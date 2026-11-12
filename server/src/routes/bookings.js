const router = require('express').Router();
const { Booking, TripDeparture, TripPackage, Operator, TripAnnouncement, Review } = require('../models');
const { verifyToken } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { badRequest, notFoundErr, forbidden, conflict } = require('../utils/http');
const { bookingReference, isEmail, isPhone, EMERGENCY_CONTACT_MAX_LENGTH } = require('../utils/text');
const { holdSeats, releaseSeats, adjustConfirmedSeats } = require('../services/seats');
const { isBookable } = require('../services/trips');

const MAX_SEATS = 10;

router.use(verifyToken);

function validateTravelers(list, seats) {
  if (!Array.isArray(list) || list.length !== seats) throw badRequest(`Please provide details for all ${seats} traveller(s)`);
  return list.map((t, i) => {
    const n = i + 1;
    const fullName = String(t.fullName || '').trim();
    const age = Number(t.age);
    if (fullName.length < 2) throw badRequest(`Traveller ${n}: full name is required`);
    if (!Number.isInteger(age) || age < 1 || age > 110) throw badRequest(`Traveller ${n}: enter a valid age`);
    if (t.email && !isEmail(t.email)) throw badRequest(`Traveller ${n}: email looks invalid`);
    const phone = String(t.phone || '').trim();
    if (phone && !isPhone(phone)) throw badRequest(`Traveller ${n}: phone looks invalid`);
    const emergencyContact = String(t.emergencyContact || '').trim();
    if (emergencyContact.length > EMERGENCY_CONTACT_MAX_LENGTH) {
      throw badRequest(`Traveller ${n}: emergency contact must be ${EMERGENCY_CONTACT_MAX_LENGTH} characters or fewer`);
    }
    return {
      fullName,
      age,
      gender: ['female', 'male', 'other', 'prefer_not'].includes(t.gender) ? t.gender : 'prefer_not',
      phone,
      email: String(t.email || '').trim(),
      emergencyContact,
    };
  });
}

// POST /api/bookings — create a booking request and hold seats atomically.
router.post('/', asyncHandler(async (req, res) => {
  if (req.user.role !== 'traveler') throw forbidden('Please use a traveller account to book trips');
  const { departureId, specialRequests } = req.body || {};
  const contact = req.body?.contact && typeof req.body.contact === 'object' ? req.body.contact : {};
  const seats = Number(req.body.seats);
  if (!departureId || typeof departureId !== 'string') throw badRequest('Please choose a departure');
  if (!Number.isInteger(seats) || seats < 1 || seats > MAX_SEATS) throw badRequest(`You can book between 1 and ${MAX_SEATS} seats`);
  const travelers = validateTravelers(req.body.travelers, seats);
  if (!contact.name || !contact.email || !contact.phone) throw badRequest('Contact name, email and phone are required');
  if (!isEmail(contact.email)) throw badRequest('Contact email looks invalid');
  if (!isPhone(contact.phone)) throw badRequest('Contact phone looks invalid');

  const departure = await TripDeparture.findById(departureId).lean();
  if (!departure) throw notFoundErr('Departure not found');
  const pkg = await TripPackage.findById(departure.package).lean();
  const operator = await Operator.findById(departure.operator).lean();
  if (!pkg || pkg.status !== 'published' || !operator || operator.status !== 'approved') throw badRequest('This trip is not accepting bookings');
  if (!isBookable(departure)) throw conflict('This departure is no longer accepting bookings');
  if (departure.seatsAvailable < seats) throw conflict(`Only ${departure.seatsAvailable} seat(s) left on this departure`);

  const held = await holdSeats(departure._id, seats);
  if (!held) {
    const fresh = await TripDeparture.findById(departure._id).lean();
    throw conflict(`Only ${fresh ? fresh.seatsAvailable : 0} seat(s) left on this departure`);
  }

  try {
    const booking = await Booking.create({
      reference: bookingReference(),
      user: req.user._id,
      operator: operator._id,
      package: pkg._id,
      departure: departure._id,
      seats,
      pricePerSeat: departure.price,
      totalAmount: departure.price * seats,
      currency: pkg.currency || 'INR',
      travelers,
      contact: { name: String(contact.name).trim(), email: String(contact.email).trim(), phone: String(contact.phone).trim() },
      specialRequests: String(specialRequests || '').slice(0, 1000),
      history: [{ status: 'requested', note: 'Booking request submitted', by: req.user._id }],
    });
    res.status(201).json({ success: true, data: booking });
  } catch (err) {
    await releaseSeats(departure._id, seats);
    throw err;
  }
}));

