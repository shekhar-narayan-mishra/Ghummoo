/**
 * Interface for Guide Repository
 * Defines the contract for guide data access operations
 */
class IGuideRepository {
  /**
   * Find guide by user ID
   * @param {string} userId - User ID
   * @returns {Promise<Guide|null>} Guide or null
   */
  async findByUserId(userId) {
    throw new Error('Method not implemented');
  }

  /**
   * Get all certified guides with filters
   * @param {Object} filters - Filter options (location, rating, specialty)
   * @returns {Promise<Guide[]>} Array of certified guides
   */
  async findCertifiedGuides(filters = {}) {
    throw new Error('Method not implemented');
  }

  /**
   * Update guide profile
   * @param {string} userId - User ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<Guide>} Updated guide
   */
  async updateProfile(userId, updateData) {
    throw new Error('Method not implemented');
  }

  /**
   * Update guide certification status
   * @param {string} userId - User ID
   * @param {string} status - New certification status
   * @returns {Promise<Guide>} Updated guide
   */
  async updateCertificationStatus(userId, status) {
    throw new Error('Method not implemented');
  }

  /**
   * Update guide rating
   * @param {string} userId - User ID
   * @param {number} newRating - New average rating
   * @param {number} totalReviews - Total number of reviews
   * @returns {Promise<Guide>} Updated guide
   */
  async updateRating(userId, newRating, totalReviews) {
    throw new Error('Method not implemented');
  }

  /**
   * Get guide with availability
   * @param {string} userId - User ID
   * @returns {Promise<Guide>} Guide with availability slots
   */
  async findWithAvailability(userId) {
    throw new Error('Method not implemented');
  }

  /**
   * Get guide with reviews
   * @param {string} userId - User ID
   * @returns {Promise<Guide>} Guide with reviews
   */
  async findWithReviews(userId) {
    throw new Error('Method not implemented');
  }
}

module.exports = IGuideRepository;
