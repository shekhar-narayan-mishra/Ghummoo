const { asyncHandler } = require('../middleware/errorHandler');
const CertificationService = require('../services/CertificationService');
const Guide = require('../models/Guide');

const certService = new CertificationService();

// POST /api/certifications/apply
const apply = asyncHandler(async (req, res) => {
  const guide = await Guide.findOne({ userId: req.user._id }).lean();
  if (!guide) return res.status(404).json({ success: false, message: 'Guide profile not found' });

  const cert = await certService.applyForCertification(guide._id, req.file);
  res.status(201).json({ success: true, data: cert });
});

// GET /api/certifications/pending (admin only)
const getPending = asyncHandler(async (req, res) => {
  const certs = await certService.getPendingApplications();
  res.json({ success: true, data: certs });
});

// PATCH /api/certifications/:id/approve (admin only)
const approve = asyncHandler(async (req, res) => {
  const cert = await certService.approve(req.params.id, req.user._id);
  res.json({ success: true, data: cert });
});

// PATCH /api/certifications/:id/reject (admin only)
const reject = asyncHandler(async (req, res) => {
  const { notes } = req.body;
  const cert = await certService.reject(req.params.id, req.user._id, notes);
  res.json({ success: true, data: cert });
});

// GET /api/certifications/my (guide checks their own)
const getMyCert = asyncHandler(async (req, res) => {
  const guide = await Guide.findOne({ userId: req.user._id }).lean();
  if (!guide) return res.status(404).json({ success: false, message: 'Guide profile not found' });
  const cert = await certService.getGuideLatestCert(guide._id);
  res.json({ success: true, data: cert });
});

module.exports = { apply, getPending, approve, reject, getMyCert };