const populateBooking = (q) => q
  .populate('package', 'title slug destination coverImage durationDays durationNights itinerary cancellationPolicy pickupInfo inclusions exclusions')
  .populate('departure')
  .populate('operator', 'businessName slug contactEmail contactPhone verifiedAt');

router.get('/mine', asyncHandler(async (req, res) => {
  const items = await populateBooking(Booking.find({ user: req.user._id }).sort({ createdAt: -1 })).lean();
  res.json({ success: true, data: items });
}));

async function loadAccessible(req) {
  const booking = await populateBooking(Booking.findById(req.params.id));
  if (!booking) throw notFoundErr('Booking not found');
  const isOwner = String(booking.user) === String(req.user._id);
  let isOperator = false;
  if (req.user.role === 'operator') {
    const op = await Operator.findOne({ owner: req.user._id }).lean();
    isOperator = op && String(op._id) === String(booking.operator._id);
  }
  const isAdmin = req.user.role === 'admin';
  if (!isOwner && !isOperator && !isAdmin) throw notFoundErr('Booking not found');
  return { booking, isOwner, isOperator, isAdmin };
}

router.get('/:id', asyncHandler(async (req, res) => {
  const { booking } = await loadAccessible(req);
  const review = await Review.findOne({ booking: booking._id }).lean();
  res.json({ success: true, data: { ...booking.toObject(), review } });
}));

router.post('/:id/cancel', asyncHandler(async (req, res) => {
  const { booking, isOwner } = await loadAccessible(req);
  if (!isOwner) throw forbidden('Only the traveller who made this booking can cancel it');
  if (!['requested', 'confirmed'].includes(booking.status)) throw conflict(`A ${booking.status} booking cannot be cancelled`);
  if (new Date(booking.departure.startDate) <= new Date()) throw conflict('This trip has already started');
  // Read the pre-update document so we know whether confirmed seats must be released too.
  const before = await Booking.findOneAndUpdate(
    { _id: booking._id, status: { $in: ['requested', 'confirmed'] } },
    { $set: { status: 'cancelled' }, $push: { history: { status: 'cancelled', note: String(req.body?.reason || 'Cancelled by traveller').slice(0, 300), by: req.user._id } } },
    { new: false }
  );
  if (!before) throw conflict('Booking status changed, please refresh');
  await releaseSeats(booking.departure._id, booking.seats);
  if (before.status === 'confirmed') await adjustConfirmedSeats(booking.departure._id, -booking.seats);
  const updated = await Booking.findById(booking._id);
  res.json({ success: true, data: updated });
}));

// Trip updates board for a booking. Only confirmed bookings (or the operator/admin) can read it.
router.get('/:id/announcements', asyncHandler(async (req, res) => {
  const { booking, isOwner } = await loadAccessible(req);
  if (isOwner && booking.status !== 'confirmed') {
    return res.json({ success: true, data: { locked: true, items: [] } });
  }
  const items = await TripAnnouncement.find({ departure: booking.departure._id }).sort({ pinned: -1, createdAt: -1 }).lean();
  return res.json({ success: true, data: { locked: false, items } });
}));

router.post('/:id/review', asyncHandler(async (req, res) => {
  const { booking, isOwner } = await loadAccessible(req);
  if (!isOwner) throw forbidden();
  if (booking.status !== 'confirmed') throw conflict('Only confirmed trips can be reviewed');
  if (new Date(booking.departure.endDate) > new Date()) throw conflict('You can review this trip after it ends');
  const rating = Number(req.body?.rating);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) throw badRequest('Rating must be between 1 and 5');
  const ALREADY = 'You have already reviewed this trip';
  if (await Review.exists({ booking: booking._id })) throw conflict(ALREADY);
  let review;
  try {
    review = await Review.create({
      package: booking.package._id, operator: booking.operator._id, booking: booking._id, user: req.user._id,
      rating, comment: String(req.body?.comment || '').slice(0, 2000),
    });
  } catch (err) {
    // Two requests at once: the unique index on Review.booking lets only one through.
    if (err && err.code === 11000) throw conflict(ALREADY);
    throw err;
  }
  res.status(201).json({ success: true, data: review });
}));

module.exports = router;
