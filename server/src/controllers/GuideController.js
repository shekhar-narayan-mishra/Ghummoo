const { asyncHandler } = require('../middleware/errorHandler');
const GuideService = require('../services/GuideService');
const MongoGuideRepository = require('../repositories/MongoGuideRepository');

const guideRepo = new MongoGuideRepository();
const guideService = new GuideService(guideRepo);

// GET /api/guides
const listGuides = asyncHandler(async (req, res) => {
  const result = await guideService.searchGuides(req.query);
  res.json({ success: true, data: result });
});

// GET /api/guides/:id
const getGuide = asyncHandler(async (req, res) => {
  const guide = await guideService.getGuideById(req.params.id);
  res.json({ success: true, data: guide });
});

// PUT /api/guides/:id
const updateGuide = asyncHandler(async (req, res) => {
  const guide = await guideService.updateGuideProfile(req.params.id, req.user._id, req.body);
  res.json({ success: true, data: guide });
});

// GET /api/guides/me (guide gets their own profile by userId)
const getMyProfile = asyncHandler(async (req, res) => {
  const guide = await guideService.getGuideByUserId(req.user._id);
  res.json({ success: true, data: guide });
});

module.exports = { listGuides, getGuide, updateGuide, getMyProfile };
