/**
 * Interface for Availability Repository
 * Defines the contract for availability data access operations
 */
class IAvailabilityRepository {
  /**
   * Create availability slot
   * @param {Object} availabilityData - Availability data
   * @returns {Promise<Availability>} Created availability
   */
  async create(availabilityData) {
    throw new Error('Method not implemented');
  }

  /**
   * Update availability slot
   * @param {string} id - Availability ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<Availability>} Updated availability
   */
  async update(id, updateData) {
    throw new Error('Method not implemented');
  }

  /**
   * Delete availability slot
   * @param {string} id - Availability ID
   * @returns {Promise<boolean>} True if deleted
   */
  async delete(id) {
    throw new Error('Method not implemented');
  }

  /**
   * Get availability by guide
   * @param {string} guideId - Guide user ID
   * @param {Object} filters - Filter options (date range)
   * @returns {Promise<Availability[]>} Array of availability slots
   */
  async findByGuideId(guideId, filters = {}) {
    throw new Error('Method not implemented');
  }

  /**
   * Check if availability exists for guide on specific date
   * @param {string} guideId - Guide user ID
   * @param {Date} date - Date to check
   * @returns {Promise<Availability|null>} Availability or null
   */
  async findByGuideAndDate(guideId, date) {
    throw new Error('Method not implemented');
  }

  /**
   * Bulk create availability slots
   * @param {Array} availabilityData - Array of availability data
   * @returns {Promise<Availability[]>} Created availability slots
   */
  async bulkCreate(availabilityData) {
    throw new Error('Method not implemented');
  }

  /**
   * Delete availability slots for date range
   * @param {string} guideId - Guide user ID
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<number>} Number of deleted slots
   */
  async deleteByDateRange(guideId, startDate, endDate) {
    throw new Error('Method not implemented');
  }
}

module.exports = IAvailabilityRepository;
