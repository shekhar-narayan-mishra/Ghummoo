// Abstraction: hides MongoDB implementation from service layer
// SOLID - ISP: review-specific queries (flagging, aggregation) stay separate

class IReviewRepository {
  async findById(id) { throw new Error('Not implemented'); }
  async findByBookingId(bookingId) { throw new Error('Not implemented'); }
  async create(data) { throw new Error('Not implemented'); }
  async update(id, data) { throw new Error('Not implemented'); }
  async paginateByGuide(guideId, options) { throw new Error('Not implemented'); }
  async aggregateRatingForGuide(guideId) { throw new Error('Not implemented'); }
  async findFlagged() { throw new Error('Not implemented'); }
}

module.exports = IReviewRepository;
