// Pattern: State Pattern
// Why: Booking has strict lifecycle transitions. Using state classes prevents invalid
// status jumps (e.g., going from cancelled to confirmed) and keeps BookingService clean.

// SOLID - SRP: each State class only manages transitions valid from that state

class PendingState {
  constructor(booking) { this.booking = booking; }

  confirm() {
    return { status: 'confirmed', confirmedAt: new Date() };
  }

  cancel(reason) {
    return {
      status: 'cancelled',
      cancellationReason: reason,
      cancelledAt: new Date(),
    };
  }

  complete() {
    throw new Error('Cannot complete a pending booking — must confirm first');
  }

  startProgress() {
    throw new Error('Cannot mark in_progress from pending state');
  }
}

class ConfirmedState {
  constructor(booking) { this.booking = booking; }

  cancel(reason) {
    return {
      status: 'cancelled',
      cancellationReason: reason,
      cancelledAt: new Date(),
    };
  }

  startProgress() {
    return { status: 'in_progress' };
  }

  confirm() {
    throw new Error('Booking is already confirmed');
  }

  complete() {
    throw new Error('Cannot complete directly from confirmed — must mark in_progress first');
  }
}

class InProgressState {
  constructor(booking) { this.booking = booking; }

  complete() {
    return { status: 'completed', completedAt: new Date() };
  }

  cancel() {
    throw new Error('Cannot cancel a booking that is in progress');
  }

  confirm() {
    throw new Error('Booking is already in progress');
  }
}

class CompletedState {
  constructor(booking) { this.booking = booking; }
  cancel() { throw new Error('Cannot cancel a completed booking'); }
  confirm() { throw new Error('Cannot confirm a completed booking'); }
  complete() { throw new Error('Booking is already completed'); }
}

class CancelledState {
  constructor(booking) { this.booking = booking; }
  confirm() { throw new Error('Cannot confirm a cancelled booking'); }
  cancel() { throw new Error('Booking is already cancelled'); }
  complete() { throw new Error('Cannot complete a cancelled booking'); }
}

// SOLID - SRP: this class only manages booking state transitions
class BookingStateMachine {
  static getState(booking) {
    switch (booking.status) {
      case 'pending': return new PendingState(booking);
      case 'confirmed': return new ConfirmedState(booking);
      case 'in_progress': return new InProgressState(booking);
      case 'completed': return new CompletedState(booking);
      case 'cancelled': return new CancelledState(booking);
      default: throw new Error(`Unknown booking status: ${booking.status}`);
    }
  }
}

module.exports = { BookingStateMachine, PendingState, ConfirmedState, InProgressState, CompletedState, CancelledState };
