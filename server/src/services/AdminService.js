// USE CASES COVERED (from useCaseDiagram.md):
// - Manage Users → getPlatformStats(), suspendGuide()

const dayjs = require('dayjs');
const User = require('../models/User');
const Guide = require('../models/Guide');
const Booking = require('../models/Booking');

// SOLID - SRP: AdminService only handles admin-specific platform monitoring
class AdminService {
  async getPlatformStats() {
    const now = dayjs();
    const monthStart = now.startOf('month').toDate();
    const monthEnd = now.endOf('month').toDate();

    const [totalUsers, totalGuides, pendingCerts, monthlyBookings, topGuides] = await Promise.all([
      User.countDocuments(),
      Guide.countDocuments({ certificationStatus: 'approved' }),
      require('../models/Certification').countDocuments({ status: 'pending' }),
      Booking.find({ createdAt: { $gte: monthStart, $lte: monthEnd } }).lean(),
      Guide.find({ certificationStatus: 'approved' })
        .sort({ avgRating: -1 })
        .limit(5)
        .populate('userId', 'name email')
        .lean(),
    ]);

    const revenueThisMonth = monthlyBookings.reduce((sum, b) => sum + (b.totalAmount || 0), 0);

    return {
      totalUsers,
      totalGuides,
      pendingCerts,
      bookingsThisMonth: monthlyBookings.length,
      revenueThisMonth,
      topGuides,
    };
  }

  async suspendGuide(guideId) {
    const guide = await Guide.findByIdAndUpdate(
      guideId,
      { certificationStatus: 'none', isSuspended: true },
      { new: true }
    ).lean();
    if (!guide) throw new Error('Guide not found');
    return guide;
  }

  async getAllGuides() {
    return Guide.find()
      .populate('userId', 'name email')
      .sort({ createdAt: -1 })
      .lean();
  }
}

module.exports = AdminService;
