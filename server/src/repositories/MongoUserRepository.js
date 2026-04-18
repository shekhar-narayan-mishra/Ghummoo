const IUserRepository = require('./IUserRepository');
const User = require('../models/User');

// SOLID - DIP: MongoUserRepository implements the abstract IUserRepository contract
class MongoUserRepository extends IUserRepository {
  async findById(id) {
    return User.findById(id).lean();
  }

  async findByEmail(email) {
    // Do NOT .lean() here — we need mongoose methods like comparePassword
    return User.findOne({ email }).select('+passwordHash');
  }

  async create(data) {
    const user = new User(data);
    return user.save();
  }

  async update(id, data) {
    return User.findByIdAndUpdate(id, data, { new: true, runValidators: true }).lean();
  }

  async delete(id) {
    return User.findByIdAndDelete(id).lean();
  }

  async findAll(filter = {}) {
    return User.find(filter).lean();
  }
}

module.exports = MongoUserRepository;
