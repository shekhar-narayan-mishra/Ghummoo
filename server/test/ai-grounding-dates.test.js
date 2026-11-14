// AI Package Studio: departure dates and durations must be written in the organiser's post.
// Pure unit tests, no database. Captions are made up, not real organisers' posts.
const { test } = require('node:test');
const assert = require('node:assert/strict');

delete process.env.ANTHROPIC_API_KEY;
delete process.env.OPENAI_API_KEY;
delete process.env.AI_PROVIDER;

const { normalise, dateInText } = require('../src/services/ai');

const raw = (fields) => ({ departureDates: [], itinerary: [], inclusions: [], exclusions: [], warnings: [], ...fields });
const Y = 2099; // always in the future, so the past-date rule never interferes

test('dateInText: month names and abbreviations, before or after the day', () => {
  assert.equal(dateInText(`${Y}-12-20`, 'Spiti trip leaving 20 December'), true);
  assert.equal(dateInText(`${Y}-12-20`, 'Spiti trip leaving December 20'), true);
  assert.equal(dateInText(`${Y}-12-20`, 'Batch on 20 Dec, Delhi to Delhi'), true);
  assert.equal(dateInText(`${Y}-09-14`, 'Next batch 14 Sept'), true);
  assert.equal(dateInText(`${Y}-09-14`, 'Next batch Sep 14'), true);
  assert.equal(dateInText(`${Y}-03-07`, 'Holi special, 7 MARCH'), true, 'case does not matter');
});

test('dateInText: ordinals', () => {
  assert.equal(dateInText(`${Y}-12-20`, 'Leaving 20th Dec'), true);
  assert.equal(dateInText(`${Y}-12-20`, 'Leaving Dec 20th'), true);
  assert.equal(dateInText(`${Y}-01-01`, 'New year batch: 1st of January'), true);
  assert.equal(dateInText(`${Y}-11-22`, '22nd November departure'), true);
});

test('dateInText: numeric day-first dates', () => {
  assert.equal(dateInText(`${Y}-12-20`, 'Departure 20/12'), true);
  assert.equal(dateInText(`${Y}-12-20`, 'Departure 20-12'), true);
  assert.equal(dateInText(`${Y}-12-20`, 'Departure 20.12'), true);
  assert.equal(dateInText(`${Y}-12-20`, `Departure 20/12/${Y}`), true);
  assert.equal(dateInText(`${Y}-06-05`, 'Departure 05/06'), true, 'day first, the Indian convention');
  assert.equal(dateInText(`${Y}-05-06`, 'Departure 05/06'), false, 'never read month first');
  assert.equal(dateInText(`${Y}-12-20`, `Departure ${Y}-12-20`), true, 'ISO dates in the text');
});

test('dateInText: ranges ground their days', () => {
  assert.equal(dateInText(`${Y}-12-20`, 'Kasol 20-22 Dec'), true);
  assert.equal(dateInText(`${Y}-12-22`, 'Kasol 20-22 Dec'), true);
  assert.equal(dateInText(`${Y}-12-21`, 'Kasol 20-22 Dec'), false, 'a day inside a range is not written');
  assert.equal(dateInText(`${Y}-12-22`, 'Kasol Dec 20 - 22'), true);
  assert.equal(dateInText(`${Y}-12-22`, 'Kasol 20th to 22nd Dec'), true);
  assert.equal(dateInText(`${Y}-01-06`, 'Weekend 5-6 Jan'), true);
  assert.equal(dateInText(`${Y}-06-05`, 'Weekend 5-6 Jan'), false, '"5-6 Jan" is not 5 June');
  assert.equal(dateInText(`${Y}-12-19`, 'Batches: Dec 5, 12 and 19'), true);
});

test('dateInText: a missing day or month does not ground a date', () => {
  assert.equal(dateInText(`${Y}-12-20`, 'Spiti in December, 6499 per person'), false, 'no day');
  assert.equal(dateInText(`${Y}-12-20`, 'Leaving on the 20th, Delhi pickup'), false, 'no month');
  assert.equal(dateInText(`${Y}-12-20`, 'Leaving 20 Nov'), false, 'another month');
  assert.equal(dateInText(`${Y}-11-05`, '5 days in Nov, 20 seats'), false, 'a number not next to the month');
  assert.equal(dateInText(`${Y}-11-20`, '20 seats, trips all through Nov'), false, 'a number not next to the month');
});

