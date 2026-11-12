// End-to-end API acceptance tests. Run: npm test (from server/)
// Uses a throwaway embedded MongoDB, never your real database.
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const os = require('os');
const fs = require('fs');
const path = require('path');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ghumo-test-'));
process.env.MONGODB_URI = '';
process.env.EMBEDDED_DB_PATH = tmp;
process.env.JWT_SECRET = 'test-secret';
process.env.UPLOAD_DIR = path.join(tmp, 'uploads');
delete process.env.ANTHROPIC_API_KEY;
delete process.env.OPENAI_API_KEY;
delete process.env.AI_PROVIDER;

const { connectDB, disconnectDB } = require('../src/config/db');
const { seed, DEMO_PASSWORD } = require('../src/seedData');
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
    const text = await res.text();
    let json; try { json = JSON.parse(text); } catch { json = text; }
    return { status: res.status, body: json, data: json && json.data };
  };
  return {
    get: (u) => call('GET', u), post: (u, b) => call('POST', u, b || {}), put: (u, b) => call('PUT', u, b), del: (u) => call('DELETE', u),
    login: (email) => call('POST', '/api/auth/login', { email, password: DEMO_PASSWORD }),
  };
}

const travellers = (n) => Array.from({ length: n }, (_, i) => ({ fullName: `Test Traveller ${i + 1}`, age: 25 + i }));
const contact = { name: 'Test Traveller', email: 'test@example.com', phone: '+91 90000 11111' };

before(async () => {
  await connectDB();
  await seed();
  server = app.listen(0);
  base = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  server?.close();
  await disconnectDB();
  fs.rmSync(tmp, { recursive: true, force: true });
});

test('T1/T2: lists and filters published trips', async () => {
  const c = client();
  const all = await c.get('/api/trips');
  assert.equal(all.status, 200);
  assert.ok(all.data.total >= 9, 'seeded trips are listed');
  assert.ok(all.data.items.every((t) => t.operator && t.slug), 'cards include operator and slug');
  assert.ok(!all.data.items.some((t) => t.slug === 'gokarna-beach-trek-weekend'), 'drafts and pending operators are hidden');

  const weekend = await c.get('/api/trips?category=weekend');
  assert.ok(weekend.data.items.length >= 3 && weekend.data.items.every((t) => t.categories.includes('weekend')));

  const cheap = await c.get('/api/trips?maxPrice=8000');
  assert.ok(cheap.data.items.length > 0 && cheap.data.items.every((t) => t.priceFrom <= 8000));

  const intl = await c.get('/api/trips?q=bali');
  assert.equal(intl.data.items[0].slug, 'bali-group-experience');

  const asc = await c.get('/api/trips?sort=price_asc');
  const prices = asc.data.items.map((t) => t.priceFrom);
  assert.deepEqual(prices, [...prices].sort((a, b) => a - b));

  const city = await c.get('/api/trips?city=Chandigarh');
  assert.ok(city.data.items.every((t) => t.startLocation === 'Chandigarh'));
});

test('T3: trip detail includes departures, operator, policies', async () => {
  const d = await client().get('/api/trips/manali-kasol-escape');
  assert.equal(d.status, 200);
  assert.ok(d.data.departures.length >= 3);
  assert.ok(d.data.itinerary.length === 5);
  assert.ok(d.data.cancellationPolicy && d.data.exclusions.length);
  assert.equal(d.data.operator.verified, false, 'seeded operators are not marked verified');
  assert.equal(d.data.reviews.count, 0, 'no fabricated reviews');
  const missing = await client().get('/api/trips/does-not-exist');
  assert.equal(missing.status, 404);
});

