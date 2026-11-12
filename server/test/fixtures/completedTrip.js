// Test-only fixture: a published trip whose departure has already ended, with a booking for a
// traveller. The API refuses to create past departures, so this writes through the models directly.
// Used by server/test/reviews.test.js and e2e/05-reviews.spec.js. It is never part of seed() or the
// demo data, and every record it creates is removed by removeCompletedTrip().
const { Booking, Operator, Review, TripDeparture, TripPackage, User } = require('../../src/models');
const { bookingReference } = require('../../src/utils/text');

const FIXTURE_TITLE = 'E2E fixture: completed trip';
const DAY = 24 * 60 * 60 * 1000;

let counter = 0;

// Creates the package (if not given), a departure and one booking for `travellerEmail`.
// `status` is the booking status; `ended: false` puts the departure in the future instead.
async function createCompletedTrip({
  travellerEmail = 'traveller@ghumo.demo',
  operatorEmail = 'operator@ghumo.demo',
  status = 'confirmed',
  ended = true,
  pkg = null,
} = {}) {
  const traveller = await User.findOne({ email: travellerEmail });
  if (!traveller) throw new Error(`fixture: no user ${travellerEmail}`);
  const owner = await User.findOne({ email: operatorEmail });
  const operator = owner && await Operator.findOne({ owner: owner._id });
  if (!operator) throw new Error(`fixture: no organiser for ${operatorEmail}`);

  counter += 1;
  const tag = `${Date.now().toString(36)}-${counter}`;
  const tripPackage = pkg || await TripPackage.create({
    operator: operator._id,
    title: FIXTURE_TITLE,
    slug: `e2e-fixture-completed-trip-${tag}`,
    destination: 'Test fixture',
    durationDays: 2,
    durationNights: 1,
    basePrice: 5000,
    summary: 'Test fixture used by automated tests. Not a real trip.',
    itinerary: [{ day: 1, title: 'Fixture day one' }, { day: 2, title: 'Fixture day two' }],
    status: 'published',
  });

  const now = Date.now();
  const startDate = new Date(ended ? now - 3 * DAY : now + 10 * DAY);
  const endDate = new Date(ended ? now - DAY : now + 11 * DAY);
  const departure = await TripDeparture.create({
    package: tripPackage._id,
    operator: operator._id,
    startDate,
    endDate,
    price: 5000,
    totalCapacity: 10,
    seatsAvailable: status === 'confirmed' || status === 'requested' ? 9 : 10,
    confirmedSeats: status === 'confirmed' ? 1 : 0,
    status: ended ? 'closed' : 'open',
  });

  const booking = await Booking.create({
    reference: bookingReference(),
    user: traveller._id,
    operator: operator._id,
    package: tripPackage._id,
    departure: departure._id,
    seats: 1,
    pricePerSeat: 5000,
    totalAmount: 5000,
    travelers: [{ fullName: 'Fixture Traveller', age: 30 }],
    contact: { name: 'Fixture Traveller', email: 'fixture@example.com', phone: '+91 90000 22222' },
    status,
    history: [{ status, note: 'Created by a test fixture', by: owner._id }],
  });

  return { pkg: tripPackage, departure, booking, traveller, operator };
}

// Removes every fixture package and everything hanging off it.
async function removeCompletedTrip() {
  const pkgs = await TripPackage.find({ title: FIXTURE_TITLE }, '_id').lean();
  const ids = pkgs.map((p) => p._id);
  if (!ids.length) return;
  await Promise.all([
    Review.deleteMany({ package: { $in: ids } }),
    Booking.deleteMany({ package: { $in: ids } }),
    TripDeparture.deleteMany({ package: { $in: ids } }),
  ]);
  await TripPackage.deleteMany({ _id: { $in: ids } });
}

module.exports = { createCompletedTrip, removeCompletedTrip, FIXTURE_TITLE };
