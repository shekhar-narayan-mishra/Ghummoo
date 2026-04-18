const express = require('express');
const GuideController = require('../controllers/GuideController');
const { authenticate } = require('../middleware/authMiddleware');
const { RoleGuard } = require('../middleware/roleGuard');
const { ValidationMiddleware, Schemas } = require('../middleware/validationMiddleware');
const { ErrorHandler } = require('../middleware/errorHandler');

const router = express.Router();
const guideController = new GuideController();

// Public endpoints (no authentication required)

// GET /api/v1/guides - Get all certified guides (public)
router.get(
  '/',
  ValidationMiddleware.validateQuery(Schemas.guideFilters),
  ErrorHandler.asyncHandler(guideController.getGuides.bind(guideController))
);

// GET /api/v1/guides/:id - Get guide by ID with reviews (public)
router.get(
  '/:id',
  ValidationMiddleware.validateParams(Schemas.uuidParam),
  ErrorHandler.asyncHandler(guideController.getGuideById.bind(guideController))
);

// Guide-specific endpoints (authentication required)

// GET /api/v1/guides/profile - Get guide profile (authenticated guide only)
router.get(
  '/profile',
  authenticate,
  RoleGuard.requireGuide(),
  ErrorHandler.asyncHandler(guideController.getProfile.bind(guideController))
);

// PUT /api/v1/guides/profile - Update guide profile (authenticated guide only)
router.put(
  '/profile',
  authenticate,
  RoleGuard.requireGuide(),
  ValidationMiddleware.validateBody(Schemas.updateGuideProfile),
  ErrorHandler.asyncHandler(guideController.updateProfile.bind(guideController))
);

// POST /api/v1/guides/certification - Submit certification application (authenticated guide only)
router.post(
  '/certification',
  authenticate,
  RoleGuard.requireGuide(),
  ErrorHandler.asyncHandler(guideController.submitCertification.bind(guideController))
);

// GET /api/v1/guides/bookings - Get guide's bookings (authenticated guide only)
router.get(
  '/bookings',
  authenticate,
  RoleGuard.requireGuide(),
  ErrorHandler.asyncHandler(guideController.getBookings.bind(guideController))
);

// PATCH /api/v1/guides/bookings/:id - Accept or reject booking (authenticated guide only)
router.patch(
  '/bookings/:id',
  authenticate,
  RoleGuard.requireGuide(),
  ValidationMiddleware.validateParams(Schemas.uuidParam),
  ErrorHandler.asyncHandler(guideController.handleBooking.bind(guideController))
);

// POST /api/v1/guides/availability - Set availability (authenticated guide only)
router.post(
  '/availability',
  authenticate,
  RoleGuard.requireGuide(),
  ValidationMiddleware.validateBody(Schemas.setAvailability),
  ErrorHandler.asyncHandler(guideController.setAvailability.bind(guideController))
);

// GET /api/v1/guides/availability - Get guide availability (authenticated guide only)
router.get(
  '/availability',
  authenticate,
  RoleGuard.requireGuide(),
  ValidationMiddleware.validateQuery(Schemas.dateRangeFilters),
  ErrorHandler.asyncHandler(guideController.getAvailability.bind(guideController))
);

module.exports = router;
