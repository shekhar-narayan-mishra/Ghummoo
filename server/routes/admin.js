const express = require('express');
const AdminController = require('../controllers/AdminController');
const { authenticate } = require('../middleware/authMiddleware');
const { RoleGuard } = require('../middleware/roleGuard');
const { ValidationMiddleware, Schemas } = require('../middleware/validationMiddleware');
const { ErrorHandler } = require('../middleware/errorHandler');

const router = express.Router();
const adminController = new AdminController();

// All admin routes require admin role
router.use(authenticate);
router.use(RoleGuard.requireAdmin());

// GET /api/v1/admin/certifications - Get pending certifications
router.get(
  '/certifications',
  ErrorHandler.asyncHandler(adminController.getPendingCertifications.bind(adminController))
);

// PATCH /api/v1/admin/certifications/:id - Approve or reject certification
router.patch(
  '/certifications/:id',
  ValidationMiddleware.validateParams(Schemas.uuidParam),
  ValidationMiddleware.validateBody(Schemas.handleCertification),
  ErrorHandler.asyncHandler(adminController.handleCertification.bind(adminController))
);

// GET /api/v1/admin/certifications/all - Get all certifications
router.get(
  '/certifications/all',
  ValidationMiddleware.validateQuery(Schemas.bookingFilters),
  ErrorHandler.asyncHandler(adminController.getAllCertifications.bind(adminController))
);

// GET /api/v1/admin/users - Get all users
router.get(
  '/users',
  ValidationMiddleware.validateQuery(Schemas.bookingFilters),
  ErrorHandler.asyncHandler(adminController.getAllUsers.bind(adminController))
);

// DELETE /api/v1/admin/users/:id - Delete user
router.delete(
  '/users/:id',
  ValidationMiddleware.validateParams(Schemas.uuidParam),
  ErrorHandler.asyncHandler(adminController.deleteUser.bind(adminController))
);

// GET /api/v1/admin/statistics/bookings - Get booking statistics
router.get(
  '/statistics/bookings',
  ErrorHandler.asyncHandler(adminController.getBookingStatistics.bind(adminController))
);

// GET /api/v1/admin/statistics/users - Get user statistics
router.get(
  '/statistics/users',
  ErrorHandler.asyncHandler(adminController.getUserStatistics.bind(adminController))
);

// GET /api/v1/admin/bookings - Monitor platform bookings
router.get(
  '/bookings',
  ValidationMiddleware.validateQuery(Schemas.bookingFilters),
  ErrorHandler.asyncHandler(adminController.monitorBookings.bind(adminController))
);

module.exports = router;
