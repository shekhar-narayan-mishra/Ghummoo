const crypto = require('crypto');

const slugify = (s) =>
  String(s || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/[\s_-]+/g, '-')
    .slice(0, 70) || 'item';

async function uniqueSlug(Model, base, excludeId) {
  const root = slugify(base);
  let candidate = root;
  for (let i = 0; i < 20; i += 1) {
    const q = { slug: candidate };
    if (excludeId) q._id = { $ne: excludeId };
    // eslint-disable-next-line no-await-in-loop -- sequential uniqueness check with early return on first available slug
    if (!(await Model.exists(q))) return candidate;
    candidate = `${root}-${crypto.randomBytes(2).toString('hex')}`;
  }
  return `${root}-${Date.now().toString(36)}`;
}

// Human-friendly booking reference, e.g. GHM-7K3P9Q (no ambiguous chars).
function bookingReference() {
  const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  const limit = 256 - (256 % alphabet.length); // reject the top bytes so every symbol is equally likely
  let out = '';
  while (out.length < 6) {
    for (const b of crypto.randomBytes(8)) {
      if (b < limit && out.length < 6) out += alphabet[b % alphabet.length];
    }
  }
  return `GHM-${out}`;
}

// Email shape check. The length cap (RFC 5321 allows 254) runs before the regex, so a crafted
// multi-kilobyte string can never reach it. /^\S+@\S+\.\S+$/ alone is polynomial on input like
// "!@!@!@…": 64,000 characters blocked the event loop for about 2 seconds.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const isEmail = (v) => typeof v === 'string' && v.length <= 254 && EMAIL_RE.test(v);

const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const toList = (v) => {
  if (Array.isArray(v)) return v.map((x) => String(x).trim()).filter(Boolean);
  if (typeof v === 'string') return v.split('\n').map((x) => x.trim()).filter(Boolean);
  return [];
};

// One CSV cell. Values starting with a character a spreadsheet treats as a formula (=, +, -, @,
// tab or carriage return) are prefixed with ' so an exported manifest can't run formulas.
const csvCell = (v) => {
  let s = v == null ? '' : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
};

// Phone numbers: an optional leading +, then 8-17 digits, spaces or hyphens. The same rule is
// used for the booking contact, profile, sign-up and traveller phones (client: lib/validation.js).
const PHONE_PATTERN = /^[+\d][\d\s-]{7,16}$/;
const PHONE_MAX_LENGTH = 17; // the longest string PHONE_PATTERN accepts
const EMERGENCY_CONTACT_MAX_LENGTH = 120;
const isPhone = (v) => PHONE_PATTERN.test(String(v ?? '').trim());

module.exports = {
  slugify, uniqueSlug, bookingReference, escapeRegex, toList, csvCell, isEmail, EMAIL_RE,
  PHONE_PATTERN, PHONE_MAX_LENGTH, EMERGENCY_CONTACT_MAX_LENGTH, isPhone,
};
