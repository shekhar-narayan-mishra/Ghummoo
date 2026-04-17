const BookingService = require('../services/BookingService');

/**
 * Booking Controller - Handles HTTP requests for booking operations
 * Only handles HTTP request/response, delegates business logic to BookingService
 */
class BookingController {
  constructor(bookingService = new BookingService()) {
    this.bookingService = bookingService;
  }

  /**
   * Create new booking request (authenticated traveler only)
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async createBooking(req, res) {
    try {
      const bookingData = {
        ...req.body,
        traveler_id: req.user.id
      };
      
      const booking = await this.bookingService.createBooking(bookingData);
      
      res.status(201).json({
        success: true,
        message: 'Booking request created successfully',
        data: { booking }
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
        code: 'BOOKING_CREATION_FAILED'
      });
    }
  }

  /**
   * Get traveler's bookings (authenticated traveler only)
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getTravelerBookings(req, res) {
    try {
      const bookings = await this.bookingService.getTravelerBookings(req.user.id);
      
      res.status(200).json({
        success: true,
        message: 'Bookings retrieved successfully',
        data: { bookings }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
        code: 'BOOKINGS_RETRIEVAL_FAILED'
      });
    }
  }

  /**
   * Get booking by ID (authenticated user only - must be traveler or guide)
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getBookingById(req, res) {
    try {
      const { id } = req.params;
      const booking = await this.bookingService.getBookingById(id);
      
      // Check if user is authorized to view this booking
      if (booking.traveler_id !== req.user.id && booking.guide_id !== req.user.id && req.user.role !== 'ADMIN') {
        return res.status(403).json({
          success: false,
          message: 'Unauthorized to view this booking',
          code: 'UNAUTHORIZED_BOOKING_ACCESS'
        });
      }
      
      res.status(200).json({
        success: true,
        message: 'Booking retrieved successfully',
        data: { booking }
      });
    } catch (error) {
      res.status(404).json({
        success: false,
        message: error.message,
        code: 'BOOKING_NOT_FOUND'
      });
    }
  }

  /**
   * Cancel booking (authenticated traveler or guide only)
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async cancelBooking(req, res) {
    try {
      const { id } = req.params;
      const booking = await this.bookingService.cancelBooking(id, req.user.id);
      
      res.status(200).json({
        success: true,
        message: 'Booking cancelled successfully',
        data: { booking }
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
        code: 'BOOKING_CANCELLATION_FAILED'
      });
    }
  }

  /**
   * Complete booking (authenticated guide only)
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async completeBooking(req, res) {
    try {
      const { id } = req.params;
      const booking = await this.bookingService.completeBooking(id, req.user.id);
      
      res.status(200).json({
        success: true,
        message: 'Booking completed successfully',
        data: { booking }
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
        code: 'BOOKING_COMPLETION_FAILED'
      });
    }
  }

  /**
   * Update booking status (authenticated guide only - for accept/reject)
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async updateBookingStatus(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;
      
      const booking = await this.bookingService.updateBookingStatus(id, status, req.user.id);
      
      res.status(200).json({
        success: true,
        message: `Booking status updated to ${status} successfully`,
        data: { booking }
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
        code: 'BOOKING_STATUS_UPDATE_FAILED'
      });
    }
  }

  /**
   * Get all bookings (admin only)
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getAllBookings(req, res) {
    try {
      const filters = {
        status: req.query.status,
        guideId: req.query.guideId,
        travelerId: req.query.travelerId
      };
      
      const bookings = await this.bookingService.getAllBookings(filters);
      
      res.status(200).json({
        success: true,
        message: 'All bookings retrieved successfully',
        data: { bookings }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
        code: 'ALL_BOOKINGS_RETRIEVAL_FAILED'
      });
    }
  }
}

module.exports = BookingController;
