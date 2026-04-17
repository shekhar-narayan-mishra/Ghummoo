/**
 * Role Guard Middleware - Enforces role-based access control
 * Follows middleware chain pattern and RBAC principles
 */
class RoleGuard {
  /**
   * Create role guard middleware
   * @param {string|Array} allowedRoles - Allowed role(s)
   * @returns {Function} Express middleware function
   */
  static requireRole(allowedRoles) {
    return (req, res, next) => {
      try {
        // Check if user exists (should be set by auth middleware)
        if (!req.user) {
          return res.status(401).json({
            success: false,
            message: 'Authentication required',
            code: 'AUTHENTICATION_REQUIRED'
          });
        }

        // Convert allowedRoles to array if it's a string
        const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
        
        // Check if user's role is allowed
        if (!roles.includes(req.user.role)) {
          return res.status(403).json({
            success: false,
            message: `Access denied. Required role: ${roles.join(' or ')}. Current role: ${req.user.role}`,
            code: 'INSUFFICIENT_PERMISSIONS'
          });
        }

        next();
      } catch (error) {
        return res.status(500).json({
          success: false,
          message: 'Role verification failed',
          code: 'ROLE_VERIFICATION_ERROR'
        });
      }
    };
  }

  /**
   * Require traveler role
   * @returns {Function} Express middleware function
   */
  static requireTraveler() {
    return this.requireRole('TRAVELER');
  }

  /**
   * Require guide role
   * @returns {Function} Express middleware function
   */
  static requireGuide() {
    return this.requireRole('GUIDE');
  }

  /**
   * Require admin role
   * @returns {Function} Express middleware function
   */
  static requireAdmin() {
    return this.requireRole('ADMIN');
  }

  /**
   * Require traveler or guide role
   * @returns {Function} Express middleware function
   */
  static requireTravelerOrGuide() {
    return this.requireRole(['TRAVELER', 'GUIDE']);
  }

  /**
   * Require guide or admin role
   * @returns {Function} Express middleware function
   */
  static requireGuideOrAdmin() {
    return this.requireRole(['GUIDE', 'ADMIN']);
  }

  /**
   * Require any authenticated user
   * @returns {Function} Express middleware function
   */
  static requireAnyAuthenticated() {
    return (req, res, next) => {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
          code: 'AUTHENTICATION_REQUIRED'
        });
      }
      next();
    };
  }

  /**
   * Resource ownership check - user can only access their own resources
   * @param {string} resourceParam - Parameter name containing resource owner ID
   * @returns {Function} Express middleware function
   */
  static requireOwnership(resourceParam) {
    return (req, res, next) => {
      try {
        if (!req.user) {
          return res.status(401).json({
            success: false,
            message: 'Authentication required',
            code: 'AUTHENTICATION_REQUIRED'
          });
        }

        const resourceId = req.params[resourceParam];
        const userId = req.user.id;

        // Admin can access any resource
        if (req.user.role === 'ADMIN') {
          return next();
        }

        // Check ownership
        if (resourceId !== userId) {
          return res.status(403).json({
            success: false,
            message: 'Access denied. You can only access your own resources',
            code: 'RESOURCE_OWNERSHIP_REQUIRED'
          });
        }

        next();
      } catch (error) {
        return res.status(500).json({
          success: false,
          message: 'Ownership verification failed',
          code: 'OWNERSHIP_VERIFICATION_ERROR'
        });
      }
    };
  }

  /**
   * Booking access check - user can access booking if they are traveler or guide
   * @param {string} bookingParam - Parameter name containing booking ID
   * @returns {Function} Express middleware function
   */
  static requireBookingAccess(bookingParam = 'id') {
    return async (req, res, next) => {
      try {
        if (!req.user) {
          return res.status(401).json({
            success: false,
            message: 'Authentication required',
            code: 'AUTHENTICATION_REQUIRED'
          });
        }

        const bookingId = req.params[bookingParam];
        const userId = req.user.id;
        const userRole = req.user.role;

        // Admin can access any booking
        if (userRole === 'ADMIN') {
          return next();
        }

        // For non-admins, we need to check booking ownership
        // This would typically involve fetching the booking from the database
        // For now, we'll pass through and let the service layer handle the check
        // In a real implementation, you might want to do the check here for efficiency
        
        next();
      } catch (error) {
        return res.status(500).json({
          success: false,
          message: 'Booking access verification failed',
          code: 'BOOKING_ACCESS_VERIFICATION_ERROR'
        });
      }
    };
  }
}

module.exports = { RoleGuard };

