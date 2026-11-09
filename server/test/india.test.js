// V0.1 data foundation tests: India content directory, package ↔ place links, related-package
// queries, confirmed-seat counters and departure availability. Uses a throwaway embedded MongoDB.
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const os = require('os');
const fs = require('fs');
const path = require('path');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ghumo-india-test-'));
process.env.MONGODB_URI = '';
process.env.EMBEDDED_DB_PATH = tmp;
process.env.JWT_SECRET = 'test-secret';
process.env.UPLOAD_DIR = path.join(tmp, 'uploads');
process.env.LOG_REQUESTS = 'false'; // keep request-log lines out of test output
delete process.env.ANTHROPIC_API_KEY;
delete process.env.OPENAI_API_KEY;
delete process.env.AI_PROVIDER;

const { connectDB, disconnectDB } = require('../src/config/db');
const { seed, DEMO_PASSWORD } = require('../src/seedData');
const { runFoundation, linkAllPackages, matchPlaces, placeIndex, backfillConfirmedSeats } = require('../src/migrations/v0_1');
const { LANDSCAPES, CITIES, PLACES } = require('../src/content/india');
const { Landscape, Place, TripPackage, TripDeparture } = require('../src/models');
const app = require('../src/app');

let server;
let base;

function client() {
  let cookie = '';
  const call = async (method, url, body) => {
    const res = await fetch(base + url, {
      method,
      headers: { 'content-type': 'application/json', ...(cookie ? { cookie } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    const set = res.headers.get('set-cookie');
    if (set) cookie = set.split(';')[0];
    const json = await res.json().catch(() => null);
    return { status: res.status, body: json, data: json && json.data };
  };
  return {
    get: (u) => call('GET', u), post: (u, b) => call('POST', u, b || {}), put: (u, b) => call('PUT', u, b),
    login: (email) => call('POST', '/api/auth/login', { email, password: DEMO_PASSWORD }),
  };
}

const slugsOf = (cards) => cards.map((c) => c.slug);
const placeId = async (slug) => (await Place.findOne({ slug }).lean())._id;

before(async () => {
  await connectDB();
  await seed();
  await runFoundation();
  server = app.listen(0);
  base = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  server?.close();
  await disconnectDB();
  fs.rmSync(tmp, { recursive: true, force: true });
});

test('Content: six landscapes and a complete ten-city directory', async () => {
  const landscapes = await Landscape.find().sort({ order: 1 }).lean();
  assert.deepEqual(landscapes.map((l) => l.slug), ['himalayas', 'rivers-valleys', 'desert', 'coast', 'northeast', 'culture-heritage']);

  const cities = await Place.find({ featured: true }).sort({ order: 1 }).lean();
  assert.deepEqual(cities.map((c) => c.name), ['Delhi', 'Jaipur', 'Varanasi', 'Mumbai', 'Bengaluru', 'Kolkata', 'Kochi', 'Guwahati', 'Srinagar', 'Lucknow']);
  const ids = new Set((await Place.find({}, '_id').lean()).map((p) => String(p._id)));
  for (const c of cities) {
    assert.equal(c.kind, 'city');
    assert.ok(c.state && c.slug && c.intro.length > 40, `${c.name}: name, state, slug, intro`);
    assert.ok(c.theme?.name && c.theme?.palette?.primary, `${c.name}: theme and palette`);
    assert.ok(c.landmarks.length >= 3, `${c.name}: at least 3 landmarks`);
    assert.ok(c.highlights.length >= 2 && c.experiences.length >= 2, `${c.name}: highlights and experiences`);
    assert.ok(c.landscapes.length >= 1, `${c.name}: landscape`);
    assert.ok(c.nearby.length >= 1 && c.nearby.every((n) => ids.has(String(n))), `${c.name}: nearby places resolve`);
    assert.ok(c.assets.length >= 1 && c.assets.every((a) => a.alt), `${c.name}: assets with alt text`);
    assert.ok(c.landmarks.every((m) => m.asset?.key), `${c.name}: landmark asset keys`);
  }
});

test('Content: no unsupported distance, travel-time, season or superlative claims', () => {
  const text = JSON.stringify({ LANDSCAPES, CITIES, PLACES });
  // Proper names such as "Tipu Sultan's Summer Palace" are allowed.
  const banned = /\b(\d+\s?(km|kms|kilomet\w*|miles?|hrs?|hours?|minutes?|mins?)|best (time|season)|monsoon|winter|summer(?![ -]palace)|oldest|largest|biggest|tallest|must[- ]visit|#1)\b/i;
  const hit = text.match(banned);
  assert.ok(!hit, `Unsupported claim in content/india.js: "${hit && text.slice(Math.max(0, hit.index - 40), hit.index + 40)}"`);
  for (const a of [...LANDSCAPES, ...CITIES, ...PLACES].flatMap((x) => x.assets || [])) {
    assert.equal(a.status, 'planned', 'assets stay planned until real artwork exists');
  }
});

test('Content: validation rejects incomplete directory cities and unknown references', async () => {
  const bad = new Place({ slug: 'x-city', name: 'X', kind: 'city', placeType: 'city', state: 'Y', featured: true });
  await assert.rejects(bad.validate(), /introduction|palette|landmarks|landscape/);
  const featuredDestination = new Place({ slug: 'x-dest', name: 'X', kind: 'destination', placeType: 'valley', state: 'Y', featured: true });
  await assert.rejects(featuredDestination.validate(), /Only cities/);
  const { upsertContent } = require('../src/migrations/v0_1');
  await assert.rejects(upsertContent({ LANDSCAPES, CITIES: [{ ...CITIES[0], slug: 'delhi', nearby: ['nowhere'] }], PLACES: [] }), /unknown nearby place/);
  await runFoundation(); // restore the real nearby links after the failed attempt
});

test('Migration is idempotent and never overwrites existing links', async () => {
  const before = { l: await Landscape.countDocuments(), p: await Place.countDocuments() };
  const manual = await TripPackage.findOne({ slug: 'nainital-lakes-weekend' });
  const varanasi = await placeId('varanasi');
  manual.destinationRefs = [varanasi]; // deliberately "wrong" manual link
  await manual.save();

  await runFoundation();
  await runFoundation();
  assert.equal(await Landscape.countDocuments(), before.l);
  assert.equal(await Place.countDocuments(), before.p);
  const again = await TripPackage.findById(manual._id).lean();
  assert.deepEqual(again.destinationRefs.map(String), [String(varanasi)], 'manual links are kept');

  manual.destinationRefs = [];
  await manual.save();
  await linkAllPackages();
  const relinked = await TripPackage.findById(manual._id).lean();
  assert.deepEqual(relinked.destinationRefs.map(String), [String(await placeId('nainital'))]);
});

test('Package links: exact name/alias matches only; places outside the directory stay unlinked', async () => {
  const get = async (slug) => TripPackage.findOne({ slug }).populate('destinationRefs', 'slug').populate('departureCityRefs', 'slug').lean();
  const s = (refs) => refs.map((r) => r.slug).sort();

  const rishikesh = await get('rishikesh-adventure-weekend');
  assert.deepEqual(s(rishikesh.destinationRefs), ['rishikesh']);
  assert.deepEqual(s(rishikesh.departureCityRefs), ['delhi']);

  const meghalaya = await get('meghalaya-explorer');
  assert.deepEqual(s(meghalaya.destinationRefs), ['shillong', 'sohra']);
  assert.deepEqual(s(meghalaya.departureCityRefs), ['guwahati']);

  const rajasthan = await get('rajasthan-cultural-journey');
  assert.deepEqual(s(rajasthan.destinationRefs), ['jaipur', 'jaisalmer', 'jodhpur']);

  const spiti = await get('spiti-valley-expedition');
  assert.deepEqual(s(spiti.departureCityRefs), ['chandigarh']);

  const bali = await get('bali-group-experience');
  assert.equal(bali.destinationRefs.length, 0, 'Bali is not in the India directory');
  assert.deepEqual(s(bali.departureCityRefs), ['mumbai']);

  // Departure cities only ever match cities, and partial words never match.
  const index = await placeIndex();
  const m = matchPlaces({ destination: 'Manaliyan hills', startLocation: 'Rishikesh' }, index);
  assert.equal(m.destinationRefs.length, 0);
  assert.equal(m.departureCityRefs.length, 0);
});

test('API: landscapes, city directory and place detail with related packages', async () => {
  const c = client();
  const landscapes = await c.get('/api/india/landscapes');
  assert.equal(landscapes.status, 200);
  assert.equal(landscapes.data.length, 6);
  const himalayas = landscapes.data.find((l) => l.slug === 'himalayas');
  assert.ok(himalayas.placeCount >= 5 && himalayas.tripCount >= 2, 'Himalaya counts come from real links');

  const desert = await c.get('/api/india/landscapes/desert');
  assert.ok(slugsOf(desert.data.trips).includes('rajasthan-cultural-journey'));
  assert.ok(desert.data.places.some((p) => p.slug === 'jaisalmer'));

  const cities = await c.get('/api/india/cities');
  assert.equal(cities.data.length, 10);
  assert.equal(cities.data[0].slug, 'delhi');
  assert.ok(cities.data[0].tripCounts.from >= 2);

  const delhi = await c.get('/api/india/places/delhi');
  assert.equal(delhi.status, 200);
  assert.ok(delhi.data.landmarks.some((m) => m.slug === 'red-fort'));
  assert.ok(delhi.data.nearby.some((n) => n.slug === 'agra'));
  assert.ok(slugsOf(delhi.data.relatedPackages.from).includes('rishikesh-adventure-weekend'));
  assert.ok(slugsOf(delhi.data.relatedPackages.nearby).includes('rishikesh-adventure-weekend'), 'trips to nearby Rishikesh');

  const rishikesh = await c.get('/api/india/places/rishikesh');
  assert.ok(slugsOf(rishikesh.data.relatedPackages.to).includes('rishikesh-adventure-weekend'));
  assert.equal(rishikesh.data.relatedPackages.from.length, 0, 'destinations have no departures-from list');

  assert.equal((await c.get('/api/india/places/atlantis')).status, 404);
  assert.equal((await c.get('/api/india/landscapes/moon')).status, 404);
});

test('API: related packages only ever show published listings from approved organisers', async () => {
  const c = client();
  const gokarna = await c.get('/api/india/places/gokarna');
  assert.equal(gokarna.data.relatedPackages.to.length, 0, 'draft from a pending organiser is hidden');

  const pkg = await TripPackage.findOne({ slug: 'rishikesh-adventure-weekend' });
  pkg.status = 'unpublished';
  await pkg.save();
  const hidden = await c.get('/api/india/places/rishikesh');
  assert.ok(!slugsOf(hidden.data.relatedPackages.to).includes('rishikesh-adventure-weekend'));
  pkg.status = 'published';
  await pkg.save();
});

test('Trip detail exposes linked places; organisers can link places with validation', async () => {
  const pub = client();
  const detail = await pub.get('/api/trips/meghalaya-explorer');
  assert.deepEqual(detail.data.places.departureCities.map((p) => p.slug), ['guwahati']);
  assert.ok(detail.data.departures.every((d) => typeof d.availability === 'string'));

  const op = client();
  await op.login('operator@ghumo.demo');
  const varanasi = String(await placeId('varanasi'));
  const rishikesh = String(await placeId('rishikesh'));

  const badCity = await op.post('/api/operator/packages', { title: 'Test trip one', departureCityRefs: [rishikesh] });
  assert.equal(badCity.status, 400, 'a destination cannot be a departure city');
  const badId = await op.post('/api/operator/packages', { title: 'Test trip two', destinationRefs: ['not-an-id'] });
  assert.equal(badId.status, 400);

  const auto = await op.post('/api/operator/packages', { title: 'Banaras by the river', destination: 'Varanasi', startLocation: 'Lucknow' });
  assert.equal(auto.status, 201);
  assert.deepEqual(auto.data.destinationRefs.map(String), [varanasi], 'linked from its own text');
  assert.deepEqual(auto.data.departureCityRefs.map(String), [String(await placeId('lucknow'))]);

  const manual = await op.post('/api/operator/packages', { title: 'Somewhere new', destination: 'A secret valley', destinationRefs: [rishikesh] });
  assert.deepEqual(manual.data.destinationRefs.map(String), [rishikesh]);
});

test('Departures: confirmedSeats follows booking transitions; availability is derived', async () => {
  const traveller = client();
  await traveller.login('traveller@ghumo.demo');
  const op = client();
  await op.login('operator@ghumo.demo');

  const trip = await traveller.get('/api/trips/nainital-lakes-weekend');
  const depId = trip.data.departures[0]._id;
  const contact = { name: 'Test Traveller', email: 'test@example.com', phone: '+91 90000 11111' };
  const book = (seats) => traveller.post('/api/bookings', {
    departureId: depId, seats, contact, travelers: Array.from({ length: seats }, (_, i) => ({ fullName: `Traveller ${i + 1}`, age: 30 })),
  });
  const dep = () => TripDeparture.findById(depId).lean();
  const start = await dep();

  const a = await book(2);
  assert.equal(a.status, 201);
  assert.equal((await dep()).confirmedSeats, 0, 'requests are not confirmations');

  assert.equal((await op.post(`/api/operator/bookings/${a.data._id}/confirm`)).status, 200);
  assert.equal((await dep()).confirmedSeats, 2);

  assert.equal((await traveller.post(`/api/bookings/${a.data._id}/cancel`, { reason: 'Plans changed' })).status, 200);
  let now = await dep();
  assert.equal(now.confirmedSeats, 0);
  assert.equal(now.seatsAvailable, start.seatsAvailable);

  const b = await book(3);
  await op.post(`/api/operator/bookings/${b.data._id}/confirm`);
  assert.equal((await dep()).confirmedSeats, 3);
  const rejected = await op.post(`/api/operator/bookings/${b.data._id}/reject`, { note: 'Group is full for this date' });
  assert.equal(rejected.status, 200);
  assert.equal(rejected.data.status, 'rejected');
  now = await dep();
  assert.equal(now.confirmedSeats, 0);
  assert.equal(now.seatsAvailable, start.seatsAvailable);

  const c = await book(1);
  await traveller.post(`/api/bookings/${c.data._id}/cancel`);
  assert.equal((await dep()).confirmedSeats, 0, 'cancelling a request leaves confirmed seats alone');

  // Recount repairs drift.
  const d = await book(4);
  await op.post(`/api/operator/bookings/${d.data._id}/confirm`);
  await TripDeparture.updateOne({ _id: depId }, { $unset: { confirmedSeats: 1 } });
  await backfillConfirmedSeats();
  assert.equal((await dep()).confirmedSeats, 4);
  assert.ok((await dep()).confirmedSeats <= now.totalCapacity - (await dep()).seatsAvailable, 'invariant holds');

  // Availability is derived from stored fields.
  await TripDeparture.updateOne({ _id: depId }, { $set: { seatsAvailable: 0 } });
  const soldOut = await traveller.get('/api/trips/nainital-lakes-weekend');
  assert.equal(soldOut.data.departures.find((x) => x._id === depId).availability, 'sold_out');
});
