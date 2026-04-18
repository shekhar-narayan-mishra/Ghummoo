const express = require('express');
const BookingController = require('../controllers/BookingController');
const { authenticate } = require('../middleware/authMiddleware');
const { RoleGuard } = require('../middleware/roleGuard');
const { ValidationMiddleware, Schemas } = require('../middleware/validationMiddleware');
const { ErrorHandler } = require('../middleware/errorHandler');

const router = express.Router();
const bookingController = new BookingController();

// POST /api/v1/bookings - Create booking request (authenticated traveler only)
router.post(
  '/',
  authenticate,
  RoleGuard.requireTraveler(),
  ValidationMiddleware.validateBody(Schemas.createBooking),
  ErrorHandler.asyncHandler(bookingController.createBooking.bind(bookingController))
);

// GET /api/v1/bookings - Get traveler's bookings (authenticated traveler only)
router.get(
  '/',
  authenticate,
  RoleGuard.requireTraveler(),
  ErrorHandler.asyncHandler(bookingController.getTravelerBookings.bind(bookingController))
);

// GET /api/v1/bookings/:id - Get booking by ID (authenticated user only)
router.get(
  '/:id',
  authenticate,
  ValidationMiddleware.validateParams(Schemas.uuidParam),
  ErrorHandler.asyncHandler(bookingController.getBookingById.bind(bookingController))
);

// DELETE /api/v1/bookings/:id - Cancel booking (authenticated traveler or guide only)
router.delete(
  '/:id',
  authenticate,
  RoleGuard.requireTravelerOrGuide(),
  ValidationMiddleware.validateParams(Schemas.uuidParam),
  ErrorHandler.asyncHandler(bookingController.cancelBooking.bind(bookingController))
);

// PATCH /api/v1/bookings/:id/complete - Complete booking (authenticated guide only)
router.patch(
  '/:id/complete',
  authenticate,
  RoleGuard.requireGuide(),
  ValidationMiddleware.validateParams(Schemas.uuidParam),
  ErrorHandler.asyncHandler(bookingController.completeBooking.bind(bookingController))
);

// PATCH /api/v1/bookings/:id/status - Update booking status (authenticated guide only)
router.patch(
  '/:id/status',
  authenticate,
  RoleGuard.requireGuide(),
  ValidationMiddleware.validateParams(Schemas.uuidParam),
  ValidationMiddleware.validateBody(Schemas.updateBookingStatus),
  ErrorHandler.asyncHandler(bookingController.updateBookingStatus.bind(bookingController))
);

// GET /api/v1/bookings/all - Get all bookings (admin only)
router.get(
  '/all',
  authenticate,
  RoleGuard.requireAdmin(),
  ValidationMiddleware.validateQuery(Schemas.bookingFilters),
  ErrorHandler.asyncHandler(bookingController.getAllBookings.bind(bookingController))
);

module.exports = router;
