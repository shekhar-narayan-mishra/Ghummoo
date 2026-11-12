// Traveller cancellation edge cases: POST /api/bookings/:id/cancel refusals and the double-cancel race.
// The successful paths and confirmedSeats counters are covered in api.test.js and india.test.js.
// Uses a throwaway embedded MongoDB, never your real database.
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const os = require('os');
const fs = require('fs');
const path = require('path');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ghumo-cancel-test-'));
process.env.MONGODB_URI = '';
process.env.EMBEDDED_DB_PATH = tmp;
process.env.JWT_SECRET = 'test-secret';
process.env.UPLOAD_DIR = path.join(tmp, 'uploads');
delete process.env.ANTHROPIC_API_KEY;
delete process.env.OPENAI_API_KEY;
delete process.env.AI_PROVIDER;

const { connectDB, disconnectDB } = require('../src/config/db');
const { seed, DEMO_PASSWORD } = require('../src/seedData');
const { Booking, Operator, TripDeparture, TripPackage, User } = require('../src/models');
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
    get: (u) => call('GET', u), post: (u, b) => call('POST', u, b || {}),
    login: (email) => call('POST', '/api/auth/login', { email, password: DEMO_PASSWORD }),
  };
}

const contact = { name: 'Test Traveller', email: 'test@example.com', phone: '+91 90000 11111' };
const travellers = (n) => Array.from({ length: n }, (_, i) => ({ fullName: `Traveller ${i + 1}`, age: 30 }));

let departureIds = [];
let nextDeparture = 0;
// Each test books on its own departure so seat counts and start dates never leak between tests.
const freshDeparture = () => {
  assert.ok(nextDeparture < departureIds.length, 'seed data has enough departures for these tests');
  return departureIds[nextDeparture++];
};

const seatsLeft = async (id) => (await TripDeparture.findById(id).lean()).seatsAvailable;
const statusOf = async (id) => (await Booking.findById(id).lean()).status;

async function signedIn(email) {
  const c = client();
  const res = await c.login(email);
  assert.equal(res.status, 200, `${email} can sign in`);
  return c;
}

async function book(traveller, departureId, seats = 2) {
  const res = await traveller.post('/api/bookings', { departureId, seats, contact, travelers: travellers(seats) });
  assert.equal(res.status, 201, 'booking request is created');
  return res.data._id;
}

before(async () => {
  await connectDB();
  await seed();
  server = app.listen(0);
  base = `http://127.0.0.1:${server.address().port}`;
  // Open departures of the demo organiser's published trips: the organiser can reject their bookings,
  // and each has plenty of seats.
  const owner = await User.findOne({ email: 'operator@ghumo.demo' }).lean();
  const operator = await Operator.findOne({ owner: owner._id }).lean();
  const published = await TripPackage.find({ operator: operator._id, status: 'published' }).distinct('_id');
  const departures = await TripDeparture.find({
    package: { $in: published }, status: 'open', startDate: { $gt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000) }, seatsAvailable: { $gte: 8 },
  }).lean();
  departureIds = departures.map((d) => String(d._id));
});

after(async () => {
  server?.close();
  await disconnectDB();
  fs.rmSync(tmp, { recursive: true, force: true });
});

test('Cancel refuses a rejected booking with 409 and leaves seats alone', async () => {
  const traveller = await signedIn('traveller@ghumo.demo');
  const op = await signedIn('operator@ghumo.demo');
  const depId = freshDeparture();
  const id = await book(traveller, depId, 2);
  assert.equal((await op.post(`/api/operator/bookings/${id}/reject`, { note: 'Group is full for this date' })).status, 200);
  const seatsBefore = await seatsLeft(depId);

  const res = await traveller.post(`/api/bookings/${id}/cancel`);
  assert.equal(res.status, 409);
  assert.equal(await statusOf(id), 'rejected', 'status is unchanged');
  assert.equal(await seatsLeft(depId), seatsBefore, 'no seats are released a second time');
});

test('Cancel refuses an already cancelled booking with 409 and does not release seats twice', async () => {
  const traveller = await signedIn('traveller@ghumo.demo');
  const depId = freshDeparture();
  const startSeats = await seatsLeft(depId);
  // A second held booking keeps seatsAvailable below capacity, so a double release is not hidden by the cap.
  await book(traveller, depId, 2);
  const id = await book(traveller, depId, 2);
  assert.equal((await traveller.post(`/api/bookings/${id}/cancel`)).status, 200);
  const afterFirst = await seatsLeft(depId);
  assert.equal(afterFirst, startSeats - 2);

  const again = await traveller.post(`/api/bookings/${id}/cancel`);
  assert.equal(again.status, 409);
  assert.equal(await statusOf(id), 'cancelled');
  assert.equal(await seatsLeft(depId), afterFirst, 'seats are released exactly once');
});

test('Cancel refuses a booking once the departure has started', async () => {
  const traveller = await signedIn('traveller@ghumo.demo');
  const depId = freshDeparture();
  const id = await book(traveller, depId, 2);
  const seatsBefore = await seatsLeft(depId);
  await TripDeparture.updateOne({ _id: depId }, { $set: { startDate: new Date(Date.now() - 24 * 60 * 60 * 1000) } });

  const res = await traveller.post(`/api/bookings/${id}/cancel`);
  assert.equal(res.status, 409);
  assert.match(res.body.message, /already started/);
  assert.equal(await statusOf(id), 'requested', 'status is unchanged');
  assert.equal(await seatsLeft(depId), seatsBefore);
});

test('Cancel is limited to the booking owner: other travellers get 404, the organiser gets 403', async () => {
  const traveller = await signedIn('traveller@ghumo.demo');
  const op = await signedIn('operator@ghumo.demo');
  await User.create({ name: 'Other Traveller', email: 'other.traveller@example.com', passwordHash: DEMO_PASSWORD, role: 'traveler' });
  const other = await signedIn('other.traveller@example.com');
  const depId = freshDeparture();
  const id = await book(traveller, depId, 2);
  const seatsBefore = await seatsLeft(depId);

  assert.equal((await other.post(`/api/bookings/${id}/cancel`)).status, 404, 'another traveller cannot even see it');
  assert.equal((await op.post(`/api/bookings/${id}/cancel`)).status, 403, "the trip's organiser may not cancel for the traveller");
  assert.equal(await statusOf(id), 'requested', 'status is unchanged');
  assert.equal(await seatsLeft(depId), seatsBefore);
});

test('Two concurrent cancel requests: exactly one succeeds and seats are released once', async () => {
  const traveller = await signedIn('traveller@ghumo.demo');
  const depId = freshDeparture();
  const startSeats = await seatsLeft(depId);
  // Another booking holds seats, so a double release would show instead of being capped at capacity.
  await book(traveller, depId, 2);
  const id = await book(traveller, depId, 3);
  assert.equal(await seatsLeft(depId), startSeats - 5);

  const results = await Promise.all([traveller.post(`/api/bookings/${id}/cancel`), traveller.post(`/api/bookings/${id}/cancel`)]);
  assert.deepEqual(results.map((r) => r.status).sort(), [200, 409]);
  assert.equal(await statusOf(id), 'cancelled');
  assert.equal(await seatsLeft(depId), startSeats - 2, "only the cancelled booking's 3 seats come back, once");
});
