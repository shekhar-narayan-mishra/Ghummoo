const { ReviewRepository, BookingRepository } = require('../repositories');
const { EventBus } = require('../events/EventBus');

/**
 * Review Service - Handles all review-related business logic
 * Follows Single Responsibility Principle
 */
class ReviewService {
  constructor(
    reviewRepository = new ReviewRepository(),
    bookingRepository = new BookingRepository()
  ) {
    this.reviewRepository = reviewRepository;
    this.bookingRepository = bookingRepository;
  }

  /**
   * Submit a review for a completed booking
   * @param {Object} reviewData - Review data
   * @returns {Promise<Object>} Created review
   */
  async submitReview(reviewData) {
    try {
      // Validate review data
      await this.validateReviewData(reviewData);

      // Check if booking exists and is completed
      const booking = await this.bookingRepository.findById(reviewData.booking_id);
      if (!booking) {
        throw new Error('Booking not found');
      }

      if (booking.status !== 'COMPLETED') {
        throw new Error('Can only review completed bookings');
      }

      // Check if review already exists for this booking
      const existingReview = await this.reviewRepository.existsForBooking(reviewData.booking_id);
      if (existingReview) {
        throw new Error('Review already exists for this booking');
      }

      // Verify reviewer is the traveler
      if (booking.traveler_id !== reviewData.traveler_id) {
        throw new Error('Only the traveler can submit a review');
      }

      // Create review
      const review = await this.reviewRepository.create({
        booking_id: reviewData.booking_id,
        traveler_id: reviewData.traveler_id,
        guide_id: booking.guide_id,
        rating: reviewData.rating,
        comment: reviewData.comment || null
      });

      // Update guide's average rating
      const { GuideService } = require('./GuideService');
      const guideService = new GuideService();
      await guideService.updateGuideRating(booking.guide_id);

      // Emit review submitted event
      EventBus.emit('ReviewSubmitted', {
        reviewId: review.id,
        bookingId: review.booking_id,
        guideId: review.guide_id,
        travelerId: review.traveler_id,
        rating: review.rating
      });

      return review;
    } catch (error) {
      throw new Error(`Failed to submit review: ${error.message}`);
    }
  }

  /**
   * Get reviews by guide
   * @param {string} guideId - Guide user ID
   * @returns {Promise<Array>} Array of reviews
   */
  async getGuideReviews(guideId) {
    try {
      return await this.reviewRepository.findByGuideId(guideId);
    } catch (error) {
      throw new Error(`Failed to get guide reviews: ${error.message}`);
    }
  }

  /**
   * Get reviews by traveler
   * @param {string} travelerId - Traveler user ID
   * @returns {Promise<Array>} Array of reviews
   */
  async getTravelerReviews(travelerId) {
    try {
      return await this.reviewRepository.findByTravelerId(travelerId);
    } catch (error) {
      throw new Error(`Failed to get traveler reviews: ${error.message}`);
    }
  }

  /**
   * Get review by ID
   * @param {string} reviewId - Review ID
   * @returns {Promise<Object>} Review
   */
  async getReviewById(reviewId) {
    try {
      const review = await this.reviewRepository.findById(reviewId);
      if (!review) {
        throw new Error('Review not found');
      }
      return review;
    } catch (error) {
      throw new Error(`Failed to get review: ${error.message}`);
    }
  }

  /**
   * Validate review data
   * @param {Object} reviewData - Review data
   * @private
   */
  async validateReviewData(reviewData) {
    if (!reviewData.booking_id || !reviewData.traveler_id || !reviewData.rating) {
      throw new Error('Missing required review fields');
    }

    if (reviewData.rating < 1 || reviewData.rating > 5) {
      throw new Error('Rating must be between 1 and 5');
    }

    if (reviewData.comment && reviewData.comment.length > 1000) {
      throw new Error('Comment cannot exceed 1000 characters');
    }
  }
}

module.exports = ReviewService;
