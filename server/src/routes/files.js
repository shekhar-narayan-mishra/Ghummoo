// Serves uploaded photos at /uploads/<filename> from the active storage adapter, so the URLs
// stored in the database are the same whichever adapter is in use.
const router = require('express').Router();
const { getStorage, getFallbackStorage } = require('../services/storage');

const SAFE_NAME = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

router.get('/:name', async (req, res, next) => {
  const { name } = req.params;
  if (!SAFE_NAME.test(name)) return res.status(404).end();
  try {
    let file = null;
    try {
      file = await getStorage().open(name);
    } catch (err) {
      if (!getFallbackStorage()) throw err; // GridFS unavailable but the file may still be on disk
    }
    if (!file) file = await getFallbackStorage()?.open(name) ?? null;
    if (!file) return res.status(404).end();

    res.set({
      'Content-Type': file.contentType,
      'Content-Length': String(file.size),
      'Cache-Control': 'public, max-age=604800',
      'X-Content-Type-Options': 'nosniff',
    });
    file.stream.once('error', (err) => {
      if (res.headersSent) return res.destroy(err);
      return next(err);
    });
    return file.stream.pipe(res);
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
