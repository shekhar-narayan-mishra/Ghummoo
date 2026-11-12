// AI discovery: preference extraction, natural-language interpretation, hard constraints, dates
// and inventory, empty results and alternatives, grounded "Ask this trip" answers, provider
// failures and the no-key fallback. The AI provider is stubbed; no real API is called.
const { test, before, after, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const os = require('os');
const fs = require('fs');
const path = require('path');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ghumo-discovery-test-'));
process.env.MONGODB_URI = '';
process.env.EMBEDDED_DB_PATH = tmp;
process.env.JWT_SECRET = 'test-secret';
process.env.UPLOAD_DIR = path.join(tmp, 'uploads');
process.env.RATE_LIMIT = 'off';
const clearAi = () => { for (const k of ['ANTHROPIC_API_KEY', 'OPENAI_API_KEY', 'AI_PROVIDER', 'OPENAI_BASE_URL', 'AI_MODEL']) delete process.env[k]; };
clearAi();

const { connectDB, disconnectDB } = require('../src/config/db');
const { seed } = require('../src/seedData');
const { runFoundation } = require('../src/migrations/v0_1');
const { TripPackage, TripDeparture, Place } = require('../src/models');
const { setFetch } = require('../src/services/ai/provider');
const { normalisePrefs, constraintsOf, parseQuery, summarise, upcomingWeekend } = require('../src/services/discovery/prefs');
const { searchTrips } = require('../src/services/discovery/engine');
const { interpret } = require('../src/services/discovery/interpret');
const { askTrip, askBasic, buildContext, NOT_CONFIRMED } = require('../src/services/discovery/ask');
const { rateLimit } = require('../src/middleware/rateLimit');
const app = require('../src/app');

let server;
let base;
let places;
const post = async (url, body) => {
  const res = await fetch(base + url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  const json = await res.json();
  return { status: res.status, data: json.data, body: json };
};
const get = async (url) => (await fetch(base + url)).json();

// Stubbed OpenAI-compatible provider.
const useStubAi = (handler) => {
  process.env.AI_PROVIDER = 'openai';
  process.env.OPENAI_API_KEY = 'test-key';
  process.env.OPENAI_BASE_URL = 'http://ai.stub/v1';
  process.env.AI_MODEL = 'stub-model';
  setFetch(handler);
};
const localDay = (d) => new Date(d).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }); // dates are Indian calendar days
const reply = (obj, status = 200) => async () => ({ ok: status < 300, status, json: async () => (status < 300 ? { choices: [{ message: { content: typeof obj === 'string' ? obj : JSON.stringify(obj) } }] } : { error: { message: 'provider exploded' } }) });

before(async () => {
  await connectDB();
  await seed();
  await runFoundation();
  places = await Place.find({}, 'slug name kind aliases').lean();
  server = app.listen(0);
  base = `http://127.0.0.1:${server.address().port}`;
});
afterEach(() => { clearAi(); setFetch(null); });
after(async () => {
  server?.close();
  await disconnectDB();
  fs.rmSync(tmp, { recursive: true, force: true });
});

test('Preference extraction: unknown values are dropped, bands become hard limits', () => {
  const p = normalisePrefs({
    moods: ['mountains', 'space-travel', 'mountains'], budget: 'cheap-ish', maxPrice: 'abc', duration: '3_5', days: 0,
    departureCity: { slug: 'delhi', name: 'Delhi' }, dates: { mode: 'range', from: '2026-12-10', to: '2026-12-01' }, interests: ['  Trekking '],
  });
  assert.deepEqual(p, { moods: ['mountains'], interests: ['trekking'], duration: '3_5', departureCity: { slug: 'delhi', name: 'Delhi' } }, 'bad budget, days and a backwards date range are dropped');

  assert.equal(constraintsOf({ budget: '5k_10k' }).maxPrice, 10000);
  assert.equal(constraintsOf({ budget: '20k_plus' }).maxPrice, undefined, '₹20,000+ sets no ceiling');
  assert.equal(constraintsOf({ budget: 'under_5k', maxPrice: 8000 }).maxPrice, 8000, 'an explicit amount wins');
  assert.deepEqual([constraintsOf({ days: 3 }).minDays, constraintsOf({ days: 3 }).maxDays], [2, 4], '"3 days" means about 3');
  assert.deepEqual([constraintsOf({ duration: 'weekend' }).minDays, constraintsOf({ duration: 'weekend' }).maxDays], [1, 3]);

  // The coming weekend, from any day of the week (Wed 4 Nov 2026, Sat 7, Sun 8).
  assert.deepEqual(upcomingWeekend(new Date(2026, 10, 4)), { from: '2026-11-06', to: '2026-11-08' });
  assert.deepEqual(upcomingWeekend(new Date(2026, 10, 7)), { from: '2026-11-07', to: '2026-11-08' });
  assert.deepEqual(upcomingWeekend(new Date(2026, 10, 8)), { from: '2026-11-08', to: '2026-11-08' });
});

