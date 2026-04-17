const IAvailabilityRepository = require('./IAvailabilityRepository');
const { Availability } = require('../models');

/**
 * Concrete implementation of Availability Repository using Sequelize
 */
class AvailabilityRepository extends IAvailabilityRepository {
  /**
   * Create availability slot
   * @param {Object} availabilityData - Availability data
   * @returns {Promise<Availability>} Created availability
   */
  async create(availabilityData) {
    try {
      return await Availability.create(availabilityData, {
        include: [{ association: 'guide' }]
      });
    } catch (error) {
      throw new Error(`Failed to create availability: ${error.message}`);
    }
  }

  /**
   * Update availability slot
   * @param {string} id - Availability ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<Availability>} Updated availability
   */
  async update(id, updateData) {
    try {
      const availability = await Availability.findByPk(id);
      if (!availability) {
        throw new Error('Availability not found');
      }
      
      await availability.update(updateData);
      return await Availability.findByPk(id, {
        include: [{ association: 'guide' }]
      });
    } catch (error) {
      throw new Error(`Failed to update availability: ${error.message}`);
    }
  }

  /**
   * Delete availability slot
   * @param {string} id - Availability ID
   * @returns {Promise<boolean>} True if deleted
   */
  async delete(id) {
    try {
      const result = await Availability.destroy({ where: { id } });
      return result > 0;
    } catch (error) {
      throw new Error(`Failed to delete availability: ${error.message}`);
    }
  }

  /**
   * Get availability by guide
   * @param {string} guideId - Guide user ID
   * @param {Object} filters - Filter options (date range)
   * @returns {Promise<Availability[]>} Array of availability slots
   */
  async findByGuideId(guideId, filters = {}) {
    try {
      const whereClause = { guide_id: guideId };
      
      if (filters.startDate && filters.endDate) {
        whereClause.date = {
          [require('sequelize').Op.between]: [filters.startDate, filters.endDate]
        };
      } else if (filters.startDate) {
        whereClause.date = {
          [require('sequelize').Op.gte]: filters.startDate
        };
      } else if (filters.endDate) {
        whereClause.date = {
          [require('sequelize').Op.lte]: filters.endDate
        };
      }

      if (filters.isAvailable !== undefined) {
        whereClause.is_available = filters.isAvailable;
      }

      return await Availability.findAll({
        where: whereClause,
        include: [{ association: 'guide' }],
        order: [['date', 'ASC']]
      });
    } catch (error) {
      throw new Error(`Failed to find availability by guide: ${error.message}`);
    }
  }

  /**
   * Check if availability exists for guide on specific date
   * @param {string} guideId - Guide user ID
   * @param {Date} date - Date to check
   * @returns {Promise<Availability|null>} Availability or null
   */
  async findByGuideAndDate(guideId, date) {
    try {
      return await Availability.findOne({
        where: {
          guide_id: guideId,
          date: date
        },
        include: [{ association: 'guide' }]
      });
    } catch (error) {
      throw new Error(`Failed to find availability by guide and date: ${error.message}`);
    }
  }

  /**
   * Bulk create availability slots
   * @param {Array} availabilityData - Array of availability data
   * @returns {Promise<Availability[]>} Created availability slots
   */
  async bulkCreate(availabilityData) {
    try {
      return await Availability.bulkCreate(availabilityData, {
        ignoreDuplicates: true
      });
    } catch (error) {
      throw new Error(`Failed to bulk create availability: ${error.message}`);
    }
  }

  /**
   * Delete availability slots for date range
   * @param {string} guideId - Guide user ID
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<number>} Number of deleted slots
   */
  async deleteByDateRange(guideId, startDate, endDate) {
    try {
      const result = await Availability.destroy({
        where: {
          guide_id: guideId,
          date: {
            [require('sequelize').Op.between]: [startDate, endDate]
          }
        }
      });
      return result;
    } catch (error) {
      throw new Error(`Failed to delete availability by date range: ${error.message}`);
    }
  }
}

module.exports = AvailabilityRepository;
