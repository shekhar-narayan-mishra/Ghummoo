// Repository Interfaces
const IUserRepository = require('./IUserRepository');
const IGuideRepository = require('./IGuideRepository');
const IBookingRepository = require('./IBookingRepository');
const ICertificationRepository = require('./ICertificationRepository');
const IReviewRepository = require('./IReviewRepository');
const IAvailabilityRepository = require('./IAvailabilityRepository');

// Repository Implementations
const UserRepository = require('./UserRepository');
const GuideRepository = require('./GuideRepository');
const BookingRepository = require('./BookingRepository');
const CertificationRepository = require('./CertificationRepository');
const ReviewRepository = require('./ReviewRepository');
const AvailabilityRepository = require('./AvailabilityRepository');

module.exports = {
  // Interfaces
  IUserRepository,
  IGuideRepository,
  IBookingRepository,
  ICertificationRepository,
  IReviewRepository,
  IAvailabilityRepository,
  
  // Implementations
  UserRepository,
  GuideRepository,
  BookingRepository,
  CertificationRepository,
  ReviewRepository,
  AvailabilityRepository
};
