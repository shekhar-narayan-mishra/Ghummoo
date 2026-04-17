const AdminService = require('../services/AdminService');

/**
 * Admin Controller - Handles HTTP requests for admin operations
 * Only handles HTTP request/response, delegates business logic to AdminService
 */
class AdminController {
  constructor(adminService = new AdminService()) {
    this.adminService = adminService;
  }

  /**
   * Get pending certifications for admin review
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getPendingCertifications(req, res) {
    try {
      const certifications = await this.adminService.getPendingCertifications();
      
      res.status(200).json({
        success: true,
        message: 'Pending certifications retrieved successfully',
        data: { certifications }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
        code: 'PENDING_CERTIFICATIONS_RETRIEVAL_FAILED'
      });
    }
  }

  /**
   * Approve or reject certification
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async handleCertification(req, res) {
    try {
      const { id } = req.params;
      const { action, remarks } = req.body; // 'approve' or 'reject'
      
      const certification = await this.adminService.handleCertification(
        id, 
        action, 
        req.user.id, 
        remarks
      );
      
      res.status(200).json({
        success: true,
        message: `Certification ${action}d successfully`,
        data: { certification }
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
        code: 'CERTIFICATION_HANDLING_FAILED'
      });
    }
  }

  /**
   * Get all users (admin only)
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getAllUsers(req, res) {
    try {
      const filters = {
        role: req.query.role,
        email: req.query.email
      };
      
      const users = await this.adminService.getAllUsers(filters);
      
      res.status(200).json({
        success: true,
        message: 'All users retrieved successfully',
        data: { users }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
        code: 'USERS_RETRIEVAL_FAILED'
      });
    }
  }

  /**
   * Delete user (admin only)
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async deleteUser(req, res) {
    try {
      const { id } = req.params;
      const deleted = await this.adminService.deleteUser(id);
      
      if (!deleted) {
        return res.status(404).json({
          success: false,
          message: 'User not found',
          code: 'USER_NOT_FOUND'
        });
      }
      
      res.status(200).json({
        success: true,
        message: 'User deleted successfully',
        data: null
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
        code: 'USER_DELETION_FAILED'
      });
    }
  }

  /**
   * Get platform booking statistics
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getBookingStatistics(req, res) {
    try {
      const statistics = await this.adminService.getBookingStatistics();
      
      res.status(200).json({
        success: true,
        message: 'Booking statistics retrieved successfully',
        data: { statistics }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
        code: 'BOOKING_STATISTICS_RETRIEVAL_FAILED'
      });
    }
  }

  /**
   * Get platform user statistics
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getUserStatistics(req, res) {
    try {
      const statistics = await this.adminService.getUserStatistics();
      
      res.status(200).json({
        success: true,
        message: 'User statistics retrieved successfully',
        data: { statistics }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
        code: 'USER_STATISTICS_RETRIEVAL_FAILED'
      });
    }
  }

  /**
   * Get all certifications (admin only)
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getAllCertifications(req, res) {
    try {
      const filters = {
        status: req.query.status,
        guideId: req.query.guideId
      };
      
      const certifications = await this.adminService.getAllCertifications(filters);
      
      res.status(200).json({
        success: true,
        message: 'All certifications retrieved successfully',
        data: { certifications }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
        code: 'CERTIFICATIONS_RETRIEVAL_FAILED'
      });
    }
  }

  /**
   * Monitor platform bookings (admin only)
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async monitorBookings(req, res) {
    try {
      const filters = {
        status: req.query.status,
        guideId: req.query.guideId,
        travelerId: req.query.travelerId
      };
      
      const bookings = await this.adminService.monitorBookings(filters);
      
      res.status(200).json({
        success: true,
        message: 'Bookings monitored successfully',
        data: { bookings }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
        code: 'BOOKINGS_MONITORING_FAILED'
      });
    }
  }
}

module.exports = AdminController;
