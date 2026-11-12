// Organiser journey: onboarding permissions, verification badge rules, package ownership
// (incl. duplicate/archive), departure management, booking access, insights and activity.
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const os = require('os');
const fs = require('fs');
const path = require('path');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ghumo-organiser-test-'));
process.env.MONGODB_URI = '';
process.env.EMBEDDED_DB_PATH = tmp;
process.env.JWT_SECRET = 'test-secret';
process.env.UPLOAD_DIR = path.join(tmp, 'uploads');
process.env.RATE_LIMIT = 'off';
for (const k of ['ANTHROPIC_API_KEY', 'OPENAI_API_KEY', 'AI_PROVIDER']) delete process.env[k];

const { connectDB, disconnectDB } = require('../src/config/db');
const { seed, DEMO_PASSWORD } = require('../src/seedData');
const { runFoundation } = require('../src/migrations/v0_1');
const { TripPackage } = require('../src/models');
const app = require('../src/app');

let server;
let base;

function client(ua) {
  let cookie = '';
  const call = async (method, url, body) => {
    const res = await fetch(base + url, {
      method,
      headers: { 'content-type': 'application/json', ...(cookie ? { cookie } : {}), ...(ua ? { 'user-agent': ua } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    const set = res.headers.get('set-cookie');
    if (set) cookie = set.split(';')[0];
    const text = await res.text();
    let json; try { json = JSON.parse(text); } catch { json = text; }
    return { status: res.status, body: json, data: json && json.data, text };
  };
  return {
    get: (u) => call('GET', u), post: (u, b) => call('POST', u, b || {}), put: (u, b) => call('PUT', u, b), del: (u) => call('DELETE', u),
    login: (email) => call('POST', '/api/auth/login', { email, password: DEMO_PASSWORD }),
  };
}

const PROFILE = {
  businessName: 'Monsoon Trails', organiserType: 'independent', description: 'Small-group monsoon treks in the Western Ghats, run by two trek leaders since 2021.',
  contactEmail: 'hello@monsoontrails.test', contactPhone: '+91 98765 43210', location: 'Pune, Maharashtra', instagram: '@monsoontrails',
};
const contact = { name: 'Test Traveller', email: 'test@example.com', phone: '+91 90000 11111' };
const inDays = (n) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);

let opA; let opB; let traveller; let admin; let pkgId; let depId;

before(async () => {
  await connectDB();
  await seed();
  await runFoundation();
  server = app.listen(0);
  base = `http://127.0.0.1:${server.address().port}`;
  opA = client(); await opA.login('operator@ghumo.demo');
  opB = client(); await opB.login('altitude@ghumo.demo');
  traveller = client(); await traveller.login('traveller@ghumo.demo');
  admin = client(); await admin.login('admin@ghumo.demo');
});

after(async () => {
  server?.close();
  await disconnectDB();
  fs.rmSync(tmp, { recursive: true, force: true });
});

test('Onboarding: roles, required details, one profile per account, publishing waits for approval', async () => {
  assert.equal((await traveller.post('/api/operator/profile', PROFILE)).status, 403, 'travellers cannot become organisers through this route');

  const fresh = client();
  const reg = await fresh.post('/api/auth/register', { name: 'Asha Kulkarni', email: 'asha@monsoontrails.test', password: 'trail-pass-2026', role: 'operator' });
  assert.equal(reg.status, 201);
  assert.equal(reg.data.operator, null, 'no business profile yet');
  const blocked = await fresh.get('/api/operator/packages');
  assert.equal(blocked.status, 409);
  assert.equal(blocked.body.code, 'ONBOARDING_REQUIRED');

  assert.equal((await fresh.post('/api/operator/profile', { ...PROFILE, organiserType: undefined })).status, 400, 'organiser type is required');
  assert.equal((await fresh.post('/api/operator/profile', { ...PROFILE, organiserType: 'pirate' })).status, 400);
  assert.equal((await fresh.post('/api/operator/profile', { ...PROFILE, description: 'Too short' })).status, 400);
  const created = await fresh.post('/api/operator/profile', PROFILE);
  assert.equal(created.status, 201);
  assert.equal(created.data.status, 'pending');
  assert.equal(created.data.organiserType, 'independent');
  assert.equal((await fresh.post('/api/operator/profile', PROFILE)).status, 409, 'one profile per account');
  assert.equal((await fresh.put('/api/operator/profile', { organiserType: 'nope' })).status, 400);

  // Pending organisers can prepare drafts but not publish.
  const draft = await fresh.post('/api/operator/packages', { title: 'Rajmachi monsoon trek', destination: 'Lonavala', startLocation: 'Pune' });
  assert.equal(draft.status, 201);
  assert.equal((await fresh.post(`/api/operator/packages/${draft.data._id}/publish`)).status, 403);

  // Verification is shown honestly: a reviewed submission alone never shows the badge.
  const v = await fresh.post('/api/operator/verification', { registrationType: 'msme', registrationNumber: 'UDYAM-MH-26-0001234' });
  assert.equal(v.status, 201);
  const ops = await admin.get('/api/admin/operators?status=pending');
  const mine = ops.data.find((o) => o.businessName === 'Monsoon Trails');
  assert.equal((await admin.post(`/api/admin/operators/${mine._id}/verification`, { decision: 'verified' })).status, 200);
  assert.equal((await fresh.get('/api/auth/me')).data.operator.verified, false, 'no verified badge before approval');
  assert.equal((await admin.post(`/api/admin/operators/${mine._id}/approve`)).status, 200);
  assert.equal((await fresh.get('/api/auth/me')).data.operator.verified, true, 'badge appears once approved and verified');
  const pub = await client().get(`/api/organisers/${created.data.slug}`);
  assert.equal(pub.data.verified, true);
});

test('Package ownership: other organisers can neither see nor change your packages', async () => {
  const created = await opA.post('/api/operator/packages', {
    title: 'Chopta Tungnath weekend', destination: 'Chopta', startLocation: 'Delhi', durationDays: 3, durationNights: 2, basePrice: 6999,
    coverImage: 'https://images.unsplash.com/photo-1626621341517-bbf3d9990a23', overview: 'A short Himalayan trek to Tungnath and Chandrashila.',
    itinerary: [{ title: 'Drive to Chopta' }, { title: 'Tungnath and Chandrashila' }, { title: 'Return' }], inclusions: ['Stay', 'Meals'], exclusions: ['Personal expenses'],
    cancellationPolicy: 'Full refund up to 10 days before departure.',
  });
  assert.equal(created.status, 201);
  pkgId = created.data._id;
  for (const [m, u] of [['get', `/api/operator/packages/${pkgId}`], ['put', `/api/operator/packages/${pkgId}`], ['post', `/api/operator/packages/${pkgId}/publish`], ['post', `/api/operator/packages/${pkgId}/archive`], ['post', `/api/operator/packages/${pkgId}/duplicate`], ['del', `/api/operator/packages/${pkgId}`], ['post', `/api/operator/packages/${pkgId}/departures`]]) {
    const r = await opB[m](u, { title: 'Hijacked', startDate: inDays(20), endDate: inDays(22), totalCapacity: 10 });
    assert.equal(r.status, 404, `${m.toUpperCase()} ${u} by another organiser`);
  }
  assert.equal((await traveller.get(`/api/operator/packages/${pkgId}`)).status, 403);
  assert.ok(!(await opB.get('/api/operator/packages')).data.some((p) => p._id === pkgId));
  assert.equal((await TripPackage.findById(pkgId).lean()).title, 'Chopta Tungnath weekend', 'nothing changed');
});

test('Departures: several per package, real inventory, protected edits', async () => {
  const d1 = await opA.post(`/api/operator/packages/${pkgId}/departures`, { startDate: inDays(20), endDate: inDays(22), totalCapacity: 6, price: 6999, pickupPoint: 'Kashmere Gate ISBT', reportingTime: '9:00 PM' });
  const d2 = await opA.post(`/api/operator/packages/${pkgId}/departures`, { startDate: inDays(34), endDate: inDays(36), totalCapacity: 12 });
  assert.equal(d1.status, 201);
  assert.equal(d2.status, 201);
  assert.equal(d2.data.price, 6999, 'price defaults to the package price');
  assert.equal(d1.data.seatsAvailable, 6);
  depId = d1.data._id;
  assert.equal((await opA.post(`/api/operator/packages/${pkgId}/departures`, { startDate: inDays(-2), endDate: inDays(0), totalCapacity: 6 })).status, 400, 'no past departures');
  assert.equal((await opA.post(`/api/operator/packages/${pkgId}/departures`, { startDate: inDays(30), endDate: inDays(28), totalCapacity: 6 })).status, 400, 'return after departure');
  assert.equal((await opA.post(`/api/operator/packages/${pkgId}/publish`)).status, 200);

  const book = await traveller.post('/api/bookings', { departureId: depId, seats: 4, contact, travelers: [1, 2, 3, 4].map((i) => ({ fullName: `Traveller ${i}`, age: 30 })) });
  assert.equal(book.status, 201);
  assert.equal((await opA.put(`/api/operator/departures/${depId}`, { totalCapacity: 3 })).status, 409, 'capacity cannot drop below held seats');
  const grown = await opA.put(`/api/operator/departures/${depId}`, { totalCapacity: 8 });
  assert.equal(grown.data.seatsAvailable, 4, 'available seats follow the new capacity');
  assert.equal((await opA.put(`/api/operator/departures/${depId}`, { status: 'cancelled' })).status, 409, 'cannot cancel with active bookings');
  assert.equal((await opA.del(`/api/operator/departures/${depId}`)).status, 409, 'cannot delete a departure with bookings');
  assert.equal((await opB.put(`/api/operator/departures/${depId}`, { totalCapacity: 50 })).status, 404);
  assert.equal((await opB.get(`/api/operator/departures/${depId}`)).status, 404, 'manifests are private');
  assert.equal((await opA.del(`/api/operator/departures/${d2.data._id}`)).status, 200, 'an empty departure can be removed');
});

test('Booking access: only the trip\'s organiser sees and acts on its bookings', async () => {
  const mine = await opA.get('/api/operator/bookings');
  const booking = mine.data.find((b) => String(b.departure._id) === depId);
  assert.ok(booking, 'the organiser sees the request');
  assert.ok(!(await opB.get('/api/operator/bookings')).data.some((b) => b._id === booking._id), 'others do not');
  assert.equal((await opB.get(`/api/operator/bookings/${booking._id}`)).status, 404);
  assert.equal((await opB.post(`/api/operator/bookings/${booking._id}/confirm`)).status, 404);
  assert.equal((await opB.post(`/api/operator/bookings/${booking._id}/payments`, { amount: 100, method: 'upi' })).status, 404);
  assert.equal((await opB.post(`/api/operator/departures/${depId}/announcements`, { title: 'Hi', body: 'Hello' })).status, 404);
  assert.equal((await traveller.get('/api/operator/bookings')).status, 403);

  const csvB = await opB.get('/api/operator/bookings/export.csv');
  assert.ok(!csvB.text.includes(booking.reference), 'exports only contain your own travellers');

  assert.equal((await opA.post(`/api/operator/bookings/${booking._id}/confirm`)).status, 200);
  const pay = await opA.post(`/api/operator/bookings/${booking._id}/payments`, { amount: 10000, method: 'upi', externalReference: 'UPI-778' });
  assert.equal(pay.status, 201);
  assert.equal((await opA.post(`/api/operator/bookings/${booking._id}/payments`, { amount: 999999, method: 'upi' })).status, 400, 'payments cannot exceed the booking total');
  assert.equal((await opA.post(`/api/operator/departures/${depId}/announcements`, { title: 'Pickup', body: 'Gate 3 at 9 PM', kind: 'pickup' })).status, 201);
  const csvA = await opA.get(`/api/operator/bookings/export.csv?departure=${depId}`);
  assert.ok(csvA.text.includes(booking.reference) && csvA.text.includes('Traveller 4'));
});

test('Duplicate and archive: copies are drafts, archived trips leave the marketplace', async () => {
  const dup = await opA.post(`/api/operator/packages/${pkgId}/duplicate`);
  assert.equal(dup.status, 201);
  assert.equal(dup.data.status, 'draft');
  assert.equal(dup.data.title, 'Copy of Chopta Tungnath weekend');
  assert.notEqual(dup.data.slug, (await TripPackage.findById(pkgId).lean()).slug);
  assert.deepEqual(dup.data.itinerary.map((d) => d.title), ['Drive to Chopta', 'Tungnath and Chandrashila', 'Return']);
  const dupDetail = await opA.get(`/api/operator/packages/${dup.data._id}`);
  assert.equal(dupDetail.data.departures.length, 0, 'departures and bookings are not copied');

  const slug = (await TripPackage.findById(pkgId).lean()).slug;
  assert.equal((await opA.post(`/api/operator/packages/${pkgId}/archive`)).status, 200);
  assert.equal((await client().get(`/api/trips/${slug}`)).status, 404, 'archived trips are not public');
  assert.equal((await opA.post(`/api/operator/packages/${pkgId}/publish`)).status, 409, 'restore before publishing');
  assert.equal((await opA.post(`/api/operator/packages/${pkgId}/archive`)).status, 409);
  const restored = await opA.post(`/api/operator/packages/${pkgId}/restore`);
  assert.equal(restored.data.status, 'draft');
  assert.equal((await opA.post(`/api/operator/packages/${pkgId}/publish`)).status, 200);
  const mineBookings = await traveller.get('/api/bookings/mine');
  assert.ok(mineBookings.data.some((b) => String(b.departure._id) === depId && b.status === 'confirmed'), 'archiving never touched the booking');
});

test('Insights and activity: only real events are counted', async () => {
  const slug = (await TripPackage.findById(pkgId).lean()).slug;
  await client().get(`/api/trips/${slug}`);
  await client().get(`/api/trips/${slug}`);
  await opA.get(`/api/trips/${slug}`); // owner preview: not counted
  await client('Googlebot/2.1').get(`/api/trips/${slug}`); // bot: not counted
  await new Promise((r) => setTimeout(r, 150)); // counting is fire-and-forget

  const ins = await opA.get('/api/operator/insights?days=30');
  assert.equal(ins.status, 200);
  const row = ins.data.perPackage.find((p) => p._id === pkgId);
  assert.equal(row.views, 2);
  assert.equal(row.requests, 1);
  assert.equal(row.confirmed, 1);
  const occ = ins.data.occupancy.find((d) => d._id === depId);
  assert.deepEqual([occ.totalCapacity, occ.confirmedSeats, occ.requestedSeats, occ.seatsAvailable], [8, 4, 0, 4]);
  assert.ok(!JSON.stringify(ins.data).match(/revenue|conversion|rate/i), 'no revenue or conversion figures');
  assert.ok(!(await opB.get('/api/operator/insights')).data.perPackage.some((p) => p._id === pkgId), 'insights are per organiser');

  const stats = await opA.get('/api/operator/stats');
  assert.ok(stats.data.confirmedTravellersUpcoming >= 4);
  const kinds = stats.data.recentActivity.map((e) => e.kind);
  for (const k of ['booking_confirmed', 'payment_recorded', 'announcement_posted', 'booking_requested']) assert.ok(kinds.includes(k), `activity includes ${k}`);
  assert.ok(stats.data.recordedPayments.some((p) => p.total >= 10000), 'payments are the offline records only');
});
