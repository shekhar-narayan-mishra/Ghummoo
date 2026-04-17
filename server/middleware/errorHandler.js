/**
 * Error Handler Middleware - Centralized error handling
 * Follows middleware chain pattern (must be last in chain)
 */
class ErrorHandler {
  /**
   * Handle 404 errors
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  static notFound(req, res, next) {
    const error = new Error(`Route not found: ${req.method} ${req.originalUrl}`);
    error.status = 404;
    error.code = 'ROUTE_NOT_FOUND';
    next(error);
  }

  /**
   * Global error handler
   * @param {Object} err - Error object
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  static globalHandler(err, req, res, next) {
    // Log error for debugging
    console.error('Error:', {
      message: err.message,
      stack: err.stack,
      url: req.originalUrl,
      method: req.method,
      body: req.body,
      params: req.params,
      query: req.query,
      user: req.user?.id || 'anonymous',
      timestamp: new Date().toISOString()
    });

    // Default error response
    let status = err.status || 500;
    let code = err.code || 'INTERNAL_SERVER_ERROR';
    let message = err.message || 'Internal server error';

    // Handle specific error types
    if (err.name === 'ValidationError') {
      status = 400;
      code = 'VALIDATION_ERROR';
      message = 'Validation failed';
    } else if (err.name === 'SequelizeUniqueConstraintError') {
      status = 409;
      code = 'DUPLICATE_ENTRY';
      message = 'Resource already exists';
    } else if (err.name === 'SequelizeForeignKeyConstraintError') {
      status = 400;
      code = 'FOREIGN_KEY_CONSTRAINT';
      message = 'Invalid reference to related resource';
    } else if (err.name === 'SequelizeDatabaseError') {
      status = 500;
      code = 'DATABASE_ERROR';
      message = 'Database operation failed';
    } else if (err.name === 'JsonWebTokenError') {
      status = 401;
      code = 'INVALID_TOKEN';
      message = 'Invalid authentication token';
    } else if (err.name === 'TokenExpiredError') {
      status = 401;
      code = 'TOKEN_EXPIRED';
      message = 'Authentication token has expired';
    } else if (err.name === 'CastError') {
      status = 400;
      code = 'INVALID_ID_FORMAT';
      message = 'Invalid ID format';
    }

    // Don't expose stack trace in production
    const isDevelopment = process.env.NODE_ENV === 'development';
    const response = {
      success: false,
      message,
      code,
      timestamp: new Date().toISOString()
    };

    // Include stack trace in development
    if (isDevelopment) {
      response.stack = err.stack;
      response.details = {
        name: err.name,
        originalMessage: err.message
      };
    }

    // Include validation errors if they exist
    if (err.errors && Array.isArray(err.errors)) {
      response.errors = err.errors;
    }

    res.status(status).json(response);
  }

  /**
   * Async error wrapper for route handlers
   * @param {Function} fn - Async route handler function
   * @returns {Function} Wrapped function with error handling
   */
  static asyncHandler(fn) {
    return (req, res, next) => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };
  }

  /**
   * Create custom error
   * @param {string} message - Error message
   * @param {number} status - HTTP status code
   * @param {string} code - Error code
   * @returns {Error} Custom error object
   */
  static createError(message, status = 500, code = 'CUSTOM_ERROR') {
    const error = new Error(message);
    error.status = status;
    error.code = code;
    return error;
  }

  /**
   * Create validation error
   * @param {Array} errors - Array of validation errors
   * @returns {Error} Validation error object
   */
  static createValidationError(errors) {
    const error = new Error('Validation failed');
    error.status = 400;
    error.code = 'VALIDATION_ERROR';
    error.errors = errors;
    return error;
  }

  /**
   * Create not found error
   * @param {string} resource - Resource name
   * @returns {Error} Not found error object
   */
  static createNotFoundError(resource = 'Resource') {
    const error = new Error(`${resource} not found`);
    error.status = 404;
    error.code = 'NOT_FOUND';
    return error;
  }

  /**
   * Create unauthorized error
   * @param {string} message - Error message
   * @returns {Error} Unauthorized error object
   */
  static createUnauthorizedError(message = 'Unauthorized') {
    const error = new Error(message);
    error.status = 401;
    error.code = 'UNAUTHORIZED';
    return error;
  }

  /**
   * Create forbidden error
   * @param {string} message - Error message
   * @returns {Error} Forbidden error object
   */
  static createForbiddenError(message = 'Forbidden') {
    const error = new Error(message);
    error.status = 403;
    error.code = 'FORBIDDEN';
    return error;
  }

  /**
   * Create conflict error
   * @param {string} message - Error message
   * @returns {Error} Conflict error object
   */
  static createConflictError(message = 'Resource conflict') {
    const error = new Error(message);
    error.status = 409;
    error.code = 'CONFLICT';
    return error;
  }
}

module.exports = { ErrorHandler };

