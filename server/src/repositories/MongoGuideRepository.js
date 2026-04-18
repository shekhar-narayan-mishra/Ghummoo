const IGuideRepository = require('./IGuideRepository');
const Guide = require('../models/Guide');

// SOLID - DIP: MongoGuideRepository implements the abstract IGuideRepository contract
class MongoGuideRepository extends IGuideRepository {
  async findById(id) {
    return Guide.findById(id).populate('userId', 'name email profilePhoto').lean();
  }

  async findByUserId(userId) {
    return Guide.findOne({ userId }).populate('userId', 'name email profilePhoto').lean();
  }

  async create(data) {
    const guide = new Guide(data);
    return guide.save();
  }

  async update(id, data) {
    return Guide.findByIdAndUpdate(id, data, { new: true, runValidators: true })
      .populate('userId', 'name email profilePhoto')
      .lean();
  }

  async paginate(filter, options) {
    return Guide.paginate(filter, {
      ...options,
      populate: { path: 'userId', select: 'name email profilePhoto' },
      lean: true,
    });
  }

  async updateRating(guideId, avgRating, totalReviews) {
    return Guide.findByIdAndUpdate(
      guideId,
      { avgRating, totalReviews },
      { new: true }
    ).lean();
  }
}

module.exports = MongoGuideRepository;
