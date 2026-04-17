/**
 * Interface for Booking Repository
 * Defines the contract for booking data access operations
 */
class IBookingRepository {
  /**
   * Create a new booking
   * @param {Object} bookingData - Booking data
   * @returns {Promise<Booking>} Created booking
   */
  async create(bookingData) {
    throw new Error('Method not implemented');
  }

  /**
   * Find booking by ID
   * @param {string} id - Booking ID
   * @returns {Promise<Booking|null>} Booking or null
   */
  async findById(id) {
    throw new Error('Method not implemented');
  }

  /**
   * Update booking
   * @param {string} id - Booking ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<Booking>} Updated booking
   */
  async update(id, updateData) {
    throw new Error('Method not implemented');
  }

  /**
   * Get bookings for traveler
   * @param {string} travelerId - Traveler user ID
   * @returns {Promise<Booking[]>} Array of bookings
   */
  async findByTravelerId(travelerId) {
    throw new Error('Method not implemented');
  }

  /**
   * Get bookings for guide
   * @param {string} guideId - Guide user ID
   * @returns {Promise<Booking[]>} Array of bookings
   */
  async findByGuideId(guideId) {
    throw new Error('Method not implemented');
  }

  /**
   * Get all bookings (admin access)
   * @param {Object} filters - Filter options
   * @returns {Promise<Booking[]>} Array of bookings
   */
  async findAll(filters = {}) {
    throw new Error('Method not implemented');
  }

  /**
   * Check if guide is available on specific date
   * @param {string} guideId - Guide user ID
   * @param {Date} date - Date to check
   * @returns {Promise<boolean>} True if available
   */
  async isGuideAvailable(guideId, date) {
    throw new Error('Method not implemented');
  }

  /**
   * Get bookings by status
   * @param {string} status - Booking status
   * @returns {Promise<Booking[]>} Array of bookings
   */
  async findByStatus(status) {
    throw new Error('Method not implemented');
  }
}

module.exports = IBookingRepository;
