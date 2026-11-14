// AI Package Studio evaluation harness (server/eval/studio): the scoring functions with small
// fixed inputs, corpus validation, and one full run against the local AI stub (no key needed).
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

delete process.env.ANTHROPIC_API_KEY;
delete process.env.OPENAI_API_KEY;
delete process.env.AI_PROVIDER;

const { textMatch, normText, monthDay, compareField, ungrounded, aggregate, validateCase, FIELDS } = require('../eval/studio/score');
const { run, loadCorpus, parseArgs } = require('../eval/studio/run');

const fullExpected = () => Object.fromEntries(FIELDS.map((f) => [f.name, ['inclusions', 'exclusions', 'departureDates'].includes(f.name) ? [] : null]));

test('normText and textMatch compare free text loosely but not blindly', () => {
  assert.equal(normText('  Breakfast + Dinner! '), 'breakfast dinner');
  assert.equal(textMatch('Breakfast and dinner', 'breakfast & dinner'), true, 'half the words shared');
  assert.equal(textMatch('Camps', 'Camps in Chopta'), true, 'one contains the other as whole words');
  assert.equal(textMatch('Spiti', 'Spiti Valley'), true);
  assert.equal(textMatch('Camp stay', 'Camps in Chopta'), false);
  assert.equal(textMatch('Meals', 'Mealsy'), false, 'whole words only');
  assert.equal(textMatch('', 'anything'), false);
  assert.equal(textMatch(null, null), false);
});

test('monthDay ignores the year and rejects anything that is not a date', () => {
  assert.equal(monthDay('2026-12-20'), '12-20');
  assert.equal(monthDay('12-20'), '12-20');
  assert.equal(monthDay('20/12'), null);
  assert.equal(monthDay(null), null);
});

test('compareField: scalar numbers, codes and text', () => {
  assert.deepEqual(compareField('number', 6499, 6499), { tp: 1, predicted: 1, expected: 1, exact: true });
  assert.deepEqual(compareField('number', 6499, 6500), { tp: 0, predicted: 1, expected: 1, exact: false });
  assert.deepEqual(compareField('number', null, 6499), { tp: 0, predicted: 1, expected: 0, exact: false }, 'an invented value costs precision');
  assert.deepEqual(compareField('number', 6499, null), { tp: 0, predicted: 0, expected: 1, exact: false }, 'a missed value costs recall');
  assert.deepEqual(compareField('number', null, null), { tp: 0, predicted: 0, expected: 0, exact: true }, 'both empty is right');
  assert.equal(compareField('code', 'INR', ' inr ').exact, true);
  assert.equal(compareField('text', 'Spiti winter expedition', 'SPITI WINTER EXPEDITION ❄️').exact, true);
  assert.equal(compareField('text', 'x', '   ').predicted, 0, 'a blank string is no value');
});

test('compareField: lists match one to one', () => {
  assert.deepEqual(
    compareField('list', ['Homestays', 'All meals', 'Permits'], ['homestays', 'Meals (all)', 'Bonfire']),
    { tp: 2, predicted: 3, expected: 3, exact: false },
  );
  assert.deepEqual(compareField('list', ['Camps'], ['Camps', 'Camps in Chopta']), { tp: 1, predicted: 2, expected: 1, exact: false }, 'one expected item is claimed once');
  assert.deepEqual(compareField('list', [], []), { tp: 0, predicted: 0, expected: 0, exact: true });
  assert.deepEqual(compareField('list', ['a'], 'not a list'), { tp: 0, predicted: 0, expected: 1, exact: false });
});

test('compareField: dates compare month and day only', () => {
  assert.deepEqual(compareField('dates', ['12-20', '01-03'], ['2026-12-20', '2027-01-03']), { tp: 2, predicted: 2, expected: 2, exact: true });
  assert.deepEqual(compareField('dates', ['12-20'], ['2026-12-21', 'soon']), { tp: 0, predicted: 1, expected: 1, exact: false }, 'invalid output dates are dropped');
});

test('ungrounded uses the app rules: numbers and dates must be written in the text', () => {
  const text = 'Spiti 8D/7N, 20 Dec, ₹21,999, 10 seats';
  const raw = { price: 21999, capacity: 12, durationDays: 8, durationNights: 7, departureDates: ['2099-12-20', '2099-12-21'] };
  const r = ungrounded(raw, text, 'raw');
  assert.equal(r.checked, 6);
  assert.deepEqual(r.values, [{ field: 'capacity', value: 12 }, { field: 'departureDates', value: '2099-12-21' }]);
  const d = ungrounded({ basePrice: 21999, capacity: null, durationDays: 8, durationNights: null, departureDates: [] }, text, 'draft');
  assert.deepEqual(d, { checked: 2, values: [] }, 'empty values are not checked');
  assert.deepEqual(ungrounded({}, text, 'raw'), { checked: 0, values: [] });
});

