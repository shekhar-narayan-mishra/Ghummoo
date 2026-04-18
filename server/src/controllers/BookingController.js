const { asyncHandler } = require('../middleware/errorHandler');
const BookingService = require('../services/BookingService');
const MongoBookingRepository = require('../repositories/MongoBookingRepository');
const MongoGuideRepository = require('../repositories/MongoGuideRepository');
const Guide = require('../models/Guide');

const bookingRepo = new MongoBookingRepository();
const guideRepo = new MongoGuideRepository();
const bookingService = new BookingService(bookingRepo, guideRepo);

// POST /api/bookings
const createBooking = asyncHandler(async (req, res) => {
  const { guideId, startDate, endDate } = req.body;
  if (!guideId || !startDate || !endDate) {
    return res.status(400).json({ success: false, message: 'guideId, startDate, endDate are required' });
  }
  const result = await bookingService.createBooking(req.user._id, { guideId, startDate, endDate });
  res.status(201).json({ success: true, data: result });
});

// GET /api/bookings/my
const getMyBookings = asyncHandler(async (req, res) => {
  const filter = req.query.status ? { status: req.query.status } : {};
  const bookings = await bookingService.getBookingsForTraveler(req.user._id, filter);
  res.json({ success: true, data: bookings });
});

// GET /api/bookings/guide
const getGuideBookings = asyncHandler(async (req, res) => {
  const guide = await Guide.findOne({ userId: req.user._id }).lean();
  if (!guide) return res.status(404).json({ success: false, message: 'Guide profile not found' });
  const filter = req.query.status ? { status: req.query.status } : {};
  const bookings = await bookingService.getBookingsForGuide(guide._id, filter);
  res.json({ success: true, data: bookings });
});

// PATCH /api/bookings/:id/confirm
const confirmBooking = asyncHandler(async (req, res) => {
  const guide = await Guide.findOne({ userId: req.user._id }).lean();
  if (!guide) return res.status(404).json({ success: false, message: 'Guide profile not found' });
  const booking = await bookingService.confirmBooking(req.params.id, guide._id);
  res.json({ success: true, data: booking });
});

// PATCH /api/bookings/:id/cancel
const cancelBooking = asyncHandler(async (req, res) => {
  const booking = await bookingService.cancelBooking(req.params.id, req.user._id, req.body.reason);
  res.json({ success: true, data: booking });
});

// PATCH /api/bookings/:id/complete
const completeBooking = asyncHandler(async (req, res) => {
  const booking = await bookingService.completeBooking(req.params.id);
  res.json({ success: true, data: booking });
});

module.exports = { createBooking, getMyBookings, getGuideBookings, confirmBooking, cancelBooking, completeBooking };
