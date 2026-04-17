const EventEmitter = require('events');

/**
 * Event Bus - Implements Observer Pattern for system-wide event handling
 * Central hub for all application events
 */
class EventBus extends EventEmitter {
  constructor() {
    super();
    this.listeners = new Map();
    this.notificationService = null;
  }

  /**
   * Register event listener
   * @param {string} event - Event name
   * @param {Function} handler - Event handler function
   */
  on(event, handler) {
    super.on(event, handler);
    
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(handler);
  }

  /**
   * Register one-time event listener
   * @param {string} event - Event name
   * @param {Function} handler - Event handler function
   */
  once(event, handler) {
    super.once(event, handler);
  }

  /**
   * Emit event
   * @param {string} event - Event name
   * @param {Object} data - Event data
   */
  emit(event, data) {
    console.log(`Event emitted: ${event}`, data);
    super.emit(event, data);
  }

  /**
   * Remove event listener
   * @param {string} event - Event name
   * @param {Function} handler - Event handler function
   */
  off(event, handler) {
    super.off(event, handler);
    
    if (this.listeners.has(event)) {
      const handlers = this.listeners.get(event);
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  /**
   * Get all registered listeners
   * @returns {Map} Map of event listeners
   */
  getListeners() {
    return this.listeners;
  }

  /**
   * Set notification service
   * @param {NotificationService} notificationService - Notification service instance
   */
  setNotificationService(notificationService) {
    this.notificationService = notificationService;
  }
}

// Create singleton instance
const eventBus = new EventBus();

module.exports = { EventBus, eventBus };