test('T4–T6, T9: booking request is persisted, held, visible to operator, and confirmed', async () => {
  const trav = client();
  await trav.login('traveller@ghumo.demo');
  const trip = (await trav.get('/api/trips/manali-kasol-escape')).data;
  const dep = trip.departures.find((x) => x.isBookable);

  const res = await trav.post('/api/bookings', { departureId: dep._id, seats: 2, travelers: travellers(2), contact });
  assert.equal(res.status, 201, JSON.stringify(res.body));
  assert.match(res.data.reference, /^GHM-[A-Z0-9]{6}$/);
  assert.equal(res.data.status, 'requested');
  assert.equal(res.data.totalAmount, dep.price * 2);

  const after1 = (await trav.get('/api/trips/manali-kasol-escape')).data.departures.find((x) => x._id === dep._id);
  assert.equal(after1.seatsAvailable, dep.seatsAvailable - 2, 'seats are held');

  const mine = await trav.get('/api/bookings/mine');
  assert.ok(mine.data.some((b) => b._id === res.data._id));

  const board = await trav.get(`/api/bookings/${res.data._id}/announcements`);
  assert.equal(board.data.locked, true, 'trip board locked until confirmed');

  const op = client();
  await op.login('operator@ghumo.demo');
  const list = await op.get('/api/operator/bookings?status=requested');
  assert.ok(list.data.some((b) => b.reference === res.data.reference), 'operator sees the reservation');
  const stats = await op.get('/api/operator/stats');
  assert.ok(stats.data.pendingRequests >= 1);
  assert.deepEqual(stats.data.recordedPayments, [], 'no revenue invented');

  const conf = await op.post(`/api/operator/bookings/${res.data._id}/confirm`, {});
  assert.equal(conf.data.status, 'confirmed');
  const again = await op.post(`/api/operator/bookings/${res.data._id}/confirm`, {});
  assert.equal(again.status, 409, 'cannot confirm twice');

  await op.post(`/api/operator/departures/${dep._id}/announcements`, { title: 'Pickup pin', body: 'Gate 2, 6:30 PM', kind: 'pickup' });
  const board2 = await trav.get(`/api/bookings/${res.data._id}/announcements`);
  assert.equal(board2.data.locked, false);
  assert.equal(board2.data.items[0].title, 'Pickup pin');

  const pay = await op.post(`/api/operator/bookings/${res.data._id}/payments`, { amount: 1000, method: 'upi' });
  assert.equal(pay.status, 201);
  const stats2 = await op.get('/api/operator/stats');
  assert.equal(stats2.data.recordedPayments[0].total, 1000, 'revenue only from recorded payments');
  const over = await op.post(`/api/operator/bookings/${res.data._id}/payments`, { amount: dep.price * 5, method: 'upi' });
  assert.equal(over.status, 400, 'cannot record more than booking total');
});

test('T7/T8/T9: operator creates package, adds departure, publishes; availability updates', async () => {
  const op = client();
  await op.login('operator@ghumo.demo');
  const created = await op.post('/api/operator/packages', { title: 'Kedarkantha Winter Trek', destination: 'Kedarkantha', durationDays: 6, durationNights: 5, basePrice: 9999 });
  assert.equal(created.status, 201);
  const id = created.data._id;

  const blocked = await op.post(`/api/operator/packages/${id}/publish`);
  assert.equal(blocked.status, 400, 'incomplete package cannot be published');
  assert.ok(blocked.body.details.blockers.includes('At least one departure'));

  await op.put(`/api/operator/packages/${id}`, {
    coverImage: 'https://images.unsplash.com/photo-1454496522488-7a8e488e8606?w=1600', overview: 'A classic winter summit trek.',
    itinerary: [{ title: 'Dehradun to Sankri' }, { title: 'Trek to Juda ka Talab' }], inclusions: ['Camping'], cancellationPolicy: 'Full refund 15 days prior.',
    categories: ['trek', 'mountains'],
  });
  const start = new Date(Date.now() + 20 * 86400000);
  const end = new Date(start.getTime() + 5 * 86400000);
  const dep = await op.post(`/api/operator/packages/${id}/departures`, { startDate: start, endDate: end, totalCapacity: 3 });
  assert.equal(dep.status, 201);
  assert.equal(dep.data.price, 9999, 'price defaults to base price');
  assert.equal(dep.data.seatsAvailable, 3);

  const badDep = await op.post(`/api/operator/packages/${id}/departures`, { startDate: end, endDate: start, totalCapacity: 3 });
  assert.equal(badDep.status, 400, 'return before departure rejected');

  const pub = await op.post(`/api/operator/packages/${id}/publish`);
  assert.equal(pub.status, 200, JSON.stringify(pub.body));
  const detail = await client().get(`/api/trips/${created.data.slug}`);
  assert.equal(detail.status, 200);
  assert.equal(detail.data.departures[0].seatsAvailable, 3);
});

