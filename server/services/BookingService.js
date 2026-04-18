const { BookingRepository, AvailabilityRepository, ReviewRepository } = require('../repositories');
const { EventBus } = require('../events/EventBus');
const { BookingStatusStrategy } = require('./strategies/BookingStatusStrategy');

/**
 * Booking Service - Handles all booking-related business logic
 * Follows Single Responsibility Principle and Strategy Pattern
 */
class BookingService {
  constructor(
    bookingRepository = new BookingRepository(),
    availabilityRepository = new AvailabilityRepository(),
    reviewRepository = new ReviewRepository()
  ) {
    this.bookingRepository = bookingRepository;
    this.availabilityRepository = availabilityRepository;
    this.reviewRepository = reviewRepository;
    this.statusStrategy = new BookingStatusStrategy();
  }

  /**
   * Create a new booking request
   * @param {Object} bookingData - Booking data
   * @returns {Promise<Object>} Created booking
   */
  async createBooking(bookingData) {
    try {
      // Validate booking data
      await this.validateBookingData(bookingData);

      // Check guide availability
      const isAvailable = await this.availabilityRepository.findByGuideAndDate(
        bookingData.guide_id, 
        bookingData.date
      );

      if (!isAvailable || !isAvailable.is_available) {
        throw new Error('Guide is not available on this date');
      }

      // Check for existing bookings on the same date
      const existingBooking = await this.bookingRepository.findAll({
        guideId: bookingData.guide_id,
        date: bookingData.date,
        status: ['PENDING', 'ACCEPTED']
      });

      if (existingBooking.length > 0) {
        throw new Error('Guide already has a booking on this date');
      }

      // Create booking with PENDING status
      const booking = await this.bookingRepository.create({
        ...bookingData,
        status: 'PENDING'
      });

      // Emit booking created event
      EventBus.emit('BookingCreated', {
        bookingId: booking.id,
        guideId: booking.guide_id,
        travelerId: booking.traveler_id,
        date: booking.date
      });

      return booking;
    } catch (error) {
      throw new Error(`Failed to create booking: ${error.message}`);
    }
  }

  /**
   * Get booking by ID
   * @param {string} bookingId - Booking ID
   * @returns {Promise<Object>} Booking
   */
  async getBookingById(bookingId) {
    try {
      const booking = await this.bookingRepository.findById(bookingId);
      if (!booking) {
        throw new Error('Booking not found');
      }
      return booking;
    } catch (error) {
      throw new Error(`Failed to get booking: ${error.message}`);
    }
  }

  /**
   * Get bookings for traveler
   * @param {string} travelerId - Traveler user ID
   * @returns {Promise<Array>} Array of bookings
   */
  async getTravelerBookings(travelerId) {
    try {
      return await this.bookingRepository.findByTravelerId(travelerId);
    } catch (error) {
      throw new Error(`Failed to get traveler bookings: ${error.message}`);
    }
  }

  /**
   * Cancel booking
   * @param {string} bookingId - Booking ID
   * @param {string} userId - User ID requesting cancellation
   * @returns {Promise<Object>} Updated booking
   */
  async cancelBooking(bookingId, userId) {
    try {
      const booking = await this.bookingRepository.findById(bookingId);
      if (!booking) {
        throw new Error('Booking not found');
      }

      // Check if user is authorized to cancel
      if (booking.traveler_id !== userId && booking.guide_id !== userId) {
        throw new Error('Unauthorized to cancel this booking');
      }

      // Check if booking can be cancelled
      if (!this.statusStrategy.canCancel(booking.status)) {
        throw new Error('Booking cannot be cancelled in current status');
      }

      const updatedBooking = await this.bookingRepository.update(bookingId, {
        status: 'CANCELLED'
      });

      // Emit booking cancelled event
      EventBus.emit('BookingCancelled', {
        bookingId,
        guideId: booking.guide_id,
        travelerId: booking.traveler_id,
        cancelledBy: userId
      });

      return updatedBooking;
    } catch (error) {
      throw new Error(`Failed to cancel booking: ${error.message}`);
    }
  }

  /**
   * Complete booking (mark as completed)
   * @param {string} bookingId - Booking ID
   * @param {string} userId - User ID (guide or admin)
   * @returns {Promise<Object>} Updated booking
   */
  async completeBooking(bookingId, userId) {
    try {
      const booking = await this.bookingRepository.findById(bookingId);
      if (!booking) {
        throw new Error('Booking not found');
      }

      // Only guide or admin can complete booking
      if (booking.guide_id !== userId) {
        throw new Error('Only the guide can complete the booking');
      }

      if (booking.status !== 'ACCEPTED') {
        throw new Error('Only accepted bookings can be completed');
      }

      const updatedBooking = await this.bookingRepository.update(bookingId, {
        status: 'COMPLETED'
      });

      // Emit booking completed event
      EventBus.emit('BookingCompleted', {
        bookingId,
        guideId: booking.guide_id,
        travelerId: booking.traveler_id
      });

      return updatedBooking;
    } catch (error) {
      throw new Error(`Failed to complete booking: ${error.message}`);
    }
  }

  /**
   * Update booking status (for guides to accept/reject)
   * @param {string} bookingId - Booking ID
   * @param {string} newStatus - New status
   * @param {string} userId - User ID making the change
   * @returns {Promise<Object>} Updated booking
   */
  async updateBookingStatus(bookingId, newStatus, userId) {
    try {
      const booking = await this.bookingRepository.findById(bookingId);
      if (!booking) {
        throw new Error('Booking not found');
      }

      // Only guide can update booking status
      if (booking.guide_id !== userId) {
        throw new Error('Only the guide can update booking status');
      }

      // Validate status transition
      if (!this.statusStrategy.canTransition(booking.status, newStatus)) {
        throw new Error(`Cannot transition from ${booking.status} to ${newStatus}`);
      }

      const updatedBooking = await this.bookingRepository.update(bookingId, {
        status: newStatus
      });

      // Emit booking status updated event
      EventBus.emit('BookingStatusUpdated', {
        bookingId,
        oldStatus: booking.status,
        newStatus,
        guideId: booking.guide_id,
        travelerId: booking.traveler_id
      });

      return updatedBooking;
    } catch (error) {
      throw new Error(`Failed to update booking status: ${error.message}`);
    }
  }

  /**
   * Get all bookings (admin access)
   * @param {Object} filters - Filter options
   * @returns {Promise<Array>} Array of bookings
   */
  async getAllBookings(filters = {}) {
    try {
      return await this.bookingRepository.findAll(filters);
    } catch (error) {
      throw new Error(`Failed to get all bookings: ${error.message}`);
    }
  }

  /**
   * Validate booking data
   * @param {Object} bookingData - Booking data
   * @private
   */
  async validateBookingData(bookingData) {
    if (!bookingData.traveler_id || !bookingData.guide_id || !bookingData.date) {
      throw new Error('Missing required booking fields');
    }

    if (bookingData.traveler_id === bookingData.guide_id) {
      throw new Error('Cannot book yourself');
    }

    const bookingDate = new Date(bookingData.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (bookingDate < today) {
      throw new Error('Cannot book for past dates');
    }

    if (!bookingData.total_price || bookingData.total_price <= 0) {
      throw new Error('Invalid total price');
    }
  }
}

module.exports = BookingService;
