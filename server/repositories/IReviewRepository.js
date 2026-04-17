/**
 * Interface for Review Repository
 * Defines the contract for review data access operations
 */
class IReviewRepository {
  /**
   * Create a new review
   * @param {Object} reviewData - Review data
   * @returns {Promise<Review>} Created review
   */
  async create(reviewData) {
    throw new Error('Method not implemented');
  }

  /**
   * Find review by ID
   * @param {string} id - Review ID
   * @returns {Promise<Review|null>} Review or null
   */
  async findById(id) {
    throw new Error('Method not implemented');
  }

  /**
   * Get reviews by guide
   * @param {string} guideId - Guide user ID
   * @returns {Promise<Review[]>} Array of reviews
   */
  async findByGuideId(guideId) {
    throw new Error('Method not implemented');
  }

  /**
   * Get reviews by traveler
   * @param {string} travelerId - Traveler user ID
   * @returns {Promise<Review[]>} Array of reviews
   */
  async findByTravelerId(travelerId) {
    throw new Error('Method not implemented');
  }

  /**
   * Check if review exists for booking
   * @param {string} bookingId - Booking ID
   * @returns {Promise<boolean>} True if review exists
   */
  async existsForBooking(bookingId) {
    throw new Error('Method not implemented');
  }

  /**
   * Calculate average rating for guide
   * @param {string} guideId - Guide user ID
   * @returns {Promise<Object>} Average rating and total reviews
   */
  async calculateGuideRating(guideId) {
    throw new Error('Method not implemented');
  }
}

module.exports = IReviewRepository;
