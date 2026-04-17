const UserService = require('../services/UserService');

/**
 * Auth Controller - Handles HTTP requests for authentication
 * Only handles HTTP request/response, delegates business logic to UserService
 */
class AuthController {
  constructor(userService = new UserService()) {
    this.userService = userService;
  }

  /**
   * Register new user
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async register(req, res) {
    try {
      const { user, token } = await this.userService.register(req.body);
      
      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: { user, token }
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
        code: 'REGISTRATION_FAILED'
      });
    }
  }

  /**
   * Login user
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async login(req, res) {
    try {
      const { email, password } = req.body;
      const { user, token } = await this.userService.login(email, password);
      
      res.status(200).json({
        success: true,
        message: 'Login successful',
        data: { user, token }
      });
    } catch (error) {
      res.status(401).json({
        success: false,
        message: error.message,
        code: 'LOGIN_FAILED'
      });
    }
  }

  /**
   * Get current user profile
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getProfile(req, res) {
    try {
      const user = await this.userService.getUserById(req.user.id);
      
      res.status(200).json({
        success: true,
        message: 'Profile retrieved successfully',
        data: { user }
      });
    } catch (error) {
      res.status(404).json({
        success: false,
        message: error.message,
        code: 'PROFILE_NOT_FOUND'
      });
    }
  }

  /**
   * Update user profile
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async updateProfile(req, res) {
    try {
      const user = await this.userService.updateUser(req.user.id, req.body);
      
      res.status(200).json({
        success: true,
        message: 'Profile updated successfully',
        data: { user }
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
        code: 'PROFILE_UPDATE_FAILED'
      });
    }
  }

  /**
   * Logout user (client-side token removal)
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async logout(req, res) {
    try {
      // In a stateless JWT system, logout is handled client-side
      // We could implement token blacklisting if needed
      res.status(200).json({
        success: true,
        message: 'Logout successful',
        data: null
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Logout failed',
        code: 'LOGOUT_FAILED'
      });
    }
  }
}

module.exports = AuthController;
