const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');

let memoryServer = null;

const { execFileSync } = require('child_process');

// True when `pid` is a mongod for this dbPath whose parent server has died (re-parented to init).
function isOrphanedMongod(pid, dbPath) {
  try {
    const out = execFileSync('ps', ['-o', 'ppid=,command=', '-p', String(pid)], { encoding: 'utf8' }).trim();
    const [ppid, ...cmd] = out.split(/\s+/);
    return Number(ppid) === 1 && /mongod/.test(cmd.join(' ')) && cmd.join(' ').includes(dbPath);
  } catch { return false; }
}

const isAlive = (pid) => { try { process.kill(pid, 0); return true; } catch (e) { return e.code === 'EPERM'; } };

// mongod writes its PID into mongod.lock while running and empties it on clean shutdown.
// When a dev-server restart leaves the previous mongod still shutting down, wait for it
// (up to ~30 s) instead of failing to start.
async function waitForLockRelease(dbPath) {
  const lockFile = path.join(dbPath, 'mongod.lock');
  for (let i = 0; i < 30; i += 1) {
    let pid = 0;
    try { pid = Number(fs.readFileSync(lockFile, 'utf8').trim()) || 0; } catch { return; }
    if (!pid || pid === process.pid || !isAlive(pid)) return;
    if (i === 0) console.log(`[db] waiting for the previous embedded database (pid ${pid}) to shut down…`);
    if (i === 5 && isOrphanedMongod(pid, dbPath)) {
      console.log(`[db] stopping orphaned embedded database (pid ${pid})`);
      try { process.kill(pid, 'SIGTERM'); } catch { /* already gone */ }
    }
    // eslint-disable-next-line no-await-in-loop -- sequential polling retry waiting for lock release
    await new Promise((r) => setTimeout(r, 1000));
  }
}

// Connects to MONGODB_URI when set. Otherwise starts an embedded MongoDB (mongodb-memory-server)
// that persists to server/.data so local development and demos work with zero setup.
async function connectDB() {
  mongoose.set('strictQuery', true);
  let uri = process.env.MONGODB_URI;
  let mode = 'external';

  if (!uri) {
    // Keep the downloaded mongod binary in server/.cache regardless of the working directory.
    process.env.MONGOMS_DOWNLOAD_DIR = process.env.MONGOMS_DOWNLOAD_DIR || path.join(__dirname, '..', '..', '.cache', 'mongodb-binaries');
    const { MongoMemoryServer } = require('mongodb-memory-server');
    const dbPath = process.env.EMBEDDED_DB_PATH || path.join(__dirname, '..', '..', '.data');
    fs.mkdirSync(dbPath, { recursive: true });
    await waitForLockRelease(dbPath);
    try {
      memoryServer = await MongoMemoryServer.create({
        instance: { dbPath, storageEngine: 'wiredTiger', port: Number(process.env.EMBEDDED_DB_PORT) || undefined },
      });
    } catch (err) {
      if (/DBPathInUse|lock file/i.test(String(err && err.message))) {
        err.message = `The embedded database at ${dbPath} is in use by another Ghumo server. `
          + 'Stop the other server (only one can use the embedded DB at a time), or set MONGODB_URI.';
      }
      throw err;
    }
    uri = memoryServer.getUri('ghumo');
    mode = 'embedded';
  }

  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
  console.log(`[db] connected (${mode}) → ${mongoose.connection.name}`);
  return { mode };
}

async function disconnectDB() {
  await mongoose.disconnect();
  if (memoryServer) await memoryServer.stop({ doCleanup: false });
}

module.exports = { connectDB, disconnectDB };
