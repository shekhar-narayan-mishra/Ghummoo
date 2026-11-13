// Review rules: POST /api/bookings/:id/review accepts only confirmed bookings whose trip has ended,
// once per booking, from the traveller who booked, with a whole-number rating from 1 to 5.
// Past departures come from the test-only fixture in test/fixtures/completedTrip.js.
// Uses a throwaway embedded MongoDB, never your real database.
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const os = require('os');
const fs = require('fs');
const path = require('path');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ghumo-reviews-test-'));
process.env.MONGODB_URI = '';
process.env.EMBEDDED_DB_PATH = tmp;
process.env.JWT_SECRET = 'test-secret';
process.env.UPLOAD_DIR = path.join(tmp, 'uploads');
process.env.RATE_LIMIT = 'off'; // one test below turns it back on to check the review limiter
delete process.env.ANTHROPIC_API_KEY;
delete process.env.OPENAI_API_KEY;
delete process.env.AI_PROVIDER;

const { connectDB, disconnectDB } = require('../src/config/db');
const { seed, DEMO_PASSWORD } = require('../src/seedData');
const { Booking, Review, TripPackage, User } = require('../src/models');
const { createCompletedTrip, removeCompletedTrip, FIXTURE_TITLE } = require('./fixtures/completedTrip');
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

async function signedIn(email) {
  const c = client();
  const res = await c.login(email);
  assert.equal(res.status, 200, `${email} can sign in`);
  return c;
}

const review = (c, bookingId, body) => c.post(`/api/bookings/${bookingId}/review`, body);

let traveller;
let organiser;
let otherTraveller;

before(async () => {
  await connectDB();
  await seed();
  await Review.init(); // the unique index on Review.booking must exist before the race test
  await User.create({ name: 'Other Traveller', email: 'other.traveller@example.com', passwordHash: DEMO_PASSWORD, role: 'traveler' });
  server = app.listen(0);
  base = `http://127.0.0.1:${server.address().port}`;
  traveller = await signedIn('traveller@ghumo.demo');
  organiser = await signedIn('operator@ghumo.demo');
  otherTraveller = await signedIn('other.traveller@example.com');
});

after(async () => {
  await removeCompletedTrip();
  server?.close();
  await disconnectDB();
  fs.rmSync(tmp, { recursive: true, force: true });
});

test('Seed data contains no reviews', async () => {
  assert.equal(await Review.countDocuments({}), 0);
});

test('A confirmed booking on an ended trip can be reviewed once, and shows on the trip page', async () => {
  const { booking, pkg } = await createCompletedTrip();

  const created = await review(traveller, booking._id, { rating: 4, comment: 'Well organised and on time.' });
  assert.equal(created.status, 201);
  assert.equal(created.data.rating, 4);
  assert.equal(created.data.comment, 'Well organised and on time.');

  const again = await review(traveller, booking._id, { rating: 5 });
  assert.equal(again.status, 409);
  assert.equal(again.body.message, 'You have already reviewed this trip');
  assert.equal(await Review.countDocuments({ booking: booking._id }), 1);

  const page = await client().get(`/api/trips/${pkg.slug}`);
  assert.equal(page.status, 200);
  assert.equal(page.data.title, FIXTURE_TITLE);
  assert.equal(page.data.reviews.count, 1);
  assert.equal(page.data.reviews.average, 4);
  const [item] = page.data.reviews.items;
  assert.equal(item.author, 'Priya', 'only the first name is public');
  assert.equal(item.comment, 'Well organised and on time.');
  assert.equal(JSON.stringify(page.data.reviews).includes('Sharma'), false);
  assert.equal(JSON.stringify(page.data.reviews).includes('@'), false, 'no emails in public reviews');

  const mine = await traveller.get(`/api/bookings/${booking._id}`);
  assert.equal(mine.status, 200);
  assert.equal(mine.data.review.rating, 4);
});

