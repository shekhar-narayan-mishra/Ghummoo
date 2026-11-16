// GridFS adapter: photos live in the same MongoDB as the rest of the data, so they survive
// redeploys on hosts with an ephemeral filesystem. Files are looked up by filename, so the
// public /uploads/<filename> URLs are the same as with the disk adapter.
// `mongoose.mongo` is the driver Mongoose already bundles, so this adds no dependency.
const mongoose = require('mongoose');

const BUCKET = 'uploads';

function createGridFsStorage(connection = mongoose.connection) {
  function bucket() {
    if (!connection.db) throw Object.assign(new Error('GridFS is not ready until MongoDB is connected'), { statusCode: 503 });
    return new mongoose.mongo.GridFSBucket(connection.db, { bucketName: BUCKET });
  }

  return {
    name: 'gridfs',
    async save({ buffer, filename, contentType }) {
      await new Promise((resolve, reject) => {
        const upload = bucket().openUploadStream(filename, { metadata: { contentType } });
        upload.once('error', reject);
        upload.once('finish', resolve);
        upload.end(buffer);
      });
      return { url: `/uploads/${filename}` };
    },
    async open(filename) {
      const file = await bucket().find({ filename }).limit(1).next();
      if (!file) return null;
      return {
        stream: bucket().openDownloadStream(file._id),
        contentType: file.metadata?.contentType || 'application/octet-stream',
        size: file.length,
      };
    },
    async remove(filename) {
      const files = await bucket().find({ filename }).toArray();
      await Promise.all(files.map((file) => bucket().delete(file._id)));
    },
  };
}

module.exports = { createGridFsStorage };
