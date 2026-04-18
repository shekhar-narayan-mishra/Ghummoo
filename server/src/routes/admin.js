const router = require('express').Router();
const { getStats, suspendGuide, getAllGuides } = require('../controllers/AdminController');
const { verifyToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/roleGuard');

router.use(verifyToken, requireRole('admin'));

router.get('/stats', getStats);
router.get('/guides', getAllGuides);
router.patch('/guides/:id/suspend', suspendGuide);

module.exports = router;