test('Natural language: the brief example and common phrasings become editable preferences', () => {
  const now = new Date(2026, 10, 4);
  const ex = parseQuery('Find me an affordable mountain trip for 3 days from Lucknow, preferably with trekking and camping.', { places, now });
  assert.deepEqual(ex.prefs.moods, ['mountains', 'adventure']);
  assert.deepEqual(ex.prefs.interests, ['trekking', 'camping']);
  assert.equal(ex.prefs.days, 3);
  assert.deepEqual(ex.prefs.departureCity, { slug: 'lucknow', name: 'Lucknow' });
  assert.equal(ex.prefs.affordable, true);
  assert.equal(ex.prefs.maxPrice, undefined, '"affordable" is never turned into an invented number');
  assert.ok(ex.ambiguities.some((a) => a.field === 'budget'), 'and the user is told so instead of being asked');

  assert.equal(parseQuery('beach trip under 8k', { places, now }).prefs.maxPrice, 8000);
  assert.equal(parseQuery('budget ₹12,500 for heritage', { places, now }).prefs.maxPrice, 12500);
  assert.equal(parseQuery('4 nights in the hills', { places, now }).prefs.days, 5);
  assert.deepEqual(parseQuery('something in december', { places, now }).prefs.dates, { mode: 'range', from: '2026-12-01', to: '2026-12-31' });
  assert.deepEqual(parseQuery('this weekend from Mumbai', { places, now }).prefs.dates, { mode: 'weekend' });
  assert.deepEqual(parseQuery('a trip to Spiti from Delhi', { places, now }).prefs.destination, { slug: 'spiti-valley', name: 'Spiti Valley' });
  const pune = parseQuery('peaceful trip from Pune', { places, now });
  assert.deepEqual(pune.prefs.departureCity, { text: 'Pune' }, 'cities outside the directory are kept as typed');
  assert.ok(pune.ambiguities.some((a) => a.field === 'departureCity'));
  assert.deepEqual(parseQuery('surprise me', { places, now }).prefs, {}, 'nothing is guessed from vague text');
  assert.match(summarise(ex.prefs, now), /^Looking for mountain and adventure trips of about 3 days, from Lucknow, at a lower price, on any dates\. Bonus if they include trekking and camping\.$/);
});

