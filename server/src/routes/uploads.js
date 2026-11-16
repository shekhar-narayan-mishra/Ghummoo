const crypto = require('crypto');
const router = require('express').Router();
const multer = require('multer');
const { verifyToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/roleGuard');
const { detectImageType } = require('../utils/imageType');
const { getStorage } = require('../services/storage');

const EXT = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/avif': '.avif' };

const badImage = (message) => Object.assign(new Error(message), { statusCode: 400 });

// Files are held in memory (the 5 MB limit keeps that bounded) so the real signature can be
// checked before anything is handed to the storage adapter. The Content-Type a client sends is
// only a claim: a text file labelled image/png, or PNG bytes labelled image/jpeg, is refused and
// never stored. The stored name is generated here, so its extension always matches the content.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => {
    if (EXT[file.mimetype]) return cb(null, true);
    return cb(badImage('Only JPG, PNG, WebP or AVIF images are allowed'));
  },
});

router.post('/', verifyToken, requireRole('operator', 'admin'), upload.single('image'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'Please choose an image' });
    if (detectImageType(req.file.buffer) !== req.file.mimetype) {
      throw badImage("The file isn't a valid JPG, PNG, WebP or AVIF image");
    }
    const filename = `${Date.now().toString(36)}-${crypto.randomBytes(6).toString('hex')}${EXT[req.file.mimetype]}`;
    const { url } = await getStorage().save({ buffer: req.file.buffer, filename, contentType: req.file.mimetype });
    return res.status(201).json({ success: true, data: { url } });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
