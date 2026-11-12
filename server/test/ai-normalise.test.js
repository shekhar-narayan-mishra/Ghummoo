// AI Package Studio normalise(): seat capacity grounding. Pure unit tests, no database.
const { test } = require('node:test');
const assert = require('node:assert/strict');

delete process.env.ANTHROPIC_API_KEY;
delete process.env.OPENAI_API_KEY;
delete process.env.AI_PROVIDER;

const { normalise } = require('../src/services/ai');

const raw = (fields) => ({ departureDates: [], itinerary: [], inclusions: [], exclusions: [], warnings: [], ...fields });
const capacityWarnings = (out) => out.warnings.filter((w) => w.startsWith('Seat capacity'));

test('an ungrounded seat capacity is cleared with a warning', () => {
  const out = normalise(raw({ capacity: 20 }), 'Manali 5D/4N, ₹12,000 per person');
  assert.equal(out.draft.capacity, null);
  assert.deepEqual(capacityWarnings(out), ['Seat capacity 20 could not be found in the text and was cleared']);
  assert.ok(out.missing.includes('Seat capacity'), 'the missing-field list still reports it');
});

test('a grounded seat capacity is kept without a warning', () => {
  const out = normalise(raw({ capacity: 20 }), 'Manali 5D/4N, ₹12,000 per person, only 20 seats');
  assert.equal(out.draft.capacity, 20);
  assert.deepEqual(capacityWarnings(out), []);
  assert.ok(!out.missing.includes('Seat capacity'));
});

test('a missing seat capacity produces no capacity warning', () => {
  for (const capacity of [null, undefined]) {
    const out = normalise(raw({ capacity }), 'Manali 5D/4N, ₹12,000 per person');
    assert.equal(out.draft.capacity, null);
    assert.deepEqual(capacityWarnings(out), []);
    assert.ok(out.missing.includes('Seat capacity'), 'the missing-field list still reports it');
  }
});
