const IUserRepository = require('./IUserRepository');
const { User } = require('../models');

/**
 * Concrete implementation of User Repository using Sequelize
 */
class UserRepository extends IUserRepository {
  /**
   * Create a new user
   * @param {Object} userData - User data
   * @returns {Promise<User>} Created user
   */
  async create(userData) {
    try {
      return await User.create(userData);
    } catch (error) {
      throw new Error(`Failed to create user: ${error.message}`);
    }
  }

  /**
   * Find user by ID
   * @param {string} id - User ID
   * @returns {Promise<User|null>} User or null
   */
  async findById(id) {
    try {
      return await User.findByPk(id, {
        include: [
          { association: 'travelerProfile' },
          { association: 'guideProfile' }
        ]
      });
    } catch (error) {
      throw new Error(`Failed to find user by ID: ${error.message}`);
    }
  }

  /**
   * Find user by email
   * @param {string} email - User email
   * @returns {Promise<User|null>} User or null
   */
  async findByEmail(email) {
    try {
      return await User.findOne({
        where: { email },
        include: [
          { association: 'travelerProfile' },
          { association: 'guideProfile' }
        ]
      });
    } catch (error) {
      throw new Error(`Failed to find user by email: ${error.message}`);
    }
  }

  /**
   * Update user
   * @param {string} id - User ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<User>} Updated user
   */
  async update(id, updateData) {
    try {
      const user = await User.findByPk(id);
      if (!user) {
        throw new Error('User not found');
      }
      
      await user.update(updateData);
      return await this.findById(id);
    } catch (error) {
      throw new Error(`Failed to update user: ${error.message}`);
    }
  }

  /**
   * Delete user
   * @param {string} id - User ID
   * @returns {Promise<boolean>} True if deleted
   */
  async delete(id) {
    try {
      const result = await User.destroy({ where: { id } });
      return result > 0;
    } catch (error) {
      throw new Error(`Failed to delete user: ${error.message}`);
    }
  }

  /**
   * Get all users with optional filtering
   * @param {Object} filters - Filter options
   * @returns {Promise<User[]>} Array of users
   */
  async findAll(filters = {}) {
    try {
      const whereClause = {};
      
      if (filters.role) {
        whereClause.role = filters.role;
      }
      
      if (filters.email) {
        whereClause.email = filters.email;
      }

      return await User.findAll({
        where: whereClause,
        include: [
          { association: 'travelerProfile' },
          { association: 'guideProfile' }
        ],
        order: [['created_at', 'DESC']]
      });
    } catch (error) {
      throw new Error(`Failed to find users: ${error.message}`);
    }
  }

  /**
   * Find users by role
   * @param {string} role - User role
   * @returns {Promise<User[]>} Array of users
   */
  async findByRole(role) {
    try {
      return await User.findAll({
        where: { role },
        include: [
          { association: 'travelerProfile' },
          { association: 'guideProfile' }
        ],
        order: [['created_at', 'DESC']]
      });
    } catch (error) {
      throw new Error(`Failed to find users by role: ${error.message}`);
    }
  }
}

module.exports = UserRepository;
