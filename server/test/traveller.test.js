// V0.1 traveller journey against the real API: search, filtering, card shape, comparison data,
// saved trips and booking integration (existing booking rules, seats from live inventory).
// Uses a throwaway embedded MongoDB.
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const os = require('os');
const fs = require('fs');
const path = require('path');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ghumo-traveller-test-'));
process.env.MONGODB_URI = '';
process.env.EMBEDDED_DB_PATH = tmp;
process.env.JWT_SECRET = 'test-secret';
process.env.UPLOAD_DIR = path.join(tmp, 'uploads');
delete process.env.ANTHROPIC_API_KEY;
delete process.env.OPENAI_API_KEY;
delete process.env.AI_PROVIDER;

const { connectDB, disconnectDB } = require('../src/config/db');
const { seed, DEMO_PASSWORD } = require('../src/seedData');
const { runFoundation } = require('../src/migrations/v0_1');
const { TripPackage, TripDeparture } = require('../src/models');
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
    get: (u) => call('GET', u), post: (u, b) => call('POST', u, b || {}), put: (u, b) => call('PUT', u, b || {}), del: (u) => call('DELETE', u),
    login: (email) => call('POST', '/api/auth/login', { email, password: DEMO_PASSWORD }),
  };
}

const slugs = (r) => r.data.items.map((c) => c.slug).sort();
const travellers = (n) => Array.from({ length: n }, (_, i) => ({ fullName: `Traveller ${i + 1}`, age: 30 }));
const contact = { name: 'Test Traveller', email: 'test@example.com', phone: '+91 90000 11111' };

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

test('Search: free text, destination place, departure city and landscape filters use the real catalogue', async () => {
  const c = client();
  assert.deepEqual(slugs(await c.get('/api/trips?q=rishikesh')), ['rishikesh-adventure-weekend']);
  assert.deepEqual(slugs(await c.get('/api/trips?place=sohra')), ['meghalaya-explorer'], 'alias-linked destination');
  assert.deepEqual(slugs(await c.get('/api/trips?place=guwahati')), ['meghalaya-explorer'], 'place also matches departure city');
  assert.deepEqual(slugs(await c.get('/api/trips?departureCity=delhi')), ['manali-kasol-escape', 'nainital-lakes-weekend', 'rishikesh-adventure-weekend', 'vietnam-hanoi-ha-long-bay']);
  assert.deepEqual(slugs(await c.get('/api/trips?landscape=desert')), ['rajasthan-cultural-journey']);
  assert.deepEqual(slugs(await c.get('/api/trips?landscape=desert,coast')), ['goa-beach-weekend', 'rajasthan-cultural-journey'], 'comma list = any of');
  assert.equal((await c.get('/api/trips?place=atlantis')).data.total, 0, 'unknown place gives an empty result, not everything');
  assert.equal((await c.get('/api/trips?departureCity=rishikesh')).data.total, 0, 'a destination is never a departure city');
  assert.equal((await c.get('/api/trips?q=gokarna')).data.total, 0, 'drafts from pending organisers never appear');
});

test('Filtering: category, price, duration, month, open seats and sorting', async () => {
  const c = client();
  const beach = await c.get('/api/trips?category=beach');
  assert.ok(beach.data.items.every((t) => t.categories.includes('beach')));
  const cheap = await c.get('/api/trips?maxPrice=7000');
  assert.ok(cheap.data.items.length > 0 && cheap.data.items.every((t) => t.priceFrom <= 7000));
  const short = await c.get('/api/trips?maxDays=3');
  assert.ok(short.data.items.every((t) => t.durationDays <= 3));
  const combo = await c.get('/api/trips?landscape=himalayas&maxDays=3&departureCity=delhi');
  assert.deepEqual(slugs(combo), ['nainital-lakes-weekend', 'rishikesh-adventure-weekend']);

  // Month = the server's existing date range; only departures with seats in that window count.
  const dep = await TripDeparture.findOne({ status: 'open' }).sort({ startDate: 1 }).lean();
  const m = dep.startDate.toISOString().slice(0, 7);
  const [y, mo] = m.split('-').map(Number);
  const last = new Date(Date.UTC(y, mo, 0)).getUTCDate();
  const inMonth = await c.get(`/api/trips?from=${m}-01&to=${m}-${last}`);
  assert.ok(inMonth.data.items.length > 0);
  assert.ok(inMonth.data.items.every((t) => t.nextDeparture.startDate.slice(0, 7) === m));

  const asc = (await c.get('/api/trips?sort=price_asc')).data.items.map((t) => t.priceFrom);
  assert.deepEqual(asc, [...asc].sort((a, b) => a - b));
  const open = await c.get('/api/trips?available=true');
  assert.ok(open.data.items.every((t) => t.nextDeparture && t.nextDeparture.isBookable));
});

