const mongoose = require('mongoose');
const router = require('express').Router();
const { Report, TripPackage, Operator, Booking } = require('../models');
const { verifyToken } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { badRequest, notFoundErr } = require('../utils/http');
const { rateLimit } = require('../middleware/rateLimit');

const reportLimiter = rateLimit({
  windowMs: 60000,
  max: 5,
  name: 'report',
  key: (req) => String(req.user._id),
});

router.post('/', verifyToken, reportLimiter, asyncHandler(async (req, res) => {
  const { targetType, targetId, reason, details } = req.body || {};
  if (!['package', 'operator', 'booking'].includes(targetType) || !targetId) throw badRequest('Invalid report target');
  if (!mongoose.isValidObjectId(targetId)) throw badRequest('Invalid report target');
  if (!['misleading', 'pricing', 'safety', 'fraud', 'other'].includes(reason)) throw badRequest('Please choose a reason');

  let target;
  if (targetType === 'package') target = await TripPackage.findById(targetId).select('_id').lean();
  if (targetType === 'operator') target = await Operator.findById(targetId).select('_id').lean();
  if (targetType === 'booking') {
    const operatorIds = await Operator.find({ owner: req.user._id }).distinct('_id');
    target = await Booking.findOne({
      _id: targetId,
      $or: [{ user: req.user._id }, { operator: { $in: operatorIds } }],
    }).select('_id').lean();
  }
  if (!target) throw notFoundErr("We couldn't find what you're reporting");

  const report = await Report.create({ reporter: req.user._id, targetType, targetId, reason, details: String(details || '').slice(0, 2000) });
  res.status(201).json({ success: true, data: report });
}));

module.exports = router;
