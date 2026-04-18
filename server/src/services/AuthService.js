// USE CASES COVERED (from useCaseDiagram.md):
// - Register → register()
// - Login → login()

const jwt = require('jsonwebtoken');
const UserFactory = require('../patterns/UserFactory');
const Guide = require('../models/Guide');

// SOLID - SRP: AuthService only manages authentication and registration, nothing else
class AuthService {
  constructor(userRepository) {
    // SOLID - DIP: depends on abstraction IUserRepository, not concrete MongoUserRepository
    this.userRepository = userRepository;
  }

  async register(userData) {
    const { name, email, password, role, bio, city, languages, specialties, pricePerDay, pricingType } = userData;

    const existing = await this.userRepository.findByEmail(email);
    if (existing) throw new Error('An account with this email already exists');

    const newUser = await this.userRepository.create({
      name,
      email,
      passwordHash: password, // pre-save hook in User model hashes it
      role: role || 'traveler',
    });

    // Factory creates domain object and seeds Guide document if needed
    const domainUser = await UserFactory.create(role || 'traveler', {
      ...newUser.toObject(),
      bio, city, languages, specialties, pricePerDay, pricingType,
    }, Guide);

    const token = this._generateToken(newUser._id);
    return { user: domainUser.getProfile(), token };
  }

  async login(email, password) {
    const userDoc = await this.userRepository.findByEmail(email);
    if (!userDoc) throw new Error('Invalid email or password');

    const isValid = await userDoc.comparePassword(password);
    if (!isValid) throw new Error('Invalid email or password');

    const domainUser = await UserFactory.create(userDoc.role, userDoc.toObject());
    const token = this._generateToken(userDoc._id);
    return { user: domainUser.getProfile(), token };
  }

  async getMe(userId) {
    const userDoc = await this.userRepository.findById(userId);
    if (!userDoc) throw new Error('User not found');

    let extraData = {};
    if (userDoc.role === 'guide') {
      const guide = await Guide.findOne({ userId: userDoc._id }).lean();
      if (guide) {
        extraData = {
          guideId: guide._id,
          certificationStatus: guide.certificationStatus,
          certificationTier: guide.certificationTier,
          avgRating: guide.avgRating,
          totalReviews: guide.totalReviews,
          pricePerDay: guide.pricePerDay,
        };
      }
    }

    // Polymorphism: UserFactory.create returns correct subclass, getProfile() returns role-specific data
    const domainUser = await UserFactory.create(userDoc.role, { ...userDoc, ...extraData });
    return domainUser.getProfile();
  }

  _generateToken(userId) {
    return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    });
  }
}

module.exports = AuthService;
