const IBookingRepository = require('./IBookingRepository');
const { Booking, Availability } = require('../models');
const { Op } = require('sequelize');

/**
 * Concrete implementation of Booking Repository using Sequelize
 */
class BookingRepository extends IBookingRepository {
  /**
   * Create a new booking
   * @param {Object} bookingData - Booking data
   * @returns {Promise<Booking>} Created booking
   */
  async create(bookingData) {
    try {
      return await Booking.create(bookingData, {
        include: [
          { association: 'traveler' },
          { association: 'guide' }
        ]
      });
    } catch (error) {
      throw new Error(`Failed to create booking: ${error.message}`);
    }
  }

  /**
   * Find booking by ID
   * @param {string} id - Booking ID
   * @returns {Promise<Booking|null>} Booking or null
   */
  async findById(id) {
    try {
      return await Booking.findByPk(id, {
        include: [
          { association: 'traveler' },
          { association: 'guide' }
        ]
      });
    } catch (error) {
      throw new Error(`Failed to find booking by ID: ${error.message}`);
    }
  }

  /**
   * Update booking
   * @param {string} id - Booking ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<Booking>} Updated booking
   */
  async update(id, updateData) {
    try {
      const booking = await Booking.findByPk(id);
      if (!booking) {
        throw new Error('Booking not found');
      }
      
      await booking.update(updateData);
      return await this.findById(id);
    } catch (error) {
      throw new Error(`Failed to update booking: ${error.message}`);
    }
  }

  /**
   * Get bookings for traveler
   * @param {string} travelerId - Traveler user ID
   * @returns {Promise<Booking[]>} Array of bookings
   */
  async findByTravelerId(travelerId) {
    try {
      return await Booking.findAll({
        where: { traveler_id: travelerId },
        include: [
          { association: 'traveler' },
          { association: 'guide' }
        ],
        order: [['created_at', 'DESC']]
      });
    } catch (error) {
      throw new Error(`Failed to find bookings for traveler: ${error.message}`);
    }
  }

  /**
   * Get bookings for guide
   * @param {string} guideId - Guide user ID
   * @returns {Promise<Booking[]>} Array of bookings
   */
  async findByGuideId(guideId) {
    try {
      return await Booking.findAll({
        where: { guide_id: guideId },
        include: [
          { association: 'traveler' },
          { association: 'guide' }
        ],
        order: [['created_at', 'DESC']]
      });
    } catch (error) {
      throw new Error(`Failed to find bookings for guide: ${error.message}`);
    }
  }

  /**
   * Get all bookings (admin access)
   * @param {Object} filters - Filter options
   * @returns {Promise<Booking[]>} Array of bookings
   */
  async findAll(filters = {}) {
    try {
      const whereClause = {};
      
      if (filters.status) {
        whereClause.status = filters.status;
      }
      
      if (filters.guideId) {
        whereClause.guide_id = filters.guideId;
      }
      
      if (filters.travelerId) {
        whereClause.traveler_id = filters.travelerId;
      }

      return await Booking.findAll({
        where: whereClause,
        include: [
          { association: 'traveler' },
          { association: 'guide' }
        ],
        order: [['created_at', 'DESC']]
      });
    } catch (error) {
      throw new Error(`Failed to find all bookings: ${error.message}`);
    }
  }

  /**
   * Check if guide is available on specific date
   * @param {string} guideId - Guide user ID
   * @param {Date} date - Date to check
   * @returns {Promise<boolean>} True if available
   */
  async isGuideAvailable(guideId, date) {
    try {
      // Check availability slot
      const availability = await Availability.findOne({
        where: {
          guide_id: guideId,
          date: date,
          is_available: true
        }
      });

      if (!availability) {
        return false;
      }

      // Check for existing bookings on that date
      const existingBooking = await Booking.findOne({
        where: {
          guide_id: guideId,
          date: date,
          status: ['PENDING', 'ACCEPTED']
        }
      });

      return !existingBooking;
    } catch (error) {
      throw new Error(`Failed to check guide availability: ${error.message}`);
    }
  }

  /**
   * Get bookings by status
   * @param {string} status - Booking status
   * @returns {Promise<Booking[]>} Array of bookings
   */
  async findByStatus(status) {
    try {
      return await Booking.findAll({
        where: { status },
        include: [
          { association: 'traveler' },
          { association: 'guide' }
        ],
        order: [['created_at', 'DESC']]
      });
    } catch (error) {
      throw new Error(`Failed to find bookings by status: ${error.message}`);
    }
  }
}

module.exports = BookingRepository;
