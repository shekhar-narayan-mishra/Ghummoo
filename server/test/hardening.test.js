// Hardening tests: AI number grounding, query-filter injection, CSV export safety and the
// AI Package Studio cost limit. Uses a throwaway embedded MongoDB, never your real database.
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const os = require('os');
const fs = require('fs');
const path = require('path');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ghumo-hardening-'));
process.env.MONGODB_URI = '';
process.env.EMBEDDED_DB_PATH = tmp;
process.env.JWT_SECRET = 'test-secret';
process.env.UPLOAD_DIR = path.join(tmp, 'uploads');
process.env.LOG_REQUESTS = 'false'; // keep request-log lines out of test output
process.env.AI_EXTRACTIONS_PER_HOUR = '3';
delete process.env.RATE_LIMIT;
delete process.env.ANTHROPIC_API_KEY;
delete process.env.OPENAI_API_KEY;
delete process.env.AI_PROVIDER;

const { connectDB, disconnectDB } = require('../src/config/db');
const { seed, DEMO_PASSWORD } = require('../src/seedData');
const app = require('../src/app');
const { numberInText, normalise } = require('../src/services/ai');
const { csvCell } = require('../src/utils/text');

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
    return { status: res.status, body: json, data: json && json.data, text };
  };
  return {
    get: (u) => call('GET', u),
    post: (u, b) => call('POST', u, b || {}),
    login: (email) => call('POST', '/api/auth/login', { email, password: DEMO_PASSWORD }),
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

test('AI grounding: a number counts only when it appears as a whole number in the source', () => {
  // Previously a substring match let 500 pass because "15000" contains "500".
  assert.equal(numberInText(500, 'Trip for ₹15,000 per person'), false);
  assert.equal(numberInText(799, '7999/- per person'), false);
  assert.equal(numberInText(1, 'Batch of 20 seats'), false);
  assert.equal(numberInText(15000, 'Trip for ₹15,000 per person'), true);
  assert.equal(numberInText(125000, 'Rs 1,25,000 all inclusive'), true, 'Indian digit grouping');
  assert.equal(numberInText(15000, 'only 15k per head'), true, '"k" shorthand');
  assert.equal(numberInText(120000, '1.2 lakh for two'), true, '"lakh" shorthand');
  assert.equal(numberInText(5, '5D/4N Manali'), true);
  assert.equal(numberInText(null, '5D/4N Manali'), false);

  const text = 'Spiti 7 days, ₹15,000 per person, 12 seats only';
  const out = normalise({ price: 500, capacity: 2, departureDates: [], itinerary: [], inclusions: [], exclusions: [], warnings: [] }, text);
  assert.equal(out.draft.basePrice, null, 'a price that is only a fragment of a stated number is cleared');
  assert.equal(out.draft.capacity, null, 'a capacity that is only a fragment of a stated number is cleared');
  assert.ok(out.warnings.some((w) => w.includes('500')));
  const ok = normalise({ price: 15000, capacity: 12, departureDates: [], itinerary: [], inclusions: [], exclusions: [], warnings: [] }, text);
  assert.equal(ok.draft.basePrice, 15000);
  assert.equal(ok.draft.capacity, 12);
});

test('CSV export cells neutralise spreadsheet formulas, including tab and carriage-return prefixes', () => {
  assert.equal(csvCell('=HYPERLINK("x")'), '"\'=HYPERLINK(""x"")"');
  assert.equal(csvCell('+91 90000 11111'), '"\'+91 90000 11111"');
  assert.equal(csvCell('@SUM(A1)'), '"\'@SUM(A1)"');
  assert.equal(csvCell('\t=1+1'), '"\'\t=1+1"');
  assert.equal(csvCell('\r=1+1'), '"\'\r=1+1"');
  assert.equal(csvCell('Priya Sharma'), '"Priya Sharma"');
  assert.equal(csvCell(null), '""');
  assert.equal(csvCell(27), '"27"');
});

test('Query filters reject MongoDB operators smuggled through the query string', async () => {
  const op = client();
  assert.equal((await op.login('operator@ghumo.demo')).status, 200);
  const all = await op.get('/api/operator/bookings');
  assert.equal(all.status, 200);
  const injected = await op.get('/api/operator/bookings?status[$ne]=nothing');
  assert.equal(injected.status, 400);
  assert.match(injected.body.message, /Invalid status filter/);
  assert.equal((await op.get('/api/operator/bookings?departure[$gt]=')).status, 400);
  assert.equal((await op.get('/api/operator/bookings/export.csv?status[$ne]=x')).status, 400);
  const plain = await op.get('/api/operator/bookings?status=requested');
  assert.equal(plain.status, 200);
  assert.ok(plain.data.every((b) => b.status === 'requested'));

  const admin = client();
  assert.equal((await admin.login('admin@ghumo.demo')).status, 200);
  assert.equal((await admin.get('/api/admin/bookings?status[$ne]=x')).status, 400);
  assert.equal((await admin.get('/api/admin/operators?status[$in][]=approved')).status, 400);
  assert.equal((await admin.get('/api/admin/packages?q[$regex]=.*')).status, 400);
  assert.equal((await admin.get('/api/admin/operators?status=approved')).status, 200);
});

test('Production seeding never gives the demo admin the password published in the README', () => {
  const { demoAdminPassword } = require('../src/seedData');
  const saved = { NODE_ENV: process.env.NODE_ENV, DEMO_PASSWORD: process.env.DEMO_PASSWORD, DEMO_ADMIN_PASSWORD: process.env.DEMO_ADMIN_PASSWORD };
  const warn = console.warn;
  console.warn = () => {};
  try {
    delete process.env.DEMO_PASSWORD;
    delete process.env.DEMO_ADMIN_PASSWORD;
    process.env.NODE_ENV = 'development';
    assert.equal(demoAdminPassword(), DEMO_PASSWORD, 'local development keeps the documented demo password');
    process.env.NODE_ENV = 'production';
    const a = demoAdminPassword();
    const b = demoAdminPassword();
    assert.notEqual(a, DEMO_PASSWORD);
    assert.notEqual(a, b, 'random each time');
    assert.ok(a.length >= 24);
    process.env.DEMO_ADMIN_PASSWORD = 'a-chosen-admin-password';
    assert.equal(demoAdminPassword(), 'a-chosen-admin-password');
  } finally {
    console.warn = warn;
    for (const [k, v] of Object.entries(saved)) { if (v === undefined) delete process.env[k]; else process.env[k] = v; }
  }
});

test('AI Package Studio extraction is capped per organiser so one account cannot run up provider costs', async () => {
  const text = 'Manali Kasol trip, 5 days 4 nights, 7999 per person, Delhi to Delhi Volvo, 2 nights hotel';
  const op = client();
  assert.equal((await op.login('operator@ghumo.demo')).status, 200);
  for (let i = 0; i < 3; i += 1) {
    const r = await op.post('/api/ai/extract-package', { text });
    assert.equal(r.status, 503, 'no key configured in tests, but the call still counts');
  }
  const limited = await op.post('/api/ai/extract-package', { text });
  assert.equal(limited.status, 429);
  assert.equal(limited.body.code, 'RATE_LIMITED');

  // The limit is per account, not shared: another organiser is unaffected.
  const other = client();
  assert.equal((await other.login('altitude@ghumo.demo')).status, 200);
  assert.equal((await other.post('/api/ai/extract-package', { text })).status, 503);
});

test('Malformed requests get 4xx, not 500: unknown trip for admin Ask, null booking contact, wrong upload field', async () => {
  const admin = client();
  assert.equal((await admin.login('admin@ghumo.demo')).status, 200);
  const ask = await admin.post('/api/discover/trips/no-such-trip/ask', { question: 'Is food included?' });
  assert.equal(ask.status, 404);

  const trav = client();
  assert.equal((await trav.login('traveller@ghumo.demo')).status, 200);
  const trips = await trav.get('/api/trips');
  const slug = trips.data.items.find((t) => t.nextDeparture).slug;
  const detail = await trav.get(`/api/trips/${slug}`);
  const departureId = detail.data.departures[0]._id;
  const r = await trav.post('/api/bookings', { departureId, seats: 1, travelers: [{ fullName: 'Test Person', age: 30 }], contact: null });
  assert.equal(r.status, 400);
  assert.match(r.body.message, /Contact name, email and phone are required/);

  const op = client();
  assert.equal((await op.login('operator@ghumo.demo')).status, 200);
  const login = await fetch(`${base}/api/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: 'operator@ghumo.demo', password: DEMO_PASSWORD }) });
  const cookie = login.headers.get('set-cookie').split(';')[0];
  const form = new FormData();
  form.append('photo', new Blob([Buffer.from([0xff, 0xd8, 0xff, 0xe0])], { type: 'image/jpeg' }), 'x.jpg');
  const up = await fetch(`${base}/api/uploads`, { method: 'POST', headers: { cookie }, body: form });
  assert.equal(up.status, 400, 'unexpected upload field is a client error');
});

test('Image uploads (multer 2): a valid image is stored; wrong type, oversize and anonymous uploads are refused', async () => {
  const login = await fetch(`${base}/api/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: 'operator@ghumo.demo', password: DEMO_PASSWORD }) });
  const cookie = login.headers.get('set-cookie').split(';')[0];
  const upload = (blob, name, headers = { cookie }) => {
    const form = new FormData();
    form.append('image', blob, name);
    return fetch(`${base}/api/uploads`, { method: 'POST', headers, body: form });
  };
  const jpeg = new Blob([Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 16, 0x4a, 0x46, 0x49, 0x46])], { type: 'image/jpeg' });

  const ok = await upload(jpeg, 'photo.jpg');
  assert.equal(ok.status, 201);
  const { data } = await ok.json();
  assert.match(data.url, /^\/uploads\/[a-z0-9]+-[a-f0-9]{12}\.jpg$/);
  assert.equal((await fetch(base + data.url)).status, 200, 'stored file is served');

  assert.equal((await upload(new Blob(['<svg/>'], { type: 'image/svg+xml' }), 'x.svg')).status, 400, 'SVG refused');
  const big = new Blob([Buffer.alloc(5 * 1024 * 1024 + 1)], { type: 'image/png' });
  const tooBig = await upload(big, 'big.png');
  assert.equal(tooBig.status, 400);
  assert.match((await tooBig.json()).message, /smaller than 5 MB/);
  assert.equal((await upload(jpeg, 'photo.jpg', {})).status, 401, 'signed-out upload refused');
});
