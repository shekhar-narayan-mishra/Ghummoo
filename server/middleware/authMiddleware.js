const UserService = require('../services/UserService');

/**
 * Authentication Middleware - Verifies JWT tokens and attaches user to request
 * Follows middleware chain pattern
 */
class AuthMiddleware {
  constructor(userService = new UserService()) {
    this.userService = userService;
  }

  /**
   * Middleware to verify JWT token
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  async authenticate(req, res, next) {
    try {
      const token = this.extractToken(req);
      
      if (!token) {
        return res.status(401).json({
          success: false,
          message: 'Access token required',
          code: 'TOKEN_REQUIRED'
        });
      }

      // Verify token
      const decoded = this.userService.verifyToken(token);
      
      // Get user from database
      const user = await this.userService.getUserById(decoded.id);
      
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Invalid token - user not found',
          code: 'INVALID_TOKEN_USER'
        });
      }

      // Attach user to request object
      req.user = user;
      req.token = token;
      
      next();
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token',
        code: 'INVALID_TOKEN'
      });
    }
  }

  /**
   * Extract JWT token from request headers
   * @param {Object} req - Express request object
   * @returns {string|null} JWT token or null
   */
  extractToken(req) {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7); // Remove 'Bearer ' prefix
    }
    
    // Also check for token in query parameters (for certain use cases)
    return req.query.token || null;
  }

  /**
   * Optional authentication - doesn't fail if no token provided
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  async optionalAuthenticate(req, res, next) {
    try {
      const token = this.extractToken(req);
      
      if (token) {
        const decoded = this.userService.verifyToken(token);
        const user = await this.userService.getUserById(decoded.id);
        
        if (user) {
          req.user = user;
          req.token = token;
        }
      }
      
      next();
    } catch (error) {
      // Don't fail for optional authentication
      next();
    }
  }
}

// Create singleton instance
const authMiddleware = new AuthMiddleware();

module.exports = {
  AuthMiddleware,
  authenticate: authMiddleware.authenticate.bind(authMiddleware),
  optionalAuthenticate: authMiddleware.optionalAuthenticate.bind(authMiddleware)
};
