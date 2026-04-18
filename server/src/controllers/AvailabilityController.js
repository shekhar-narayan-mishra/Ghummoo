const { asyncHandler } = require('../middleware/errorHandler');
const AvailabilityService = require('../services/AvailabilityService');
const Guide = require('../models/Guide');

const availabilityService = new AvailabilityService();

// GET /api/availability/:guideId?month=YYYY-MM
const getSlots = asyncHandler(async (req, res) => {
  const slots = await availabilityService.getSlots(req.params.guideId, req.query.month);
  res.json({ success: true, data: slots });
});

// POST /api/availability/:guideId/slots
const addSlots = asyncHandler(async (req, res) => {
  const { dates } = req.body;
  if (!dates || !Array.isArray(dates) || dates.length === 0) {
    return res.status(400).json({ success: false, message: 'dates array is required' });
  }

  // Verify the logged-in guide owns this profile
  const guide = await Guide.findById(req.params.guideId).lean();
  if (!guide || guide.userId.toString() !== req.user._id.toString()) {
    return res.status(403).json({ success: false, message: 'Not authorized' });
  }

  const slots = await availabilityService.addSlots(req.params.guideId, dates);
  res.json({ success: true, data: slots });
});

// DELETE /api/availability/:guideId/slots/:date
const removeSlot = asyncHandler(async (req, res) => {
  const guide = await Guide.findById(req.params.guideId).lean();
  if (!guide || guide.userId.toString() !== req.user._id.toString()) {
    return res.status(403).json({ success: false, message: 'Not authorized' });
  }

  const result = await availabilityService.removeSlot(req.params.guideId, req.params.date);
  res.json({ success: true, data: result });
});

module.exports = { getSlots, addSlots, removeSlot };
