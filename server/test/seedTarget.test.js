// Unit tests for the seed guard: what `npm run seed` is about to wipe, and whether it may.
// Nothing here connects to a database.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const { spawnSync } = require('child_process');
const { seedTarget } = require('../src/utils/seedTarget');

const REMOTE = 'mongodb+srv://user:s3cret@cluster.example.net/ghumo';

test('unset MONGODB_URI targets the embedded database and is allowed locally', () => {
  const target = seedTarget({}, []);
  assert.equal(target.label, 'embedded database at server/.data');
  assert.equal(target.local, true);
  assert.equal(target.allowed, true);
  assert.equal(target.reason, '');
});

test('embedded database in production is refused without --force', () => {
  const refused = seedTarget({ NODE_ENV: 'production' }, []);
  assert.equal(refused.local, true);
  assert.equal(refused.allowed, false);
  assert.match(refused.reason, /production/i);

  const forced = seedTarget({ NODE_ENV: 'production' }, ['--force']);
  assert.equal(forced.allowed, true);
});

test('localhost and 127.0.0.1 targets are local', () => {
  for (const uri of ['mongodb://localhost:27017/ghumo', 'mongodb://127.0.0.1/ghumo']) {
    const target = seedTarget({ MONGODB_URI: uri }, []);
    assert.equal(target.local, true, uri);
    assert.equal(target.allowed, true, uri);
  }
});

test('IPv6 loopback in brackets is local', () => {
  const target = seedTarget({ MONGODB_URI: 'mongodb://[::1]:27017/ghumo' }, []);
  assert.equal(target.local, true);
  assert.equal(target.allowed, true);
});

test('a local multi-host list stays local', () => {
  const target = seedTarget({ MONGODB_URI: 'mongodb://localhost:27017,127.0.0.1:27018/ghumo' }, []);
  assert.equal(target.local, true);
  assert.equal(target.allowed, true);
});

test('any mongodb+srv URI is remote', () => {
  const target = seedTarget({ MONGODB_URI: REMOTE }, []);
  assert.equal(target.local, false);
  assert.equal(target.allowed, false);
  assert.match(target.reason, /remote/i);
});

test('the remote target names the host and database, never the credentials', () => {
  const target = seedTarget({ MONGODB_URI: REMOTE }, []);
  assert.equal(target.label, 'cluster.example.net/ghumo');
  assert.ok(!JSON.stringify(target).includes('s3cret'));
  assert.ok(!target.label.includes('user'));
});

test('a remote URI is allowed with --force, and production still needs it', () => {
  assert.equal(seedTarget({ MONGODB_URI: REMOTE }, ['--force']).allowed, true);
  assert.equal(seedTarget({ MONGODB_URI: REMOTE, NODE_ENV: 'production' }, ['--force']).allowed, true);
  assert.equal(seedTarget({ MONGODB_URI: REMOTE, NODE_ENV: 'production' }, []).allowed, false);
});

test('the CLI refuses a remote target before connecting and prints a masked target', () => {
  const seedScript = path.join(__dirname, '..', 'src', 'seed.js');
  const env = { ...process.env, MONGODB_URI: REMOTE };
  delete env.NODE_ENV;

  const result = spawnSync(process.execPath, [seedScript], { env, encoding: 'utf8' });

  assert.equal(result.status, 1);
  const output = `${result.stdout}${result.stderr}`;
  assert.ok(output.includes('cluster.example.net/ghumo'));
  assert.ok(output.includes('--force'));
  assert.ok(!output.includes('s3cret'));
  assert.ok(!output.includes('About to wipe and reseed'));
});
