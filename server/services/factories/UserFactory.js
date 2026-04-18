const { User, TravelerProfile, GuideProfile } = require('../../models');

/**
 * User Factory - Implements Factory Pattern for creating user profiles
 * Creates appropriate profile based on user role
 */
class UserFactory {
  /**
   * Create profile based on user role
   * @param {string} userId - User ID
   * @param {string} role - User role (TRAVELER, GUIDE, ADMIN)
   * @returns {Promise<Object>} Created profile
   */
  async createProfile(userId, role) {
    switch (role) {
      case 'TRAVELER':
        return await this.createTravelerProfile(userId);
      case 'GUIDE':
        return await this.createGuideProfile(userId);
      case 'ADMIN':
        // Admins don't need additional profiles
        return null;
      default:
        throw new Error(`Invalid role: ${role}`);
    }
  }

  /**
   * Create traveler profile
   * @param {string} userId - User ID
   * @returns {Promise<TravelerProfile>} Created traveler profile
   */
  async createTravelerProfile(userId) {
    try {
      return await TravelerProfile.create({
        user_id: userId,
        preferences: {},
        total_bookings: 0
      });
    } catch (error) {
      throw new Error(`Failed to create traveler profile: ${error.message}`);
    }
  }

  /**
   * Create guide profile
   * @param {string} userId - User ID
   * @returns {Promise<GuideProfile>} Created guide profile
   */
  async createGuideProfile(userId) {
    try {
      return await GuideProfile.create({
        user_id: userId,
        bio: '',
        specializations: [],
        is_certified: false,
        certification_status: 'PENDING',
        avg_rating: 0.00,
        total_reviews: 0
      });
    } catch (error) {
      throw new Error(`Failed to create guide profile: ${error.message}`);
    }
  }

  /**
   * Create user instance based on role (for inheritance simulation)
   * @param {Object} userData - User data
   * @returns {Object} User instance with role-specific methods
   */
  createUserInstance(userData) {
    const baseUser = {
      id: userData.id,
      name: userData.name,
      email: userData.email,
      role: userData.role,
      created_at: userData.created_at
    };

    switch (userData.role) {
      case 'TRAVELER':
        return {
          ...baseUser,
          // Traveler-specific methods
          canBookGuide: () => true,
          canReviewGuide: (bookingStatus) => bookingStatus === 'COMPLETED'
        };
      
      case 'GUIDE':
        return {
          ...baseUser,
          // Guide-specific methods
          canAcceptBooking: () => true,
          canManageAvailability: () => true,
          canApplyForCertification: () => true
        };
      
      case 'ADMIN':
        return {
          ...baseUser,
          // Admin-specific methods
          canManageUsers: () => true,
          canApproveCertifications: () => true,
          canViewAllBookings: () => true
        };
      
      default:
        return baseUser;
    }
  }
}

module.exports = { UserFactory };
