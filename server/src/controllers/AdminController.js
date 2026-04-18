const { asyncHandler } = require('../middleware/errorHandler');
const AdminService = require('../services/AdminService');

const adminService = new AdminService();

// GET /api/admin/stats
const getStats = asyncHandler(async (req, res) => {
  const stats = await adminService.getPlatformStats();
  res.json({ success: true, data: stats });
});

// PATCH /api/admin/guides/:id/suspend
const suspendGuide = asyncHandler(async (req, res) => {
  const guide = await adminService.suspendGuide(req.params.id);
  res.json({ success: true, data: guide });
});

// GET /api/admin/guides
const getAllGuides = asyncHandler(async (req, res) => {
  const guides = await adminService.getAllGuides();
  res.json({ success: true, data: guides });
});

module.exports = { getStats, suspendGuide, getAllGuides };
