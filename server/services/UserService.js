const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { UserRepository } = require('../repositories');
const { UserFactory } = require('./factories/UserFactory');
const { EventBus } = require('../events/EventBus');

/**
 * User Service - Handles all user-related business logic
 * Follows Single Responsibility Principle
 */
class UserService {
  constructor(userRepository = new UserRepository()) {
    this.userRepository = userRepository;
  }

  /**
   * Register a new user
   * @param {Object} userData - User registration data
   * @returns {Promise<Object>} Created user with JWT token
   */
  async register(userData) {
    try {
      // Check if user already exists
      const existingUser = await this.userRepository.findByEmail(userData.email);
      if (existingUser) {
        throw new Error('User with this email already exists');
      }

      // Hash password
      const password_hash = await bcrypt.hash(userData.password, 10);
      delete userData.password;

      // Create user using factory pattern
      const userFactory = new UserFactory();
      const user = await this.userRepository.create({
        ...userData,
        password_hash
      });

      // Create profile based on role
      await userFactory.createProfile(user.id, userData.role);

      // Generate JWT token
      const token = this.generateToken(user);

      // Emit user registered event
      EventBus.emit('UserRegistered', { userId: user.id, role: userData.role });

      return {
        user: this.sanitizeUser(user),
        token
      };
    } catch (error) {
      throw new Error(`Registration failed: ${error.message}`);
    }
  }

  /**
   * Authenticate user and return JWT token
   * @param {string} email - User email
   * @param {string} password - User password
   * @returns {Promise<Object>} User with JWT token
   */
  async login(email, password) {
    try {
      const user = await this.userRepository.findByEmail(email);
      if (!user) {
        throw new Error('Invalid credentials');
      }

      const isPasswordValid = await bcrypt.compare(password, user.password_hash);
      if (!isPasswordValid) {
        throw new Error('Invalid credentials');
      }

      const token = this.generateToken(user);

      // Emit user logged in event
      EventBus.emit('UserLoggedIn', { userId: user.id, role: user.role });

      return {
        user: this.sanitizeUser(user),
        token
      };
    } catch (error) {
      throw new Error(`Login failed: ${error.message}`);
    }
  }

  /**
   * Get user by ID
   * @param {string} id - User ID
   * @returns {Promise<Object>} User data
   */
  async getUserById(id) {
    try {
      const user = await this.userRepository.findById(id);
      if (!user) {
        throw new Error('User not found');
      }
      return this.sanitizeUser(user);
    } catch (error) {
      throw new Error(`Failed to get user: ${error.message}`);
    }
  }

  /**
   * Update user profile
   * @param {string} id - User ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object>} Updated user
   */
  async updateUser(id, updateData) {
    try {
      // Don't allow password updates through this method
      delete updateData.password_hash;
      delete updateData.role; // Role changes should be handled separately

      const user = await this.userRepository.update(id, updateData);
      
      // Emit user updated event
      EventBus.emit('UserUpdated', { userId: id });

      return this.sanitizeUser(user);
    } catch (error) {
      throw new Error(`Failed to update user: ${error.message}`);
    }
  }

  /**
   * Delete user (admin only)
   * @param {string} id - User ID
   * @returns {Promise<boolean>} True if deleted
   */
  async deleteUser(id) {
    try {
      const deleted = await this.userRepository.delete(id);
      
      if (deleted) {
        // Emit user deleted event
        EventBus.emit('UserDeleted', { userId: id });
      }
      
      return deleted;
    } catch (error) {
      throw new Error(`Failed to delete user: ${error.message}`);
    }
  }

  /**
   * Get all users (admin only)
   * @param {Object} filters - Filter options
   * @returns {Promise<Array>} Array of users
   */
  async getAllUsers(filters = {}) {
    try {
      const users = await this.userRepository.findAll(filters);
      return users.map(user => this.sanitizeUser(user));
    } catch (error) {
      throw new Error(`Failed to get users: ${error.message}`);
    }
  }

  /**
   * Generate JWT token for user
   * @param {Object} user - User object
   * @returns {string} JWT token
   */
  generateToken(user) {
    return jwt.sign(
      { 
        id: user.id, 
        email: user.email, 
        role: user.role 
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );
  }

  /**
   * Verify JWT token
   * @param {string} token - JWT token
   * @returns {Promise<Object>} Decoded token
   */
  verifyToken(token) {
    try {
      return jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      throw new Error('Invalid token');
    }
  }

  /**
   * Sanitize user object by removing sensitive data
   * @param {Object} user - User object
   * @returns {Object} Sanitized user
   */
  sanitizeUser(user) {
    const { password_hash, ...sanitizedUser } = user.toJSON ? user.toJSON() : user;
    return sanitizedUser;
  }
}

module.exports = UserService;
