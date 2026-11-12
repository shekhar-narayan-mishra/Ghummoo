// Detects an image type from its leading bytes (the file signature), so the server does not have
// to trust the Content-Type a client claims for an upload. Returns a MIME type or null.
const SIGNATURE_BYTES = 16;

const startsWith = (buf, bytes, offset = 0) =>
  buf.length >= offset + bytes.length && bytes.every((b, i) => buf[offset + i] === b);

const ascii = (buf, text, offset) => startsWith(buf, [...Buffer.from(text, 'ascii')], offset);

function detectImageType(buf) {
  if (!Buffer.isBuffer(buf)) return null;
  if (startsWith(buf, [0xff, 0xd8, 0xff])) return 'image/jpeg';
  if (startsWith(buf, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'image/png';
  if (ascii(buf, 'RIFF', 0) && ascii(buf, 'WEBP', 8)) return 'image/webp';
  if (ascii(buf, 'ftyp', 4) && (ascii(buf, 'avif', 8) || ascii(buf, 'avis', 8))) return 'image/avif';
  return null;
}

module.exports = { detectImageType, SIGNATURE_BYTES };
