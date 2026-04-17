/**
 * Interface for Certification Repository
 * Defines the contract for certification data access operations
 */
class ICertificationRepository {
  /**
   * Create a new certification application
   * @param {Object} certificationData - Certification data
   * @returns {Promise<Certification>} Created certification
   */
  async create(certificationData) {
    throw new Error('Method not implemented');
  }

  /**
   * Find certification by ID
   * @param {string} id - Certification ID
   * @returns {Promise<Certification|null>} Certification or null
   */
  async findById(id) {
    throw new Error('Method not implemented');
  }

  /**
   * Update certification
   * @param {string} id - Certification ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<Certification>} Updated certification
   */
  async update(id, updateData) {
    throw new Error('Method not implemented');
  }

  /**
   * Get pending certifications for admin review
   * @returns {Promise<Certification[]>} Array of pending certifications
   */
  async findPending() {
    throw new Error('Method not implemented');
  }

  /**
   * Get certifications by guide
   * @param {string} guideId - Guide user ID
   * @returns {Promise<Certification[]>} Array of certifications
   */
  async findByGuideId(guideId) {
    throw new Error('Method not implemented');
  }

  /**
   * Get all certifications (admin access)
   * @param {Object} filters - Filter options
   * @returns {Promise<Certification[]>} Array of certifications
   */
  async findAll(filters = {}) {
    throw new Error('Method not implemented');
  }
}

module.exports = ICertificationRepository;
