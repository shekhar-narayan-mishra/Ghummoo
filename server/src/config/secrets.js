const crypto = require('crypto');

// The placeholder shipped in server/.env.example. A deployment that copied the example file
// unchanged must not sign sessions with a value anyone can read on GitHub.
const EXAMPLE_JWT_SECRET = 'change-me-to-a-long-random-string';
const MIN_PRODUCTION_LENGTH = 32;

// Decides which JWT secret the server uses. It never throws: a crash-looping app on hosts like
// Render just hangs every request. A missing secret, or in production an example or short one,
// is replaced by a random per-process secret (everyone is signed out on restart) with a warning.
function resolveJwtSecret(env = process.env) {
  const production = env.NODE_ENV === 'production';
  const secret = env.JWT_SECRET || '';
  let problem = null;
  if (!secret) problem = 'is not set';
  else if (production && secret === EXAMPLE_JWT_SECRET) problem = 'is the example value from server/.env.example';
  else if (production && secret.length < MIN_PRODUCTION_LENGTH) problem = `is shorter than ${MIN_PRODUCTION_LENGTH} characters`;
  if (!problem) return { secret, warning: null };
  return {
    secret: crypto.randomBytes(32).toString('hex'),
    warning: production
      ? `[auth] WARNING: JWT_SECRET ${problem}. Using a random secret instead, so everyone is logged out on each restart. `
        + `Set JWT_SECRET to a long random value (at least ${MIN_PRODUCTION_LENGTH} characters), e.g. \`openssl rand -hex 32\`.`
      : '[auth] JWT_SECRET not set; using a random development secret.',
  };
}

module.exports = { resolveJwtSecret, EXAMPLE_JWT_SECRET, MIN_PRODUCTION_LENGTH };
