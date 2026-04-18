// OOP Pillar — Encapsulation, Inheritance, Polymorphism
// Base User class with private-style fields accessed through methods.
// TravelerUser, GuideUser, AdminUser extend this and override getProfile()
// demonstrating polymorphism.

class User {
  // Encapsulation: core fields wrapped in class, only accessed via getters
  constructor({ id, name, email, role, profilePhoto, phone }) {
    this._id = id;
    this._name = name;
    this._email = email;
    this._role = role;
    this._profilePhoto = profilePhoto || null;
    this._phone = phone || null;
  }

  // Getters — fields not directly settable from outside
  get id() { return this._id; }
  get name() { return this._name; }
  get email() { return this._email; }
  get role() { return this._role; }
  get profilePhoto() { return this._profilePhoto; }

  isAuthenticated() {
    return !!this._id;
  }

  // Polymorphism: base implementation, overridden in each subclass
  getProfile() {
    return {
      id: this._id,
      name: this._name,
      email: this._email,
      role: this._role,
      profilePhoto: this._profilePhoto,
    };
  }
}

// Inheritance: TravelerUser extends User and overrides getProfile()
class TravelerUser extends User {
  constructor(data) {
    super(data);
    this._bookingHistory = data.bookingHistory || [];
  }

  // Polymorphism: overrides base User.getProfile()
  getProfile() {
    return {
      ...super.getProfile(),
      bookingHistory: this._bookingHistory,
      dashboardType: 'traveler',
    };
  }
}

// Inheritance: GuideUser extends User and overrides getProfile()
class GuideUser extends User {
  // Encapsulation: pricePerDay is private, only settable through setPrice()
  #pricePerDay;

  constructor(data) {
    super(data);
    this.#pricePerDay = data.pricePerDay || 0;
    this._certificationStatus = data.certificationStatus || 'none';
    this._certificationTier = data.certificationTier || null;
    this._avgRating = data.avgRating || 0;
    this._totalReviews = data.totalReviews || 0;
    this._availabilitySummary = data.availabilitySummary || [];
  }

  // Encapsulation: pricePerDay can only be changed through this validated method
  setPrice(amount) {
    if (amount <= 0) throw new Error('Price must be a positive number');
    this.#pricePerDay = amount;
  }

  get pricePerDay() { return this.#pricePerDay; }

  // Polymorphism: overrides base User.getProfile()
  getProfile() {
    return {
      ...super.getProfile(),
      dashboardType: 'guide',
      certificationStatus: this._certificationStatus,
      certificationTier: this._certificationTier,
      avgRating: this._avgRating,
      totalReviews: this._totalReviews,
      pricePerDay: this.#pricePerDay,
      availabilitySummary: this._availabilitySummary,
    };
  }
}

// Inheritance: AdminUser extends User and overrides getProfile()
class AdminUser extends User {
  constructor(data) {
    super(data);
    this._platformStatsAccess = true;
  }

  // Polymorphism: overrides base User.getProfile()
  getProfile() {
    return {
      ...super.getProfile(),
      dashboardType: 'admin',
      platformStatsAccess: this._platformStatsAccess,
    };
  }
}

module.exports = { User, TravelerUser, GuideUser, AdminUser };
