const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const router = require('express').Router();
const multer = require('multer');
const { verifyToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/roleGuard');
const { detectImageType, SIGNATURE_BYTES } = require('../utils/imageType');

const uploadDir = process.env.UPLOAD_DIR || path.join(__dirname, '..', '..', 'uploads');
const EXT = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/avif': '.avif' };

const upload = multer({
  storage: multer.diskStorage({
    destination: uploadDir,
    filename: (req, file, cb) => cb(null, `${Date.now().toString(36)}-${crypto.randomBytes(6).toString('hex')}${EXT[file.mimetype]}`),
  }),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => {
    if (EXT[file.mimetype]) return cb(null, true);
    const err = new Error('Only JPG, PNG, WebP or AVIF images are allowed');
    err.statusCode = 400;
    return cb(err);
  },
});

async function readSignature(filePath) {
  const handle = await fs.promises.open(filePath, 'r');
  try {
    const buf = Buffer.alloc(SIGNATURE_BYTES);
    const { bytesRead } = await handle.read(buf, 0, SIGNATURE_BYTES, 0);
    return buf.subarray(0, bytesRead);
  } finally {
    await handle.close();
  }
}

router.post('/', verifyToken, requireRole('operator', 'admin'), upload.single('image'), async (req, res, next) => {
  if (!req.file) return res.status(400).json({ success: false, message: 'Please choose an image' });
  try {
    // The fileFilter only saw the claimed Content-Type; check the real bytes match it.
    const detected = detectImageType(await readSignature(req.file.path));
    if (detected !== req.file.mimetype) {
      try {
        await fs.promises.unlink(req.file.path);
      } catch (err) {
        console.error(`[uploads] Could not delete rejected file ${req.file.filename}: ${err.message}`);
      }
      return res.status(400).json({ success: false, message: "The file isn't a valid JPG, PNG, WebP or AVIF image" });
    }
    return res.status(201).json({ success: true, data: { url: `/uploads/${req.file.filename}` } });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
