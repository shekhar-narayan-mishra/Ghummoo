/* AI provider layer shared by every AI feature (Package Studio, discovery, Ask This Trip).
   Reuses the existing integration: Anthropic tool use, or any OpenAI-compatible API (Gemini).

   callStructured() returns JSON that has been validated against a schema, or throws an
   AiError with one of these codes (statusCode in brackets):
     AI_NOT_CONFIGURED  (503) no provider key
     AI_TIMEOUT         (504) the provider didn't answer in time
     AI_RATE_LIMITED    (429) the provider kept returning 429/503 after retries and fallbacks
     AI_INVALID_OUTPUT  (502) the reply wasn't JSON or didn't match the schema
     AI_PROVIDER_ERROR  (502) any other provider failure
   Callers decide how to degrade (every traveller-facing feature has a non-AI fallback). */

class AiError extends Error {
  constructor(code, message, statusCode) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    this.details = { code };
  }
}

// Injectable for tests (the test client itself uses global fetch).
let fetchImpl = (...args) => fetch(...args);
const setFetch = (fn) => { fetchImpl = fn || ((...args) => fetch(...args)); };

function getConfig() {
  const provider = (process.env.AI_PROVIDER || (process.env.ANTHROPIC_API_KEY ? 'anthropic' : process.env.OPENAI_API_KEY ? 'openai' : '')).toLowerCase();
  if (provider === 'anthropic' && process.env.ANTHROPIC_API_KEY) {
    return { provider, model: process.env.AI_MODEL || 'claude-sonnet-5-5', key: process.env.ANTHROPIC_API_KEY };
  }
  if (provider === 'openai' && process.env.OPENAI_API_KEY) {
    return {
      provider,
      model: process.env.AI_MODEL || 'gpt-4.1-mini',
      key: process.env.OPENAI_API_KEY,
      baseUrl: (process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/+$/, ''),
    };
  }
  return null;
}

const status = () => {
  const cfg = getConfig();
  return cfg ? { configured: true, provider: cfg.provider, model: cfg.model } : { configured: false };
};

/* --------------------------- schema validation --------------------------- */
/* Minimal JSON-Schema subset (type, properties, required, items, enum, nullable via type
   arrays). Enough for our own schemas; no extra dependency. Returns a list of problems. */
function validate(schema, value, path = '$') {
  const errs = [];
  const types = Array.isArray(schema.type) ? schema.type : schema.type ? [schema.type] : [];
  const typeOf = (v) => (v === null ? 'null' : Array.isArray(v) ? 'array' : Number.isInteger(v) ? 'integer' : typeof v);
  const t = typeOf(value);
  if (types.length && !types.includes(t) && !(t === 'integer' && types.includes('number'))) {
    errs.push(`${path}: expected ${types.join('|')}, got ${t}`);
    return errs;
  }
  if (schema.enum && value !== null && !schema.enum.includes(value)) errs.push(`${path}: ${JSON.stringify(value)} is not allowed`);
  if (t === 'object' && schema.properties) {
    for (const k of schema.required || []) if (!(k in value)) errs.push(`${path}.${k}: missing`);
    for (const [k, sub] of Object.entries(schema.properties)) if (k in value) errs.push(...validate(sub, value[k], `${path}.${k}`));
  }
  if (t === 'array' && schema.items) value.forEach((v, i) => errs.push(...validate(schema.items, v, `${path}[${i}]`)));
  return errs;
}

function parseJsonContent(content) {
  const s = String(content || '').trim().replace(/^```(?:json)?\s*/i, '').replace(/```$/, '');
  try { return JSON.parse(s); } catch { throw new AiError('AI_INVALID_OUTPUT', 'The AI reply was not valid JSON', 502); }
}

// Some OpenAI-compatible APIs (e.g. Gemini) wrap errors in an array.
const providerError = (body) => (Array.isArray(body) ? body[0]?.error : body?.error) || {};

async function send(url, init, timeoutMs) {
  try {
    return await fetchImpl(url, { ...init, signal: AbortSignal.timeout(timeoutMs) });
  } catch (err) {
    if (err?.name === 'TimeoutError' || err?.name === 'AbortError') throw new AiError('AI_TIMEOUT', 'The AI provider took too long to answer', 504);
    throw new AiError('AI_PROVIDER_ERROR', 'Could not reach the AI provider', 502);
  }
}

