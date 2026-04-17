const User = require('./User');
const TravelerProfile = require('./TravelerProfile');
const GuideProfile = require('./GuideProfile');
const Certification = require('./Certification');
const Availability = require('./Availability');
const Booking = require('./Booking');
const Review = require('./Review');

// Import all models
const models = {
  User,
  TravelerProfile,
  GuideProfile,
  Certification,
  Availability,
  Booking,
  Review
};

// Set up additional associations
// User to TravelerProfile (already defined in TravelerProfile.js)
// User to GuideProfile (already defined in GuideProfile.js)

// GuideProfile to Certifications
GuideProfile.hasMany(Certification, { 
  foreignKey: 'guide_id', 
  sourceKey: 'user_id',
  as: 'certifications' 
});
Certification.belongsTo(GuideProfile, { 
  foreignKey: 'guide_id', 
  targetKey: 'user_id',
  as: 'guideProfile' 
});

// GuideProfile to Availability
GuideProfile.hasMany(Availability, { 
  foreignKey: 'guide_id', 
  sourceKey: 'user_id',
  as: 'availabilitySlots' 
});
Availability.belongsTo(GuideProfile, { 
  foreignKey: 'guide_id', 
  targetKey: 'user_id',
  as: 'guideProfile' 
});

// GuideProfile to Bookings
GuideProfile.hasMany(Booking, { 
  foreignKey: 'guide_id', 
  sourceKey: 'user_id',
  as: 'bookings' 
});
Booking.belongsTo(GuideProfile, { 
  foreignKey: 'guide_id', 
  targetKey: 'user_id',
  as: 'guideProfile' 
});

// TravelerProfile to Bookings
TravelerProfile.hasMany(Booking, { 
  foreignKey: 'traveler_id', 
  sourceKey: 'user_id',
  as: 'bookings' 
});
Booking.belongsTo(TravelerProfile, { 
  foreignKey: 'traveler_id', 
  targetKey: 'user_id',
  as: 'travelerProfile' 
});

// GuideProfile to Reviews
GuideProfile.hasMany(Review, { 
  foreignKey: 'guide_id', 
  sourceKey: 'user_id',
  as: 'reviews' 
});
Review.belongsTo(GuideProfile, { 
  foreignKey: 'guide_id', 
  targetKey: 'user_id',
  as: 'guideProfile' 
});

// TravelerProfile to Reviews
TravelerProfile.hasMany(Review, { 
  foreignKey: 'traveler_id', 
  sourceKey: 'user_id',
  as: 'reviews' 
});
Review.belongsTo(TravelerProfile, { 
  foreignKey: 'traveler_id', 
  targetKey: 'user_id',
  as: 'travelerProfile' 
});

module.exports = {
  sequelize: require('../config/database').sequelize,
  ...models
};
