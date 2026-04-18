// Pattern: Observer Pattern
// Why: Booking and certification state changes must notify multiple consumers (email + in-app)
// without BookingService or CertificationService knowing the details of notification delivery.

const Notification = require('../models/Notification');

// SOLID - SRP: each Observer only handles one delivery channel

// Observer 1: in-app notifications (persists to MongoDB)
class InAppObserver {
  async update(event, payload) {
    const messages = {
      booking_requested: `New booking request from ${payload.travelerName}`,
      booking_confirmed: `Your booking with ${payload.guideName} is confirmed!`,
      booking_cancelled: `A booking has been cancelled: ${payload.reason || 'No reason provided'}`,
      booking_completed: `Your trip with ${payload.guideName} is complete. Leave a review!`,
      review_received: `${payload.travelerName} left you a ${payload.rating}-star review`,
      certification_submitted: 'Your certification application has been submitted for review',
      certification_approved: `Congratulations! Your certification has been approved. Tier: ${payload.tier || 'Bronze'}`,
      certification_rejected: `Your certification was not approved. Notes: ${payload.notes || 'N/A'}`,
      booking_activity: `Booking activity: ${payload.summary || ''}`,
    };

    const message = messages[event] || `Platform notification: ${event}`;

    try {
      await Notification.create({
        userId: payload.recipientId,
        type: event,
        message,
      });
    } catch (err) {
      console.error('[InAppObserver] Failed to create notification:', err.message);
    }
  }
}

// Observer 2: email notifications (console.log in dev, nodemailer in prod)
class EmailObserver {
  async update(event, payload) {
    if (process.env.NODE_ENV === 'production') {
      // TODO: wire up nodemailer for production email delivery
      // const transporter = nodemailer.createTransporter({...})
      // await transporter.sendMail({...})
    } else {
      console.log(`[EmailObserver] Would send email for event: ${event}`, payload);
    }
  }
}

// SOLID - SRP: NotificationService only manages observer registration and dispatch
class NotificationService {
  constructor() {
    this.observers = [];
    // Register default observers
    this.observers.push(new InAppObserver());
    this.observers.push(new EmailObserver());
  }

  register(observer) {
    this.observers.push(observer);
  }

  // Notify all registered observers
  async notify(event, payload) {
    const promises = this.observers.map((obs) => obs.update(event, payload));
    await Promise.allSettled(promises);
  }
}

// Singleton instance shared across all services
const notificationService = new NotificationService();

module.exports = { NotificationService, notificationService, InAppObserver, EmailObserver };
