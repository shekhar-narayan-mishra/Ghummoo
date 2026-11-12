// Trip groups: server-side membership, privacy between departures, announcements, unread,
// mute, leave/rejoin, losing eligibility, validation and reports.
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const os = require('os');
const fs = require('fs');
const path = require('path');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ghumo-groups-test-'));
process.env.MONGODB_URI = '';
process.env.EMBEDDED_DB_PATH = tmp;
process.env.JWT_SECRET = 'test-secret';
process.env.UPLOAD_DIR = path.join(tmp, 'uploads');
process.env.RATE_LIMIT = 'off';
for (const k of ['ANTHROPIC_API_KEY', 'OPENAI_API_KEY', 'AI_PROVIDER']) delete process.env[k];

const { connectDB, disconnectDB } = require('../src/config/db');
const { seed, DEMO_PASSWORD } = require('../src/seedData');
const { TripPackage, TripDeparture, TripGroup, Report } = require('../src/models');
const app = require('../src/app');

let server;
let base;

function client() {
  let cookie = '';
  const call = async (method, url, body) => {
    const res = await fetch(base + url, { method, headers: { 'content-type': 'application/json', ...(cookie ? { cookie } : {}) }, body: body ? JSON.stringify(body) : undefined });
    const set = res.headers.get('set-cookie');
    if (set) cookie = set.split(';')[0];
    const json = await res.json().catch(() => null);
    return { status: res.status, body: json, data: json && json.data };
  };
  return {
    get: (u) => call('GET', u), post: (u, b) => call('POST', u, b || {}),
    login: (email, password = DEMO_PASSWORD) => call('POST', '/api/auth/login', { email, password }),
    register: (name, email) => call('POST', '/api/auth/register', { name, email, password: 'group-test-pass', role: 'traveler' }),
  };
}

const contact = { name: 'Group Tester', email: 'group@example.com', phone: '+91 90000 22222' };
let organiser; let otherOrganiser; let confirmed; let pending; let declined; let unrelated; let otherDepTraveller;
let depId; let otherDepId; let confirmedBookingId;

const book = async (cl, departureId) => (await cl.post('/api/bookings', { departureId, seats: 1, contact, travelers: [{ fullName: 'Group Tester', age: 30 }] })).data._id;

before(async () => {
  await connectDB();
  await seed();
  server = app.listen(0);
  base = `http://127.0.0.1:${server.address().port}`;

  organiser = client(); await organiser.login('operator@ghumo.demo');
  otherOrganiser = client(); await otherOrganiser.login('altitude@ghumo.demo');
  confirmed = client(); await confirmed.login('traveller@ghumo.demo');
  pending = client(); await pending.register('Pending Pooja', 'pending@groups.test');
  declined = client(); await declined.register('Declined Dev', 'declined@groups.test');
  unrelated = client(); await unrelated.register('Unrelated Uma', 'unrelated@groups.test');
  otherDepTraveller = client(); await otherDepTraveller.register('Other Omkar', 'other@groups.test');

  const pkg = await TripPackage.findOne({ slug: 'rishikesh-adventure-weekend' }).lean();
  const [d1, d2] = await TripDeparture.find({ package: pkg._id }).sort({ startDate: 1 }).lean();
  depId = String(d1._id);
  otherDepId = String(d2._id);

  confirmedBookingId = await book(confirmed, depId);
  await book(pending, depId);
  const declinedId = await book(declined, depId);
  const otherId = await book(otherDepTraveller, otherDepId);
  await organiser.post(`/api/operator/bookings/${confirmedBookingId}/confirm`);
  await organiser.post(`/api/operator/bookings/${declinedId}/reject`, { note: 'Group is full' });
  await organiser.post(`/api/operator/bookings/${otherId}/confirm`);
});

after(async () => {
  server?.close();
  await disconnectDB();
  fs.rmSync(tmp, { recursive: true, force: true });
});

test('The group is created with the first confirmed traveller', async () => {
  assert.ok(await TripGroup.exists({ departure: depId }));
  assert.ok(await TripGroup.exists({ departure: otherDepId }));
});

