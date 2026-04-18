const { asyncHandler } = require('../middleware/errorHandler');
const AuthService = require('../services/AuthService');
const MongoUserRepository = require('../repositories/MongoUserRepository');

const userRepo = new MongoUserRepository();
const authService = new AuthService(userRepo);

// POST /api/auth/register
const register = asyncHandler(async (req, res) => {
  const { name, email, password, role, bio, city, languages, specialties, pricePerDay, pricingType } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ success: false, message: 'Name, email and password are required' });
  }
  const result = await authService.register({ name, email, password, role, bio, city, languages, specialties, pricePerDay, pricingType });

  res.cookie('token', result.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  res.status(201).json({ success: true, data: result.user, token: result.token });
});

// POST /api/auth/login
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email and password are required' });
  }
  const result = await authService.login(email, password);

  res.cookie('token', result.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  res.json({ success: true, data: result.user, token: result.token });
});

// POST /api/auth/logout
const logout = asyncHandler(async (req, res) => {
  res.clearCookie('token');
  res.json({ success: true, message: 'Logged out successfully' });
});

// GET /api/auth/me
const getMe = asyncHandler(async (req, res) => {
  const profile = await authService.getMe(req.user._id);
  res.json({ success: true, data: profile });
});

module.exports = { register, login, logout, getMe };
