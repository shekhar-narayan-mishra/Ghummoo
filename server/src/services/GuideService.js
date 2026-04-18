// USE CASES COVERED (from useCaseDiagram.md):
// - Search Guides → searchGuides()

const { decorateGuideProfile } = require('../patterns/GuideProfileDecorator');

// SOLID - SRP: GuideService only handles guide search and profile management
class GuideService {
  constructor(guideRepository) {
    // SOLID - DIP: depends on abstraction, not concrete MongoGuideRepository
    this.guideRepository = guideRepository;
  }

  async searchGuides(query) {
    const {
      city, specialty, language, minRating, maxPrice,
      instantBook, page = 1, limit = 12,
    } = query;

    const filter = {
      certificationStatus: 'approved',
      isSuspended: { $ne: true },
    };

    if (city) filter.city = { $regex: city, $options: 'i' };
    if (specialty) filter.specialties = specialty;
    if (language) filter.languages = language;
    if (minRating) filter.avgRating = { $gte: parseFloat(minRating) };
    if (maxPrice) filter.pricePerDay = { $lte: parseFloat(maxPrice) };
    if (instantBook === 'true' || instantBook === true) filter.instantBook = true;

    const result = await this.guideRepository.paginate(filter, {
      page: parseInt(page),
      limit: parseInt(limit),
      sort: { avgRating: -1 },
    });

    // Apply Decorator to each guide result
    result.docs = result.docs.map(decorateGuideProfile);
    return result;
  }

  async getGuideById(guideId) {
    const guide = await this.guideRepository.findById(guideId);
    if (!guide) throw new Error('Guide not found');
    if (guide.isSuspended) throw new Error('This guide is currently suspended');
    return decorateGuideProfile(guide);
  }

  async getGuideByUserId(userId) {
    const guide = await this.guideRepository.findByUserId(userId);
    if (!guide) throw new Error('Guide profile not found');
    return decorateGuideProfile(guide);
  }

  async updateGuideProfile(guideId, userId, updateData) {
    const guide = await this.guideRepository.findById(guideId);
    if (!guide) throw new Error('Guide not found');
    // Ensure guide can only update their own profile
    if (guide.userId._id.toString() !== userId.toString()) {
      throw new Error('Not authorized to update this profile');
    }
    const updated = await this.guideRepository.update(guideId, updateData);
    return decorateGuideProfile(updated);
  }
}

module.exports = GuideService;
