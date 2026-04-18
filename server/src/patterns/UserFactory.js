// Pattern: Factory Pattern
// Why: Registration must create different domain objects (TravelerUser/GuideUser/AdminUser)
// and seed the corresponding MongoDB document without bloating the controller.

const { TravelerUser, GuideUser, AdminUser } = require('./UserClasses');

// SOLID - SRP: UserFactory only handles object creation and DB seeding, nothing else
// SOLID - OCP: Adding a new role means adding a new class, not modifying this factory
class UserFactory {
  /**
   * Creates the correct domain class instance and seeds the Guide document if needed.
   * Called by AuthService during registration.
   * @param {string} role - 'traveler' | 'guide' | 'admin'
   * @param {object} userData - raw user data from the saved User document
   * @param {object} GuideModel - passed in to avoid circular dep; seed the Guide row
   * @returns {TravelerUser | GuideUser | AdminUser}
   */
  static async create(role, userData, GuideModel = null) {
    switch (role) {
      case 'guide': {
        // Seed the Guide document when a guide registers
        if (GuideModel) {
          const existing = await GuideModel.findOne({ userId: userData._id });
          if (!existing) {
            await GuideModel.create({
              userId: userData._id,
              bio: userData.bio || '',
              city: userData.city || '',
              languages: userData.languages || [],
              specialties: userData.specialties || [],
              pricePerDay: userData.pricePerDay || 0,
              pricingType: userData.pricingType || 'budget',
            });
          }
        }
        return new GuideUser({
          id: userData._id,
          name: userData.name,
          email: userData.email,
          role: userData.role,
          profilePhoto: userData.profilePhoto,
          pricePerDay: userData.pricePerDay || 0,
        });
      }
      case 'admin':
        return new AdminUser({
          id: userData._id,
          name: userData.name,
          email: userData.email,
          role: userData.role,
          profilePhoto: userData.profilePhoto,
        });
      case 'traveler':
      default:
        return new TravelerUser({
          id: userData._id,
          name: userData.name,
          email: userData.email,
          role: userData.role,
          profilePhoto: userData.profilePhoto,
        });
    }
  }
}

module.exports = UserFactory;
