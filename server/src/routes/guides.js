const router = require('express').Router();
const { listGuides, getGuide, updateGuide, getMyProfile } = require('../controllers/GuideController');
const { verifyToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/roleGuard');

router.get('/', listGuides);
router.get('/me', verifyToken, requireRole('guide'), getMyProfile);
router.get('/:id', getGuide);
router.put('/:id', verifyToken, requireRole('guide'), updateGuide);

module.exports = router;
