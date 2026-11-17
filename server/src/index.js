require('dotenv').config({ path: require('path').join(__dirname, '..', '.env'), quiet: true });
const { connectDB, disconnectDB } = require('./config/db');
const { resolveJwtSecret } = require('./config/secrets');
const { seedIfEmpty, rotatePublicDemoPasswords } = require('./seedData');
const { runFoundation } = require('./migrations/v0_1');

// Never crash-loop on a bad secret: hosts like Render keep restarting a crashed app and every
// request just hangs. A missing, example or (in production) short secret is replaced by a random
// per-process one, with a loud warning.
{
  const { secret, warning } = resolveJwtSecret();
  process.env.JWT_SECRET = secret;
  if (warning) console.warn(warning);
}

const app = require('./app');

const PORT = process.env.PORT || 5050;
const RETRY_MS = 15000;

// Mask credentials before logging a connection string.
const safeUri = (uri) => String(uri || '').replace(/\/\/[^@/]+@/, '//***@');

function explain(err) {
  const msg = String(err && err.message);
  if (/ENOTFOUND|querySrv|EAI_AGAIN/i.test(msg)) {
    return `Could not find the MongoDB host (${safeUri(process.env.MONGODB_URI)}). Check that MONGODB_URI is correct and the cluster still exists.`;
  }
  if (/auth|Authentication failed/i.test(msg)) return 'MongoDB rejected the username or password in MONGODB_URI.';
  if (/timed out|Server selection|ECONNREFUSED/i.test(msg)) {
    return 'Could not connect to MongoDB. Check MONGODB_URI and that the cluster allows connections from this server (Atlas Network Access).';
  }
  return msg;
}

// Connect in the background and keep retrying, so the API answers with a clear 503
// instead of the process exiting and the host restarting it in a loop.
async function connectWithRetry() {
  for (;;) {
    try {
      // eslint-disable-next-line no-await-in-loop -- sequential database connection in retry loop
      const { mode } = await connectDB();
      app.locals.db = { ready: false, mode, error: null, state: 'seeding' };
      if (process.env.SEED_ON_EMPTY !== 'false' && (mode === 'embedded' || process.env.SEED_ON_EMPTY === 'true')) {
        // eslint-disable-next-line no-await-in-loop -- sequential seed check after connection
        await seedIfEmpty();
      }
      // Deployments seeded before v0.3.0 gave demo accounts the README password; replace it.
      // eslint-disable-next-line no-await-in-loop -- sequential step after database connection
      await rotatePublicDemoPasswords();
      // V0.1 content directory + package links + confirmed-seat counters (idempotent, non-destructive).
      if (process.env.AUTO_MIGRATE !== 'false') {
        // eslint-disable-next-line no-await-in-loop -- sequential migration after database connection
        await runFoundation({ log: console.log });
      }
      app.locals.db = { ready: true, mode, error: null, state: 'ready' };
      console.log('[ghumo] database ready');
      return;
    } catch (err) {
      const reason = explain(err);
      app.locals.db = { ready: false, error: reason, state: 'error' };
      console.error(`[db] ${reason} Retrying in ${RETRY_MS / 1000}s.`);
      // eslint-disable-next-line no-await-in-loop -- backoff delay before reconnect attempt
      await new Promise((r) => setTimeout(r, RETRY_MS));
    }
  }
}

function start() {
  app.locals.db = { ready: false, error: null, state: 'starting' };
  const server = app.listen(PORT, '0.0.0.0', () => console.log(`[ghumo] listening on http://localhost:${PORT}`));
  connectWithRetry();

  let closing = false;
  const shutdown = (signal) => async () => {
    if (closing) return;
    closing = true;
    server.close();
    await disconnectDB().catch(() => {});
    // nodemon's default restart signal: re-raise it so nodemon knows we're done.
    if (signal === 'SIGUSR2') process.kill(process.pid, 'SIGUSR2');
    else process.exit(0);
  };
  process.on('SIGINT', shutdown('SIGINT'));
  process.on('SIGTERM', shutdown('SIGTERM'));
  process.once('SIGUSR2', shutdown('SIGUSR2'));
}

start();