test('Hard constraints: budget, departure city, duration, dates and published status', async () => {
  const all = await searchTrips({});
  assert.ok(all.results.length > 0);
  assert.ok(!all.results.some((r) => r.trip.slug === 'gokarna-beach-trek-weekend'), 'drafts never match');
  for (const r of all.results) assert.equal(r.departure.availability, 'available');

  const cheap = await searchTrips({ maxPrice: 6000 });
  assert.ok(cheap.results.length > 0 && cheap.results.every((r) => r.departure.price <= 6000));
  assert.ok(cheap.results.every((r) => r.reasons.some((x) => /Within your budget/.test(x))));

  const delhi = await searchTrips({ departureCity: { slug: 'delhi', name: 'Delhi' } });
  assert.ok(delhi.results.length > 0 && delhi.results.every((r) => r.trip.places.departureCities.some((p) => p.slug === 'delhi')));
  const typed = await searchTrips({ departureCity: { text: 'Chandigarh' } });
  assert.deepEqual(typed.results.map((r) => r.trip.slug), ['spiti-valley-expedition'], 'free-text cities match the organiser\'s start location');

  const weekend = await searchTrips({ duration: 'weekend' });
  assert.ok(weekend.results.every((r) => r.trip.durationDays <= 3));
  const long = await searchTrips({ duration: '6_8' });
  assert.ok(long.results.every((r) => r.trip.durationDays >= 6 && r.trip.durationDays <= 8));

  const first = localDay(all.results.map((r) => new Date(r.departure.startDate)).sort((a, b) => a - b)[0]);
  const window = await searchTrips({ dates: { mode: 'range', from: first, to: first } });
  assert.ok(window.results.length > 0 && window.results.every((r) => localDay(r.departure.startDate) === first));

  const moods = await searchTrips({ moods: ['beaches'] });
  assert.equal(moods.results[0].trip.slug, 'goa-beach-weekend', 'soft preferences rank; they do not hide trips');
  assert.ok(moods.results.length > 1);
  assert.ok(moods.results.slice(1).some((r) => r.caveats.some((c) => /Isn't listed as a beach trip/.test(c))), 'and say honestly when a trip is not that kind of trip');
  assert.ok(!JSON.stringify(moods).match(/\d+%|score|best match/i), 'no fake match percentages');
});

test('Dates and inventory: sold-out or closed departures are never offered', async () => {
  const pkg = await TripPackage.findOne({ slug: 'nainital-lakes-weekend' }).lean();
  const deps = await TripDeparture.find({ package: pkg._id }).sort({ startDate: 1 }).lean();
  const [d1, d2] = deps;
  const day = (d) => localDay(d.startDate);
  const prefs = { departureCity: { slug: 'delhi', name: 'Delhi' }, duration: 'weekend', dates: { mode: 'range', from: day(d1), to: day(d1) } };

  const before = await searchTrips(prefs);
  assert.ok(before.results.some((r) => r.departure._id.toString() === d1._id.toString()));

  await TripDeparture.updateOne({ _id: d1._id }, { $set: { seatsAvailable: 0 } });
  const soldOut = await searchTrips(prefs);
  assert.ok(!soldOut.results.some((r) => r.trip.slug === 'nainital-lakes-weekend'), 'a full departure is not offered');
  const widen = await searchTrips({ ...prefs, dates: { mode: 'range', from: day(d1), to: day(d2) } });
  const n = widen.results.find((r) => r.trip.slug === 'nainital-lakes-weekend');
  assert.equal(n.departure._id.toString(), d2._id.toString(), 'the next departure with seats is used instead');
  assert.equal(n.departure.seatsAvailable, d2.seatsAvailable, 'seat counts come straight from inventory');

  await TripDeparture.updateOne({ _id: d1._id }, { $set: { seatsAvailable: d1.seatsAvailable, bookingDeadline: new Date(Date.now() - 86400000) } });
  const closed = await searchTrips(prefs);
  assert.ok(!closed.results.some((r) => r.trip.slug === 'nainital-lakes-weekend'), 'a passed booking deadline closes the departure');
  await TripDeparture.updateOne({ _id: d1._id }, { $set: { bookingDeadline: null } });
});

test('Empty results explain why and offer alternatives that miss exactly one thing', async () => {
  const lucknow = await searchTrips({ moods: ['mountains'], duration: 'weekend', departureCity: { slug: 'lucknow', name: 'Lucknow' } });
  assert.equal(lucknow.results.length, 0);
  assert.match(lucknow.explanation, /no listed trip departs from Lucknow, but \d+ match/);
  assert.ok(lucknow.alternatives.length > 0);
  for (const a of lucknow.alternatives) {
    assert.equal(a.relaxed, 'city');
    assert.match(a.difference, /^Departs from .+, not Lucknow, so you would need to arrange travel to .+\.$/);
    assert.equal(a.departure.availability, 'available', 'alternatives are bookable too');
  }
  assert.ok(lucknow.alternatives[0].reasons.some((r) => /mountain|Himalayas/i.test(r)), 'the most relevant alternative comes first');

  const tooCheap = await searchTrips({ maxPrice: 1000, departureCity: { slug: 'delhi', name: 'Delhi' } });
  assert.equal(tooCheap.results.length, 0);
  assert.match(tooCheap.explanation, /over ₹1,000/);
  assert.ok(tooCheap.alternatives.every((a) => a.relaxed === 'budget' && /over your budget/.test(a.difference)));
  assert.ok(tooCheap.alternatives.every((a) => a.reasons.every((r) => !/Within your budget/.test(r))), 'never claims an over-budget trip fits the budget');

  const nothing = await searchTrips({ maxPrice: 1000, departureCity: { text: 'Atlantis' }, duration: '6_8' });
  assert.equal(nothing.results.length, 0);
  assert.deepEqual(nothing.alternatives, [], 'no alternative when more than one thing is off');
  assert.ok(nothing.explanation.length > 20);
});

const fakePkg = {
  title: 'Test trip', summary: 'Two days by the river.', overview: '', highlights: ['Rafting'],
  itinerary: [{ day: 1, title: 'Arrive', description: 'Camp check-in', meals: 'Dinner', stay: 'Tents' }],
  inclusions: ['Tent stay', 'Rafting'], exclusions: [], accommodation: 'Riverside tents', transport: '', meals: 'Dinner on day 1',
  pickupInfo: 'Haridwar station at 7 AM', cancellationPolicy: 'Full refund up to 10 days before departure.', groupSize: '', currency: 'INR',
};
const fakeDeps = [{ startDate: new Date(Date.now() + 9 * 86400000), endDate: new Date(Date.now() + 10 * 86400000), price: 4999, seatsAvailable: 6, totalCapacity: 20, status: 'open' }];
const ctx = buildContext(fakePkg, fakeDeps, { businessName: 'River Folk', location: 'Rishikesh' });

test('Ask this trip without AI: listing fields only, and no inferred promises', async () => {
  assert.equal((await askTrip(ctx, 'What is not included?')).answer, NOT_CONFIRMED, 'empty exclusions are not guessed');
  assert.equal((await askTrip(ctx, 'How do we get there? Any transport?')).answer, NOT_CONFIRMED);
  assert.equal((await askTrip(ctx, 'Is it safe for solo women?')).answer, NOT_CONFIRMED, 'safety is never inferred');
  const refund = await askTrip(ctx, 'Can I get a refund if I cancel?');
  assert.equal(refund.answer, fakePkg.cancellationPolicy);
  assert.deepEqual(refund.sources.map((s) => s.key), ['cancellation']);
  assert.equal(refund.mode, 'basic');
  assert.equal(refund.aiAvailable, false);
  const seats = askBasic(ctx, 'Are seats available?');
  assert.match(seats.answer, /₹4,999 per person, 6 seats left/);
  assert.equal(seats.sources[0].anchor, 'policy', 'sources point at a section of the trip page');
});

test('Ask this trip with AI: ungrounded answers are replaced, grounded ones are kept', async () => {
  useStubAi(reply({ answered: true, answer: 'The tents are ₹3,000 extra per night.', sources: ['accommodation'] }));
  assert.equal((await askTrip(ctx, 'Is the stay extra?')).answer, NOT_CONFIRMED, 'a number not in the cited field is rejected');

  useStubAi(reply({ answered: true, answer: 'An AC tempo traveller from Delhi.', sources: ['transport'] }));
  assert.equal((await askTrip(ctx, 'How do we travel?')).answer, NOT_CONFIRMED, 'citing an empty field is rejected');

  useStubAi(reply({ answered: true, answer: 'Yes, refunds are guaranteed.', sources: ['cancellation'] }));
  assert.equal((await askTrip(ctx, 'Is my refund safe?')).answer, NOT_CONFIRMED, 'promises the listing does not make are rejected');

  useStubAi(reply({ answered: true, answer: 'Rafting.', sources: [] }));
  assert.equal((await askTrip(ctx, 'What activities?')).answer, NOT_CONFIRMED, 'uncited answers are rejected');

  useStubAi(reply({ answered: false, answer: 'Probably yes!', sources: [] }));
  assert.equal((await askTrip(ctx, 'Is there wifi?')).answer, NOT_CONFIRMED);

  useStubAi(reply({ answered: true, answer: 'A full refund up to 10 days before departure.', sources: ['cancellation'] }));
  const ok = await askTrip(ctx, 'What is the refund policy?');
  assert.equal(ok.answered, true);
  assert.equal(ok.mode, 'ai');
  assert.deepEqual(ok.sources, [{ key: 'cancellation', label: 'Cancellation policy', anchor: 'policy' }]);
});

test('Provider failures fall back gracefully: errors, invalid JSON, schema violations, timeouts, rate limits', async () => {
  const text = 'mountain weekend from Delhi under 7000';

  useStubAi(reply(null, 500));
  let r = await interpret(text, { places });
  assert.equal(r.mode, 'basic');
  assert.equal(r.aiError, 'AI_PROVIDER_ERROR');
  assert.equal(r.prefs.maxPrice, 7000, 'the rule-based reading still works');
  assert.match(r.notice, /unavailable/);

  useStubAi(reply('this is not json'));
  assert.equal((await interpret(text, { places })).aiError, 'AI_INVALID_OUTPUT');

  useStubAi(reply({ moods: ['mountains'] }));
  assert.equal((await interpret(text, { places })).aiError, 'AI_INVALID_OUTPUT', 'missing required fields fail schema validation');

  useStubAi(reply({ answered: true, answer: 'x', sources: ['made_up_field'] }));
  const bad = await askTrip(ctx, 'What is included?');
  assert.equal(bad.aiError, 'AI_INVALID_OUTPUT');
  assert.equal(bad.mode, 'basic', 'falls back to keyword answers');

  useStubAi(async () => { const e = new Error('slow'); e.name = 'TimeoutError'; throw e; });
  assert.equal((await interpret(text, { places })).aiError, 'AI_TIMEOUT');

  useStubAi(async () => ({ ok: false, status: 429, json: async () => ({ error: { message: 'slow down' } }) }));
  r = await interpret(text, { places });
  assert.equal(r.aiError, 'AI_RATE_LIMITED');
  assert.match(r.notice, /busy/);
});

test('AI interpretation is grounded: invented hard filters are dropped', async () => {
  useStubAi(reply({
    moods: ['mountains'], interests: ['trekking', 'scuba'], budget: '5k_10k', maxPrice: 3000, affordable: false, duration: null, days: 3,
    departureCity: 'Goa', destination: null, dates: { mode: 'range', from: '2026-12-01', to: '2026-12-05' }, ambiguities: [],
  }));
  const r = await interpret('a 3 day trek in the mountains from Delhi', { places });
  assert.equal(r.mode, 'ai');
  assert.equal(r.prefs.maxPrice, undefined, 'a price the user never said is dropped');
  assert.equal(r.prefs.budget, undefined, 'and so is a budget band');
  assert.equal(r.prefs.days, 3);
  assert.deepEqual(r.prefs.departureCity, { slug: 'delhi', name: 'Delhi' }, 'an invented city is replaced by the one in the text');
  assert.equal(r.prefs.dates, undefined, 'invented dates are dropped');
  assert.deepEqual(r.prefs.interests, ['trekking'], 'interests must appear in the text');
  assert.ok(r.ambiguities.some((a) => /wasn't in your words/.test(a.message)));
});

test('No API key: the whole journey still works through the API', async () => {
  assert.deepEqual((await get('/api/discover/status')).data, { ai: false });
  const i = await post('/api/discover/interpret', { text: 'Find me an affordable mountain trip for 3 days from Lucknow, preferably with trekking and camping.' });
  assert.equal(i.status, 200);
  assert.equal(i.data.mode, 'basic');
  assert.equal(i.data.aiAvailable, false);
  assert.match(i.data.summary, /mountain/);

  const s = await post('/api/discover/search', { prefs: i.data.prefs });
  assert.equal(s.status, 200);
  assert.equal(s.data.results.length, 0);
  assert.ok(s.data.alternatives.length > 0 && s.data.explanation);
  const guided = await post('/api/discover/search', { prefs: { moods: ['mountains'], budget: '5k_10k', duration: 'weekend', departureCity: { slug: 'delhi', name: 'Delhi' } } });
  assert.ok(guided.data.results.length > 0, 'guided preferences search deterministically');

  const ask = await post('/api/discover/trips/rishikesh-adventure-weekend/ask', { question: 'What is the cancellation policy?' });
  assert.equal(ask.status, 200);
  assert.equal(ask.data.answered, true);
  assert.equal(ask.data.mode, 'basic');
  assert.equal((await post('/api/discover/trips/gokarna-beach-trek-weekend/ask', { question: 'Is food included?' })).status, 404, 'drafts are not answerable publicly');
  assert.equal((await post('/api/discover/interpret', { text: 'x' })).status, 400);
  assert.equal((await post('/api/discover/trips/rishikesh-adventure-weekend/ask', { question: 'y'.repeat(301) })).status, 400);

  // Package Studio without a key keeps its honest 503.
  const studio = await fetch(`${base}/api/ai/status`);
  assert.equal(studio.status, 401, 'Studio status stays operator-only');
});

test('Rate limiter: requests over the limit get 429 with Retry-After', () => {
  const prev = process.env.RATE_LIMIT;
  delete process.env.RATE_LIMIT;
  const limit = rateLimit({ max: 2, windowMs: 60000, name: 't' });
  const run = () => {
    const out = { code: 200, headers: {} };
    const res = { set: (k, v) => { out.headers[k] = v; }, status: (c) => { out.code = c; return { json: () => out }; } };
    let passed = false;
    limit({ ip: '1.2.3.4' }, res, () => { passed = true; });
    return { ...out, passed };
  };
  assert.equal(run().passed, true);
  assert.equal(run().passed, true);
  const third = run();
  assert.equal(third.code, 429);
  assert.ok(Number(third.headers['Retry-After']) > 0);
  process.env.RATE_LIMIT = prev;
});
