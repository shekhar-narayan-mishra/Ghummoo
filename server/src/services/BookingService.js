// USE CASES COVERED (from useCaseDiagram.md):
// - Book Guide → createBooking()
// - Cancel Booking → cancelBooking()
// - Accept Booking → confirmBooking()
// - Reject Booking → rejectBooking()
// - Monitor Bookings → getBookingsForGuide(), getBookingsForTraveler()

const dayjs = require('dayjs');
const { BookingStateMachine } = require('../patterns/BookingStateMachine');
const { getPricingStrategy } = require('../patterns/PricingStrategy');
const { notificationService } = require('../patterns/NotificationObserver');
const AvailabilityService = require('./AvailabilityService');
const Guide = require('../models/Guide');

const availabilityService = new AvailabilityService();

// SOLID - SRP: this class only manages booking state transitions
class BookingService {
  constructor(bookingRepository, guideRepository) {
    // SOLID - DIP: depends on abstraction, not concrete MongoDB impl
    this.bookingRepository = bookingRepository;
    this.guideRepository = guideRepository;
  }

  // Sequence step 3 of 7: Traveler sends booking request
  async createBooking(travelerId, bookingData) {
    const { guideId, startDate, endDate } = bookingData;

    // Business rule 1: guide must be approved
    const guide = await this.guideRepository.findById(guideId);
    if (!guide) throw new Error('Guide not found');
    if (guide.certificationStatus !== 'approved') {
      throw new Error('This guide is not yet certified to accept bookings');
    }
    if (guide.isSuspended) throw new Error('This guide is currently suspended');

    // Business rule 2: validate all dates are available and not already booked
    const totalDays = dayjs(endDate).diff(dayjs(startDate), 'day') + 1;
    if (totalDays < 1) throw new Error('End date must be after start date');
    await availabilityService.validateDatesAvailable(guide._id, startDate, endDate);

    // Strategy Pattern: calculate total amount based on guide's pricingType
    const strategy = getPricingStrategy(guide.pricingType);
    const pricing = strategy.calculate(guide.pricePerDay, totalDays);

    // State Machine: initial state
    const bookingMode = guide.instantBook ? 'instant' : 'request';
    const initialStatus = guide.instantBook ? 'confirmed' : 'pending';
    const confirmedAt = guide.instantBook ? new Date() : null;

    const booking = await this.bookingRepository.create({
      travelerId,
      guideId: guide._id,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      totalDays,
      totalAmount: pricing.total,
      status: initialStatus,
      bookingMode,
      confirmedAt,
    });

    // Mark availability slots as booked
    await availabilityService.markSlotsBooked(guide._id, startDate, endDate);

    // Sequence step 4 of 7: System notifies Guide
    const guideUserId = guide.userId._id || guide.userId;
    await notificationService.notify('booking_requested', {
      recipientId: guideUserId,
      travelerName: 'A traveler',
      bookingId: booking._id,
    });

    // For instant booking, also notify traveler immediately
    if (guide.instantBook) {
      // Sequence step 6 of 7: System confirms to Traveler
      await notificationService.notify('booking_confirmed', {
        recipientId: travelerId,
        guideName: guide.userId?.name || 'your guide',
      });
    }

    // Sequence step 7 of 7: System logs to Admin (via booking_activity event)
    // Admin is notified through InAppObserver targeting admin users in a real impl
    // Here we log for visibility
    console.log('[BookingService] Booking activity logged for admin monitoring');

    return { booking, pricing };
  }

  // Sequence step 5 of 7: Guide accepts
  async confirmBooking(bookingId, guideId) {
    const booking = await this.bookingRepository.findById(bookingId);
    if (!booking) throw new Error('Booking not found');
    if (booking.guideId._id.toString() !== guideId.toString()) {
      throw new Error('Not authorized to confirm this booking');
    }

    const state = BookingStateMachine.getState(booking);
    const updates = state.confirm();
    const updated = await this.bookingRepository.update(bookingId, updates);

    // Sequence step 6 of 7: System confirms to Traveler
    await notificationService.notify('booking_confirmed', {
      recipientId: booking.travelerId._id || booking.travelerId,
      guideName: 'your guide',
    });

    return updated;
  }

  async rejectBooking(bookingId, guideId, reason) {
    const booking = await this.bookingRepository.findById(bookingId);
    if (!booking) throw new Error('Booking not found');
    if (booking.guideId._id.toString() !== guideId.toString()) {
      throw new Error('Not authorized to reject this booking');
    }

    const state = BookingStateMachine.getState(booking);
    const updates = state.cancel(reason || 'Guide declined');
    const updated = await this.bookingRepository.update(bookingId, updates);

    // Release availability slots
    await availabilityService.markSlotsAvailable(booking.guideId._id, booking.startDate, booking.endDate);

    await notificationService.notify('booking_cancelled', {
      recipientId: booking.travelerId._id || booking.travelerId,
      reason: reason || 'Guide declined the request',
    });

    return updated;
  }

  async cancelBooking(bookingId, userId, reason) {
    const booking = await this.bookingRepository.findById(bookingId);
    if (!booking) throw new Error('Booking not found');

    const travelerId = booking.travelerId._id?.toString() || booking.travelerId.toString();
    const guideUserId = booking.guideId?.userId?._id?.toString() || booking.guideId?.userId?.toString();

    if (travelerId !== userId.toString() && guideUserId !== userId.toString()) {
      throw new Error('Not authorized to cancel this booking');
    }

    const state = BookingStateMachine.getState(booking);
    const updates = state.cancel(reason || 'Cancelled by user');

    // Business rule 4: cancellation refund policy
    const hoursUntilStart = dayjs(booking.startDate).diff(dayjs(), 'hour');
    if (hoursUntilStart >= 48) {
      updates.fullRefund = true;
      updates.partialRefund = false;
    } else {
      updates.fullRefund = false;
      updates.partialRefund = true;
    }

    const updated = await this.bookingRepository.update(bookingId, updates);
    await availabilityService.markSlotsAvailable(booking.guideId._id || booking.guideId, booking.startDate, booking.endDate);

    await notificationService.notify('booking_cancelled', {
      recipientId: travelerId,
      reason: reason || 'Booking cancelled',
    });

    return updated;
  }

  async completeBooking(bookingId) {
    const booking = await this.bookingRepository.findById(bookingId);
    if (!booking) throw new Error('Booking not found');

    const state = BookingStateMachine.getState(booking);
    const updates = state.complete();
    const updated = await this.bookingRepository.update(bookingId, updates);

    // Increment guide's completed bookings count
    await Guide.findByIdAndUpdate(
      booking.guideId._id || booking.guideId,
      { $inc: { totalCompletedBookings: 1 } }
    );

    await notificationService.notify('booking_completed', {
      recipientId: booking.travelerId._id || booking.travelerId,
      guideName: 'your guide',
    });

    return updated;
  }

  async getBookingsForTraveler(travelerId, filter = {}) {
    return this.bookingRepository.findByTraveler(travelerId, filter);
  }

  async getBookingsForGuide(guideId, filter = {}) {
    return this.bookingRepository.findByGuide(guideId, filter);
  }

  async getAllBookings(filter = {}) {
    return this.bookingRepository.findAll(filter);
  }
}

module.exports = BookingService;
