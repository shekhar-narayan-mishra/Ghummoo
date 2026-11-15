const fs = require('fs');
const path = require('path');

const CONTENT_TYPES = {
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
};

function createDiskStorage(uploadDir) {
  function filePath(filename) {
    return path.join(uploadDir, path.basename(filename));
  }

  return {
    name: 'disk',
    async save({ buffer, filename }) {
      await fs.promises.mkdir(uploadDir, { recursive: true });
      await fs.promises.writeFile(filePath(filename), buffer, { flag: 'wx' });
      return { url: `/uploads/${filename}` };
    },
    // Opens the file before returning, so the size and the stream refer to the same file: a file
    // removed or replaced after open() is still read in full (a lazily opened stream would fail with
    // ENOENT, or send different bytes than Content-Length promised).
    async open(filename) {
      let handle;
      try {
        handle = await fs.promises.open(filePath(filename), 'r');
      } catch (err) {
        if (err.code === 'ENOENT' || err.code === 'EISDIR') return null;
        throw err;
      }
      try {
        const stat = await handle.stat();
        if (!stat.isFile()) { await handle.close(); return null; }
        return {
          stream: handle.createReadStream(),
          contentType: CONTENT_TYPES[path.extname(filename).toLowerCase()] || 'application/octet-stream',
          size: stat.size,
        };
      } catch (err) {
        await handle.close().catch(() => {});
        throw err;
      }
    },
    async remove(filename) {
      try {
        await fs.promises.unlink(filePath(filename));
      } catch (err) {
        if (err.code !== 'ENOENT') throw err;
      }
    },
  };
}

module.exports = { createDiskStorage };