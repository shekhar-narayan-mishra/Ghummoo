const ICertificationRepository = require('./ICertificationRepository');
const { Certification } = require('../models');

/**
 * Concrete implementation of Certification Repository using Sequelize
 */
class CertificationRepository extends ICertificationRepository {
  /**
   * Create a new certification application
   * @param {Object} certificationData - Certification data
   * @returns {Promise<Certification>} Created certification
   */
  async create(certificationData) {
    try {
      return await Certification.create(certificationData, {
        include: [
          { association: 'guide' },
          { association: 'admin' }
        ]
      });
    } catch (error) {
      throw new Error(`Failed to create certification: ${error.message}`);
    }
  }

  /**
   * Find certification by ID
   * @param {string} id - Certification ID
   * @returns {Promise<Certification|null>} Certification or null
   */
  async findById(id) {
    try {
      return await Certification.findByPk(id, {
        include: [
          { association: 'guide' },
          { association: 'admin' }
        ]
      });
    } catch (error) {
      throw new Error(`Failed to find certification by ID: ${error.message}`);
    }
  }

  /**
   * Update certification
   * @param {string} id - Certification ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<Certification>} Updated certification
   */
  async update(id, updateData) {
    try {
      const certification = await Certification.findByPk(id);
      if (!certification) {
        throw new Error('Certification not found');
      }
      
      await certification.update(updateData);
      return await this.findById(id);
    } catch (error) {
      throw new Error(`Failed to update certification: ${error.message}`);
    }
  }

  /**
   * Get pending certifications for admin review
   * @returns {Promise<Certification[]>} Array of pending certifications
   */
  async findPending() {
    try {
      return await Certification.findAll({
        where: { status: 'PENDING' },
        include: [
          { association: 'guide' }
        ],
        order: [['submitted_at', 'ASC']]
      });
    } catch (error) {
      throw new Error(`Failed to find pending certifications: ${error.message}`);
    }
  }

  /**
   * Get certifications by guide
   * @param {string} guideId - Guide user ID
   * @returns {Promise<Certification[]>} Array of certifications
   */
  async findByGuideId(guideId) {
    try {
      return await Certification.findAll({
        where: { guide_id: guideId },
        include: [
          { association: 'guide' },
          { association: 'admin' }
        ],
        order: [['submitted_at', 'DESC']]
      });
    } catch (error) {
      throw new Error(`Failed to find certifications by guide: ${error.message}`);
    }
  }

  /**
   * Get all certifications (admin access)
   * @param {Object} filters - Filter options
   * @returns {Promise<Certification[]>} Array of certifications
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

      return await Certification.findAll({
        where: whereClause,
        include: [
          { association: 'guide' },
          { association: 'admin' }
        ],
        order: [['submitted_at', 'DESC']]
      });
    } catch (error) {
      throw new Error(`Failed to find all certifications: ${error.message}`);
    }
  }
}

module.exports = CertificationRepository;
