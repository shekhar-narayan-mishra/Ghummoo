// Picks where uploaded photos are stored. UPLOAD_STORAGE=disk (default) or gridfs.
// Every adapter has the same three methods:
//   save({ buffer, filename, contentType }) -> { url }
//   open(filename) -> { stream, contentType, size } | null
//   remove(filename)
// Read at call time (not require time) so tests and hosts can switch it with the environment.
const path = require('path');
const { createDiskStorage } = require('./disk');
const { createGridFsStorage } = require('./gridfs');

const uploadDir = () => process.env.UPLOAD_DIR || path.join(__dirname, '..', '..', '..', 'uploads');

const adapters = new Map();
function cached(key, create) {
  if (!adapters.has(key)) adapters.set(key, create());
  return adapters.get(key);
}

const diskStorage = () => { const dir = uploadDir(); return cached(`disk:${dir}`, () => createDiskStorage(dir)); };
const gridFsStorage = () => cached('gridfs', () => createGridFsStorage());

function getStorage() {
  const mode = (process.env.UPLOAD_STORAGE || 'disk').toLowerCase();
  if (mode === 'gridfs') return gridFsStorage();
  if (mode === 'disk') return diskStorage();
  throw new Error(`Unknown UPLOAD_STORAGE "${process.env.UPLOAD_STORAGE}". Use "disk" or "gridfs".`);
}

// While moving to GridFS, photos uploaded earlier are still on local disk: serve them as a fallback.
const getFallbackStorage = () => (getStorage().name === 'gridfs' ? diskStorage() : null);

module.exports = { getStorage, getFallbackStorage };
