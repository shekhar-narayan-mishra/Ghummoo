const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { PHONE_MAX_LENGTH } = require('../utils/text');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Name is required'], trim: true, minlength: 2, maxlength: 100 },
    email: {
      type: String, required: [true, 'Email is required'], unique: true, lowercase: true, trim: true,
      maxlength: [254, 'Email is too long'],
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please use a valid email address'],
    },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ['traveler', 'operator', 'admin'], default: 'traveler' },
    phone: { type: String, default: null, trim: true, maxlength: [PHONE_MAX_LENGTH, 'Phone number is too long'] },
    isDemo: { type: Boolean, default: false },
    // Trips a traveller saved for later (V0.1). Only published listings are ever shown back.
    savedTrips: { type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'TripPackage' }], default: [], select: false },
  },
  { timestamps: true }
);

userSchema.pre('save', async function hash(next) {
  if (!this.isModified('passwordHash')) return next();
  this.passwordHash = await bcrypt.hash(this.passwordHash, 10);
  next();
});

userSchema.methods.comparePassword = function compare(candidate) {
  return bcrypt.compare(candidate, this.passwordHash);
};

userSchema.methods.toJSON = function toJSON() {
  const obj = this.toObject();
  delete obj.passwordHash;
  delete obj.__v;
  return obj;
};

module.exports = mongoose.model('User', userSchema);