test('Cards: what a traveller needs to decide, honest labels, no private data', async () => {
  const c = client();
  const { data } = await c.get('/api/trips?q=meghalaya');
  const card = data.items[0];
  assert.equal(card.isDemo, true, 'seeded listings are marked demo');
  assert.ok(card.coverImage && card.operator.businessName && card.durationDays && card.priceFrom != null);
  assert.deepEqual(card.places.departureCities.map((p) => p.slug), ['guwahati']);
  assert.deepEqual(card.places.destinations.map((p) => p.slug).sort(), ['shillong', 'sohra']);
  assert.ok(card.landscapes.includes('northeast'));
  assert.equal(card.nextDeparture.availability, 'available');
  assert.equal(typeof card.nextDeparture.seatsAvailable, 'number');
  assert.equal(card.operator.verified, false, 'no seeded organiser is verified');
  for (const k of ['contactPhone', 'contactEmail', 'owner']) assert.equal(card.operator[k], undefined, `card hides operator ${k}`);
  assert.equal(card.nextDeparture.confirmedSeats, undefined, 'booking counts are not exposed publicly');

  const meta = await c.get('/api/trips/meta');
  const delhi = meta.data.places.departureCities.find((p) => p.slug === 'delhi');
  assert.equal(delhi.tripCount, 4);
  assert.ok(meta.data.landscapes.includes('himalayas'));
});

test('Comparison data: every compared field comes from the listing; missing stays missing', async () => {
  const op = client();
  await op.login('operator@ghumo.demo');
  const created = await op.post('/api/operator/packages', {
    title: 'Agra day trip test', destination: 'Agra', startLocation: 'Delhi', durationDays: 1, basePrice: 2500,
    coverImage: 'https://images.unsplash.com/photo-1548013146-72479768bada', overview: 'A day at the Taj Mahal.',
    itinerary: [{ title: 'Taj Mahal and Agra Fort' }], inclusions: ['AC transport'], cancellationPolicy: 'No refunds within 3 days.',
  });
  assert.equal(created.status, 201);
  const start = new Date(Date.now() + 15 * 86400000);
  await op.post(`/api/operator/packages/${created.data._id}/departures`, { startDate: start, endDate: start, totalCapacity: 12 });
  assert.equal((await op.post(`/api/operator/packages/${created.data._id}/publish`)).status, 200);

  const pub = client();
  const trips = await Promise.all(['agra-day-trip-test', 'rishikesh-adventure-weekend', 'spiti-valley-expedition'].map((s) => pub.get(`/api/trips/${s}`)));
  for (const t of trips) {
    assert.equal(t.status, 200);
    for (const k of ['priceFrom', 'departures', 'durationDays', 'places', 'accommodation', 'transport', 'meals', 'inclusions', 'exclusions', 'cancellationPolicy', 'operator']) {
      assert.ok(k in t.data, `${t.data.slug} exposes ${k}`);
    }
    assert.ok(t.data.departures.every((d) => typeof d.availability === 'string'));
  }
  const agra = trips[0].data;
  assert.equal(agra.isDemo, false, 'a real organiser listing is not marked demo');
  assert.equal(agra.transport, '', 'unstated transport is empty, never invented');
  assert.equal(agra.meals, '');
  assert.deepEqual(agra.exclusions, []);
  assert.deepEqual(agra.places.departureCities.map((p) => p.slug), ['delhi'], 'auto-linked from its own text');
  assert.deepEqual(agra.places.destinations.map((p) => p.slug), ['agra']);
  assert.equal(agra.priceFrom, 2500);
  assert.ok(agra.operator.businessName && 'verified' in agra.operator && 'location' in agra.operator);

  // Unpublished trips drop out of comparison (404) instead of showing stale data.
  await op.post(`/api/operator/packages/${created.data._id}/unpublish`);
  assert.equal((await pub.get('/api/trips/agra-day-trip-test')).status, 404);
});