test('T10: nobody can reserve more seats than available, even concurrently', async () => {
  const op = client();
  await op.login('operator@ghumo.demo');
  const pkgs = await op.get('/api/operator/packages');
  const kedar = pkgs.data.find((p) => p.title === 'Kedarkantha Winter Trek');
  const full = await op.get(`/api/operator/packages/${kedar._id}`);
  const depId = full.data.departures[0]._id;

  const trav = client();
  await trav.login('traveller@ghumo.demo');
  const tooMany = await trav.post('/api/bookings', { departureId: depId, seats: 4, travelers: travellers(4), contact });
  assert.equal(tooMany.status, 409);

  // 6 concurrent single-seat requests against 3 seats: exactly 3 succeed.
  const results = await Promise.all(Array.from({ length: 6 }, () => trav.post('/api/bookings', { departureId: depId, seats: 1, travelers: travellers(1), contact })));
  const ok = results.filter((r) => r.status === 201);
  assert.equal(ok.length, 3, `expected 3 successes, got ${results.map((r) => r.status)}`);
  assert.ok(results.filter((r) => r.status !== 201).every((r) => r.status === 409));
  const after1 = await client().get(`/api/trips/${kedar.slug}`);
  assert.equal(after1.data.departures[0].seatsAvailable, 0);

  // Rejecting a booking releases its seat.
  const rej = await op.post(`/api/operator/bookings/${ok[0].data._id}/reject`, { note: 'Group full on our side' });
  assert.equal(rej.data.status, 'rejected');
  const after2 = await client().get(`/api/trips/${kedar.slug}`);
  assert.equal(after2.data.departures[0].seatsAvailable, 1);

  // Traveller cancellation releases seats too.
  const can = await trav.post(`/api/bookings/${ok[1].data._id}/cancel`, {});
  assert.equal(can.data.status, 'cancelled');
  const after3 = await client().get(`/api/trips/${kedar.slug}`);
  assert.equal(after3.data.departures[0].seatsAvailable, 2);

  // Capacity cannot drop below seats already held.
  const shrink = await op.put(`/api/operator/departures/${depId}`, { totalCapacity: 0 });
  assert.equal(shrink.status, 400);
});

test('Access control: ownership and roles are enforced server-side', async () => {
  const trav = client();
  await trav.login('traveller@ghumo.demo');
  const mine = await trav.get('/api/bookings/mine');
  const bookingId = mine.data[0]._id;

  const other = client();
  await other.post('/api/auth/register', { name: 'Other Person', email: 'other@example.com', password: 'password123' });
  assert.equal((await other.get(`/api/bookings/${bookingId}`)).status, 404, 'other travellers cannot see a booking');
  assert.equal((await other.get(`/api/bookings/${bookingId}/announcements`)).status, 404);
  assert.equal((await other.get('/api/operator/bookings')).status, 403);
  assert.equal((await other.get('/api/admin/stats')).status, 403);

  const otherOp = client();
  await otherOp.login('altitude@ghumo.demo');
  const ob = await otherOp.get('/api/operator/bookings');
  assert.ok(!ob.data.some((b) => b._id === bookingId), "operators only see their own bookings");
  assert.equal((await otherOp.post(`/api/operator/bookings/${bookingId}/confirm`)).status, 404);

  const anon = client();
  assert.equal((await anon.post('/api/bookings', {})).status, 401);
  const me = await anon.get('/api/auth/me');
  assert.equal(me.status, 200);
  assert.equal(me.data, null);

  const adminReg = await client().post('/api/auth/register', { name: 'Sneaky', email: 'sneaky@example.com', password: 'password123', role: 'admin' });
  assert.equal(adminReg.data.role, 'traveler', 'cannot self-register as admin');
});

