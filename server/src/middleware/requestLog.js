// One JSON log line per request: { time, level, requestId, method, path, status, durationMs, role }.
// A request id returned to the client and printed in the logs connects a user's error report
// to the exact server entry. Lines never contain query strings, request bodies, cookies,
// headers, IP addresses, emails, phones or user IDs.
const crypto = require('crypto');

// An incoming id is echoed only when it is short and safe; anything else is replaced
// with a fresh UUID so header injection and log junk can't get through.
const SAFE_ID = /^[A-Za-z0-9._-]{1,64}$/;

// Assets and uploads are fetched dozens of times per page view; they log at debug
// level so the info stream stays readable.
const STATIC_PREFIX = /^\/(assets|uploads)\//;

// LOG_REQUESTS=false turns the log lines off; the header and req.id stay in place.
const linesEnabled = () => {
  const v = process.env.LOG_REQUESTS;
  return v === undefined || v.trim().toLowerCase() !== 'false';
};

function defaultWrite(line) {
  process.stdout.write(line);
}

const requestLog = ({ write = defaultWrite } = {}) => function requestLog(req, res, next) {
  const incoming = req.headers['x-request-id'];
  const requestId = typeof incoming === 'string' && SAFE_ID.test(incoming) ? incoming : crypto.randomUUID();
  req.id = requestId;
  res.setHeader('X-Request-Id', requestId);

  if (!linesEnabled()) return next();

  const started = process.hrtime.bigint();
  const level = STATIC_PREFIX.test(req.path) ? 'debug' : 'info';
  res.once('finish', () => {
    try {
      const line = `${JSON.stringify({
        time: new Date().toISOString(),
        level,
        requestId,
        method: req.method,
        path: req.path,
        status: res.statusCode,
        durationMs: Math.round((Number(process.hrtime.bigint() - started) / 1e6) * 10) / 10,
        role: (req.user && req.user.role) || 'anonymous',
      })}\n`;
      write(line);
    } catch {
      // A logging failure must never break a response.
    }
  });
  return next();
};

module.exports = { requestLog };