test('Two review requests at once create only one review', async () => {
  const { booking } = await createCompletedTrip();
  const results = await Promise.all([review(traveller, booking._id, { rating: 5 }), review(traveller, booking._id, { rating: 3 })]);
  assert.deepEqual(results.map((r) => r.status).sort(), [201, 409]);
  const refused = results.find((r) => r.status === 409);
  assert.equal(refused.body.message, 'You have already reviewed this trip');
  assert.equal(await Review.countDocuments({ booking: booking._id }), 1);
});

test('A trip that has not ended yet cannot be reviewed', async () => {
  const { booking } = await createCompletedTrip({ ended: false });
  const res = await review(traveller, booking._id, { rating: 5 });
  assert.equal(res.status, 409);
  assert.equal(res.body.message, 'You can review this trip after it ends');
  assert.equal(await Review.countDocuments({ booking: booking._id }), 0);
});

for (const status of ['requested', 'rejected', 'cancelled']) {
  test(`A ${status} booking cannot be reviewed`, async () => {
    const { booking } = await createCompletedTrip({ status });
    const res = await review(traveller, booking._id, { rating: 5 });
    assert.equal(res.status, 409);
    assert.equal(res.body.message, 'Only confirmed trips can be reviewed');
    assert.equal(await Review.countDocuments({ booking: booking._id }), 0);
  });
}

test('Only the traveller who booked can review: others get 404, the organiser 403', async () => {
  const { booking } = await createCompletedTrip();

  const stranger = await review(otherTraveller, booking._id, { rating: 1 });
  assert.equal(stranger.status, 404, 'another traveller cannot tell the booking exists');

  const byOrganiser = await review(organiser, booking._id, { rating: 5 });
  assert.equal(byOrganiser.status, 403);

  const anonymous = await review(client(), booking._id, { rating: 5 });
  assert.equal(anonymous.status, 401);

  assert.equal(await Review.countDocuments({ booking: booking._id }), 0);
});

test('Ratings must be whole numbers from 1 to 5', async () => {
  const { booking } = await createCompletedTrip();
  for (const rating of [0, 6, -1, 3.5, 'abc', null, undefined]) {
    const res = await review(traveller, booking._id, rating === undefined ? {} : { rating });
    assert.equal(res.status, 400, `rating ${JSON.stringify(rating)} is refused`);
    assert.equal(res.body.message, 'Rating must be between 1 and 5');
  }
  assert.equal(await Review.countDocuments({ booking: booking._id }), 0);

  const ok = await review(traveller, booking._id, { rating: '5' });
  assert.equal(ok.status, 201, 'a numeric string from a form is accepted');
});

test('Review requests are rate-limited per account', async () => {
  const prev = process.env.RATE_LIMIT;
  delete process.env.RATE_LIMIT;
  try {
    const { booking } = await createCompletedTrip();
    const statuses = [];
    for (let i = 0; i < 11; i += 1) statuses.push((await review(traveller, booking._id, { rating: 0 })).status);
    assert.deepEqual(statuses.slice(0, 10), Array(10).fill(400), 'the first 10 reach the route');
    assert.equal(statuses[10], 429, 'the 11th within a minute is limited');
    const other = await createCompletedTrip({ travellerEmail: 'other.traveller@example.com' });
    const unaffected = await review(otherTraveller, other.booking._id, { rating: 5 });
    assert.equal(unaffected.status, 201, 'another account is not affected');
  } finally {
    process.env.RATE_LIMIT = prev;
  }
});

test('Hidden reviews are left out of the public trip page', async () => {
  const { booking, pkg } = await createCompletedTrip();
  const created = await review(traveller, booking._id, { rating: 2, comment: 'Hidden by moderation' });
  assert.equal(created.status, 201);
  await Review.updateOne({ _id: created.data._id }, { $set: { hidden: true } });

  const page = await client().get(`/api/trips/${pkg.slug}`);
  assert.equal(page.data.reviews.count, 0);
  assert.equal(JSON.stringify(page.data.reviews).includes('Hidden by moderation'), false);
});

test('Removing the fixture leaves no fixture data behind', async () => {
  await createCompletedTrip();
  await removeCompletedTrip();
  assert.equal(await TripPackage.countDocuments({ title: FIXTURE_TITLE }), 0);
  assert.equal(await Booking.countDocuments({ 'contact.email': 'fixture@example.com' }), 0);
});
