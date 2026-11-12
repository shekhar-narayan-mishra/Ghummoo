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

const badImage = (message) => Object.assign(new Error(message), { statusCode: 400 });

/* Multer storage engine that checks the file's real signature before anything reaches the disk.
   The Content-Type a client sends for the part is only a claim, so the first bytes must match it:
   a text file labelled image/png, or PNG bytes labelled image/jpeg, is refused and never stored.
   The stored name is generated here, so its extension always matches the content. */
const signatureCheckedStorage = {
  _handleFile(req, file, cb) {
    const { stream } = file;
    const head = [];
    let headLength = 0;
    let ended = false;

    function onData(chunk) {
      head.push(chunk);
      headLength += chunk.length;
      if (headLength >= SIGNATURE_BYTES) decide();
    }
    function onEnd() { ended = true; decide(); }
    function onError(err) { detach(); cb(err); }
    function detach() {
      stream.off('data', onData);
      stream.off('end', onEnd);
      stream.off('error', onError);
    }

    function decide() {
      detach();
      stream.pause();
      const start = Buffer.concat(head);
      if (detectImageType(start) !== file.mimetype) {
        // Drain the rest of the part before answering, so an oversized file still gets the
        // "smaller than 5 MB" error (multer reports the size limit first).
        const reject = () => cb(badImage("The file isn't a valid JPG, PNG, WebP or AVIF image"));
        if (ended) return reject();
        stream.once('end', reject);
        return stream.resume();
      }
      const filename = `${Date.now().toString(36)}-${crypto.randomBytes(6).toString('hex')}${EXT[file.mimetype]}`;
      const dest = path.join(uploadDir, filename);
      const out = fs.createWriteStream(dest, { flags: 'wx' });
      out.on('error', (err) => {
        stream.unpipe(out);
        stream.resume();
        fs.unlink(dest, () => cb(err)); // don't leave a partial file behind
      });
      out.on('finish', () => cb(null, { destination: uploadDir, filename, path: dest, size: out.bytesWritten }));
      if (ended) return out.end(start);
      out.write(start);
      stream.on('error', (err) => out.destroy(err));
      return stream.pipe(out);
    }

    stream.on('data', onData);
    stream.on('end', onEnd);
    stream.on('error', onError);
  },
  // Called by multer when a stored file has to be discarded (e.g. it went over the size limit).
  _removeFile(req, file, cb) {
    fs.unlink(path.join(uploadDir, path.basename(file.filename)), cb);
  },
};

const upload = multer({
  storage: signatureCheckedStorage,
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => {
    if (EXT[file.mimetype]) return cb(null, true);
    return cb(badImage('Only JPG, PNG, WebP or AVIF images are allowed'));
  },
});

router.post('/', verifyToken, requireRole('operator', 'admin'), upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, message: 'Please choose an image' });
  return res.status(201).json({ success: true, data: { url: `/uploads/${req.file.filename}` } });
});

module.exports = router;
