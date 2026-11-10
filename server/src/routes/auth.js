const router = require('express').Router();
const jwt = require('jsonwebtoken');
const { User, Operator } = require('../models');
const { verifyToken, optionalAuth } = require('../middleware/auth');
const { isVerified } = require('../services/trips');
const { asyncHandler } = require('../middleware/errorHandler');
const { badRequest } = require('../utils/http');
const { isEmail, isPhone } = require('../utils/text');
const { rateLimit } = require('../middleware/rateLimit');

// Brute-force protection: failed sign-ins per account and IP, and new accounts per IP.
const loginLimiter = rateLimit({ windowMs: 15 * 60000, max: Number(process.env.LOGIN_FAILURES_PER_15_MIN) || 10, name: 'login', onlyFailures: true,
  key: (req) => `${req.ip}:${String(req.body?.email || '').trim().toLowerCase()}` });
const registerLimiter = rateLimit({ windowMs: 15 * 60000, max: Number(process.env.REGISTRATIONS_PER_15_MIN) || 20, name: 'register' });

// `secure` follows the actual connection (trust proxy is on), so cookies work on plain-HTTP
// localhost and are HTTPS-only behind Replit's or any other TLS proxy.
//
// When the web app is hosted on a different site from the API (e.g. two *.onrender.com
// services, which browsers treat as separate sites), the cookie must be SameSite=None; Secure
// or the browser won't send it with API requests.
function isCrossSite(req) {
  const origin = req.headers.origin;
  if (!origin) return false;
  try { return new URL(origin).host !== req.headers.host; } catch { return false; }
}
const cookieOpts = (req) => ({
  httpOnly: true,
  secure: req.secure,
  sameSite: isCrossSite(req) && req.secure ? 'none' : 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000,
});

// Optional phone: empty input clears it (null); anything else must look like a phone number.
function cleanPhone(value) {
  if (value === undefined || value === null) return null;
  const phone = String(value).trim();
  if (!phone) return null;
  if (!isPhone(phone)) throw badRequest('Phone number looks invalid. Use digits, spaces or hyphens, e.g. +91 98765 43210');
  return phone;
}

const sign = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

async function profile(user) {
  const out = { _id: user._id, name: user.name, email: user.email, role: user.role, phone: user.phone, isDemo: user.isDemo };
  if (user.role === 'operator') {
    const op = await Operator.findOne({ owner: user._id }).lean();
    out.operator = op ? { _id: op._id, businessName: op.businessName, slug: op.slug, status: op.status, verified: isVerified(op) } : null;
  }
  return out;
}

router.post('/register', registerLimiter, asyncHandler(async (req, res) => {
  const { name, email, password, phone } = req.body || {};
  const role = req.body.role === 'operator' ? 'operator' : 'traveler';
  if (!name || String(name).trim().length < 2) throw badRequest('Please enter your full name');
  if (!isEmail(email)) throw badRequest('Please enter a valid email address');
  if (!password || String(password).length < 8) throw badRequest('Password must be at least 8 characters');
  const cleanedPhone = cleanPhone(phone);
  if (await User.exists({ email: String(email).toLowerCase().trim() })) throw badRequest('An account with this email already exists');
  const user = await User.create({ name, email, passwordHash: String(password), role, phone: cleanedPhone });
  res.cookie('token', sign(user._id), cookieOpts(req));
  res.status(201).json({ success: true, data: await profile(user) });
}));

router.post('/login', loginLimiter, asyncHandler(async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) throw badRequest('Email and password are required');
  const user = await User.findOne({ email: String(email).toLowerCase().trim() }).select('+passwordHash');
  if (!user || !(await user.comparePassword(String(password)))) {
    return res.status(401).json({ success: false, message: 'Incorrect email or password' });
  }
  res.cookie('token', sign(user._id), cookieOpts(req));
  return res.json({ success: true, data: await profile(user) });
}));

router.post('/logout', (req, res) => {
  res.clearCookie('token', { ...cookieOpts(req), maxAge: undefined });
  res.json({ success: true, data: null });
});

// Returns null (not 401) for anonymous visitors so the SPA can check the session quietly.
router.get('/me', optionalAuth, asyncHandler(async (req, res) => {
  res.json({ success: true, data: req.user ? await profile(req.user) : null });
}));

router.put('/me', verifyToken, asyncHandler(async (req, res) => {
  const { name, phone } = req.body || {};
  const cleanedPhone = phone === undefined ? undefined : cleanPhone(phone);
  const user = await User.findById(req.user._id);
  if (name !== undefined) {
    if (String(name).trim().length < 2) throw badRequest('Please enter your full name');
    user.name = name;
  }
  if (cleanedPhone !== undefined) user.phone = cleanedPhone;
  await user.save();
  res.json({ success: true, data: await profile(user) });
}));

module.exports = router;
