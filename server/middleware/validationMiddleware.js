const Joi = require('joi');

/**
 * Validation Middleware - Validates request data using Joi schemas
 * Follows middleware chain pattern
 */
class ValidationMiddleware {
  /**
   * Create validation middleware for request body
   * @param {Object} schema - Joi validation schema
   * @returns {Function} Express middleware function
   */
  static validateBody(schema) {
    return (req, res, next) => {
      const { error, value } = schema.validate(req.body, {
        abortEarly: false, // Return all validation errors
        stripUnknown: true // Remove unknown fields
      });

      if (error) {
        const validationErrors = error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message,
          value: detail.context.value
        }));

        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          code: 'VALIDATION_ERROR',
          errors: validationErrors
        });
      }

      // Replace request body with validated and cleaned data
      req.body = value;
      next();
    };
  }

  /**
   * Create validation middleware for request parameters
   * @param {Object} schema - Joi validation schema
   * @returns {Function} Express middleware function
   */
  static validateParams(schema) {
    return (req, res, next) => {
      const { error, value } = schema.validate(req.params, {
        abortEarly: false,
        stripUnknown: true
      });

      if (error) {
        const validationErrors = error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message,
          value: detail.context.value
        }));

        return res.status(400).json({
          success: false,
          message: 'Parameter validation failed',
          code: 'PARAMETER_VALIDATION_ERROR',
          errors: validationErrors
        });
      }

      req.params = value;
      next();
    };
  }

  /**
   * Create validation middleware for query parameters
   * @param {Object} schema - Joi validation schema
   * @returns {Function} Express middleware function
   */
  static validateQuery(schema) {
    return (req, res, next) => {
      const { error, value } = schema.validate(req.query, {
        abortEarly: false,
        stripUnknown: true
      });

      if (error) {
        const validationErrors = error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message,
          value: detail.context.value
        }));

        return res.status(400).json({
          success: false,
          message: 'Query validation failed',
          code: 'QUERY_VALIDATION_ERROR',
          errors: validationErrors
        });
      }

      req.query = value;
      next();
    };
  }
}

// Validation schemas
const Schemas = {
  // User registration schema
  register: Joi.object({
    name: Joi.string().min(2).max(100).required().messages({
      'string.empty': 'Name is required',
      'string.min': 'Name must be at least 2 characters',
      'string.max': 'Name cannot exceed 100 characters'
    }),
    email: Joi.string().email().required().messages({
      'string.email': 'Please provide a valid email address',
      'string.empty': 'Email is required'
    }),
    password: Joi.string().min(6).required().messages({
      'string.empty': 'Password is required',
      'string.min': 'Password must be at least 6 characters'
    }),
    role: Joi.string().valid('TRAVELER', 'GUIDE').required().messages({
      'any.only': 'Role must be either TRAVELER or GUIDE'
    })
  }),

  // User login schema
  login: Joi.object({
    email: Joi.string().email().required().messages({
      'string.email': 'Please provide a valid email address',
      'string.empty': 'Email is required'
    }),
    password: Joi.string().required().messages({
      'string.empty': 'Password is required'
    })
  }),

  // User profile update schema
  updateProfile: Joi.object({
    name: Joi.string().min(2).max(100).optional(),
    email: Joi.string().email().optional()
  }).min(1).messages({
    'object.min': 'At least one field must be provided for update'
  }),

  // Guide profile update schema
  updateGuideProfile: Joi.object({
    bio: Joi.string().max(2000).optional().allow(''),
    specializations: Joi.array().items(Joi.string()).optional().messages({
      'array.base': 'Specializations must be an array'
    })
  }).min(1),

  // Booking creation schema
  createBooking: Joi.object({
    guide_id: Joi.string().uuid().required().messages({
      'string.guid': 'Invalid guide ID format',
      'any.required': 'Guide ID is required'
    }),
    date: Joi.date().iso().min('now').required().messages({
      'date.format': 'Date must be in ISO format',
      'date.min': 'Booking date cannot be in the past',
      'any.required': 'Booking date is required'
    }),
    total_price: Joi.number().positive().required().messages({
      'number.positive': 'Total price must be positive',
      'any.required': 'Total price is required'
    }),
    notes: Joi.string().max(1000).optional().allow('')
  }),

  // Booking status update schema
  updateBookingStatus: Joi.object({
    status: Joi.string().valid('ACCEPTED', 'REJECTED', 'COMPLETED', 'CANCELLED').required().messages({
      'any.only': 'Status must be one of: ACCEPTED, REJECTED, COMPLETED, CANCELLED'
    })
  }),

  // Review submission schema
  submitReview: Joi.object({
    booking_id: Joi.string().uuid().required().messages({
      'string.guid': 'Invalid booking ID format',
      'any.required': 'Booking ID is required'
    }),
    rating: Joi.number().integer().min(1).max(5).required().messages({
      'number.min': 'Rating must be at least 1',
      'number.max': 'Rating cannot exceed 5',
      'any.required': 'Rating is required'
    }),
    comment: Joi.string().max(1000).optional().allow('')
  }),

  // Availability setting schema
  setAvailability: Joi.object({
    availability: Joi.array().items(
      Joi.object({
        date: Joi.date().iso().min('now').required(),
        is_available: Joi.boolean().default(true)
      })
    ).min(1).required().messages({
      'array.min': 'At least one availability slot must be provided'
    })
  }),

  // Certification handling schema
  handleCertification: Joi.object({
    action: Joi.string().valid('approve', 'reject').required().messages({
      'any.only': 'Action must be either approve or reject'
    }),
    remarks: Joi.string().max(500).optional().allow('')
  }),

  // UUID parameter schema
  uuidParam: Joi.object({
    id: Joi.string().uuid().required().messages({
      'string.guid': 'Invalid ID format',
      'any.required': 'ID is required'
    })
  }),

  // Guide ID parameter schema
  guideIdParam: Joi.object({
    guideId: Joi.string().uuid().required().messages({
      'string.guid': 'Invalid guide ID format',
      'any.required': 'Guide ID is required'
    })
  }),

  // Query filters schema
  bookingFilters: Joi.object({
    status: Joi.string().valid('PENDING', 'ACCEPTED', 'REJECTED', 'COMPLETED', 'CANCELLED').optional(),
    guideId: Joi.string().uuid().optional(),
    travelerId: Joi.string().uuid().optional()
  }),

  // Guide listing filters schema
  guideFilters: Joi.object({
    specialty: Joi.string().optional(),
    minRating: Joi.number().min(0).max(5).optional()
  }),

  // Date range filters schema
  dateRangeFilters: Joi.object({
    startDate: Joi.date().iso().optional(),
    endDate: Joi.date().iso().min(Joi.ref('startDate')).optional()
  })
};

module.exports = {
  ValidationMiddleware,
  Schemas
};
