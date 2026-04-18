const { asyncHandler } = require('../middleware/errorHandler');
const NotificationService = require('../services/NotificationService');

const notifService = new NotificationService();

// GET /api/notifications
const getNotifications = asyncHandler(async (req, res) => {
  const notifs = await notifService.getUserNotifications(req.user._id);
  res.json({ success: true, data: notifs });
});

// PATCH /api/notifications/read-all
const markAllRead = asyncHandler(async (req, res) => {
  const result = await notifService.markAllRead(req.user._id);
  res.json({ success: true, data: result });
});

// GET /api/notifications/unread-count
const getUnreadCount = asyncHandler(async (req, res) => {
  const count = await notifService.getUnreadCount(req.user._id);
  res.json({ success: true, data: count });
});

module.exports = { getNotifications, markAllRead, getUnreadCount };
