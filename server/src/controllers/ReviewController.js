const { asyncHandler } = require('../middleware/errorHandler');
const ReviewService = require('../services/ReviewService');
const MongoReviewRepository = require('../repositories/MongoReviewRepository');
const MongoGuideRepository = require('../repositories/MongoGuideRepository');

const reviewRepo = new MongoReviewRepository();
const guideRepo = new MongoGuideRepository();
const reviewService = new ReviewService(reviewRepo, guideRepo);

// POST /api/reviews
const createReview = asyncHandler(async (req, res) => {
  const { bookingId, rating, comment } = req.body;
  if (!bookingId || !rating) {
    return res.status(400).json({ success: false, message: 'bookingId and rating are required' });
  }
  const review = await reviewService.createReview(req.user._id, { bookingId, rating, comment });
  res.status(201).json({ success: true, data: review });
});

// GET /api/reviews/guide/:guideId
const getReviewsForGuide = asyncHandler(async (req, res) => {
  const reviews = await reviewService.getReviewsForGuide(req.params.guideId, req.query);
  res.json({ success: true, data: reviews });
});

// PATCH /api/reviews/:id/flag
const flagReview = asyncHandler(async (req, res) => {
  const review = await reviewService.flagReview(req.params.id);
  res.json({ success: true, data: review });
});

// GET /api/reviews/flagged (admin)
const getFlaggedReviews = asyncHandler(async (req, res) => {
  const reviews = await reviewService.getFlaggedReviews();
  res.json({ success: true, data: reviews });
});

module.exports = { createReview, getReviewsForGuide, flagReview, getFlaggedReviews };
