const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

const guideSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    bio: {
      type: String,
      default: '',
      maxlength: [1000, 'Bio cannot exceed 1000 characters'],
    },
    city: {
      type: String,
      default: '',
      trim: true,
    },
    languages: {
      type: [String],
      default: [],
    },
    specialties: {
      type: [String],
      enum: ['heritage', 'adventure', 'food', 'spiritual', 'cultural', 'trekking'],
      default: [],
    },
    certificationStatus: {
      type: String,
      enum: ['none', 'pending', 'approved', 'rejected'],
      default: 'none',
    },
    certificationTier: {
      type: String,
      enum: ['bronze', 'silver', 'gold', null],
      default: null,
    },
    instantBook: {
      type: Boolean,
      default: false,
    },
    pricePerDay: {
      type: Number,
      default: 0,
      min: [0, 'Price cannot be negative'],
    },
    pricingType: {
      type: String,
      enum: ['budget', 'premium', 'luxury'],
      default: 'budget',
    },
    avgRating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    totalReviews: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalCompletedBookings: {
      type: Number,
      default: 0,
      min: 0,
    },
    isSuspended: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Indexes for fast filter queries
guideSchema.index({ city: 1 });
guideSchema.index({ certificationStatus: 1 });
guideSchema.index({ specialties: 1 });
guideSchema.index({ avgRating: -1 });

guideSchema.plugin(mongoosePaginate);

module.exports = mongoose.model('Guide', guideSchema);
