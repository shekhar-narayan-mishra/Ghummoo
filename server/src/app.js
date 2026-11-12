const path = require('path');
const fs = require('fs');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const { errorHandler, notFound } = require('./middleware/errorHandler');
const { requestLog } = require('./middleware/requestLog');

const app = express();
app.set('trust proxy', 1);

// First middleware in: every response gets an X-Request-Id and one JSON log line records
// the request (requestLog runs before the database 503 gate, so that path gets an id too).
app.use(requestLog());

app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      'img-src': ["'self'", 'data:', 'blob:', 'https:'],
      'connect-src': ["'self'"],
      'font-src': ["'self'", 'https://fonts.gstatic.com'],
      'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

const allowed = (process.env.CLIENT_URL || 'http://localhost:5173').split(',').map((s) => s.trim());
app.use(cors({ origin: (origin, cb) => cb(null, !origin || allowed.includes(origin)), credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

const uploadDir = process.env.UPLOAD_DIR || path.join(__dirname, '..', 'uploads');
fs.mkdirSync(uploadDir, { recursive: true });
app.use('/uploads', express.static(uploadDir, { maxAge: '7d' }));

// Health reports database readiness so hosts and humans can see why the API isn't serving.
// In production the reason (host names, raw driver errors) stays in the server logs, not in public responses.
const hideDbError = () => process.env.NODE_ENV === 'production';

app.get('/api/health', (req, res) => {
  const db = req.app.locals.db;
  const ok = !db || db.ready;
  const reason = db?.error && hideDbError() ? 'unavailable' : db?.error;
  res.status(ok ? 200 : 503).json({ success: ok, data: { status: ok ? 'ok' : db.state, database: db ? (db.ready ? 'ready' : reason || 'connecting') : 'ready' } });
});

// Until the database is connected, answer API calls immediately with a readable 503
// rather than letting them hang. (Tests attach the DB before creating the app, so no state = ready.)
app.use('/api', (req, res, next) => {
  const db = req.app.locals.db;
  if (!db || db.ready) return next();
  let message = 'The server is starting up. Please try again in a few seconds.';
  if (db.error) message = hideDbError() ? "The server can't reach its database right now. Please try again shortly." : `The server can't reach its database. ${db.error}`;
  return res.status(503).json({ success: false, code: 'DB_UNAVAILABLE', message });
});
app.use('/api/auth', require('./routes/auth'));
app.use('/api/trips', require('./routes/trips'));
app.use('/api/india', require('./routes/india'));
app.use('/api/saved', require('./routes/saved'));
app.use('/api/discover', require('./routes/discover'));
app.use('/api/groups', require('./routes/groups'));
app.use('/api/organisers', require('./routes/organisers'));
app.use('/api/bookings', require('./routes/bookings'));
app.use('/api/operator', require('./routes/operator'));
app.use('/api/ai', require('./routes/ai'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/uploads', require('./routes/uploads'));
app.use('/api', notFound);

// In production the built SPA is served from the same origin.
const clientDist = path.join(__dirname, '..', '..', 'client', 'dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist, { maxAge: '1h', index: false }));
  app.get('*', (req, res) => res.sendFile(path.join(clientDist, 'index.html')));
}

app.use(notFound);
app.use(errorHandler);

module.exports = app;
