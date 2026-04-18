const express = require('express');
const { ErrorHandler } = require('../middleware/errorHandler');

// Import route modules
const authRoutes = require('./auth');
const guideRoutes = require('./guides');
const bookingRoutes = require('./bookings');
const reviewRoutes = require('./reviews');
const adminRoutes = require('./admin');

const router = express.Router();

// API versioning - v1 routes
router.use('/auth', authRoutes);
router.use('/guides', guideRoutes);
router.use('/bookings', bookingRoutes);
router.use('/reviews', reviewRoutes);
router.use('/admin', adminRoutes);

// API health check endpoint
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Ghummoo API is running',
    version: 'v1',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API documentation endpoint
router.get('/docs', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Ghummoo API Documentation',
    version: 'v1',
    endpoints: {
      auth: {
        'POST /auth/register': 'Register new user',
        'POST /auth/login': 'Login user',
        'GET /auth/profile': 'Get current user profile',
        'PUT /auth/profile': 'Update user profile',
        'POST /auth/logout': 'Logout user'
      },
      guides: {
        'GET /guides': 'Get all certified guides (public)',
        'GET /guides/:id': 'Get guide by ID with reviews (public)',
        'GET /guides/profile': 'Get guide profile (guide only)',
        'PUT /guides/profile': 'Update guide profile (guide only)',
        'POST /guides/certification': 'Submit certification application (guide only)',
        'GET /guides/bookings': 'Get guide\'s bookings (guide only)',
        'PATCH /guides/bookings/:id': 'Accept or reject booking (guide only)',
        'POST /guides/availability': 'Set availability (guide only)',
        'GET /guides/availability': 'Get guide availability (guide only)'
      },
      bookings: {
        'POST /bookings': 'Create booking request (traveler only)',
        'GET /bookings': 'Get traveler\'s bookings (traveler only)',
        'GET /bookings/:id': 'Get booking by ID (authenticated users)',
        'DELETE /bookings/:id': 'Cancel booking (traveler or guide)',
        'PATCH /bookings/:id/complete': 'Complete booking (guide only)',
        'PATCH /bookings/:id/status': 'Update booking status (guide only)',
        'GET /bookings/all': 'Get all bookings (admin only)'
      },
      reviews: {
        'POST /reviews': 'Submit review (traveler only)',
        'GET /reviews/guide/:guideId': 'Get reviews for a guide (public)',
        'GET /reviews/traveler': 'Get traveler\'s reviews (traveler only)',
        'GET /reviews/:id': 'Get review by ID (authenticated users)'
      },
      admin: {
        'GET /admin/certifications': 'Get pending certifications (admin only)',
        'PATCH /admin/certifications/:id': 'Approve or reject certification (admin only)',
        'GET /admin/certifications/all': 'Get all certifications (admin only)',
        'GET /admin/users': 'Get all users (admin only)',
        'DELETE /admin/users/:id': 'Delete user (admin only)',
        'GET /admin/statistics/bookings': 'Get booking statistics (admin only)',
        'GET /admin/statistics/users': 'Get user statistics (admin only)',
        'GET /admin/bookings': 'Monitor platform bookings (admin only)'
      }
    }
  });
});

// 404 handler for undefined routes
router.use('*', ErrorHandler.notFound);

module.exports = router;
