const { CertificationRepository, UserRepository, BookingRepository } = require('../repositories');
const { EventBus } = require('../events/EventBus');

/**
 * Admin Service - Handles all admin-related business logic
 * Follows Single Responsibility Principle
 */
class AdminService {
  constructor(
    certificationRepository = new CertificationRepository(),
    userRepository = new UserRepository(),
    bookingRepository = new BookingRepository()
  ) {
    this.certificationRepository = certificationRepository;
    this.userRepository = userRepository;
    this.bookingRepository = bookingRepository;
  }

  /**
   * Get pending certifications for review
   * @returns {Promise<Array>} Array of pending certifications
   */
  async getPendingCertifications() {
    try {
      return await this.certificationRepository.findPending();
    } catch (error) {
      throw new Error(`Failed to get pending certifications: ${error.message}`);
    }
  }

  /**
   * Approve or reject certification
   * @param {string} certificationId - Certification ID
   * @param {string} action - Action ('approve' or 'reject')
   * @param {string} adminId - Admin user ID
   * @param {string} remarks - Remarks for rejection (optional)
   * @returns {Promise<Object>} Updated certification
   */
  async handleCertification(certificationId, action, adminId, remarks = null) {
    try {
      const certification = await this.certificationRepository.findById(certificationId);
      if (!certification) {
        throw new Error('Certification not found');
      }

      if (certification.status !== 'PENDING') {
        throw new Error('Certification has already been processed');
      }

      const newStatus = action === 'approve' ? 'APPROVED' : 'REJECTED';
      
      const updateData = {
        status: newStatus,
        admin_id: adminId,
        reviewed_at: new Date(),
        remarks: remarks || null
      };

      const updatedCertification = await this.certificationRepository.update(certificationId, updateData);

      // Update guide profile certification status
      const { GuideService } = require('./GuideService');
      const guideService = new GuideService();
      await guideService.guideRepository.updateCertificationStatus(certification.guide_id, newStatus);

      // Emit certification processed event
      EventBus.emit('CertificationProcessed', {
        certificationId,
        guideId: certification.guide_id,
        adminId,
        status: newStatus,
        remarks
      });

      return updatedCertification;
    } catch (error) {
      throw new Error(`Failed to handle certification: ${error.message}`);
    }
  }

  /**
   * Get all users (admin access)
   * @param {Object} filters - Filter options
   * @returns {Promise<Array>} Array of users
   */
  async getAllUsers(filters = {}) {
    try {
      return await this.userRepository.findAll(filters);
    } catch (error) {
      throw new Error(`Failed to get all users: ${error.message}`);
    }
  }

  /**
   * Delete user (admin only)
   * @param {string} userId - User ID
   * @returns {Promise<boolean>} True if deleted
   */
  async deleteUser(userId) {
    try {
      const deleted = await this.userRepository.delete(userId);
      
      if (deleted) {
        // Emit user deleted by admin event
        EventBus.emit('UserDeletedByAdmin', { userId });
      }
      
      return deleted;
    } catch (error) {
      throw new Error(`Failed to delete user: ${error.message}`);
    }
  }

  /**
   * Get platform-wide booking statistics
   * @returns {Promise<Object>} Booking statistics
   */
  async getBookingStatistics() {
    try {
      const allBookings = await this.bookingRepository.findAll();
      
      const stats = {
        total: allBookings.length,
        pending: allBookings.filter(b => b.status === 'PENDING').length,
        accepted: allBookings.filter(b => b.status === 'ACCEPTED').length,
        rejected: allBookings.filter(b => b.status === 'REJECTED').length,
        completed: allBookings.filter(b => b.status === 'COMPLETED').length,
        cancelled: allBookings.filter(b => b.status === 'CANCELLED').length
      };

      return stats;
    } catch (error) {
      throw new Error(`Failed to get booking statistics: ${error.message}`);
    }
  }

  /**
   * Get platform-wide user statistics
   * @returns {Promise<Object>} User statistics
   */
  async getUserStatistics() {
    try {
      const allUsers = await this.userRepository.findAll();
      
      const stats = {
        total: allUsers.length,
        travelers: allUsers.filter(u => u.role === 'TRAVELER').length,
        guides: allUsers.filter(u => u.role === 'GUIDE').length,
        admins: allUsers.filter(u => u.role === 'ADMIN').length,
        certifiedGuides: allUsers.filter(u => 
          u.role === 'GUIDE' && 
          u.guideProfile && 
          u.guideProfile.is_certified
        ).length
      };

      return stats;
    } catch (error) {
      throw new Error(`Failed to get user statistics: ${error.message}`);
    }
  }

  /**
   * Get all certifications (admin access)
   * @param {Object} filters - Filter options
   * @returns {Promise<Array>} Array of certifications
   */
  async getAllCertifications(filters = {}) {
    try {
      return await this.certificationRepository.findAll(filters);
    } catch (error) {
      throw new Error(`Failed to get all certifications: ${error.message}`);
    }
  }

  /**
   * Get platform-wide booking monitoring data
   * @param {Object} filters - Filter options
   * @returns {Promise<Array>} Array of bookings with details
   */
  async monitorBookings(filters = {}) {
    try {
      return await this.bookingRepository.findAll(filters);
    } catch (error) {
      throw new Error(`Failed to monitor bookings: ${error.message}`);
    }
  }
}

module.exports = AdminService;