test('dateInText: a day only inside a larger number does not ground a date', () => {
  assert.equal(dateInText(`${Y}-12-12`, 'Only 120 seats in Dec'), false);
  assert.equal(dateInText(`${Y}-12-20`, `Dec ${2025} batch`), false);
  assert.equal(dateInText(`${Y}-12-05`, 'Dec trip, 5D/4N'), false, '"5D" is a duration, not a day');
  assert.equal(dateInText(`${Y}-05-01`, 'Just 1.5 lakh for two'), false, 'an amount is not a date');
  assert.equal(dateInText(`${Y}-10-06`, 'Reporting 6.10 am at Majnu ka Tilla'), false, 'a time is not a date');
  assert.equal(dateInText('not-a-date', '20 Dec'), false);
});

test('dateInText: an amount with thousands separators is not a day', () => {
  assert.equal(dateInText(`${Y}-12-18`, 'Departure Dec 5: ₹18,999 per person'), false);
  assert.equal(dateInText(`${Y}-12-12`, 'Only 12 seats, Rs 12,500. Dec 5'), false);
  assert.equal(dateInText(`${Y}-12-01`, 'Dec 5 – ₹1,25,000 for the group'), false, 'Indian grouping');
  assert.equal(dateInText(`${Y}-12-05`, 'Departure Dec 5: ₹18,999 per person'), true, 'the real date still grounds');
  assert.equal(dateInText(`${Y}-12-12`, 'Batches: Dec 5,12,19'), true, 'a list of days without spaces');
});

test('normalise keeps grounded dates and clears invented ones with a warning', () => {
  const text = 'Manali Kasol 5D/4N, 7999 per person, batches 20th Dec and 27 Dec';
  const out = normalise(raw({ departureDates: [`${Y}-12-20`, `${Y}-12-27`, `${Y}-12-31`] }), text);
  assert.deepEqual(out.draft.departureDates, [`${Y}-12-20`, `${Y}-12-27`]);
  assert.ok(out.warnings.includes(`Departure date ${Y}-12-31 could not be found in the text and was cleared`));
  assert.ok(!out.missing.includes('Departure dates'));
});

test('normalise: clearing every date leads to the missing "Departure dates" entry', () => {
  const out = normalise(raw({ departureDates: [`${Y}-12-20`] }), 'Manali Kasol 5D/4N, 7999 per person');
  assert.deepEqual(out.draft.departureDates, []);
  assert.ok(out.warnings.includes(`Departure date ${Y}-12-20 could not be found in the text and was cleared`));
  assert.ok(out.missing.includes('Departure dates'));
});

test('normalise: a past date is dropped with a warning', () => {
  const out = normalise(raw({ departureDates: ['2001-12-20'] }), 'Leaving 20 Dec 2001');
  assert.deepEqual(out.draft.departureDates, []);
  assert.ok(out.warnings.includes('Departure date 2001-12-20 is in the past and was cleared'));
});

test('normalise keeps durations written in the text, in every common form', () => {
  for (const text of ['Manali 5D/4N', 'Manali 5 days 4 nights', 'Manali 4N/5D', 'Manali, 4 nights / 5 days']) {
    const out = normalise(raw({ durationDays: 5, durationNights: 4 }), text);
    assert.equal(out.draft.durationDays, 5, text);
    assert.equal(out.draft.durationNights, 4, text);
    assert.ok(!out.warnings.some((w) => w.startsWith('Duration')), text);
    assert.ok(!out.missing.includes('Duration'), text);
  }
});

test('normalise clears invented durations with a warning', () => {
  const out = normalise(raw({ durationDays: 6, durationNights: 5 }), 'Manali trip, 7999 per person');
  assert.equal(out.draft.durationDays, null);
  assert.equal(out.draft.durationNights, null);
  assert.ok(out.warnings.includes('Duration 6 days could not be found in the text and was cleared'));
  assert.ok(out.warnings.includes('Duration 5 nights could not be found in the text and was cleared'));
  assert.ok(out.missing.includes('Duration'));

  const partial = normalise(raw({ durationDays: 3, durationNights: 2 }), 'Chopta trek 3 days, 6499');
  assert.equal(partial.draft.durationDays, 3);
  assert.equal(partial.draft.durationNights, null, 'each value is checked on its own');
});

test('normalise: a missing duration adds no duration warning', () => {
  const out = normalise(raw({ durationDays: null }), 'Manali trip');
  assert.ok(!out.warnings.some((w) => w.startsWith('Duration')));
  assert.ok(out.missing.includes('Duration'));
});
