// Request-id and request-log contract tests: the X-Request-Id header (generated and echoed),
// rejection of unsafe incoming ids, one JSON line per request with exactly the listed fields,
// no query strings, bodies or personal data in the logs, the LOG_REQUESTS=false switch and
// requestId in 500 responses. Line capture happens through an injected writer, and the real
// app runs under LOG_REQUESTS=false, so test output stays quiet either way.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const os = require('os');
const fs = require('fs');
const path = require('path');
const express = require('express');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ghumo-requestlog-test-'));
process.env.JWT_SECRET = 'test-secret';
process.env.UPLOAD_DIR = path.join(tmp, 'uploads');
process.env.LOG_REQUESTS = 'false'; // quiet default; logging-on tests opt in explicitly

const app = require('../src/app');
const { requestLog } = require('../src/middleware/requestLog');
const { errorHandler } = require('../src/middleware/errorHandler');

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

function serve(build) {
  const lines = [];
  const client = express();
  client.use(requestLog({ write: (line) => lines.push(line) }));
  build(client);
  const server = client.listen(0);
  const base = `http://127.0.0.1:${server.address().port}`;
  const close = () => new Promise((r) => server.close(r));
  return { lines, base, close };
}

// The `finish` event fires just before the client gives control back, so captured lines
// usually already exist; wait briefly rather than racing on them.
async function waitLines(lines, count, ms = 1000) {
  const t0 = Date.now();
  while (lines.length < count && Date.now() - t0 < ms) await new Promise((r) => setTimeout(r, 10));
}

// Swap the LOG_REQUESTS value for the duration of a test, then restore whatever it was.
const withLogRequests = (value, fn) => async () => {
  const prev = process.env.LOG_REQUESTS;
  process.env.LOG_REQUESTS = value;
  try {
    await fn();
  } finally {
    if (prev === undefined) delete process.env.LOG_REQUESTS;
    else process.env.LOG_REQUESTS = prev;
  }
};

test('Every API response carries X-Request-Id: generated when absent, kept across handlers', async () => {
  const server = app.listen(0);
  const base = `http://127.0.0.1:${server.address().port}`;
  const previousDb = app.locals.db;
  try {
    const first = await fetch(`${base}/api/health`);
    assert.equal(first.status, 200);
    assert.match(first.headers.get('x-request-id'), UUID, 'a fresh version 4 UUID');

    const second = await fetch(`${base}/api/health`, { headers: { 'x-request-id': 'abc.DEF-123_x' } });
    assert.equal(second.headers.get('x-request-id'), 'abc.DEF-123_x', 'a valid incoming id is echoed');

    // The request middleware runs before the database 503 gate, so that path also gets an id.
    app.locals.db = { ready: false, error: 'database is down in this test', state: 'error' };
    const gate = await fetch(`${base}/api/trips`);
    assert.equal(gate.status, 503);
    assert.match(gate.headers.get('x-request-id'), UUID, 'even the 503 gate response has an id');
    assert.equal((await gate.json()).code, 'DB_UNAVAILABLE');
  } finally {
    if (previousDb === undefined) delete app.locals.db;
    else app.locals.db = previousDb;
    server.close();
  }
});

test('An unsafe incoming X-Request-Id (length, charset, whitespace) is replaced', async () => {
  const server = app.listen(0);
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    for (const bad of ['../etc/passwd', 'bad id with spaces!', `${'a'.repeat(65)}`, 'semi;colon', 'b?roken']) {
      const res = await fetch(`${base}/api/health`, { headers: { 'x-request-id': bad } });
      const id = res.headers.get('x-request-id');
      assert.match(id, UUID, `replaced rather than echoed: ${JSON.stringify(bad)}`);
    }
  } finally {
    server.close();
  }
});

test('One JSON line per request, exactly the listed fields, query and body never leak', withLogRequests('true', async () => {
  const { lines, base, close } = serve((a) => {
    a.use(express.json());
    a.post('/api/things', (req, res) => res.json({ ok: true }));
  });
  try {
    const res = await fetch(`${base}/api/things?q=secretsearch&place=sohra`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'hidden@example.com', note: 'body that must not be logged' }),
    });
    assert.equal(res.status, 200);
    await waitLines(lines, 1);
    await close();

    assert.equal(lines.length, 1, 'exactly one line for the request');
    const entry = JSON.parse(lines[0]);
    assert.deepEqual(
      Object.keys(entry).sort().length === 0 ? [] : Object.keys(entry).sort(),
      ['durationMs', 'level', 'method', 'path', 'requestId', 'role', 'status', 'time'],
      'nothing beyond the listed fields',
    );
    assert.equal(entry.method, 'POST');
    assert.equal(entry.path, '/api/things', 'path without the query string');
    assert.equal(entry.status, 200);
    assert.equal(entry.role, 'anonymous');
    assert.equal(entry.level, 'info');
    assert.equal(typeof entry.durationMs, 'number');
    assert.ok(entry.durationMs >= 0);
    assert.equal(entry.time, new Date(entry.time).toISOString(), 'a well-formed timestamp');
    assert.equal(entry.requestId, res.headers.get('x-request-id'));

    const raw = lines.join('');
    for (const forbidden of ['secretsearch', 'place=sohra', 'sohra', 'hidden@example.com', 'body that must not be logged', 'note']) {
      assert.ok(!raw.includes(forbidden), `line must not contain: ${forbidden}`);
    }
  } finally {
    await close();
  }
}));