test('Admin: approval workflow and moderation', async () => {
  const admin = client();
  await admin.login('admin@ghumo.demo');
  const pending = await admin.get('/api/admin/operators?status=pending');
  const coastal = pending.data.find((o) => o.businessName === 'Coastal Weekenders');
  assert.ok(coastal);

  const pendingOp = client();
  await pendingOp.login('newoperator@ghumo.demo');
  const pkgs = await pendingOp.get('/api/operator/packages');
  const pub = await pendingOp.post(`/api/operator/packages/${pkgs.data[0]._id}/publish`);
  assert.equal(pub.status, 403, 'pending operators cannot publish');

  const rej = await admin.post(`/api/admin/operators/${coastal._id}/reject`, {});
  assert.equal(rej.status, 400, 'rejection requires a reason');
  const appr = await admin.post(`/api/admin/operators/${coastal._id}/approve`, {});
  assert.equal(appr.data.status, 'approved');

  const ops = await admin.get('/api/admin/operators');
  const pahadi = ops.data.find((o) => o.businessName === 'Wandering Pahadi Co.');
  assert.equal(pahadi.verification.status, 'submitted');
  await admin.post(`/api/admin/operators/${pahadi._id}/verification`, { decision: 'verified' });
  const detail = await client().get('/api/trips/manali-kasol-escape');
  assert.equal(detail.data.operator.verified, true, 'verified badge only after admin review');

  const bali = (await admin.get('/api/admin/packages?q=Bali')).data[0];
  await admin.post(`/api/admin/packages/${bali._id}/remove`, { reason: 'Misleading pricing' });
  assert.equal((await client().get('/api/trips/bali-group-experience')).status, 404, 'removed listing is hidden');
  await admin.post(`/api/admin/packages/${bali._id}/restore`);

  const trav = client();
  await trav.login('traveller@ghumo.demo');
  const rep = await trav.post('/api/reports', { targetType: 'package', targetId: bali._id, reason: 'pricing', details: 'test' });
  assert.equal(rep.status, 201);
  const reports = await admin.get('/api/admin/reports?status=open');
  assert.ok(reports.data.some((r) => r.target && r.target.title.includes('Bali')));
});

test('T11: AI Package Studio is honest when no key is configured, and grounds numbers', async () => {
  const op = client();
  await op.login('operator@ghumo.demo');
  const s = await op.get('/api/ai/status');
  assert.equal(s.data.configured, false);
  const r = await op.post('/api/ai/extract-package', { text: 'Manali Kasol trip, 5 days 4 nights, 7999 per person, Delhi to Delhi Volvo, 2 nights hotel' });
  assert.equal(r.status, 503);
  assert.equal(r.body.details.code, 'AI_NOT_CONFIGURED');

  // normalise() never keeps numbers that aren't in the source text.
  const { normalise } = require('../src/services/ai');
  const text = 'Manali Kasol trip, 5 days 4 nights, 7999 per person, Delhi to Delhi Volvo, 2 nights hotel, breakfast, dinner, bonfire';
  const out = normalise({ title: 'Manali & Kasol', destination: 'Manali', price: 8999, capacity: 20, durationDays: 5, durationNights: 4, departureDates: [], itinerary: [], inclusions: ['Breakfast'], exclusions: [], warnings: [] }, text);
  assert.equal(out.draft.basePrice, null, 'hallucinated price cleared');
  assert.equal(out.draft.capacity, null, 'hallucinated capacity cleared');
  assert.ok(out.missing.includes('Seat capacity') && out.missing.includes('Cancellation policy'));
  const ok = normalise({ price: 7999, departureDates: [], itinerary: [], inclusions: [], exclusions: [], warnings: [] }, text);
  assert.equal(ok.draft.basePrice, 7999);
});

test('Sign-in is protected against password guessing without blocking normal use', async () => {
  const email = `guess-${Date.now()}@ghumo.test`;
  const owner = client();
  assert.equal((await owner.post('/api/auth/register', { name: 'Guess Target', email, password: 'right-password-1' })).status, 201);
  // Successful sign-ins never count towards the limit.
  for (let i = 0; i < 12; i += 1) assert.equal((await client().post('/api/auth/login', { email, password: 'right-password-1' })).status, 200);
  const attacker = client();
  for (let i = 0; i < 10; i += 1) assert.equal((await attacker.post('/api/auth/login', { email, password: `wrong-${i}` })).status, 401);
  const blocked = await attacker.post('/api/auth/login', { email, password: 'right-password-1' });
  assert.equal(blocked.status, 429, 'locked after 10 failures, even with the right password');
  // Other accounts are unaffected.
  assert.equal((await client().post('/api/auth/login', { email: 'traveller@ghumo.demo', password: DEMO_PASSWORD })).status, 200);
});
