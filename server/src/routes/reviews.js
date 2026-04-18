const router = require('express').Router();
const { createReview, getReviewsForGuide, flagReview, getFlaggedReviews } = require('../controllers/ReviewController');
const { verifyToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/roleGuard');

router.post('/', verifyToken, requireRole('traveler'), createReview);
router.get('/flagged', verifyToken, requireRole('admin'), getFlaggedReviews);
router.get('/guide/:guideId', getReviewsForGuide);
router.patch('/:id/flag', verifyToken, requireRole('admin'), flagReview);

module.exports = router;