test('aggregate: micro-averaged precision and recall, exact-match per case, errors left out', () => {
  const field = (tp, predicted, expected, exact) => ({ tp, predicted, expected, exact });
  const fields = (price) => Object.fromEntries(FIELDS.map((f) => [f.name, f.name === 'price' ? price : field(0, 0, 0, true)]));
  const cases = [
    { id: 'a', fields: fields(field(1, 1, 1, true)), ungrounded: { raw: { checked: 4, values: [{}] }, draft: { checked: 3, values: [] } } },
    { id: 'b', fields: fields(field(0, 1, 0, false)), ungrounded: { raw: { checked: 2, values: [{}, {}] }, draft: { checked: 0, values: [] } } },
    { id: 'c', error: 'AI_TIMEOUT' },
  ];
  const s = aggregate(cases);
  assert.equal(s.cases, 3);
  assert.equal(s.scored, 2);
  assert.equal(s.errors, 1);
  assert.equal(s.fields.price.precision, 0.5);
  assert.equal(s.fields.price.recall, 1);
  assert.equal(s.fields.price.exactMatch, 0.5);
  assert.equal(s.fields.capacity.precision, null, 'no predictions: precision is undefined, not 0');
  assert.deepEqual(s.hallucination.model, { checked: 6, ungrounded: 3, rate: 0.5 });
  assert.deepEqual(s.hallucination.draft, { checked: 3, ungrounded: 0, rate: 0 });
});

test('validateCase requires every field to be labelled, with the right type', () => {
  const ok = { id: 'x', text: 'A post', expected: fullExpected() };
  assert.deepEqual(validateCase(ok), []);
  const missing = { ...ok, expected: { ...fullExpected() } };
  delete missing.expected.capacity;
  assert.match(validateCase(missing).join(), /expected\.capacity is missing/);
  assert.match(validateCase({ ...ok, expected: { ...fullExpected(), price: '6499' } }).join(), /price must be a number or null/);
  assert.match(validateCase({ ...ok, expected: { ...fullExpected(), departureDates: ['20 Dec'] } }).join(), /MM-DD/);
  assert.match(validateCase({ ...ok, expected: { ...fullExpected(), hotel: 'x' } }).join(), /not a scored field/);
  assert.match(validateCase({ ...ok, text: '' }).join(), /"text"/);
});

test('loadCorpus refuses an invalid corpus and the sample corpus is valid', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ghumo-eval-'));
  try {
    assert.throws(() => loadCorpus(dir), /No corpus\.json/);
    fs.writeFileSync(path.join(dir, 'corpus.json'), JSON.stringify({ name: 't', version: '1' }));
    fs.writeFileSync(path.join(dir, 'a.json'), JSON.stringify({ id: 'a', text: 'post', expected: {} }));
    assert.throws(() => loadCorpus(dir), /Invalid corpus/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
  const { manifest, cases } = loadCorpus(path.join(__dirname, '..', 'eval', 'studio', 'cases'));
  assert.equal(manifest.synthetic, true);
  assert.ok(cases.length >= 5);
});

test('parseArgs rejects unknown options', () => {
  assert.equal(parseArgs(['--stub']).stub, true);
  assert.throws(() => parseArgs(['--key', 'x']), /Unknown option/);
  assert.throws(() => parseArgs(['--corpus']), /needs a path/);
});

test('A full run against the stub scores every case and no invented value survives grounding', async () => {
  const before = { ...process.env };
  try {
    const result = await run({ stub: true, corpus: path.join(__dirname, '..', 'eval', 'studio', 'cases') });
    assert.equal(result.stub, true);
    assert.equal(result.model, 'stub-model');
    assert.equal(result.summary.errors, 0);
    assert.deepEqual(result.failures, []);
    assert.ok(result.summary.hallucination.model.ungrounded > 0, 'the stub answers every post with the same trip, so it invents values');
    assert.equal(result.summary.hallucination.draft.ungrounded, 0);
    const chopta = result.cases.find((c) => c.id === 'chopta-weekend');
    assert.equal(chopta.fields.price.exact, true);
    assert.equal(chopta.fields.durationDays.exact, true);
    const json = JSON.stringify(result);
    assert.equal(json.includes('Tempo traveller, camps in Chopta'), false, 'captions are never written to the results');
    assert.equal(json.includes('eval-stub-key'), false);
  } finally {
    for (const k of Object.keys(process.env)) if (!(k in before)) delete process.env[k];
    Object.assign(process.env, before);
  }
});
