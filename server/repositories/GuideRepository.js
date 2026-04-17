const IGuideRepository = require('./IGuideRepository');
const { User, GuideProfile, Availability, Review } = require('../models');

/**
 * Concrete implementation of Guide Repository using Sequelize
 */
class GuideRepository extends IGuideRepository {
  /**
   * Find guide by user ID
   * @param {string} userId - User ID
   * @returns {Promise<Guide|null>} Guide or null
   */
  async findByUserId(userId) {
    try {
      return await User.findOne({
        where: { id: userId, role: 'GUIDE' },
        include: [
          {
            association: 'guideProfile',
            include: [
              { association: 'availabilitySlots' },
              { association: 'reviews' }
            ]
          }
        ]
      });
    } catch (error) {
      throw new Error(`Failed to find guide by user ID: ${error.message}`);
    }
  }

  /**
   * Get all certified guides with filters
   * @param {Object} filters - Filter options (location, rating, specialty)
   * @returns {Promise<Guide[]>} Array of certified guides
   */
  async findCertifiedGuides(filters = {}) {
    try {
      const whereClause = {
        is_certified: true
      };

      const includeClause = [
        {
          association: 'guideProfile',
          where: whereClause,
          include: [
            { association: 'availabilitySlots' },
            { association: 'reviews' }
          ]
        }
      ];

      // Add specialty filter if provided
      if (filters.specialty) {
        includeClause[0].where.specializations = {
          [require('sequelize').Op.contains]: [filters.specialty]
        };
      }

      // Add minimum rating filter if provided
      if (filters.minRating) {
        includeClause[0].where.avg_rating = {
          [require('sequelize').Op.gte]: filters.minRating
        };
      }

      return await User.findAll({
        where: { role: 'GUIDE' },
        include: includeClause,
        order: [[{ association: 'guideProfile' }, 'avg_rating', 'DESC']]
      });
    } catch (error) {
      throw new Error(`Failed to find certified guides: ${error.message}`);
    }
  }

  /**
   * Update guide profile
   * @param {string} userId - User ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<Guide>} Updated guide
   */
  async updateProfile(userId, updateData) {
    try {
      const guide = await GuideProfile.findOne({ where: { user_id: userId } });
      if (!guide) {
        throw new Error('Guide profile not found');
      }
      
      await guide.update(updateData);
      return await this.findByUserId(userId);
    } catch (error) {
      throw new Error(`Failed to update guide profile: ${error.message}`);
    }
  }

  /**
   * Update guide certification status
   * @param {string} userId - User ID
   * @param {string} status - New certification status
   * @returns {Promise<Guide>} Updated guide
   */
  async updateCertificationStatus(userId, status) {
    try {
      const guide = await GuideProfile.findOne({ where: { user_id: userId } });
      if (!guide) {
        throw new Error('Guide profile not found');
      }
      
      const updateData = {
        certification_status: status,
        is_certified: status === 'APPROVED'
      };
      
      await guide.update(updateData);
      return await this.findByUserId(userId);
    } catch (error) {
      throw new Error(`Failed to update certification status: ${error.message}`);
    }
  }

  /**
   * Update guide rating
   * @param {string} userId - User ID
   * @param {number} newRating - New average rating
   * @param {number} totalReviews - Total number of reviews
   * @returns {Promise<Guide>} Updated guide
   */
  async updateRating(userId, newRating, totalReviews) {
    try {
      const guide = await GuideProfile.findOne({ where: { user_id: userId } });
      if (!guide) {
        throw new Error('Guide profile not found');
      }
      
      await guide.update({
        avg_rating: newRating,
        total_reviews: totalReviews
      });
      
      return await this.findByUserId(userId);
    } catch (error) {
      throw new Error(`Failed to update guide rating: ${error.message}`);
    }
  }

  /**
   * Get guide with availability
   * @param {string} userId - User ID
   * @returns {Promise<Guide>} Guide with availability slots
   */
  async findWithAvailability(userId) {
    try {
      return await User.findOne({
        where: { id: userId, role: 'GUIDE' },
        include: [
          {
            association: 'guideProfile',
            include: [
              { association: 'availabilitySlots' }
            ]
          }
        ]
      });
    } catch (error) {
      throw new Error(`Failed to find guide with availability: ${error.message}`);
    }
  }

  /**
   * Get guide with reviews
   * @param {string} userId - User ID
   * @returns {Promise<Guide>} Guide with reviews
   */
  async findWithReviews(userId) {
    try {
      return await User.findOne({
        where: { id: userId, role: 'GUIDE' },
        include: [
          {
            association: 'guideProfile',
            include: [
              { 
                association: 'reviews',
                include: [
                  { association: 'traveler' }
                ]
              }
            ]
          }
        ]
      });
    } catch (error) {
      throw new Error(`Failed to find guide with reviews: ${error.message}`);
    }
  }
}

module.exports = GuideRepository;
