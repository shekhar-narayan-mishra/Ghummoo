// SOLID - SRP: NotificationService only handles notification retrieval and read status
const Notification = require('../models/Notification');

class NotificationService {
  async getUserNotifications(userId) {
    return Notification.find({ userId }).sort({ createdAt: -1 }).lean();
  }

  async markAllRead(userId) {
    await Notification.updateMany({ userId, isRead: false }, { isRead: true });
    return { message: 'All notifications marked as read' };
  }

  async getUnreadCount(userId) {
    const count = await Notification.countDocuments({ userId, isRead: false });
    return { count };
  }
}

module.exports = NotificationService;
