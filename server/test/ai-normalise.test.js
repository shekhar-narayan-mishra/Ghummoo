const { test } = require('node:test');
const assert = require('node:assert/strict');
const { normalise } = require('../src/services/ai');

test('normalise warns when it clears an ungrounded seat capacity', () => {
  const { draft, missing, warnings } = normalise({ capacity: 20 }, 'Manali trip with 12 seats');

  assert.equal(draft.capacity, null);
  assert.ok(missing.includes('Seat capacity'));
  assert.deepEqual(warnings, ['Seat capacity 20 could not be found in the text and was cleared']);
});

test('normalise keeps a grounded seat capacity without a warning', () => {
  const { draft, missing, warnings } = normalise({ capacity: 20 }, 'Manali trip with 20 seats');

  assert.equal(draft.capacity, 20);
  assert.ok(!missing.includes('Seat capacity'));
  assert.deepEqual(warnings, []);
});

test('normalise lists an absent seat capacity as missing without a warning', () => {
  for (const raw of [{ capacity: null }, {}]) {
    const { draft, missing, warnings } = normalise(raw, 'Manali trip');

    assert.equal(draft.capacity, null);
    assert.ok(missing.includes('Seat capacity'));
    assert.deepEqual(warnings, []);
  }
});