test('role comes from req.user without exposing the user record behind it', withLogRequests('true', async () => {
  const { lines, base, close } = serve((a) => {
    a.get('/api/mine', (req, res) => {
      req.user = { role: 'operator', email: 'organiser@example.com', _id: '507f1f77bcf86cd799439011' };
      res.json({ ok: true });
    });
  });
  try {
    const res = await fetch(`${base}/api/mine`);
    assert.equal(res.status, 200);
    await waitLines(lines, 1);
    await close();

    const entry = JSON.parse(lines[0]);
    assert.equal(entry.role, 'operator');
    const raw = lines.join('');
    assert.ok(!raw.includes('organiser@example.com'), 'no email');
    assert.ok(!raw.includes('507f1f77bcf86cd799439011'), 'no user id');
  } finally {
    await close();
  }
}));

test('Static files (/assets/*, /uploads/*) log at debug level', withLogRequests('true', async () => {
  const { lines, base, close } = serve((a) => {
    a.get('/assets/app.js', (req, res) => res.type('text/plain').send('/* script */'));
    a.get('/uploads/store/photo.jpg', (req, res) => res.type('text/plain').send('pretend file'));
  });
  try {
    for (const p of ['/assets/app.js', '/uploads/store/photo.jpg']) {
      const res = await fetch(base + p);
      assert.equal(res.status, 200);
      assert.ok(res.headers.get('x-request-id'), 'the response still carries a request id');
    }
    await waitLines(lines, 2);
    await close();

    assert.equal(lines.length, 2);
    for (const line of lines) {
      const entry = JSON.parse(line);
      assert.equal(entry.level, 'debug');
      assert.match(entry.path, /^\/(assets|uploads)\//);
    }
  } finally {
    await close();
  }
}));

test('LOG_REQUESTS=false silences the log lines but keeps the header and req.id', withLogRequests('false', async () => {
  const { lines, base, close } = serve((a) => {
    a.get('/api/things', (req, res) => {
      assert.equal(typeof req.id, 'string');
      assert.ok(req.id.length > 0, 'the id is still assigned to the request');
      res.json({ ok: true });
    });
  });
  try {
    const res = await fetch(`${base}/api/things`);
    assert.equal(res.status, 200);
    assert.match(res.headers.get('x-request-id'), UUID);
    await new Promise((r) => setTimeout(r, 80));
    await close();
    assert.equal(lines.length, 0, 'no log line is written');
  } finally {
    await close();
  }
}));

test('A forced 500 returns requestId in the body and logs the same id with the error', withLogRequests('true', async () => {
  const { lines, base, close } = serve((a) => {
    a.post('/api/boom', (req, res, next) => next(new Error('boom for the test')));
    a.use(errorHandler);
  });
  const capturedConsole = [];
  const originalError = console.error;
  console.error = (...parts) => capturedConsole.push(parts.map(String).join(' '));
  try {
    const res = await fetch(`${base}/api/boom`, { method: 'POST' });
    assert.equal(res.status, 500);
    const body = await res.json();
    const requestId = res.headers.get('x-request-id');
    assert.equal(body.success, false);
    assert.equal(typeof body.requestId, 'string', 'the 500 body quotes the same id the client received');
    assert.equal(body.requestId, requestId);
    await waitLines(lines, 1);
    await close();

    const requestLine = JSON.parse(lines[0]);
    assert.equal(requestLine.status, 500);
    assert.equal(requestLine.requestId, requestId, 'the request line carries the same id');

    assert.equal(capturedConsole.length, 1, 'one console.error line for the failure');
    assert.ok(capturedConsole[0].includes('requestId=' + requestId), 'console.error includes the id');
    assert.ok(capturedConsole[0].includes('[error]'));
    assert.ok(capturedConsole[0].includes('path=/api/boom'), 'console.error includes the path without a query');
  } finally {
    console.error = originalError;
    await close();
  }
}));
