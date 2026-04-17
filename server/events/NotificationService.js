const { eventBus } = require('./EventBus');

/**
 * Notification Service - Implements Observer Pattern
 * Subscribes to events and handles notifications
 */
class NotificationService {
  constructor() {
    this.emailQueue = [];
    this.inAppNotifications = [];
    this.setupEventListeners();
  }

  /**
   * Setup event listeners for all system events
   */
  setupEventListeners() {
    // User events
    eventBus.on('UserRegistered', this.handleUserRegistered.bind(this));
    eventBus.on('UserLoggedIn', this.handleUserLoggedIn.bind(this));
    eventBus.on('UserUpdated', this.handleUserUpdated.bind(this));
    eventBus.on('UserDeleted', this.handleUserDeleted.bind(this));

    // Guide events
    eventBus.on('GuideProfileUpdated', this.handleGuideProfileUpdated.bind(this));
    eventBus.on('GuideAvailabilityUpdated', this.handleGuideAvailabilityUpdated.bind(this));

    // Certification events
    eventBus.on('CertificationSubmitted', this.handleCertificationSubmitted.bind(this));
    eventBus.on('CertificationProcessed', this.handleCertificationProcessed.bind(this));

    // Booking events
    eventBus.on('BookingCreated', this.handleBookingCreated.bind(this));
    eventBus.on('BookingActionTaken', this.handleBookingActionTaken.bind(this));
    eventBus.on('BookingStatusUpdated', this.handleBookingStatusUpdated.bind(this));
    eventBus.on('BookingCancelled', this.handleBookingCancelled.bind(this));
    eventBus.on('BookingCompleted', this.handleBookingCompleted.bind(this));

    // Review events
    eventBus.on('ReviewSubmitted', this.handleReviewSubmitted.bind(this));
  }

  /**
   * Handle user registration
   * @param {Object} data - Event data
   */
  async handleUserRegistered(data) {
    const notification = {
      type: 'EMAIL',
      recipient: data.userId,
      subject: 'Welcome to Ghummoo!',
      message: `Thank you for registering as a ${data.role} on Ghummoo. Your account has been created successfully.`,
      template: 'welcome',
      data
    };

    await this.sendNotification(notification);
  }

  /**
   * Handle user login
   * @param {Object} data - Event data
   */
  async handleUserLoggedIn(data) {
    const notification = {
      type: 'IN_APP',
      recipient: data.userId,
      title: 'Login Detected',
      message: 'You have successfully logged into your Ghummoo account.',
      category: 'SECURITY'
    };

    await this.sendNotification(notification);
  }

  /**
   * Handle certification submission
   * @param {Object} data - Event data
   */
  async handleCertificationSubmitted(data) {
    // Notify guide
    const guideNotification = {
      type: 'EMAIL',
      recipient: data.guideId,
      subject: 'Certification Application Submitted',
      message: 'Your certification application has been submitted successfully. We will review it and get back to you soon.',
      template: 'certification_submitted',
      data
    };

    // Notify all admins
    const adminNotification = {
      type: 'EMAIL',
      recipient: 'ADMINS',
      subject: 'New Certification Application',
      message: `A new certification application has been submitted by guide ${data.guideId}. Please review it in the admin dashboard.`,
      template: 'certification_review_needed',
      data
    };

    await this.sendNotification(guideNotification);
    await this.sendNotification(adminNotification);
  }

  /**
   * Handle certification processing
   * @param {Object} data - Event data
   */
  async handleCertificationProcessed(data) {
    const status = data.status === 'APPROVED' ? 'approved' : 'rejected';
    const subject = `Certification Application ${data.status === 'APPROVED' ? 'Approved' : 'Rejected'}`;
    
    const notification = {
      type: 'EMAIL',
      recipient: data.guideId,
      subject,
      message: `Your certification application has been ${status}. ${data.remarks ? `Remarks: ${data.remarks}` : ''}`,
      template: 'certification_processed',
      data
    };

    await this.sendNotification(notification);
  }

  /**
   * Handle booking creation
   * @param {Object} data - Event data
   */
  async handleBookingCreated(data) {
    // Notify guide
    const guideNotification = {
      type: 'EMAIL',
      recipient: data.guideId,
      subject: 'New Booking Request',
      message: `You have received a new booking request for ${data.date}. Please log in to accept or reject it.`,
      template: 'booking_request',
      data
    };

    // Notify traveler
    const travelerNotification = {
      type: 'EMAIL',
      recipient: data.travelerId,
      subject: 'Booking Request Sent',
      message: `Your booking request for ${data.date} has been sent to the guide. You will be notified once they respond.`,
      template: 'booking_sent',
      data
    };

    await this.sendNotification(guideNotification);
    await this.sendNotification(travelerNotification);
  }

