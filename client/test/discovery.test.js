// Unit tests for the traveller app's pure logic: search, filter params, ranking, "Ask this
// trip" answers and comparison data. Run: npm test --prefix client
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { searchPlaces, searchExperiences, rankTrips, noMatchNote, answerFromTrip, compareRows } from '../src/lib/discovery.js';
import { toTripParams, upcomingMonths } from '../src/lib/tripParams.js';

const places = [
  { slug: 'varanasi', name: 'Varanasi', state: 'Uttar Pradesh', aliases: ['banaras', 'kashi'], featured: true },
  { slug: 'jaipur', name: 'Jaipur', state: 'Rajasthan', aliases: ['pink city'], featured: true },
  { slug: 'jaisalmer', name: 'Jaisalmer', state: 'Rajasthan', aliases: [], featured: false },
  { slug: 'sohra', name: 'Sohra (Cherrapunji)', state: 'Meghalaya', aliases: ['cherrapunji'], featured: false },
];

test('search: prefix and alias matches rank first; state matches count; empty query returns nothing', () => {
  assert.deepEqual(searchPlaces(places, 'jai').map((p) => p.slug), ['jaipur', 'jaisalmer']);
  assert.deepEqual(searchPlaces(places, 'banaras').map((p) => p.slug), ['varanasi']);
  assert.deepEqual(searchPlaces(places, 'cherra').map((p) => p.slug), ['sohra']);
  assert.deepEqual(searchPlaces(places, 'rajasthan').map((p) => p.slug).sort(), ['jaipur', 'jaisalmer']);
  assert.deepEqual(searchPlaces(places, '   '), []);
  assert.equal(searchPlaces(places, 'j', 1).length, 1);
});

test('search: experiences map typed words to package categories', () => {
  assert.equal(searchExperiences('trek')[0].value, 'trek');
  assert.equal(searchExperiences('beach')[0].value, 'beach');
  assert.ok(searchExperiences('temple').some((c) => c.value === 'spiritual'));
  assert.deepEqual(searchExperiences('ab'), [], 'too short to suggest');
});

test('filters: UI state maps to the /api/trips query without colliding with date filters', () => {
  assert.deepEqual(toTripParams({ q: 'goa', place: 'north-goa', from: 'mumbai', landscape: 'coast', category: 'beach', maxPrice: '10000', maxDays: '3', available: true, sort: 'price_asc' }), {
    q: 'goa', place: 'north-goa', departureCity: 'mumbai', landscape: 'coast', category: 'beach', maxPrice: '10000', maxDays: '3', available: 'true', sort: 'price_asc',
  });
  // A month becomes the server's existing date range; leap years handled.
  assert.deepEqual(toTripParams({ month: '2028-02' }), { from: '2028-02-01', to: '2028-02-29' });
  assert.deepEqual(toTripParams({ month: '2027-11' }), { from: '2027-11-01', to: '2027-11-30' });
  assert.deepEqual(toTripParams({ month: 'nonsense', sort: 'departure' }), {}, 'invalid month and default sort are dropped');
  assert.deepEqual(upcomingMonths(3, new Date(2026, 10, 15)), ['2026-11', '2026-12', '2027-01']);
});

test('filters: keeps legacy destination and limit without sending default sort or availability', () => {
  assert.deepEqual(toTripParams({ destination: 'Goa', limit: 12, sort: 'departure', available: false }), {
    destination: 'Goa', limit: 12,
  });
});

test('filters: sends date bounds only for calendar months 01 through 12', () => {
  for (const month of ['2027-00', '2027-13']) {
    assert.deepEqual(toTripParams({ month, q: 'goa' }), { q: 'goa' });
  }
  assert.deepEqual(toTripParams({ month: '2027-01' }), { from: '2027-01-01', to: '2027-01-31' });
  assert.deepEqual(toTripParams({ month: '2027-12' }), { from: '2027-12-01', to: '2027-12-31' });
});

const day = (n) => new Date(Date.now() + n * 86400000).toISOString();
const card = (slug, o = {}) => ({
  slug, title: slug, categories: [], landscapes: [], durationDays: 3, priceFrom: 5000,
  nextDeparture: { startDate: day(10), seatsAvailable: 8, availability: 'available' }, ...o,
});