async function callAnthropic(cfg, { system, user, schema, name, maxTokens, timeoutMs }) {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    // eslint-disable-next-line no-await-in-loop
    const res = await send('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': cfg.key, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: cfg.model,
        max_tokens: maxTokens,
        system,
        tools: [{ name, description: 'Record the structured result', input_schema: schema }],
        tool_choice: { type: 'tool', name },
        messages: [{ role: 'user', content: user }],
      }),
    }, timeoutMs);
    // eslint-disable-next-line no-await-in-loop
    const body = await res.json().catch(() => ({}));
    if (res.ok) {
      const block = (body.content || []).find((c) => c.type === 'tool_use');
      if (!block) throw new AiError('AI_INVALID_OUTPUT', 'The AI reply had no structured output', 502);
      return { data: block.input, model: cfg.model };
    }
    const busy = res.status === 429 || res.status === 503 || res.status === 529;
    if (!busy) throw new AiError('AI_PROVIDER_ERROR', body.error?.message || `AI provider returned ${res.status}`, 502);
    // eslint-disable-next-line no-await-in-loop
    if (attempt === 0) await new Promise((r) => setTimeout(r, 800));
  }
  throw new AiError('AI_RATE_LIMITED', 'The AI provider is busy right now. Please try again in a minute.', 429);
}

// AI_MODEL may be a comma-separated list; overloaded models (503/429) fall through to the next.
async function callOpenAI(cfg, { system, user, schema, timeoutMs }) {
  const models = cfg.model.split(',').map((m) => m.trim()).filter(Boolean);
  for (const model of models) {
    const payload = JSON.stringify({
      model,
      response_format: { type: 'json_object' },
      temperature: 0,
      messages: [
        { role: 'system', content: `${system}\nRespond with a single JSON object matching this JSON Schema:\n${JSON.stringify(schema)}` },
        { role: 'user', content: user },
      ],
    });
    for (let attempt = 0; attempt < 2; attempt += 1) {
      // eslint-disable-next-line no-await-in-loop
      const res = await send(`${cfg.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${cfg.key}` },
        body: payload,
      }, timeoutMs);
      // eslint-disable-next-line no-await-in-loop
      const body = await res.json().catch(() => ({}));
      if (res.ok) return { data: parseJsonContent(body.choices?.[0]?.message?.content), model };
      const busy = res.status === 503 || res.status === 429;
      if (!busy) throw new AiError('AI_PROVIDER_ERROR', providerError(body).message || `AI provider returned ${res.status}`, 502);
      // eslint-disable-next-line no-await-in-loop
      if (attempt === 0) await new Promise((r) => setTimeout(r, 800));
    }
  }
  throw new AiError('AI_RATE_LIMITED', 'The AI provider is busy right now. Please try again in a minute.', 429);
}

/* Calls the configured provider and returns { data, provider, model } where `data` matches
   `schema`. Throws AiError on any failure. */
async function callStructured({ system, user, schema, name = 'record_result', maxTokens = 2000, timeoutMs = Number(process.env.AI_TIMEOUT_MS) || 30000, strict = true }) {
  const cfg = getConfig();
  if (!cfg) throw new AiError('AI_NOT_CONFIGURED', 'AI is not configured on this server', 503);
  const opts = { system, user, schema, name, maxTokens, timeoutMs };
  const { data, model } = cfg.provider === 'anthropic' ? await callAnthropic(cfg, opts) : await callOpenAI(cfg, opts);
  // strict=false: the caller sanitises every field itself (Package Studio's normalise()).
  const problems = data && typeof data === 'object' ? (strict ? validate(schema, data) : []) : ['$: not an object'];
  if (problems.length) {
    const err = new AiError('AI_INVALID_OUTPUT', 'The AI reply did not match the expected format', 502);
    err.problems = problems.slice(0, 5);
    throw err;
  }
  return { data, provider: cfg.provider, model };
}

module.exports = { AiError, getConfig, status, callStructured, validate, parseJsonContent, setFetch };
