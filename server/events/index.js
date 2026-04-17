const { EventBus, eventBus } = require('./EventBus');
const NotificationService = require('./NotificationService');

// Initialize notification service and register with event bus
const notificationService = new NotificationService();
eventBus.setNotificationService(notificationService);

module.exports = {
  EventBus,
  eventBus,
  NotificationService,
  notificationService
};