test('ranking: only open trips; preferences raise matches; reasons come from the card', () => {
  const cards = [
    card('beach-weekend', { categories: ['beach', 'weekend'], landscapes: ['coast'], durationDays: 3, nextDeparture: { startDate: day(20), seatsAvailable: 5, availability: 'available' } }),
    card('himalaya-trek', { categories: ['trek'], landscapes: ['himalayas'], durationDays: 8, priceFrom: 21999 }),
    card('no-dates', { nextDeparture: null }),
    card('sold-out', { landscapes: ['coast'], nextDeparture: { startDate: day(3), seatsAvailable: 0, availability: 'sold_out' } }),
  ];
  const out = rankTrips(cards, { landscapes: ['coast'], experiences: ['beaches'], days: 3, budget: 10000 }, { landscapeName: (s) => ({ coast: 'Coast' })[s] || s });
  assert.deepEqual(out.map((r) => r.trip.slug), ['beach-weekend', 'himalaya-trek'], 'no dates and sold out are excluded');
  assert.match(out[0].reasons[0], /Coast you picked/);
  assert.ok(out[0].reasons.every((r) => !/rating|best|top/i.test(r)), 'no invented scores or superlatives');
  assert.ok(!out[1].reasons.some((r) => /budget/.test(r)), 'over-budget trips never claim to be within budget');
  assert.ok(rankTrips(cards, {}, { limit: 1 }).length === 1);
  assert.match(noMatchNote({ budget: 5000, month: '2026-12' }), /raise the budget, or try another month/);
});

const trip = {
  slug: 't', meals: 'Breakfast and dinner', accommodation: '', transport: null,
  inclusions: ['Stay', 'Rafting'], exclusions: [], cancellationPolicy: 'Full refund up to 10 days before departure.',
  pickupInfo: '', itinerary: [{ day: 1, title: 'Arrive' }, { day: 2, title: 'Raft' }],
  departures: [{ startDate: day(5), price: 4999, seatsAvailable: 3, availability: 'available', pickupPoint: 'Akshardham metro', reportingTime: '9:30 PM' }, { startDate: day(12), price: 5299, seatsAvailable: 0, availability: 'sold_out' }],
};

test('ask this trip: answers from listing fields only and says so when the organiser is silent', () => {
  assert.deepEqual(answerFromTrip(trip, 'Which meals are included?'), { answered: true, answer: 'Breakfast and dinner', sources: ['Meals'] });
  assert.equal(answerFromTrip(trip, 'What is not included?').answered, false, '"not included" is exclusions, which are empty');
  assert.match(answerFromTrip(trip, 'What is not included?').answer, /hasn't shared exclusions/);
  assert.equal(answerFromTrip(trip, 'what is included').answer, 'Stay; Rafting');
  assert.equal(answerFromTrip(trip, 'Which hotel?').answered, false, 'empty accommodation is reported, not invented');
  assert.match(answerFromTrip(trip, 'Where is pickup?').answer, /Akshardham metro, report by 9:30 PM/, 'falls back to departure pickup points');
  assert.match(answerFromTrip(trip, 'any seats available?').answer, /3 seats left.*sold out/);
  assert.equal(answerFromTrip(trip, 'Is it safe for kids?').answered, false, 'off-topic questions are not guessed');
});

test('comparison data: one row per field, missing values flagged, no scores', () => {
  const a = { ...trip, slug: 'a', priceFrom: 4999, durationDays: 3, durationNights: 2, places: { departureCities: [{ name: 'Delhi' }] }, operator: { businessName: 'A' } };
  const b = { slug: 'b', priceFrom: null, durationDays: null, departures: [], inclusions: [], operator: { businessName: 'B', verified: true }, startLocation: 'Pune' };
  const rows = compareRows([a, b]);
  const row = (k) => rows.find((r) => r.key === k);
  assert.deepEqual(rows.map((r) => r.key), ['price', 'departures', 'duration', 'from', 'accommodation', 'transport', 'meals', 'inclusions', 'exclusions', 'cancellation', 'organiser']);
  assert.deepEqual(row('price').cells.map((c) => c.missing), [false, true]);
  assert.deepEqual(row('duration').cells.map((c) => c.missing), [false, true]);
  assert.deepEqual(row('from').cells.map((c) => c.value), [['Delhi'], ['Pune']], 'falls back to the organiser\'s own start location');
  assert.deepEqual(row('transport').cells.map((c) => c.missing), [true, true]);
  assert.equal(row('departures').cells[0].value.length, 2);
  assert.ok(rows.every((r) => !/score|rating|rank/i.test(r.label)));
});
