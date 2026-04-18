// Abstraction: hides MongoDB implementation from service layer
// SOLID - ISP: booking-specific operations isolated from user and guide repos

class IBookingRepository {
  async findById(id) { throw new Error('Not implemented'); }
  async create(data) { throw new Error('Not implemented'); }
  async update(id, data) { throw new Error('Not implemented'); }
  async findByTraveler(travelerId, filter) { throw new Error('Not implemented'); }
  async findByGuide(guideId, filter) { throw new Error('Not implemented'); }
  async findAll(filter) { throw new Error('Not implemented'); }
}

module.exports = IBookingRepository;
