const express = require('express');
const ReviewController = require('../controllers/ReviewController');
const { authenticate } = require('../middleware/authMiddleware');
const { RoleGuard } = require('../middleware/roleGuard');
const { ValidationMiddleware, Schemas } = require('../middleware/validationMiddleware');
const { ErrorHandler } = require('../middleware/errorHandler');

const router = express.Router();
const reviewController = new ReviewController();

// POST /api/v1/reviews - Submit review (authenticated traveler only)
router.post(
  '/',
  authenticate,
  RoleGuard.requireTraveler(),
  ValidationMiddleware.validateBody(Schemas.submitReview),
  ErrorHandler.asyncHandler(reviewController.submitReview.bind(reviewController))
);

// GET /api/v1/reviews/guide/:guideId - Get reviews for a guide (public)
router.get(
  '/guide/:guideId',
  ValidationMiddleware.validateParams(Schemas.guideIdParam),
  ErrorHandler.asyncHandler(reviewController.getGuideReviews.bind(reviewController))
);

// GET /api/v1/reviews/traveler - Get traveler's reviews (authenticated traveler only)
router.get(
  '/traveler',
  authenticate,
  RoleGuard.requireTraveler(),
  ErrorHandler.asyncHandler(reviewController.getTravelerReviews.bind(reviewController))
);

// GET /api/v1/reviews/:id - Get review by ID (authenticated user only)
router.get(
  '/:id',
  authenticate,
  ValidationMiddleware.validateParams(Schemas.uuidParam),
  ErrorHandler.asyncHandler(reviewController.getReviewById.bind(reviewController))
);

module.exports = router;