test('Saved trips: travellers only, idempotent, and unpublished trips drop out', async () => {
  const guest = client();
  assert.equal((await guest.put('/api/saved/goa-beach-weekend')).status, 401);
  const op = client();
  await op.login('operator@ghumo.demo');
  assert.equal((await op.get('/api/saved')).status, 403);

  const t = client();
  await t.login('traveller@ghumo.demo');
  assert.deepEqual((await t.get('/api/saved')).data.items, []);
  assert.equal((await t.put('/api/saved/goa-beach-weekend')).status, 200);
  assert.equal((await t.put('/api/saved/goa-beach-weekend')).status, 200, 'saving twice is fine');
  assert.equal((await t.put('/api/saved/meghalaya-explorer')).status, 200);
  assert.equal((await t.put('/api/saved/gokarna-beach-trek-weekend')).status, 404, 'drafts cannot be saved');
  let saved = await t.get('/api/saved');
  assert.deepEqual(saved.data.slugs, ['meghalaya-explorer', 'goa-beach-weekend'], 'newest first, no duplicates');
  assert.ok(saved.data.items[0].places, 'saved items are full cards');

  await TripPackage.updateOne({ slug: 'goa-beach-weekend' }, { $set: { status: 'unpublished' } });
  saved = await t.get('/api/saved');
  assert.deepEqual(saved.data.slugs, ['meghalaya-explorer']);
  assert.equal(saved.data.unavailable, 1, 'the traveller is told one saved trip is no longer listed');
  await TripPackage.updateOne({ slug: 'goa-beach-weekend' }, { $set: { status: 'published' } });

  assert.equal((await t.del('/api/saved/meghalaya-explorer')).status, 200);
  assert.equal((await t.del('/api/saved/meghalaya-explorer')).status, 200, 'removing twice is fine');
  assert.deepEqual((await t.get('/api/saved')).data.slugs, ['goa-beach-weekend']);
});

test('Booking integration: the journey uses the existing booking request, seats and rules', async () => {
  const pub = client();
  const detail = (await pub.get('/api/trips/nainital-lakes-weekend')).data;
  const dep = detail.departures.find((d) => d.availability === 'available');
  const capacity = dep.seatsAvailable;
  const book = (cl, seats, departureId = dep._id) => cl.post('/api/bookings', { departureId, seats, contact, travelers: travellers(seats) });

  // Role and auth rules are the server's, unchanged.
  assert.equal((await book(pub, 1)).status, 401);
  const op = client();
  await op.login('operator@ghumo.demo');
  assert.equal((await book(op, 1)).status, 403);

  const t = client();
  await t.login('traveller@ghumo.demo');
  const first = await book(t, 2);
  assert.equal(first.status, 201);
  assert.equal(first.data.status, 'requested', 'a booking starts as a request');
  assert.equal(first.data.pricePerSeat, dep.price);
  assert.equal(first.data.totalAmount, dep.price * 2);

  // Inventory the traveller sees updates immediately (held seats).
  const after = (await pub.get('/api/trips/nainital-lakes-weekend')).data.departures.find((d) => d._id === dep._id);
  assert.equal(after.seatsAvailable, capacity - 2);
  const mine = await t.get('/api/bookings/mine');
  assert.ok(mine.data.some((b) => b._id === first.data._id && b.status === 'requested'));

  // Validation and over-booking rules still apply.
  assert.equal((await t.post('/api/bookings', { departureId: dep._id, seats: 2, contact, travelers: travellers(1) })).status, 400, 'traveller count must match seats');
  assert.equal((await book(t, 11)).status, 400, 'max 10 seats per booking');
  let left = capacity - 2;
  while (left > 0) {
    const n = Math.min(10, left);
    assert.equal((await book(t, n)).status, 201);
    left -= n;
  }
  assert.equal((await book(t, 1)).status, 409, 'cannot book a full departure');

  // Availability is derived from the real inventory everywhere the traveller looks.
  const full = (await pub.get('/api/trips/nainital-lakes-weekend')).data;
  assert.equal(full.departures.find((d) => d._id === dep._id).availability, 'sold_out');
  const card = (await pub.get('/api/trips?q=nainital')).data.items[0];
  assert.notEqual(card.nextDeparture?._id, dep._id, 'the card moves on to the next departure with seats');

  // Cancelling releases seats and the departure is bookable again.
  assert.equal((await t.post(`/api/bookings/${first.data._id}/cancel`, { reason: 'Plans changed' })).status, 200);
  const reopened = (await pub.get('/api/trips/nainital-lakes-weekend')).data.departures.find((d) => d._id === dep._id);
  assert.equal(reopened.seatsAvailable, 2);
  assert.equal(reopened.availability, 'available');
});
