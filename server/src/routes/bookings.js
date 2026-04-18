const router = require('express').Router();
const {
  createBooking, getMyBookings, getGuideBookings,
  confirmBooking, cancelBooking, completeBooking,
} = require('../controllers/BookingController');
const { verifyToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/roleGuard');

router.post('/', verifyToken, requireRole('traveler'), createBooking);
router.get('/my', verifyToken, requireRole('traveler'), getMyBookings);
router.get('/guide', verifyToken, requireRole('guide'), getGuideBookings);
router.patch('/:id/confirm', verifyToken, requireRole('guide'), confirmBooking);
router.patch('/:id/cancel', verifyToken, cancelBooking);
router.patch('/:id/complete', verifyToken, requireRole('admin'), completeBooking);

module.exports = router;
