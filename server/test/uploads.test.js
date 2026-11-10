// Upload tests: the image signature check in POST /api/uploads and the detectImageType helper.
// Uses a throwaway embedded MongoDB, never your real database.
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const os = require('os');
const fs = require('fs');
const path = require('path');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ghumo-uploads-test-'));
const uploadDir = path.join(tmp, 'uploads');
process.env.MONGODB_URI = '';
process.env.EMBEDDED_DB_PATH = tmp;
process.env.JWT_SECRET = 'test-secret';
process.env.UPLOAD_DIR = uploadDir;
delete process.env.RATE_LIMIT;

const { connectDB, disconnectDB } = require('../src/config/db');
const { seed, DEMO_PASSWORD } = require('../src/seedData');
const app = require('../src/app');
const { detectImageType } = require('../src/utils/imageType');

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0x0d, 0x49, 0x48, 0x44, 0x52]);
const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a, 0x46, 0x49, 0x46, 0]);
const WEBP = Buffer.concat([Buffer.from('RIFF'), Buffer.from([0x24, 0, 0, 0]), Buffer.from('WEBPVP8 ')]);
const avif = (brand) => Buffer.concat([Buffer.from([0, 0, 0, 0x1c]), Buffer.from('ftyp'), Buffer.from(brand), Buffer.alloc(4)]);

let server;
let base;
let cookie = '';

const files = () => (fs.existsSync(uploadDir) ? fs.readdirSync(uploadDir) : []);

async function upload(bytes, type, name = 'photo') {
  const form = new FormData();
  form.append('image', new Blob([bytes], { type }), name);
  const res = await fetch(`${base}/api/uploads`, { method: 'POST', headers: { cookie }, body: form });
  return { status: res.status, body: await res.json() };
}

before(async () => {
  await connectDB();
  await seed();
  server = app.listen(0);
  base = `http://127.0.0.1:${server.address().port}`;
  const res = await fetch(`${base}/api/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: 'operator@ghumo.demo', password: DEMO_PASSWORD }),
  });
  cookie = res.headers.get('set-cookie').split(';')[0];
});

after(async () => {
  server?.close();
  await disconnectDB();
  fs.rmSync(tmp, { recursive: true, force: true });
});

test('detectImageType recognises each supported signature', () => {
  assert.equal(detectImageType(JPEG), 'image/jpeg');
  assert.equal(detectImageType(PNG), 'image/png');
  assert.equal(detectImageType(WEBP), 'image/webp');
  assert.equal(detectImageType(avif('avif')), 'image/avif');
  assert.equal(detectImageType(avif('avis')), 'image/avif');
});

test('detectImageType rejects text, empty, truncated and look-alike buffers', () => {
  assert.equal(detectImageType(Buffer.from('<html><script>alert(1)</script>')), null);
  assert.equal(detectImageType(Buffer.alloc(0)), null);
  assert.equal(detectImageType(PNG.subarray(0, 4)), null, 'truncated PNG');
  assert.equal(detectImageType(Buffer.from([0xff, 0xd8])), null, 'truncated JPEG');
  assert.equal(detectImageType(Buffer.from('RIFF\0\0\0\0WAVEfmt ')), null, 'RIFF but not WebP');
  assert.equal(detectImageType(avif('heic')), null, 'ftyp with another brand');
  assert.equal(detectImageType(Buffer.from('RIFF')), null, 'RIFF only');
  assert.equal(detectImageType('not a buffer'), null);
});

test('valid images are accepted and stored', async () => {
  for (const [bytes, type, ext] of [[PNG, 'image/png', '.png'], [JPEG, 'image/jpeg', '.jpg'], [WEBP, 'image/webp', '.webp'], [avif('avif'), 'image/avif', '.avif']]) {
    const res = await upload(bytes, type);
    assert.equal(res.status, 201, type);
    assert.match(res.body.data.url, new RegExp(`^/uploads/[\\w-]+\\${ext}$`));
    assert.ok(fs.existsSync(path.join(uploadDir, path.basename(res.body.data.url))), `${type} file is on disk`);
  }
});

test('a file whose bytes do not match its claimed type is rejected and deleted', async () => {
  const before = files().length;

  const text = await upload(Buffer.from('<html><body>not an image</body></html>'), 'image/png');
  assert.equal(text.status, 400);
  assert.equal(text.body.message, "The file isn't a valid JPG, PNG, WebP or AVIF image");
  assert.equal(files().length, before, 'no file left behind');

  const mismatch = await upload(PNG, 'image/jpeg');
  assert.equal(mismatch.status, 400, 'PNG bytes sent as image/jpeg');
  assert.equal(files().length, before, 'no file left behind');

  const empty = await upload(Buffer.alloc(0), 'image/webp');
  assert.equal(empty.status, 400, 'empty file');
  assert.equal(files().length, before, 'no file left behind');
});

test('non-image content types are still refused before storage', async () => {
  const before = files().length;
  const res = await upload(Buffer.from('hello'), 'text/plain');
  assert.equal(res.status, 400);
  assert.equal(files().length, before);
});
