// USE CASES COVERED (from useCaseDiagram.md):
// - Submit Review → createReview()

const { notificationService } = require('../patterns/NotificationObserver');
const Booking = require('../models/Booking');

// SOLID - SRP: ReviewService only manages review creation and aggregation
class ReviewService {
  constructor(reviewRepository, guideRepository) {
    // SOLID - DIP: depends on abstractions, not concrete implementations
    this.reviewRepository = reviewRepository;
    this.guideRepository = guideRepository;
  }

  async createReview(travelerId, reviewData) {
    const { bookingId, rating, comment } = reviewData;

    // Business rule 3: booking must be completed
    const booking = await Booking.findById(bookingId).lean();
    if (!booking) throw new Error('Booking not found');
    if (booking.travelerId.toString() !== travelerId.toString()) {
      throw new Error('Not authorized to review this booking');
    }
    if (booking.status !== 'completed') {
      throw new Error('Reviews can only be submitted for completed bookings');
    }

    // Check if review already exists (also enforced by unique index, but give friendly error)
    const existing = await this.reviewRepository.findByBookingId(bookingId);
    if (existing) throw new Error('You have already submitted a review for this booking');

    const review = await this.reviewRepository.create({
      bookingId,
      travelerId,
      guideId: booking.guideId,
      rating,
      comment: comment || '',
    });

    // Business rule 6: recalculate and persist avgRating and totalReviews on Guide
    const { avgRating, totalReviews } = await this.reviewRepository.aggregateRatingForGuide(booking.guideId);
    await this.guideRepository.updateRating(
      booking.guideId,
      Math.round(avgRating * 100) / 100,
      totalReviews
    );

    // Notify guide
    const guide = await this.guideRepository.findById(booking.guideId);
    if (guide) {
      const guideUserId = guide.userId._id || guide.userId;
      await notificationService.notify('review_received', {
        recipientId: guideUserId,
        travelerName: 'A traveler',
        rating,
      });
    }

    return review;
  }

  async getReviewsForGuide(guideId, options = {}) {
    const { page = 1, limit = 10 } = options;
    return this.reviewRepository.paginateByGuide(guideId, { page: parseInt(page), limit: parseInt(limit) });
  }

  async flagReview(reviewId) {
    const review = await this.reviewRepository.findById(reviewId);
    if (!review) throw new Error('Review not found');
    return this.reviewRepository.update(reviewId, { isFlagged: true });
  }

  async getFlaggedReviews() {
    return this.reviewRepository.findFlagged();
  }
}

module.exports = ReviewService;
