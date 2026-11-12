const mongoose = require('mongoose');
const { PHONE_MAX_LENGTH, EMERGENCY_CONTACT_MAX_LENGTH } = require('../utils/text');

// Traveler is stored as a subdocument: a traveller only exists in the context of one booking.
const travelerSchema = new mongoose.Schema({
  fullName: { type: String, required: [true, 'Traveller name is required'], trim: true, maxlength: 100 },
  age: { type: Number, min: 1, max: 110, required: [true, 'Traveller age is required'] },
  gender: { type: String, enum: ['female', 'male', 'other', 'prefer_not'], default: 'prefer_not' },
  phone: { type: String, trim: true, default: '', maxlength: [PHONE_MAX_LENGTH, 'Traveller phone is too long'] },
  email: { type: String, trim: true, lowercase: true, default: '' },
  idType: { type: String, trim: true, default: '' },
  emergencyContact: { type: String, trim: true, default: '', maxlength: [EMERGENCY_CONTACT_MAX_LENGTH, 'Emergency contact is too long'] },
});

const historySchema = new mongoose.Schema(
  { status: String, note: String, by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, at: { type: Date, default: Date.now } },
  { _id: false }
);

const bookingSchema = new mongoose.Schema(
  {
    reference: { type: String, required: true, unique: true, index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    operator: { type: mongoose.Schema.Types.ObjectId, ref: 'Operator', required: true, index: true },
    package: { type: mongoose.Schema.Types.ObjectId, ref: 'TripPackage', required: true },
    departure: { type: mongoose.Schema.Types.ObjectId, ref: 'TripDeparture', required: true, index: true },
    seats: { type: Number, required: true, min: 1, max: 20 },
    pricePerSeat: { type: Number, required: true },
    totalAmount: { type: Number, required: true },
    currency: { type: String, default: 'INR' },
    travelers: { type: [travelerSchema], validate: [(v) => v.length > 0, 'At least one traveller is required'] },
    contact: {
      name: { type: String, trim: true, required: true },
      email: { type: String, trim: true, lowercase: true, required: true },
      phone: { type: String, trim: true, required: true },
    },
    specialRequests: { type: String, trim: true, maxlength: 1000, default: '' },
    // requested → confirmed | rejected ; requested|confirmed → cancelled
    status: { type: String, enum: ['requested', 'confirmed', 'rejected', 'cancelled'], default: 'requested', index: true },
    operatorNote: { type: String, default: '' },
    history: [historySchema],
  },
  { timestamps: true }
);

module.exports = mongoose.model('Booking', bookingSchema);