test('Confirmed traveller and the organiser can access; members show names only', async () => {
  const info = await confirmed.get(`/api/groups/${depId}`);
  assert.equal(info.status, 200);
  assert.equal(info.data.me.role, 'traveller');
  assert.equal(info.data.trip.title, 'Rishikesh Adventure Weekend');
  assert.deepEqual(info.data.members.map((m) => [m.name, m.role]), [['Wandering Pahadi Co.', 'organiser'], ['Priya S.', 'traveller']]);
  const raw = JSON.stringify(info.data);
  for (const leak of ['+91', '@', 'GHM-', 'totalAmount', 'travelers']) assert.ok(!raw.includes(leak), `no ${leak} in group info`);

  const org = await organiser.get(`/api/groups/${depId}`);
  assert.equal(org.status, 200);
  assert.equal(org.data.me.role, 'organiser');
  assert.equal(org.data.me.canLeave, false);
});

test('Pending, declined and unrelated travellers, and other organisers, are refused', async () => {
  const p = await pending.get(`/api/groups/${depId}/messages`);
  assert.equal(p.status, 403);
  assert.equal(p.body.details.code, 'GROUP_NOT_CONFIRMED');
  const d = await declined.get(`/api/groups/${depId}`);
  assert.equal(d.status, 403);
  assert.match(d.body.message, /declined/);
  assert.equal((await unrelated.get(`/api/groups/${depId}/messages`)).status, 403);
  assert.equal((await unrelated.post(`/api/groups/${depId}/messages`, { body: 'hi' })).status, 403);
  assert.equal((await otherOrganiser.get(`/api/groups/${depId}`)).status, 403, 'another organiser is not a member');
  assert.equal((await client().get(`/api/groups/${depId}`)).status, 401);
  assert.equal((await confirmed.get('/api/groups/not-an-id')).status, 404);
});

test('Organiser can announce; travellers can message but not announce', async () => {
  const a = await organiser.post(`/api/groups/${depId}/messages`, { body: 'Pickup is at Akshardham metro, gate 3, 9:30 PM Friday.', kind: 'announcement' });
  assert.equal(a.status, 201);
  assert.equal(a.data.kind, 'announcement');
  assert.equal(a.data.author.role, 'organiser');
  const fake = await confirmed.post(`/api/groups/${depId}/messages`, { body: 'Trip cancelled!', kind: 'announcement' });
  assert.equal(fake.status, 403);
  const m = await confirmed.post(`/api/groups/${depId}/messages`, { body: 'Excited! Anyone bringing a speaker?' });
  assert.equal(m.status, 201);
  assert.equal(m.data.kind, 'message');
  assert.equal(m.data.author.name, 'Priya S.');
  assert.equal(m.data.mine, true);
});

