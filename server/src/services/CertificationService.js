// USE CASES COVERED (from useCaseDiagram.md):
// - Apply for Certification → applyForCertification()
// - Verify Guide → getPendingApplications()
// - Approve Certification → approve()

const { buildCertificationPipeline } = require('../patterns/CertificationPipeline');
const { notificationService } = require('../patterns/NotificationObserver');
const Certification = require('../models/Certification');
const Guide = require('../models/Guide');

// SOLID - SRP: CertificationService only manages the certification workflow
class CertificationService {
  async applyForCertification(guideId, file) {
    // Get guide document
    const guide = await Guide.findById(guideId).lean();
    if (!guide) throw new Error('Guide profile not found');

    // Run the Chain of Responsibility pipeline
    const pipeline = buildCertificationPipeline();
    const documentUrl = file ? (file.path || file.secure_url || file.location || 'local://' + file.filename) : null;

    const context = {
      file,
      guide,
      documentUrl,
      CertificationModel: Certification,
    };

    const result = await pipeline.handle(context);

    // Update guide status to pending
    await Guide.findByIdAndUpdate(guideId, { certificationStatus: 'pending' });

    // Notify guide
    await notificationService.notify('certification_submitted', {
      recipientId: guide.userId,
    });

    return result.certification;
  }

  async getPendingApplications() {
    return Certification.find({ status: 'pending' })
      .populate({ path: 'guideId', populate: { path: 'userId', select: 'name email city' } })
      .sort({ createdAt: 1 })
      .lean();
  }

  async approve(certificationId, adminUserId) {
    const cert = await Certification.findById(certificationId);
    if (!cert) throw new Error('Certification not found');

    // Business rule 5: admin cannot approve their own certification
    const guide = await Guide.findById(cert.guideId).lean();
    if (guide && guide.userId.toString() === adminUserId.toString()) {
      throw new Error('An admin cannot approve their own certification');
    }

    // Compute tier based on avgRating and totalReviews
    let tier = 'bronze';
    if (guide.avgRating >= 4.8 && guide.totalReviews >= 50) tier = 'gold';
    else if (guide.avgRating >= 4.5 && guide.totalReviews >= 20) tier = 'silver';

    cert.status = 'approved';
    cert.reviewedBy = adminUserId;
    cert.reviewedAt = new Date();
    await cert.save();

    await Guide.findByIdAndUpdate(cert.guideId, {
      certificationStatus: 'approved',
      certificationTier: tier,
    });

    await notificationService.notify('certification_approved', {
      recipientId: guide.userId,
      tier,
    });

    return cert;
  }

  async reject(certificationId, adminUserId, notes) {
    const cert = await Certification.findById(certificationId);
    if (!cert) throw new Error('Certification not found');

    cert.status = 'rejected';
    cert.reviewedBy = adminUserId;
    cert.reviewedAt = new Date();
    cert.adminNotes = notes || 'Does not meet certification requirements';
    await cert.save();

    const guide = await Guide.findByIdAndUpdate(
      cert.guideId,
      { certificationStatus: 'rejected' },
      { new: true }
    ).lean();

    await notificationService.notify('certification_rejected', {
      recipientId: guide.userId,
      notes: cert.adminNotes,
    });

    return cert;
  }

  async getGuideLatestCert(guideId) {
    return Certification.findOne({ guideId }).sort({ createdAt: -1 }).lean();
  }
}

module.exports = CertificationService;
