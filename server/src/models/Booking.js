const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema(
  {
    travelerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    guideId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Guide',
      required: true,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    totalDays: {
      type: Number,
      required: true,
      min: 1,
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'in_progress', 'completed', 'cancelled'],
      default: 'pending',
    },
    bookingMode: {
      type: String,
      enum: ['instant', 'request'],
      required: true,
    },
    cancellationReason: {
      type: String,
      default: null,
    },
    fullRefund: {
      type: Boolean,
      default: null,
    },
    partialRefund: {
      type: Boolean,
      default: null,
    },
    confirmedAt: {
      type: Date,
      default: null,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    cancelledAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

bookingSchema.index({ travelerId: 1, status: 1 });
bookingSchema.index({ guideId: 1, status: 1 });

module.exports = mongoose.model('Booking', bookingSchema);