test('Message validation: length, empty text and contact or payment details', async () => {
  assert.equal((await confirmed.post(`/api/groups/${depId}/messages`, { body: '   ' })).status, 400);
  assert.equal((await confirmed.post(`/api/groups/${depId}/messages`, { body: 'x'.repeat(1001) })).status, 400);
  for (const body of ['Call me on 98765 43210', 'Pay me at priya@okaxis', 'my card 4111 1111 1111 1111', 'mail me priya@example.com']) {
    const r = await confirmed.post(`/api/groups/${depId}/messages`, { body });
    assert.equal(r.status, 400, body);
    assert.match(r.body.message, /can't be shared/);
  }
  assert.equal((await confirmed.post(`/api/groups/${depId}/messages`, { body: 'The trip is ₹4,999 and starts 14 Nov at 9:30 PM' })).status, 201, 'prices, dates and times are fine');
});

test('Message history is private to its departure', async () => {
  await otherDepTraveller.post(`/api/groups/${otherDepId}/messages`, { body: 'Hello from the later batch' });
  assert.equal((await otherDepTraveller.get(`/api/groups/${depId}/messages`)).status, 403, 'same package, different departure');
  assert.equal((await confirmed.get(`/api/groups/${otherDepId}/messages`)).status, 403);
  const mine = await confirmed.get(`/api/groups/${depId}/messages`);
  assert.ok(mine.data.items.every((m) => m.body !== 'Hello from the later batch'));
  const other = await otherDepTraveller.get(`/api/groups/${otherDepId}/messages`);
  assert.deepEqual(other.data.items.map((m) => m.body), ['Hello from the later batch']);
  const reportOther = await otherDepTraveller.post(`/api/groups/${otherDepId}/messages/${mine.data.items[0]._id}/report`, { reason: 'spam' });
  assert.equal(reportOther.status, 404, 'cannot reach another group\'s message through your own group');
});

test('Polling, unread counts, read and mute', async () => {
  const before = (await organiser.get('/api/groups/mine')).data.items.find((g) => g.departureId === depId);
  assert.ok(before.unread >= 2, 'traveller messages are unread for the organiser');
  const all = await organiser.get(`/api/groups/${depId}/messages`);
  const lastAt = all.data.items[all.data.items.length - 1].createdAt;
  assert.equal((await organiser.get(`/api/groups/${depId}/messages?after=${encodeURIComponent(lastAt)}`)).data.items.length, 0, 'nothing new since the last poll');
  await confirmed.post(`/api/groups/${depId}/messages`, { body: 'One more thing' });
  const poll = await organiser.get(`/api/groups/${depId}/messages?after=${encodeURIComponent(lastAt)}`);
  assert.deepEqual(poll.data.items.map((m) => m.body), ['One more thing']);

  await organiser.post(`/api/groups/${depId}/read`);
  assert.equal((await organiser.get('/api/groups/mine')).data.items.find((g) => g.departureId === depId).unread, 0);

  await confirmed.post(`/api/groups/${depId}/mute`, { muted: true });
  await organiser.post(`/api/groups/${depId}/messages`, { body: 'Reminder: carry an ID' });
  const muted = await confirmed.get('/api/groups/mine');
  const g = muted.data.items.find((x) => x.departureId === depId);
  assert.equal(g.muted, true);
  assert.ok(g.unread >= 1, 'unread is still counted inside the group');
  assert.equal(muted.data.unreadTotal, 0, 'but muted groups do not add to the badge');
  await confirmed.post(`/api/groups/${depId}/mute`, { muted: false });
});

test('Reports go to moderation without exposing the reporter to others', async () => {
  const msgs = (await confirmed.get(`/api/groups/${depId}/messages`)).data.items;
  const fromOrganiser = msgs.find((m) => !m.mine);
  assert.equal((await confirmed.post(`/api/groups/${depId}/messages/${fromOrganiser._id}/report`, { reason: 'nope' })).status, 400);
  const r = await confirmed.post(`/api/groups/${depId}/messages/${fromOrganiser._id}/report`, { reason: 'spam', details: 'test' });
  assert.equal(r.status, 201);
  assert.ok(await Report.exists({ targetType: 'message', targetId: fromOrganiser._id }));
  const own = msgs.find((m) => m.mine);
  assert.equal((await confirmed.post(`/api/groups/${depId}/messages/${own._id}/report`, { reason: 'spam' })).status, 400);
});

test('Leaving, rejoining and losing eligibility revoke access as expected', async () => {
  assert.equal((await organiser.post(`/api/groups/${depId}/leave`)).status, 403, 'organisers cannot leave');
  assert.equal((await confirmed.post(`/api/groups/${depId}/leave`)).status, 200);
  const left = await confirmed.get(`/api/groups/${depId}/messages`);
  assert.equal(left.status, 403);
  assert.equal(left.body.details.code, 'GROUP_LEFT');
  assert.ok(!(await confirmed.get('/api/groups/mine')).data.items.some((g) => g.departureId === depId));
  assert.ok(!(await organiser.get(`/api/groups/${depId}`)).data.members.some((m) => m.name === 'Priya S.'), 'left members disappear from the list');
  assert.equal((await confirmed.post(`/api/groups/${depId}/join`)).status, 200);
  assert.equal((await confirmed.get(`/api/groups/${depId}/messages`)).status, 200);

  // Cancelling the confirmed booking removes access at once.
  assert.equal((await confirmed.post(`/api/bookings/${confirmedBookingId}/cancel`, { reason: 'Plans changed' })).status, 200);
  assert.equal((await confirmed.get(`/api/groups/${depId}/messages`)).status, 403);
  assert.equal((await confirmed.post(`/api/groups/${depId}/join`)).status, 403, 'and rejoining is not possible');
  assert.ok(!(await organiser.get(`/api/groups/${depId}`)).data.members.some((m) => m.name === 'Priya S.'));
});
