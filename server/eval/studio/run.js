#!/usr/bin/env node
/* AI Package Studio evaluation harness. Runs extraction over a labelled corpus and reports
   per-field precision, recall and exact-match rate, and how often values that are not in the
   source text appear (before and after the app's grounding). See ./README.md.

     npm run eval:studio -- --stub                 # local AI stub, no key (what CI runs)
     npm run eval:studio                           # the provider configured in server/.env
     npm run eval:studio -- --corpus <dir> --out <file.json>

   It never prints captions, API keys or provider error bodies: only case ids, field names,
   counts and error codes. */
const fs = require('fs');
const net = require('net');
const path = require('path');
const { spawn } = require('child_process');
const { aggregate, scoreCase, ungrounded, validateCase, FIELDS } = require('./score');

const SERVER_DIR = path.join(__dirname, '..', '..');
const STUB = path.join(SERVER_DIR, '..', 'e2e', 'ai-stub.js');
const DEFAULT_CORPUS = path.join(__dirname, 'cases');
const DEFAULT_OUT = path.join(__dirname, 'results', 'latest.json');
const HARNESS_VERSION = 1;

function parseArgs(argv) {
  const opts = { stub: false, corpus: DEFAULT_CORPUS, out: DEFAULT_OUT, quiet: false };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--stub') opts.stub = true;
    else if (a === '--quiet') opts.quiet = true;
    else if (a === '--corpus' || a === '--out') {
      if (!argv[i + 1]) throw new Error(`${a} needs a path`);
      opts[a.slice(2)] = path.resolve(argv[i + 1]);
      i += 1;
    } else throw new Error(`Unknown option ${a}. Options: --stub, --corpus <dir>, --out <file>, --quiet`);
  }
  return opts;
}

// corpus.json ({ name, version }) plus one JSON file per case. Invalid cases stop the run.
function loadCorpus(dir) {
  const manifestFile = path.join(dir, 'corpus.json');
  if (!fs.existsSync(manifestFile)) throw new Error(`No corpus.json in ${dir}`);
  const manifest = JSON.parse(fs.readFileSync(manifestFile, 'utf8'));
  if (!manifest.name || !manifest.version) throw new Error('corpus.json needs "name" and "version"');
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json') && f !== 'corpus.json').sort();
  if (!files.length) throw new Error(`No case files in ${dir}`);
  const errors = [];
  const ids = new Set();
  const cases = files.map((f) => {
    let c;
    try { c = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')); } catch (err) { errors.push(`${f}: invalid JSON (${err.message})`); return null; }
    errors.push(...validateCase(c, f));
    if (c?.id && ids.has(c.id)) errors.push(`${f}: duplicate id "${c.id}"`);
    ids.add(c?.id);
    return c;
  });
  if (errors.length) throw new Error(`Invalid corpus:\n  ${errors.join('\n  ')}`);
  return { manifest, cases };
}

const freePort = () => new Promise((resolve, reject) => {
  const srv = net.createServer();
  srv.unref();
  srv.on('error', reject);
  srv.listen(0, '127.0.0.1', () => { const { port } = srv.address(); srv.close(() => resolve(port)); });
});

// Starts e2e/ai-stub.js (the same stub the Playwright suite uses) and points the AI env at it.
async function startStub() {
  const port = await freePort();
  const child = spawn(process.execPath, [STUB], { env: { ...process.env, E2E_AI_PORT: String(port) }, stdio: ['ignore', 'pipe', 'inherit'] });
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('The AI stub did not start within 10 seconds')), 10000);
    child.on('exit', (code) => { clearTimeout(timer); reject(new Error(`The AI stub exited (${code})`)); });
    child.stdout.on('data', (chunk) => { if (String(chunk).includes('listening')) { clearTimeout(timer); resolve(); } });
  });
  Object.assign(process.env, {
    AI_PROVIDER: 'openai', OPENAI_API_KEY: 'eval-stub-key', OPENAI_BASE_URL: `http://127.0.0.1:${port}/v1`, AI_MODEL: 'stub-model',
  });
  return () => child.kill();
}

