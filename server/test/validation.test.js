// Phone and emergency-contact validation on profile, sign-up and booking requests. These values
// end up in organiser manifests and CSV exports, so they are checked on the server, not only in
// the forms. Uses a throwaway embedded MongoDB.
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const os = require('os');
const fs = require('fs');
const path = require('path');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ghumo-validation-test-'));
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
const { Booking } = require('../src/models');
const { isPhone, EMERGENCY_CONTACT_MAX_LENGTH } = require('../src/utils/text');
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
    get: (u) => call('GET', u), post: (u, b) => call('POST', u, b || {}), put: (u, b) => call('PUT', u, b || {}),
    login: (email) => call('POST', '/api/auth/login', { email, password: DEMO_PASSWORD }),
  };
}

const contact = { name: 'Test Traveller', email: 'test@example.com', phone: '+91 90000 11111' };
let departureId;

before(async () => {
  await connectDB();
  await seed();
  await runFoundation();
  server = app.listen(0);
  base = `http://127.0.0.1:${server.address().port}`;
  const detail = (await client().get('/api/trips/nainital-lakes-weekend')).data;
  departureId = detail.departures.find((d) => d.availability === 'available')._id;
});

after(async () => {
  server?.close();
  await disconnectDB();
  fs.rmSync(tmp, { recursive: true, force: true });
});

test('isPhone accepts the formats the forms suggest and rejects text', () => {
  for (const ok of ['+91 98765 43210', '9876543210', '+44-20-7946-0958', '  +91 90000 11111  ']) assert.equal(isPhone(ok), true, ok);
  for (const bad of ['', 'abc', 'not a phone', '12345', '+91 98765 43210 ext 2', '1'.repeat(18), null, undefined]) assert.equal(isPhone(bad), false, String(bad));
});

test('PUT /api/auth/me validates the phone and an empty value clears it', async () => {
  const t = client();
  await t.login('traveller@ghumo.demo');

  const bad = await t.put('/api/auth/me', { phone: 'not a phone' });
  assert.equal(bad.status, 400);
  assert.match(bad.body.message, /phone/i);
  assert.equal((await t.put('/api/auth/me', { phone: '9'.repeat(40) })).status, 400, 'over-long phone');

  const ok = await t.put('/api/auth/me', { phone: '  +91 98765 43210 ' });
  assert.equal(ok.status, 200);
  assert.equal(ok.data.phone, '+91 98765 43210', 'stored trimmed');

  const cleared = await t.put('/api/auth/me', { phone: '' });
  assert.equal(cleared.status, 200);
  assert.equal(cleared.data.phone, null);

  const nameOnly = await t.put('/api/auth/me', { name: 'Renamed Traveller' });
  assert.equal(nameOnly.status, 200, 'omitting phone leaves it alone');
  assert.equal(nameOnly.data.phone, null);
});

test('POST /api/auth/register validates an optional phone', async () => {
  const account = (email, phone) => ({ name: 'New Person', email, password: 'longenough', phone });
  const bad = await client().post('/api/auth/register', account('bad-phone@example.com', 'call me maybe'));
  assert.equal(bad.status, 400);
  assert.match(bad.body.message, /phone/i);
  assert.equal((await client().post('/api/auth/register', account('long-phone@example.com', '1'.repeat(30)))).status, 400);

  const none = await client().post('/api/auth/register', account('no-phone@example.com', ''));
  assert.equal(none.status, 201);
  assert.equal(none.data.phone, null);

  const ok = await client().post('/api/auth/register', account('good-phone@example.com', '+91 98765 43210'));
  assert.equal(ok.status, 201);
  assert.equal(ok.data.phone, '+91 98765 43210');
});

test('POST /api/bookings validates traveller phones and caps emergency contacts', async () => {
  const t = client();
  await t.login('traveller@ghumo.demo');
  const book = (travelers) => t.post('/api/bookings', { departureId, seats: travelers.length, contact, travelers });
  const person = (extra = {}) => ({ fullName: 'Asha Rao', age: 30, ...extra });

  const badPhone = await book([person(), person({ phone: 'abc' })]);
  assert.equal(badPhone.status, 400);
  assert.equal(badPhone.body.message, 'Traveller 2: phone looks invalid');

  const longContact = await book([person({ emergencyContact: 'x'.repeat(5000) })]);
  assert.equal(longContact.status, 400);
  assert.match(longContact.body.message, /^Traveller 1: emergency contact/);

  const countBefore = await Booking.countDocuments();
  const atCap = 'y'.repeat(EMERGENCY_CONTACT_MAX_LENGTH);
  const ok = await book([person({ phone: ' +91 98765 43210 ', emergencyContact: `  ${atCap}  ` }), person()]);
  assert.equal(ok.status, 201);
  assert.equal(ok.data.travelers[0].phone, '+91 98765 43210');
  assert.equal(ok.data.travelers[0].emergencyContact, atCap);
  assert.equal(ok.data.travelers[1].phone, '', 'phone stays optional');
  assert.equal(await Booking.countDocuments(), countBefore + 1, 'rejected requests created nothing');
});
