/**
 * Interface for User Repository
 * Defines the contract for user data access operations
 */
class IUserRepository {
  /**
   * Create a new user
   * @param {Object} userData - User data
   * @returns {Promise<User>} Created user
   */
  async create(userData) {
    throw new Error('Method not implemented');
  }

  /**
   * Find user by ID
   * @param {string} id - User ID
   * @returns {Promise<User|null>} User or null
   */
  async findById(id) {
    throw new Error('Method not implemented');
  }

  /**
   * Find user by email
   * @param {string} email - User email
   * @returns {Promise<User|null>} User or null
   */
  async findByEmail(email) {
    throw new Error('Method not implemented');
  }

  /**
   * Update user
   * @param {string} id - User ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<User>} Updated user
   */
  async update(id, updateData) {
    throw new Error('Method not implemented');
  }

  /**
   * Delete user
   * @param {string} id - User ID
   * @returns {Promise<boolean>} True if deleted
   */
  async delete(id) {
    throw new Error('Method not implemented');
  }

  /**
   * Get all users with optional filtering
   * @param {Object} filters - Filter options
   * @returns {Promise<User[]>} Array of users
   */
  async findAll(filters = {}) {
    throw new Error('Method not implemented');
  }

  /**
   * Find users by role
   * @param {string} role - User role
   * @returns {Promise<User[]>} Array of users
   */
  async findByRole(role) {
    throw new Error('Method not implemented');
  }
}

module.exports = IUserRepository;
