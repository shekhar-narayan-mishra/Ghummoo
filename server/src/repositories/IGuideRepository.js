// Abstraction: hides MongoDB implementation from service layer
// SOLID - ISP: IGuideRepository is separate from IUserRepository — guide-specific queries only

class IGuideRepository {
  async findById(id) { throw new Error('Not implemented'); }
  async findByUserId(userId) { throw new Error('Not implemented'); }
  async create(data) { throw new Error('Not implemented'); }
  async update(id, data) { throw new Error('Not implemented'); }
  async paginate(filter, options) { throw new Error('Not implemented'); }
  async updateRating(guideId, avgRating, totalReviews) { throw new Error('Not implemented'); }
}

module.exports = IGuideRepository;
