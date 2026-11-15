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
    async open(filename) {
      const currentPath = filePath(filename);
      try {
        const stat = await fs.promises.stat(currentPath);
        if (!stat.isFile()) return null;
        return {
          stream: fs.createReadStream(currentPath),
          contentType: CONTENT_TYPES[path.extname(filename).toLowerCase()] || 'application/octet-stream',
          size: stat.size,
        };
      } catch (err) {
        if (err.code === 'ENOENT') return null;
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