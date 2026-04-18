const express = require('express');
const AuthController = require('../controllers/AuthController');
const { authenticate } = require('../middleware/authMiddleware');
const { ValidationMiddleware, Schemas } = require('../middleware/validationMiddleware');
const { ErrorHandler } = require('../middleware/errorHandler');

const router = express.Router();
const authController = new AuthController();

// POST /api/v1/auth/register - Register new user
router.post(
  '/register',
  ValidationMiddleware.validateBody(Schemas.register),
  ErrorHandler.asyncHandler(authController.register.bind(authController))
);

// POST /api/v1/auth/login - Login user
router.post(
  '/login',
  ValidationMiddleware.validateBody(Schemas.login),
  ErrorHandler.asyncHandler(authController.login.bind(authController))
);

// GET /api/v1/auth/profile - Get current user profile
router.get(
  '/profile',
  authenticate,
  ErrorHandler.asyncHandler(authController.getProfile.bind(authController))
);

// PUT /api/v1/auth/profile - Update user profile
router.put(
  '/profile',
  authenticate,
  ValidationMiddleware.validateBody(Schemas.updateProfile),
  ErrorHandler.asyncHandler(authController.updateProfile.bind(authController))
);

// POST /api/v1/auth/logout - Logout user
router.post(
  '/logout',
  authenticate,
  ErrorHandler.asyncHandler(authController.logout.bind(authController))
);

module.exports = router;
