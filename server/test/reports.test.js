const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const os = require('os');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ghumo-reports-test-'));
process.env.MONGODB_URI = '';
process.env.EMBEDDED_DB_PATH = tmp;
process.env.JWT_SECRET = 'test-secret';
process.env.UPLOAD_DIR = path.join(tmp, 'uploads');
delete process.env.RATE_LIMIT;

const { connectDB, disconnectDB } = require('../src/config/db');
const { seed, DEMO_PASSWORD } = require('../src/seedData');
const { Booking, Operator, TripDeparture, TripPackage, User } = require('../src/models');
const app = require('../src/app');

let server;
let base;

function client() {
  let cookie = '';
  const call = async (method, url, body) => {
    const response = await fetch(base + url, {
      method,
      headers: { 'content-type': 'application/json', ...(cookie ? { cookie } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    const setCookie = response.headers.get('set-cookie');
    if (setCookie) cookie = setCookie.split(';')[0];
    const text = await response.text();
    let json;
    try { json = JSON.parse(text); } catch { json = text; }
    return { status: response.status, body: json, data: json && json.data };
  };
  return {
    get: (url) => call('GET', url),
    post: (url, body) => call('POST', url, body || {}),
    login: async (email) => {
      const response = await call('POST', '/api/auth/login', { email, password: DEMO_PASSWORD });
      assert.equal(response.status, 200, `could not log in ${email}`);
      return response;
    },
  };
}

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

test('reports validate targets, enforce per-user limits, and resolve booking targets safely', async () => {
  const packageTarget = await TripPackage.findOne({ slug: 'bali-group-experience' });
  assert.ok(packageTarget, 'seeded package exists');
  const operatorTarget = await Operator.findById(packageTarget.operator);
  assert.ok(operatorTarget, 'package operator exists');
  const operatorOwner = await User.findById(operatorTarget.owner);
  assert.ok(operatorOwner, 'package operator owner exists');
  const departure = await TripDeparture.findOne({ package: packageTarget._id });
  assert.ok(departure, 'package departure exists');

  const travelerUser = await User.findOne({ email: 'traveller@ghumo.demo' });
  assert.ok(travelerUser, 'seeded traveller exists');
  const booking = await Booking.create({
    reference: 'GHM-RPT001',
    user: travelerUser._id,
    operator: operatorTarget._id,
    package: packageTarget._id,
    departure: departure._id,
    seats: 1,
    pricePerSeat: departure.price,
    totalAmount: departure.price,
    travelers: [{ fullName: 'Private Traveller', age: 30, phone: '+91 90000 11111', email: 'private@example.com' }],
    contact: { name: 'Private Traveller', email: 'private@example.com', phone: '+91 90000 11111' },
  });

  const anonymous = client();
  assert.equal((await anonymous.post('/api/reports', {})).status, 401);

  const admin = client();
  await admin.login('admin@ghumo.demo');
  const malformed = await admin.post('/api/reports', {
    targetType: 'package',
    targetId: 'abc',
    reason: 'safety',
  });
  assert.equal(malformed.status, 400);
  assert.equal(malformed.body.message, 'Invalid report target');

  const missingId = new mongoose.Types.ObjectId().toString();
  for (const targetType of ['package', 'operator', 'booking']) {
    const missing = await admin.post('/api/reports', {
      targetType,
      targetId: missingId,
      reason: 'safety',
    });
    assert.equal(missing.status, 404, `${targetType} target must exist`);
    assert.equal(missing.body.message, "We couldn't find what you're reporting");
  }

  const inaccessible = await admin.post('/api/reports', {
    targetType: 'booking',
    targetId: booking._id,
    reason: 'safety',
  });
  assert.equal(inaccessible.status, 404, 'inaccessible booking is indistinguishable from a missing booking');

  const traveler = client();
  await traveler.login('traveller@ghumo.demo');
  for (const [targetType, targetId] of [
    ['package', packageTarget._id],
    ['operator', operatorTarget._id],
    ['booking', booking._id],
  ]) {
    const report = await traveler.post('/api/reports', { targetType, targetId, reason: 'safety' });
    assert.equal(report.status, 201, `${targetType} report should succeed`);
  }

  const operator = client();
  await operator.login(operatorOwner.email);
  const operatorBookingReport = await operator.post('/api/reports', {
    targetType: 'booking',
    targetId: booking._id,
    reason: 'safety',
  });
  assert.equal(operatorBookingReport.status, 201, 'the booking owner operator can report it');

  const limitedUser = client();
  await limitedUser.login('newoperator@ghumo.demo');
  for (let i = 0; i < 5; i += 1) {
    const report = await limitedUser.post('/api/reports', {
      targetType: 'package',
      targetId: packageTarget._id,
      reason: 'other',
    });
    assert.equal(report.status, 201, `report ${i + 1} should be within the limit`);
  }
  const limited = await limitedUser.post('/api/reports', {
    targetType: 'package',
    targetId: packageTarget._id,
    reason: 'other',
  });
  assert.equal(limited.status, 429);
  assert.equal(limited.body.code, 'RATE_LIMITED');

  const otherUserReport = await traveler.post('/api/reports', {
    targetType: 'package',
    targetId: packageTarget._id,
    reason: 'other',
  });
  assert.equal(otherUserReport.status, 201, 'one user does not consume another users limit');

  const adminReports = await admin.get('/api/admin/reports');
  const bookingReport = adminReports.data.find(
    (report) => report.targetType === 'booking' && String(report.targetId) === String(booking._id),
  );
  assert.ok(bookingReport?.target, 'admin report list resolves booking targets');
  assert.equal(bookingReport.target.reference, booking.reference);
  assert.equal(bookingReport.target.status, booking.status);
  assert.equal('contact' in bookingReport.target, false);
  assert.equal('phone' in bookingReport.target, false);
  assert.equal('email' in bookingReport.target, false);
});