  /**
   * Handle booking action (accept/reject)
   * @param {Object} data - Event data
   */
  async handleBookingActionTaken(data) {
    const action = data.action === 'ACCEPTED' ? 'accepted' : 'rejected';
    const subject = `Booking ${action === 'accepted' ? 'Accepted' : 'Rejected'}`;
    
    const notification = {
      type: 'EMAIL',
      recipient: data.travelerId,
      subject,
      message: `Your booking request for has been ${action} by the guide.`,
      template: `booking_${action}`,
      data
    };

    await this.sendNotification(notification);
  }

  /**
   * Handle booking completion
   * @param {Object} data - Event data
   */
  async handleBookingCompleted(data) {
    // Notify traveler to submit review
    const travelerNotification = {
      type: 'EMAIL',
      recipient: data.travelerId,
      subject: 'Booking Completed - Share Your Experience',
      message: 'Your booking has been completed. Please take a moment to share your experience by leaving a review.',
      template: 'booking_completed_review',
      data
    };

    await this.sendNotification(travelerNotification);
  }

  /**
   * Handle review submission
   * @param {Object} data - Event data
   */
  async handleReviewSubmitted(data) {
    const notification = {
      type: 'EMAIL',
      recipient: data.guideId,
      subject: 'New Review Received',
      message: `You have received a new ${data.rating}-star review. Thank you for your service!`,
      template: 'new_review',
      data
    };

    await this.sendNotification(notification);
  }

  /**
   * Handle guide availability update
   * @param {Object} data - Event data
   */
  async handleGuideAvailabilityUpdated(data) {
    // This could trigger notifications to travelers who have saved this guide
    console.log(`Guide ${data.guideId} updated ${data.slots} availability slots`);
  }

  /**
   * Handle other events (placeholder implementations)
   */
  async handleUserUpdated(data) {
    console.log(`User ${data.userId} updated their profile`);
  }

  async handleUserDeleted(data) {
    console.log(`User ${data.userId} was deleted`);
  }

  async handleGuideProfileUpdated(data) {
    console.log(`Guide ${data.userId} updated their profile`);
  }

  async handleBookingStatusUpdated(data) {
    console.log(`Booking ${data.bookingId} status updated from ${data.oldStatus} to ${data.newStatus}`);
  }

  async handleBookingCancelled(data) {
    const notification = {
      type: 'EMAIL',
      recipient: data.cancelledBy === data.travelerId ? data.guideId : data.travelerId,
      subject: 'Booking Cancelled',
      message: 'A booking has been cancelled. Please check your dashboard for details.',
      template: 'booking_cancelled',
      data
    };

    await this.sendNotification(notification);
  }

  /**
   * Send notification
   * @param {Object} notification - Notification object
   */
  async sendNotification(notification) {
    try {
      if (notification.type === 'EMAIL') {
        await this.sendEmail(notification);
      } else if (notification.type === 'IN_APP') {
        await this.sendInAppNotification(notification);
      }
    } catch (error) {
      console.error('Failed to send notification:', error);
    }
  }

  /**
   * Send email notification
   * @param {Object} notification - Email notification
   */
  async sendEmail(notification) {
    // In a real implementation, this would integrate with an email service like SendGrid, Nodemailer, etc.
    console.log('EMAIL NOTIFICATION:', {
      to: notification.recipient,
      subject: notification.subject,
      message: notification.message,
      template: notification.template,
      timestamp: new Date().toISOString()
    });

    // For now, just log it. In production, you'd use actual email service
    this.emailQueue.push({
      ...notification,
      timestamp: new Date(),
      status: 'QUEUED'
    });
  }

  /**
   * Send in-app notification
   * @param {Object} notification - In-app notification
   */
  async sendInAppNotification(notification) {
    console.log('IN-APP NOTIFICATION:', {
      recipient: notification.recipient,
      title: notification.title,
      message: notification.message,
      category: notification.category,
      timestamp: new Date().toISOString()
    });

    this.inAppNotifications.push({
      ...notification,
      id: this.generateNotificationId(),
      timestamp: new Date(),
      read: false
    });
  }

  /**
   * Generate notification ID
   * @returns {string} Unique notification ID
   */
  generateNotificationId() {
    return `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get email queue (for debugging)
   * @returns {Array} Email queue
   */
  getEmailQueue() {
    return this.emailQueue;
  }

  /**
   * Get in-app notifications (for debugging)
   * @returns {Array} In-app notifications
   */
  getInAppNotifications() {
    return this.inAppNotifications;
  }
}

module.exports = NotificationService;
