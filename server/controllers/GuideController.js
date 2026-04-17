const GuideService = require('../services/GuideService');

/**
 * Guide Controller - Handles HTTP requests for guide operations
 * Only handles HTTP request/response, delegates business logic to GuideService
 */
class GuideController {
  constructor(guideService = new GuideService()) {
    this.guideService = guideService;
  }

  /**
   * Get all certified guides (public endpoint)
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getGuides(req, res) {
    try {
      const filters = {
        specialty: req.query.specialty,
        minRating: req.query.minRating ? parseFloat(req.query.minRating) : undefined
      };

      const guides = await this.guideService.getCertifiedGuides(filters);
      
      res.status(200).json({
        success: true,
        message: 'Guides retrieved successfully',
        data: { guides }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
        code: 'GUIDES_RETRIEVAL_FAILED'
      });
    }
  }

  /**
   * Get guide by ID with reviews (public endpoint)
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getGuideById(req, res) {
    try {
      const { id } = req.params;
      const guide = await this.guideService.getGuideWithReviews(id);
      
      if (!guide) {
        return res.status(404).json({
          success: false,
          message: 'Guide not found',
          code: 'GUIDE_NOT_FOUND'
        });
      }
      
      res.status(200).json({
        success: true,
        message: 'Guide retrieved successfully',
        data: { guide }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
        code: 'GUIDE_RETRIEVAL_FAILED'
      });
    }
  }

  /**
   * Update guide profile (authenticated guide only)
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async updateProfile(req, res) {
    try {
      const guide = await this.guideService.updateProfile(req.user.id, req.body);
      
      res.status(200).json({
        success: true,
        message: 'Guide profile updated successfully',
        data: { guide }
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
        code: 'PROFILE_UPDATE_FAILED'
      });
    }
  }

  /**
   * Submit certification application (authenticated guide only)
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async submitCertification(req, res) {
    try {
      const certification = await this.guideService.submitCertification(req.user.id, req.body);
      
      res.status(201).json({
        success: true,
        message: 'Certification application submitted successfully',
        data: { certification }
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
        code: 'CERTIFICATION_SUBMISSION_FAILED'
      });
    }
  }

  /**
   * Get guide's bookings (authenticated guide only)
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getBookings(req, res) {
    try {
      const bookings = await this.guideService.getGuideBookings(req.user.id);
      
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
   * Accept or reject booking (authenticated guide only)
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async handleBooking(req, res) {
    try {
      const { id } = req.params;
      const { action } = req.body; // 'accept' or 'reject'
      
      const booking = await this.guideService.handleBookingAction(req.user.id, id, action);
      
      res.status(200).json({
        success: true,
        message: `Booking ${action}ed successfully`,
        data: { booking }
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
        code: 'BOOKING_ACTION_FAILED'
      });
    }
  }

  /**
   * Set guide availability (authenticated guide only)
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async setAvailability(req, res) {
    try {
      const { availability } = req.body;
      
      if (!Array.isArray(availability)) {
        return res.status(400).json({
          success: false,
          message: 'Availability must be an array',
          code: 'INVALID_AVAILABILITY_FORMAT'
        });
      }
      
      const availabilitySlots = await this.guideService.setAvailability(req.user.id, availability);
      
      res.status(201).json({
        success: true,
        message: 'Availability set successfully',
        data: { availability: availabilitySlots }
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
        code: 'AVAILABILITY_SET_FAILED'
      });
    }
  }

  /**
   * Get guide availability (authenticated guide only)
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getAvailability(req, res) {
    try {
      const filters = {
        startDate: req.query.startDate,
        endDate: req.query.endDate
      };
      
      const availability = await this.guideService.getAvailability(req.user.id, filters);
      
      res.status(200).json({
        success: true,
        message: 'Availability retrieved successfully',
        data: { availability }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
        code: 'AVAILABILITY_RETRIEVAL_FAILED'
      });
    }
  }

  /**
   * Get guide profile (authenticated guide only)
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getProfile(req, res) {
    try {
      const guide = await this.guideService.getGuideProfile(req.user.id);
      
      res.status(200).json({
        success: true,
        message: 'Guide profile retrieved successfully',
        data: { guide }
      });
    } catch (error) {
      res.status(404).json({
        success: false,
        message: error.message,
        code: 'GUIDE_PROFILE_NOT_FOUND'
      });
    }
  }
}

module.exports = GuideController;
