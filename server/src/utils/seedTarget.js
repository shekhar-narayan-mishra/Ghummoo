// Decides what `npm run seed` is about to wipe, before any connection is opened.
// The seed script drops every collection, so pointing it at a shared or production
// cluster must take a deliberate extra step: pass --force.
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);

// Same masking rule as safeUri in src/index.js: never print the username or password.
const maskCredentials = (uri) => String(uri).replace(/\/\/[^@/]+@/, '//***@');

// A mongodb URI is not a URL we can hand to `new URL()`: multi-host lists break it and
// mongodb+srv has no standard scheme. Split it by hand.
function parseUri(uri) {
  const masked = maskCredentials(uri);
  const srv = /^mongodb\+srv:\/\//i.test(String(uri));
  const withoutScheme = masked.replace(/^mongodb(?:\+srv)?:\/\//i, '');
  const authority = withoutScheme.split('/')[0] || '';
  const rest = withoutScheme.slice(authority.length);
  const hostPart = authority.includes('@') ? authority.slice(authority.lastIndexOf('@') + 1) : authority;
  const hosts = hostPart.split(',').map((host) => {
    const bracketed = host.trim().match(/^\[([^\]]+)\](?::\d+)?$/);
    if (bracketed) return bracketed[1].toLowerCase();
    return host.trim().split(':')[0].toLowerCase();
  }).filter(Boolean);
  const dbName = rest.replace(/^\//, '').split('?')[0];
  return { srv, hostPart, hosts, dbName };
}

// Pure decision function: nothing connects, nothing is read from the database.
// Returns the target that would be wiped and whether that is allowed.
function seedTarget(env = process.env, argv = []) {
  const uri = env.MONGODB_URI;
  const force = argv.includes('--force');
  const production = env.NODE_ENV === 'production';

  if (!uri) {
    // No MONGODB_URI: connectDB() starts the embedded database under server/.data.
    const dir = env.EMBEDDED_DB_PATH || 'server/.data';
    const allowed = force || !production;
    return {
      label: `embedded database at ${dir}`,
      local: true,
      allowed,
      reason: allowed ? '' : 'Refusing to wipe a production database.',
    };
  }

  const { srv, hostPart, hosts, dbName } = parseUri(uri);
  const local = !srv && hosts.length > 0 && hosts.every((host) => LOCAL_HOSTS.has(host));
  const label = `${hostPart}${dbName ? `/${dbName}` : ''}`;
  const allowed = force || (!production && local);

  let reason = '';
  if (!allowed) {
    reason = production
      ? 'Refusing to wipe a production database.'
      : 'Refusing to wipe a remote database.';
  }
  return { label, local, allowed, reason };
}

module.exports = { seedTarget };
