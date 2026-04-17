const ReviewService = require('../services/ReviewService');

/**
 * Review Controller - Handles HTTP requests for review operations
 * Only handles HTTP request/response, delegates business logic to ReviewService
 */
class ReviewController {
  constructor(reviewService = new ReviewService()) {
    this.reviewService = reviewService;
  }

  /**
   * Submit review for completed booking (authenticated traveler only)
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async submitReview(req, res) {
    try {
      const reviewData = {
        ...req.body,
        traveler_id: req.user.id
      };
      
      const review = await this.reviewService.submitReview(reviewData);
      
      res.status(201).json({
        success: true,
        message: 'Review submitted successfully',
        data: { review }
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
        code: 'REVIEW_SUBMISSION_FAILED'
      });
    }
  }

  /**
   * Get reviews for a guide (public endpoint)
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getGuideReviews(req, res) {
    try {
      const { guideId } = req.params;
      const reviews = await this.reviewService.getGuideReviews(guideId);
      
      res.status(200).json({
        success: true,
        message: 'Guide reviews retrieved successfully',
        data: { reviews }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
        code: 'GUIDE_REVIEWS_RETRIEVAL_FAILED'
      });
    }
  }

  /**
   * Get reviews by traveler (authenticated traveler only)
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getTravelerReviews(req, res) {
    try {
      const reviews = await this.reviewService.getTravelerReviews(req.user.id);
      
      res.status(200).json({
        success: true,
        message: 'Traveler reviews retrieved successfully',
        data: { reviews }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
        code: 'TRAVELER_REVIEWS_RETRIEVAL_FAILED'
      });
    }
  }

  /**
   * Get review by ID (authenticated user only)
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getReviewById(req, res) {
    try {
      const { id } = req.params;
      const review = await this.reviewService.getReviewById(id);
      
      // Check if user is authorized to view this review
      if (review.traveler_id !== req.user.id && review.guide_id !== req.user.id && req.user.role !== 'ADMIN') {
        return res.status(403).json({
          success: false,
          message: 'Unauthorized to view this review',
          code: 'UNAUTHORIZED_REVIEW_ACCESS'
        });
      }
      
      res.status(200).json({
        success: true,
        message: 'Review retrieved successfully',
        data: { review }
      });
    } catch (error) {
      res.status(404).json({
        success: false,
        message: error.message,
        code: 'REVIEW_NOT_FOUND'
      });
    }
  }
}

module.exports = ReviewController;
