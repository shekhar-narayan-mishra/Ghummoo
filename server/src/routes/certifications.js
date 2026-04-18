const router = require('express').Router();
const { apply, getPending, approve, reject, getMyCert } = require('../controllers/CertificationController');
const { verifyToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/roleGuard');
const { upload } = require('../middleware/upload');

router.post('/apply', verifyToken, requireRole('guide'), upload.single('document'), apply);
router.get('/pending', verifyToken, requireRole('admin'), getPending);
router.get('/my', verifyToken, requireRole('guide'), getMyCert);
router.patch('/:id/approve', verifyToken, requireRole('admin'), approve);
router.patch('/:id/reject', verifyToken, requireRole('admin'), reject);

module.exports = router;
