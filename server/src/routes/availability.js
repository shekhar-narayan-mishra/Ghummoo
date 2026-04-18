const router = require('express').Router();
const { getSlots, addSlots, removeSlot } = require('../controllers/AvailabilityController');
const { verifyToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/roleGuard');

router.get('/:guideId', getSlots);
router.post('/:guideId/slots', verifyToken, requireRole('guide'), addSlots);
router.delete('/:guideId/slots/:date', verifyToken, requireRole('guide'), removeSlot);

module.exports = router;
