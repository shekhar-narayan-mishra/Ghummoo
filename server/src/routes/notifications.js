const router = require('express').Router();
const { getNotifications, markAllRead, getUnreadCount } = require('../controllers/NotificationController');
const { verifyToken } = require('../middleware/auth');

router.use(verifyToken);

router.get('/', getNotifications);
router.patch('/read-all', markAllRead);
router.get('/unread-count', getUnreadCount);

module.exports = router;
