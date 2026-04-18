const IBookingRepository = require('./IBookingRepository');
const Booking = require('../models/Booking');

// SOLID - DIP: MongoBookingRepository implements the abstract IBookingRepository contract
class MongoBookingRepository extends IBookingRepository {
  async findById(id) {
    return Booking.findById(id)
      .populate('travelerId', 'name email profilePhoto')
      .populate({ path: 'guideId', populate: { path: 'userId', select: 'name email' } })
      .lean();
  }

  async create(data) {
    const booking = new Booking(data);
    return booking.save();
  }

  async update(id, data) {
    return Booking.findByIdAndUpdate(id, data, { new: true, runValidators: true }).lean();
  }

  async findByTraveler(travelerId, filter = {}) {
    return Booking.find({ travelerId, ...filter })
      .populate({ path: 'guideId', populate: { path: 'userId', select: 'name email profilePhoto' } })
      .sort({ createdAt: -1 })
      .lean();
  }

  async findByGuide(guideId, filter = {}) {
    return Booking.find({ guideId, ...filter })
      .populate('travelerId', 'name email profilePhoto')
      .sort({ createdAt: -1 })
      .lean();
  }

  async findAll(filter = {}) {
    return Booking.find(filter)
      .populate('travelerId', 'name email')
      .populate({ path: 'guideId', populate: { path: 'userId', select: 'name email' } })
      .sort({ createdAt: -1 })
      .lean();
  }
}

module.exports = MongoBookingRepository;
