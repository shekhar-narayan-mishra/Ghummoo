/* Scoring for the AI Package Studio evaluation harness. Pure functions, no I/O.
   Definitions are documented in ./README.md; keep the two in step. */
const { numberInText, dateInText } = require('../../src/services/ai');

// Labelled fields. `kind` decides how a value is compared; `draft` reads the value from the
// draft that normalise() returns (what the organiser sees).
const FIELDS = [
  { name: 'title', kind: 'text', draft: (d) => d.title },
  { name: 'destination', kind: 'text', draft: (d) => d.destination },
  { name: 'price', kind: 'number', draft: (d) => d.basePrice },
  { name: 'currency', kind: 'code', draft: (d) => d.currency },
  { name: 'durationDays', kind: 'number', draft: (d) => d.durationDays },
  { name: 'durationNights', kind: 'number', draft: (d) => d.durationNights },
  { name: 'departureDates', kind: 'dates', draft: (d) => d.departureDates },
  { name: 'capacity', kind: 'number', draft: (d) => d.capacity },
  { name: 'inclusions', kind: 'list', draft: (d) => d.inclusions },
  { name: 'exclusions', kind: 'list', draft: (d) => d.exclusions },
  { name: 'pickupInfo', kind: 'text', draft: (d) => d.pickupInfo },
  { name: 'cancellationPolicy', kind: 'text', draft: (d) => d.cancellationPolicy },
];
const LIST_KINDS = new Set(['list', 'dates']);

// Values that the app grounds in the source text, and the rule it uses for each.
// `raw` is the field name in the model's answer, `draft` the name after normalise().
const GROUNDED = [
  { field: 'price', raw: 'price', draft: 'basePrice', check: numberInText },
  { field: 'capacity', raw: 'capacity', draft: 'capacity', check: numberInText },
  { field: 'durationDays', raw: 'durationDays', draft: 'durationDays', check: numberInText },
  { field: 'durationNights', raw: 'durationNights', draft: 'durationNights', check: numberInText },
  { field: 'departureDates', raw: 'departureDates', draft: 'departureDates', check: dateInText, list: true },
];

const present = (v) => v !== null && v !== undefined && !(typeof v === 'string' && !v.trim());

// Lower case, letters and digits only, single spaces. "Breakfast + Dinner!" → "breakfast dinner".
function normText(s) {
  return String(s ?? '').normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}

// Two free-text values match when, normalised, they are equal, one contains the other as whole
// words, or at least half of their combined words are shared (Jaccard ≥ 0.5).
function textMatch(a, b) {
  const x = normText(a);
  const y = normText(b);
  if (!x || !y) return false;
  if (x === y || ` ${x} `.includes(` ${y} `) || ` ${y} `.includes(` ${x} `)) return true;
  const xs = new Set(x.split(' '));
  const ys = new Set(y.split(' '));
  const shared = [...xs].filter((w) => ys.has(w)).length;
  return shared / (xs.size + ys.size - shared) >= 0.5;
}

// "2026-12-20" or "12-20" → "12-20". Years are ignored: captions rarely state one and the model
// is told to assume the next occurrence. Anything else → null.
function monthDay(v) {
  const m = /^(?:\d{4}-)?(\d{2})-(\d{2})$/.exec(String(v ?? '').trim());
  return m ? `${m[1]}-${m[2]}` : null;
}

function scalarEqual(kind, a, b) {
  if (kind === 'number') return Number(a) === Number(b);
  if (kind === 'code') return String(a).trim().toUpperCase() === String(b).trim().toUpperCase();
  return textMatch(a, b);
}

// One field of one case → counts. tp: correct values; predicted: values in the output;
// expected: values in the label; exact: the whole field is right (both empty counts as right).
function compareField(kind, expected, actual) {
  if (LIST_KINDS.has(kind)) {
    const key = kind === 'dates' ? monthDay : (v) => v;
    const exp = [...new Set((Array.isArray(expected) ? expected : []).map(key).filter(present))];
    const out = [...new Set((Array.isArray(actual) ? actual : []).map(key).filter(present))];
    const match = kind === 'dates' ? (a, b) => a === b : textMatch;
    // Greedy one-to-one matching: each expected item can be claimed by one output item.
    const unclaimed = [...exp];
    let tp = 0;
    for (const o of out) {
      const i = unclaimed.findIndex((e) => match(e, o));
      if (i !== -1) { tp += 1; unclaimed.splice(i, 1); }
    }
    return { tp, predicted: out.length, expected: exp.length, exact: tp === out.length && tp === exp.length };
  }
  const p = present(actual);
  const e = present(expected);
  const tp = p && e && scalarEqual(kind, expected, actual) ? 1 : 0;
  return { tp, predicted: p ? 1 : 0, expected: e ? 1 : 0, exact: (!p && !e) || tp === 1 };
}

