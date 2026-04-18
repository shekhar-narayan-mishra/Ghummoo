const IReviewRepository = require('./IReviewRepository');
const Review = require('../models/Review');

// SOLID - DIP: MongoReviewRepository implements the abstract IReviewRepository contract
class MongoReviewRepository extends IReviewRepository {
  async findById(id) {
    return Review.findById(id)
      .populate('travelerId', 'name profilePhoto')
      .lean();
  }

  async findByBookingId(bookingId) {
    return Review.findOne({ bookingId }).lean();
  }

  async create(data) {
    const review = new Review(data);
    return review.save();
  }

  async update(id, data) {
    return Review.findByIdAndUpdate(id, data, { new: true }).lean();
  }

  async paginateByGuide(guideId, options) {
    return Review.paginate(
      { guideId, isFlagged: false },
      {
        ...options,
        populate: { path: 'travelerId', select: 'name profilePhoto' },
        sort: { createdAt: -1 },
        lean: true,
      }
    );
  }

  async aggregateRatingForGuide(guideId) {
    const result = await Review.aggregate([
      { $match: { guideId: guideId, isFlagged: false } },
      {
        $group: {
          _id: '$guideId',
          avgRating: { $avg: '$rating' },
          totalReviews: { $sum: 1 },
        },
      },
    ]);
    return result[0] || { avgRating: 0, totalReviews: 0 };
  }

  async findFlagged() {
    return Review.find({ isFlagged: true })
      .populate('travelerId', 'name email')
      .populate({ path: 'guideId', populate: { path: 'userId', select: 'name email' } })
      .lean();
  }
}

module.exports = MongoReviewRepository;
