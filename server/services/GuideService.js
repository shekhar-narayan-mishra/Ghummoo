const { GuideRepository, CertificationRepository, AvailabilityRepository, ReviewRepository } = require('../repositories');
const { EventBus } = require('../events/EventBus');

/**
 * Guide Service - Handles all guide-related business logic
 * Follows Single Responsibility Principle
 */
class GuideService {
  constructor(
    guideRepository = new GuideRepository(),
    certificationRepository = new CertificationRepository(),
    availabilityRepository = new AvailabilityRepository(),
    reviewRepository = new ReviewRepository()
  ) {
    this.guideRepository = guideRepository;
    this.certificationRepository = certificationRepository;
    this.availabilityRepository = availabilityRepository;
    this.reviewRepository = reviewRepository;
  }

  /**
   * Get guide profile by user ID
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Guide profile
   */
  async getGuideProfile(userId) {
    try {
      const guide = await this.guideRepository.findByUserId(userId);
      if (!guide) {
        throw new Error('Guide not found');
      }
      return guide;
    } catch (error) {
      throw new Error(`Failed to get guide profile: ${error.message}`);
    }
  }

  /**
   * Update guide profile
   * @param {string} userId - User ID
   * @param {Object} updateData - Profile update data
   * @returns {Promise<Object>} Updated guide profile
   */
  async updateProfile(userId, updateData) {
    try {
      // Validate update data
      if (updateData.specializations && !Array.isArray(updateData.specializations)) {
        throw new Error('Specializations must be an array');
      }

      const guide = await this.guideRepository.updateProfile(userId, updateData);
      
      // Emit guide profile updated event
      EventBus.emit('GuideProfileUpdated', { userId, updateData });

      return guide;
    } catch (error) {
      throw new Error(`Failed to update guide profile: ${error.message}`);
    }
  }

  /**
   * Submit certification application
   * @param {string} userId - User ID
   * @param {Object} applicationData - Certification application data
   * @returns {Promise<Object>} Created certification application
   */
  async submitCertification(userId, applicationData) {
    try {
      // Check if guide already has pending application
      const existingApplications = await this.certificationRepository.findByGuideId(userId);
      const pendingApplication = existingApplications.find(app => app.status === 'PENDING');
      
      if (pendingApplication) {
        throw new Error('You already have a pending certification application');
      }

      // Create certification application
      const certification = await this.certificationRepository.create({
        guide_id: userId,
        status: 'PENDING',
        submitted_at: new Date(),
        ...applicationData
      });

      // Emit certification submitted event
      EventBus.emit('CertificationSubmitted', { 
        certificationId: certification.id, 
        guideId: userId 
      });

      return certification;
    } catch (error) {
      throw new Error(`Failed to submit certification: ${error.message}`);
    }
  }

  /**
   * Get guide's bookings
   * @param {string} userId - User ID
   * @returns {Promise<Array>} Array of bookings
   */
  async getGuideBookings(userId) {
    try {
      const { BookingRepository } = require('../repositories');
      const bookingRepository = new BookingRepository();
      
      return await bookingRepository.findByGuideId(userId);
    } catch (error) {
      throw new Error(`Failed to get guide bookings: ${error.message}`);
    }
  }

  /**
   * Accept or reject booking
   * @param {string} userId - User ID
   * @param {string} bookingId - Booking ID
   * @param {string} action - Action ('accept' or 'reject')
   * @returns {Promise<Object>} Updated booking
   */
  async handleBookingAction(userId, bookingId, action) {
    try {
      const { BookingRepository } = require('../repositories');
      const bookingRepository = new BookingRepository();
      
      const booking = await bookingRepository.findById(bookingId);
      if (!booking) {
        throw new Error('Booking not found');
      }

      if (booking.guide_id !== userId) {
        throw new Error('Unauthorized: This booking is not for you');
      }

      if (booking.status !== 'PENDING') {
        throw new Error('Booking can no longer be accepted or rejected');
      }

      const newStatus = action === 'accept' ? 'ACCEPTED' : 'REJECTED';
      const updatedBooking = await bookingRepository.update(bookingId, { status: newStatus });

      // Emit booking action event
      EventBus.emit('BookingActionTaken', {
        bookingId,
        guideId: userId,
        travelerId: booking.traveler_id,
        action: newStatus
      });

      return updatedBooking;
    } catch (error) {
      throw new Error(`Failed to handle booking action: ${error.message}`);
    }
  }

  /**
   * Set availability for guide
   * @param {string} userId - User ID
   * @param {Array} availabilityData - Array of availability data
   * @returns {Promise<Array>} Created availability slots
   */
  async setAvailability(userId, availabilityData) {
    try {
      // Validate availability data
      const validatedData = availabilityData.map(slot => ({
        guide_id: userId,
        date: new Date(slot.date).toISOString().split('T')[0], // Ensure YYYY-MM-DD format
        is_available: slot.is_available !== false
      }));

      const availability = await this.availabilityRepository.bulkCreate(validatedData);

      // Emit availability updated event
      EventBus.emit('GuideAvailabilityUpdated', { 
        guideId: userId, 
        slots: availability.length 
      });

      return availability;
    } catch (error) {
      throw new Error(`Failed to set availability: ${error.message}`);
    }
  }

  /**
   * Get guide availability
   * @param {string} userId - User ID
   * @param {Object} filters - Date range filters
   * @returns {Promise<Array>} Array of availability slots
   */
  async getAvailability(userId, filters = {}) {
    try {
      return await this.availabilityRepository.findByGuideId(userId, filters);
    } catch (error) {
      throw new Error(`Failed to get availability: ${error.message}`);
    }
  }

  /**
   * Get all certified guides with filters
   * @param {Object} filters - Filter options
   * @returns {Promise<Array>} Array of certified guides
   */
  async getCertifiedGuides(filters = {}) {
    try {
      return await this.guideRepository.findCertifiedGuides(filters);
    } catch (error) {
      throw new Error(`Failed to get certified guides: ${error.message}`);
    }
  }

  /**
   * Get guide with reviews
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Guide with reviews
   */
  async getGuideWithReviews(userId) {
    try {
      return await this.guideRepository.findWithReviews(userId);
    } catch (error) {
      throw new Error(`Failed to get guide with reviews: ${error.message}`);
    }
  }

  /**
   * Update guide rating (called after review submission)
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Updated guide
   */
  async updateGuideRating(userId) {
    try {
      const ratingData = await this.reviewRepository.calculateGuideRating(userId);
      
      return await this.guideRepository.updateRating(
        userId, 
        ratingData.avgRating, 
        ratingData.totalReviews
      );
    } catch (error) {
      throw new Error(`Failed to update guide rating: ${error.message}`);
    }
  }
}

module.exports = GuideService;
