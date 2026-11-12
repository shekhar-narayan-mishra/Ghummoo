const router = require('express').Router();
const { Operator, OperatorVerification, TripPackage, Booking, Report, User } = require('../models');
const { verifyToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/roleGuard');
const { asyncHandler } = require('../middleware/errorHandler');
const { badRequest, notFoundErr, queryFilter } = require('../utils/http');
const { escapeRegex } = require('../utils/text');

router.use(verifyToken, requireRole('admin'));

router.get('/stats', asyncHandler(async (req, res) => {
  const [opsPending, opsApproved, pkgsPublished, pkgsTotal, bookingsTotal, bookingsRequested, reportsOpen, users] = await Promise.all([
    Operator.countDocuments({ status: 'pending' }),
    Operator.countDocuments({ status: 'approved' }),
    TripPackage.countDocuments({ status: 'published' }),
    TripPackage.countDocuments({}),
    Booking.countDocuments({}),
    Booking.countDocuments({ status: 'requested' }),
    Report.countDocuments({ status: 'open' }),
    User.countDocuments({}),
  ]);
  res.json({ success: true, data: { opsPending, opsApproved, pkgsPublished, pkgsTotal, bookingsTotal, bookingsRequested, reportsOpen, users } });
}));

router.get('/operators', asyncHandler(async (req, res) => {
  const q = {};
  const status = queryFilter(req.query, 'status');
  if (status) q.status = status;
  const ops = await Operator.find(q).sort({ status: 1, createdAt: -1 }).populate('owner', 'name email phone').lean();
  const ids = ops.map((o) => o._id);
  const [verifs, pkgCounts] = await Promise.all([
    OperatorVerification.find({ operator: { $in: ids } }).sort({ createdAt: -1 }).lean(),
    TripPackage.aggregate([{ $match: { operator: { $in: ids } } }, { $group: { _id: '$operator', total: { $sum: 1 }, published: { $sum: { $cond: [{ $eq: ['$status', 'published'] }, 1, 0] } } } }]),
  ]);
  const vm = new Map();
  for (const v of verifs) if (!vm.has(String(v.operator))) vm.set(String(v.operator), v);
  const pm = new Map(pkgCounts.map((p) => [String(p._id), p]));
  res.json({ success: true, data: ops.map((o) => ({ ...o, verification: vm.get(String(o._id)) || null, packages: pm.get(String(o._id)) || { total: 0, published: 0 } })) });
}));

async function setOperatorStatus(req, status) {
  const op = await Operator.findById(req.params.id);
  if (!op) throw notFoundErr('Operator not found');
  const note = String(req.body?.note || '').trim();
  if (status === 'rejected' && note.length < 3) throw badRequest('Add a reason so the operator knows what to fix');
  op.status = status;
  op.statusNote = note;
  await op.save();
  // Rejecting an operator hides their listings by unpublishing them.
  if (status === 'rejected') await TripPackage.updateMany({ operator: op._id, status: 'published' }, { $set: { status: 'unpublished' } });
  return op;
}

router.post('/operators/:id/approve', asyncHandler(async (req, res) => res.json({ success: true, data: await setOperatorStatus(req, 'approved') })));
router.post('/operators/:id/reject', asyncHandler(async (req, res) => res.json({ success: true, data: await setOperatorStatus(req, 'rejected') })));

// Marks the operator's latest verification submission as verified (or rejected).
router.post('/operators/:id/verification', asyncHandler(async (req, res) => {
  const op = await Operator.findById(req.params.id);
  if (!op) throw notFoundErr('Operator not found');
  const v = await OperatorVerification.findOne({ operator: op._id }).sort({ createdAt: -1 });
  if (!v) throw badRequest('This operator has not submitted verification details');
  const decision = req.body?.decision;
  if (!['verified', 'rejected'].includes(decision)) throw badRequest('Decision must be verified or rejected');
  v.status = decision;
  v.reviewNote = String(req.body?.note || '');
  v.reviewedBy = req.user._id;
  v.reviewedAt = new Date();
  await v.save();
  op.verifiedAt = decision === 'verified' ? new Date() : null;
  await op.save();
  res.json({ success: true, data: { operator: op, verification: v } });
}));

router.get('/packages', asyncHandler(async (req, res) => {
  const q = {};
  const status = queryFilter(req.query, 'status');
  if (status) q.status = status;
  const text = queryFilter(req.query, 'q');
  if (text) q.title = new RegExp(escapeRegex(text), 'i');
  const items = await TripPackage.find(q).sort({ updatedAt: -1 }).limit(300).populate('operator', 'businessName slug status').lean();
  res.json({ success: true, data: items });
}));

router.post('/packages/:id/remove', asyncHandler(async (req, res) => {
  const reason = String(req.body?.reason || '').trim();
  if (reason.length < 3) throw badRequest('Add a reason for removing this listing');
  const pkg = await TripPackage.findByIdAndUpdate(req.params.id, { $set: { status: 'removed', removedReason: reason } }, { new: true });
  if (!pkg) throw notFoundErr('Package not found');
  res.json({ success: true, data: pkg });
}));

router.post('/packages/:id/restore', asyncHandler(async (req, res) => {
  const pkg = await TripPackage.findOneAndUpdate({ _id: req.params.id, status: 'removed' }, { $set: { status: 'unpublished', removedReason: '' } }, { new: true });
  if (!pkg) throw notFoundErr('Removed package not found');
  res.json({ success: true, data: pkg });
}));

router.get('/bookings', asyncHandler(async (req, res) => {
  const q = {};
  const status = queryFilter(req.query, 'status');
  if (status) q.status = status;
  const text = queryFilter(req.query, 'q');
  if (text) {
    const rx = new RegExp(escapeRegex(text), 'i');
    q.$or = [{ reference: rx }, { 'contact.name': rx }, { 'contact.email': rx }];
  }
  const items = await Booking.find(q).sort({ createdAt: -1 }).limit(300)
    .populate('package', 'title slug').populate('operator', 'businessName').populate('departure', 'startDate').lean();
  res.json({ success: true, data: items });
}));

router.get('/reports', asyncHandler(async (req, res) => {
  const q = {};
  const status = queryFilter(req.query, 'status');
  if (status) q.status = status;
  const reports = await Report.find(q).sort({ createdAt: -1 }).populate('reporter', 'name email').lean();
  const pkgIds = reports.filter((r) => r.targetType === 'package').map((r) => r.targetId);
  const opIds = reports.filter((r) => r.targetType === 'operator').map((r) => r.targetId);
  const bookingIds = reports.filter((r) => r.targetType === 'booking').map((r) => r.targetId);
  const [pkgs, ops, bookings] = await Promise.all([
    TripPackage.find({ _id: { $in: pkgIds } }, 'title slug status').lean(),
    Operator.find({ _id: { $in: opIds } }, 'businessName slug status').lean(),
    Booking.find({ _id: { $in: bookingIds } }, 'reference status').lean(),
  ]);
  const tm = new Map([...pkgs, ...ops, ...bookings].map((t) => [String(t._id), t]));
  res.json({ success: true, data: reports.map((r) => ({ ...r, target: tm.get(String(r.targetId)) || null })) });
}));

router.post('/reports/:id/resolve', asyncHandler(async (req, res) => {
  const status = req.body?.status;
  if (!['resolved', 'dismissed'].includes(status)) throw badRequest('Status must be resolved or dismissed');
  const r = await Report.findByIdAndUpdate(req.params.id, { $set: { status, resolutionNote: String(req.body?.note || ''), resolvedBy: req.user._id } }, { new: true });
  if (!r) throw notFoundErr('Report not found');
  res.json({ success: true, data: r });
}));


module.exports = router;
