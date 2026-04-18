/**
 * Booking Status Strategy - Implements Strategy Pattern for booking status transitions
 * Defines behavior for different booking states
 */
class BookingStatusStrategy {
  constructor() {
    this.strategies = {
      PENDING: new PendingStrategy(),
      ACCEPTED: new AcceptedStrategy(),
      REJECTED: new RejectedStrategy(),
      COMPLETED: new CompletedStrategy(),
      CANCELLED: new CancelledStrategy()
    };
  }

  /**
   * Get strategy for current status
   * @param {string} status - Current booking status
   * @returns {Object} Status strategy
   */
  getStrategy(status) {
    return this.strategies[status] || this.strategies.PENDING;
  }

  /**
   * Check if status transition is allowed
   * @param {string} currentStatus - Current status
   * @param {string} newStatus - New status
   * @returns {boolean} True if transition is allowed
   */
  canTransition(currentStatus, newStatus) {
    const strategy = this.getStrategy(currentStatus);
    return strategy.canTransitionTo(newStatus);
  }

  /**
   * Check if booking can be cancelled
   * @param {string} status - Current status
   * @returns {boolean} True if can be cancelled
   */
  canCancel(status) {
    const strategy = this.getStrategy(status);
    return strategy.canCancel();
  }

  /**
   * Get available actions for current status
   * @param {string} status - Current status
   * @returns {Array} Array of available actions
   */
  getAvailableActions(status) {
    const strategy = this.getStrategy(status);
    return strategy.getAvailableActions();
  }
}

/**
 * Pending Strategy - Behavior for pending bookings
 */
class PendingStrategy {
  canTransitionTo(newStatus) {
    const allowedTransitions = ['ACCEPTED', 'REJECTED', 'CANCELLED'];
    return allowedTransitions.includes(newStatus);
  }

  canCancel() {
    return true;
  }

  getAvailableActions() {
    return ['accept', 'reject', 'cancel'];
  }
}

/**
 * Accepted Strategy - Behavior for accepted bookings
 */
class AcceptedStrategy {
  canTransitionTo(newStatus) {
    const allowedTransitions = ['COMPLETED', 'CANCELLED'];
    return allowedTransitions.includes(newStatus);
  }

  canCancel() {
    return true; // Both traveler and guide can cancel
  }

  getAvailableActions() {
    return ['complete', 'cancel'];
  }
}

/**
 * Rejected Strategy - Behavior for rejected bookings
 */
class RejectedStrategy {
  canTransitionTo(newStatus) {
    // Rejected bookings are final
    return false;
  }

  canCancel() {
    return false;
  }

  getAvailableActions() {
    return [];
  }
}

/**
 * Completed Strategy - Behavior for completed bookings
 */
class CompletedStrategy {
  canTransitionTo(newStatus) {
    // Completed bookings are final
    return false;
  }

  canCancel() {
    return false;
  }

  getAvailableActions() {
    return ['review']; // Can submit review
  }
}

/**
 * Cancelled Strategy - Behavior for cancelled bookings
 */
class CancelledStrategy {
  canTransitionTo(newStatus) {
    // Cancelled bookings are final
    return false;
  }

  canCancel() {
    return false;
  }

  getAvailableActions() {
    return [];
  }
}

module.exports = { BookingStatusStrategy };