const pct = (v) => (v == null ? '   –  ' : `${(v * 100).toFixed(1).padStart(5)}%`);

function report(result, log) {
  const { summary } = result;
  log(`\nAI Package Studio evaluation: ${result.corpus.name} v${result.corpus.version}, ${summary.cases} cases, ${result.provider}/${result.model}${result.stub ? ' (stub: scores say nothing about model quality)' : ''}\n`);
  log(`${'field'.padEnd(20)} precision  recall   exact`);
  for (const f of FIELDS) {
    const s = summary.fields[f.name];
    log(`${f.name.padEnd(20)} ${pct(s.precision)}   ${pct(s.recall)}  ${pct(s.exactMatch)}`);
  }
  const h = summary.hallucination;
  log(`\nValues not found in the source text (price, capacity, duration, departure dates):`);
  log(`  model output:          ${h.model.ungrounded}/${h.model.checked} (${pct(h.model.rate).trim()})`);
  log(`  draft after grounding: ${h.draft.ungrounded}/${h.draft.checked} (${pct(h.draft.rate).trim()})`);
  for (const c of result.cases.filter((x) => x.error)) log(`  ! ${c.id}: ${c.error}`);
  log('');
}

// Runs the evaluation. Resolves with the result object; `failures` lists why the run should fail.
async function run(opts) {
  const { manifest, cases } = loadCorpus(opts.corpus);
  const stopStub = opts.stub ? await startStub() : null;
  try {
    const ai = require('../../src/services/ai');
    const status = ai.status();
    if (!status.configured) {
      throw new Error('No AI provider is configured. Set AI_PROVIDER and a key in server/.env, or use --stub.');
    }
    const results = [];
    // One case at a time, to stay under provider rate limits.
    for (const c of cases) {
      try {
        const { raw } = await ai.extractRaw(c.text);
        const { draft } = ai.normalise(raw, c.text);
        results.push({
          id: c.id,
          fields: scoreCase(c.expected, draft),
          ungrounded: { raw: ungrounded(raw, c.text, 'raw'), draft: ungrounded(draft, c.text, 'draft') },
        });
      } catch (err) {
        // Provider errors carry a code; never print a provider's message or the caption.
        results.push({ id: c.id, error: err.code || `HARNESS_ERROR: ${err.message}` });
      }
    }
    const summary = aggregate(results);
    const failures = [];
    if (summary.errors) failures.push(`${summary.errors} case(s) failed to run`);
    if (summary.hallucination.draft.ungrounded) failures.push(`${summary.hallucination.draft.ungrounded} ungrounded value(s) survived the app's grounding`);
    return {
      harnessVersion: HARNESS_VERSION,
      startedAt: new Date().toISOString(),
      provider: status.provider,
      model: status.model,
      stub: Boolean(opts.stub),
      corpus: { name: manifest.name, version: String(manifest.version), synthetic: Boolean(manifest.synthetic), cases: cases.length },
      summary,
      cases: results,
      failures,
    };
  } finally {
    stopStub?.();
  }
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (!opts.stub) {
    require('dotenv').config({ path: path.join(SERVER_DIR, '.env'), quiet: true });
  }
  const result = await run(opts);
  report(result, opts.quiet ? () => {} : console.log);
  fs.mkdirSync(path.dirname(opts.out), { recursive: true });
  fs.writeFileSync(opts.out, `${JSON.stringify(result, null, 2)}\n`);
  console.log(`Results written to ${path.relative(process.cwd(), opts.out)}`);
  if (result.failures.length) {
    console.error(`Evaluation failed: ${result.failures.join('; ')}`);
    process.exitCode = 1;
  }
}

if (require.main === module) {
  main().catch((err) => { console.error(err.message); process.exitCode = 1; });
}

module.exports = { run, loadCorpus, parseArgs };
