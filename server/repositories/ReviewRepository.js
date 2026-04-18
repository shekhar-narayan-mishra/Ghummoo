const IReviewRepository = require('./IReviewRepository');
const { Review } = require('../models');
const { sequelize } = require('../config/database');

/**
 * Concrete implementation of Review Repository using Sequelize
 */
class ReviewRepository extends IReviewRepository {
  /**
   * Create a new review
   * @param {Object} reviewData - Review data
   * @returns {Promise<Review>} Created review
   */
  async create(reviewData) {
    try {
      return await Review.create(reviewData, {
        include: [
          { association: 'traveler' },
          { association: 'guide' },
          { association: 'booking' }
        ]
      });
    } catch (error) {
      throw new Error(`Failed to create review: ${error.message}`);
    }
  }

  /**
   * Find review by ID
   * @param {string} id - Review ID
   * @returns {Promise<Review|null>} Review or null
   */
  async findById(id) {
    try {
      return await Review.findByPk(id, {
        include: [
          { association: 'traveler' },
          { association: 'guide' },
          { association: 'booking' }
        ]
      });
    } catch (error) {
      throw new Error(`Failed to find review by ID: ${error.message}`);
    }
  }

  /**
   * Get reviews by guide
   * @param {string} guideId - Guide user ID
   * @returns {Promise<Review[]>} Array of reviews
   */
  async findByGuideId(guideId) {
    try {
      return await Review.findAll({
        where: { guide_id: guideId },
        include: [
          { association: 'traveler' },
          { association: 'booking' }
        ],
        order: [['created_at', 'DESC']]
      });
    } catch (error) {
      throw new Error(`Failed to find reviews by guide: ${error.message}`);
    }
  }

  /**
   * Get reviews by traveler
   * @param {string} travelerId - Traveler user ID
   * @returns {Promise<Review[]>} Array of reviews
   */
  async findByTravelerId(travelerId) {
    try {
      return await Review.findAll({
        where: { traveler_id: travelerId },
        include: [
          { association: 'guide' },
          { association: 'booking' }
        ],
        order: [['created_at', 'DESC']]
      });
    } catch (error) {
      throw new Error(`Failed to find reviews by traveler: ${error.message}`);
    }
  }

  /**
   * Check if review exists for booking
   * @param {string} bookingId - Booking ID
   * @returns {Promise<boolean>} True if review exists
   */
  async existsForBooking(bookingId) {
    try {
      const review = await Review.findOne({
        where: { booking_id: bookingId }
      });
      return !!review;
    } catch (error) {
      throw new Error(`Failed to check review existence: ${error.message}`);
    }
  }

  /**
   * Calculate average rating for guide
   * @param {string} guideId - Guide user ID
   * @returns {Promise<Object>} Average rating and total reviews
   */
  async calculateGuideRating(guideId) {
    try {
      const result = await Review.findOne({
        where: { guide_id: guideId },
        attributes: [
          [sequelize.fn('AVG', sequelize.col('rating')), 'avgRating'],
          [sequelize.fn('COUNT', sequelize.col('id')), 'totalReviews']
        ],
        raw: true
      });

      return {
        avgRating: parseFloat(result.avgRating) || 0,
        totalReviews: parseInt(result.totalReviews) || 0
      };
    } catch (error) {
      throw new Error(`Failed to calculate guide rating: ${error.message}`);
    }
  }
}

module.exports = ReviewRepository;