function scoreCase(expected, draft) {
  const fields = {};
  for (const f of FIELDS) fields[f.name] = compareField(f.kind, expected[f.name], f.draft(draft || {}));
  return fields;
}

// Grounded values in `obj` that do not appear in `text`. `side` is 'raw' or 'draft'.
function ungrounded(obj, text, side) {
  let checked = 0;
  const values = [];
  for (const g of GROUNDED) {
    const v = (obj || {})[g[side]];
    const list = g.list ? (Array.isArray(v) ? v : []) : [v];
    for (const item of list) {
      if (!present(item)) continue;
      checked += 1;
      if (!g.check(item, text)) values.push({ field: g.field, value: item });
    }
  }
  return { checked, values };
}

const ratio = (n, d) => (d ? n / d : null);

// Per-case results → per-field precision, recall and exact-match rate, plus hallucination rates.
function aggregate(cases) {
  const scored = cases.filter((c) => c.fields);
  const fields = {};
  for (const f of FIELDS) {
    const sum = { tp: 0, predicted: 0, expected: 0, exact: 0 };
    for (const c of scored) {
      const r = c.fields[f.name];
      sum.tp += r.tp; sum.predicted += r.predicted; sum.expected += r.expected; sum.exact += r.exact ? 1 : 0;
    }
    fields[f.name] = {
      precision: ratio(sum.tp, sum.predicted),
      recall: ratio(sum.tp, sum.expected),
      exactMatch: ratio(sum.exact, scored.length),
      ...sum,
    };
  }
  const rate = (side) => {
    const checked = scored.reduce((n, c) => n + c.ungrounded[side].checked, 0);
    const count = scored.reduce((n, c) => n + c.ungrounded[side].values.length, 0);
    return { checked, ungrounded: count, rate: ratio(count, checked) };
  };
  return {
    cases: cases.length,
    scored: scored.length,
    errors: cases.length - scored.length,
    fields,
    hallucination: { model: rate('raw'), draft: rate('draft') },
  };
}

// A case file must label every field (null or [] when the post doesn't state it), so a missing
// label is never mistaken for "the post has no value".
function validateCase(c, file = 'case') {
  const errors = [];
  if (!c || typeof c !== 'object') return [`${file}: not a JSON object`];
  if (typeof c.id !== 'string' || !c.id.trim()) errors.push(`${file}: "id" must be a non-empty string`);
  if (typeof c.text !== 'string' || !c.text.trim()) errors.push(`${file}: "text" must be a non-empty string`);
  const exp = c.expected;
  if (!exp || typeof exp !== 'object') return [...errors, `${file}: "expected" must be an object`];
  for (const f of FIELDS) {
    if (!(f.name in exp)) { errors.push(`${file}: expected.${f.name} is missing (use null or [] if the post doesn't state it)`); continue; }
    const v = exp[f.name];
    if (LIST_KINDS.has(f.kind)) {
      if (!Array.isArray(v)) errors.push(`${file}: expected.${f.name} must be an array`);
      else if (f.kind === 'dates' && v.some((d) => !monthDay(d))) errors.push(`${file}: expected.departureDates must be "MM-DD" or "YYYY-MM-DD"`);
    } else if (v !== null && f.kind === 'number' && !Number.isFinite(v)) {
      errors.push(`${file}: expected.${f.name} must be a number or null`);
    } else if (v !== null && f.kind !== 'number' && typeof v !== 'string') {
      errors.push(`${file}: expected.${f.name} must be a string or null`);
    }
  }
  const known = new Set(FIELDS.map((f) => f.name));
  for (const k of Object.keys(exp)) if (!known.has(k)) errors.push(`${file}: expected.${k} is not a scored field`);
  return errors;
}

module.exports = { FIELDS, GROUNDED, normText, textMatch, monthDay, compareField, scoreCase, ungrounded, aggregate, validateCase };
