require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dayjs = require('dayjs');

const connectDB = require('./config/db');
const User = require('./models/User');
const Guide = require('./models/Guide');
const AvailabilitySlot = require('./models/AvailabilitySlot');
const Booking = require('./models/Booking');
const Review = require('./models/Review');
const Notification = require('./models/Notification');
const Certification = require('./models/Certification');

async function seed() {
  await connectDB();
  console.log('🌱 Seeding database...');

  // Clear all collections
  await Promise.all([
    User.deleteMany({}),
    Guide.deleteMany({}),
    AvailabilitySlot.deleteMany({}),
    Booking.deleteMany({}),
    Review.deleteMany({}),
    Notification.deleteMany({}),
    Certification.deleteMany({}),
  ]);
  console.log('✅ Cleared all collections');

  const password = await bcrypt.hash('Password@123', 12);

  // ── Users ─────────────────────────────────────────────────────────────────
  const [priyaUser, arjunUser, meeraUser, rohanUser, rahulUser, ananyaUser, adminUser] =
    await User.insertMany([
      { name: 'Priya Sharma',    email: 'priya@ghummoo.com',  passwordHash: password, role: 'guide' },
      { name: 'Arjun Mehta',     email: 'arjun@ghummoo.com',  passwordHash: password, role: 'guide' },
      { name: 'Meera Nair',      email: 'meera@ghummoo.com',  passwordHash: password, role: 'guide' },
      { name: 'Rohan Das',       email: 'rohan@ghummoo.com',  passwordHash: password, role: 'guide' },
      { name: 'Rahul Verma',     email: 'rahul@ghummoo.com',  passwordHash: password, role: 'traveler' },
      { name: 'Ananya Singh',    email: 'ananya@ghummoo.com', passwordHash: password, role: 'traveler' },
      { name: 'Platform Admin',  email: 'admin@ghummoo.com',  passwordHash: password, role: 'admin' },
    ]);
  console.log('✅ Created 7 users');

  // ── Guide Profiles ─────────────────────────────────────────────────────────
  const [priyaGuide, arjunGuide, meeraGuide, rohanGuide] = await Guide.insertMany([
    {
      userId: priyaUser._id,
      bio: "Born and raised in the Pink City. I've been leading heritage walks through Jaipur's old city for 8 years. I know every haveli, every chai stall, and every hidden courtyard.",
      city: 'Jaipur',
      languages: ['Hindi', 'English'],
      specialties: ['heritage', 'cultural'],
      certificationStatus: 'approved',
      certificationTier: 'gold',
      instantBook: false,
      pricePerDay: 1800,
      pricingType: 'premium',
      avgRating: 4.9,
      totalReviews: 87,
      totalCompletedBookings: 85,
    },
    {
      userId: arjunUser._id,
      bio: 'Certified mountaineer with 10 years of Himalayan trekking experience. I run Beas Kund, Hampta Pass, and custom high-altitude routes. Safety is my religion.',
      city: 'Manali',
      languages: ['Hindi', 'English', 'Punjabi'],
      specialties: ['adventure', 'trekking'],
      certificationStatus: 'approved',
      certificationTier: 'gold',
      instantBook: true,
      pricePerDay: 2200,
      pricingType: 'luxury',
      avgRating: 4.8,
      totalReviews: 112,
      totalCompletedBookings: 110,
    },
    {
      userId: meeraUser._id,
      bio: "Kerala food is my love language. I'll take you to toddy shops, fish markets at 5am, and my grandmother's kitchen. No tourist restaurants on my tours.",
      city: 'Kochi',
      languages: ['Malayalam', 'English', 'Tamil'],
      specialties: ['food', 'cultural'],
      certificationStatus: 'approved',
      certificationTier: 'silver',
      instantBook: true,
      pricePerDay: 1400,
      pricingType: 'budget',
      avgRating: 4.6,
      totalReviews: 54,
      totalCompletedBookings: 52,
    },
    {
      userId: rohanUser._id,
      bio: 'Varanasi is not a place, it is a feeling. I have guided pilgrims and curious travellers along the ghats for 5 years. I know when the best aarti light hits the river.',
      city: 'Varanasi',
      languages: ['Hindi', 'Bengali', 'English'],
      specialties: ['spiritual', 'heritage'],
      certificationStatus: 'approved',
      certificationTier: 'bronze',
      instantBook: false,
      pricePerDay: 1200,
      pricingType: 'budget',
      avgRating: 4.5,
      totalReviews: 39,
      totalCompletedBookings: 37,
    },
  ]);
  console.log('✅ Created 4 guide profiles');

  // ── Availability Slots ────────────────────────────────────────────────────
  const guides = [priyaGuide, arjunGuide, meeraGuide, rohanGuide];
  const slotDocs = [];

  const today = dayjs();
  for (const guide of guides) {
    // Generate slots for this month and next month
    for (let monthOffset = 0; monthOffset <= 1; monthOffset++) {
      const daysInMonth = today.add(monthOffset, 'month').daysInMonth();
      const year = today.add(monthOffset, 'month').year();
      const month = today.add(monthOffset, 'month').month();

      // Pick 3-4 random booked dates per guide per month
      const bookedDays = new Set();
      while (bookedDays.size < 3) bookedDays.add(Math.floor(Math.random() * daysInMonth) + 1);

      for (let day = 1; day <= daysInMonth; day++) {
        const date = dayjs(`${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`);
        const isWeekend = date.day() === 0 || date.day() === 6;
        const isWeekday = !isWeekend;

        // ~70% of weekdays + all weekends available
        const isAvailable = isWeekend || (isWeekday && Math.random() < 0.7);
        if (!isAvailable) continue;

        slotDocs.push({
          guideId: guide._id,
          date: date.toDate(),
          isBooked: bookedDays.has(day),
        });
      }
    }
  }

  await AvailabilitySlot.insertMany(slotDocs, { ordered: false }).catch(() => {});
  console.log(`✅ Created ${slotDocs.length} availability slots`);

  // ── Sample Bookings ────────────────────────────────────────────────────────
  // Booking 1: Rahul → Priya, 2 days, confirmed, premium pricing (+15%)
  const b1Start = today.add(5, 'day').startOf('day').toDate();
  const b1End = today.add(6, 'day').startOf('day').toDate();
  const b1Base = 1800 * 2;
  const booking1 = await Booking.create({
    travelerId: rahulUser._id,
    guideId: priyaGuide._id,
    startDate: b1Start,
    endDate: b1End,
    totalDays: 2,
    totalAmount: b1Base + Math.round(b1Base * 0.15),
    status: 'confirmed',
    bookingMode: 'request',
    confirmedAt: new Date(),
  });

  // Booking 2: Ananya → Arjun, 3 days, pending, luxury pricing (+25% + 500)
  const b2Start = today.add(10, 'day').startOf('day').toDate();
  const b2End = today.add(12, 'day').startOf('day').toDate();
  const b2Base = 2200 * 3;
  const booking2 = await Booking.create({
    travelerId: ananyaUser._id,
    guideId: arjunGuide._id,
    startDate: b2Start,
    endDate: b2End,
    totalDays: 3,
    totalAmount: b2Base + Math.round(b2Base * 0.25) + 500,
    status: 'pending',
    bookingMode: 'instant',
  });

  // Booking 3: Rahul → Meera, 1 day, completed, budget pricing (no markup)
  const b3Start = today.subtract(5, 'day').startOf('day').toDate();
  const booking3 = await Booking.create({
    travelerId: rahulUser._id,
    guideId: meeraGuide._id,
    startDate: b3Start,
    endDate: b3Start,
    totalDays: 1,
    totalAmount: 1400,
    status: 'completed',
    bookingMode: 'instant',
    confirmedAt: today.subtract(10, 'day').toDate(),
    completedAt: today.subtract(4, 'day').toDate(),
  });

  // Booking 4: Ananya → Rohan, 1 day, completed, budget pricing
  const b4Start = today.subtract(3, 'day').startOf('day').toDate();
  const booking4 = await Booking.create({
    travelerId: ananyaUser._id,
    guideId: rohanGuide._id,
    startDate: b4Start,
    endDate: b4Start,
    totalDays: 1,
    totalAmount: 1200,
    status: 'completed',
    bookingMode: 'request',
    confirmedAt: today.subtract(7, 'day').toDate(),
    completedAt: today.subtract(2, 'day').toDate(),
  });
  console.log('✅ Created 4 bookings');

  // ── Reviews ────────────────────────────────────────────────────────────────
  await Review.insertMany([
    {
      bookingId: booking3._id,
      travelerId: rahulUser._id,
      guideId: meeraGuide._id,
      rating: 5,
      comment: "Meera took us to a fish market at dawn and we cooked the catch for lunch. The most authentic travel experience I have ever had. Absolutely worth it.",
    },
    {
      bookingId: booking4._id,
      travelerId: ananyaUser._id,
      guideId: rohanGuide._id,
      rating: 4,
      comment: "Rohan has deep knowledge of Varanasi's spiritual history. The Ganga Aarti viewing spot he chose was magical. Could have communicated timings better but overall a great experience.",
    },
  ]);
  console.log('✅ Created 2 reviews');

  await mongoose.disconnect();
  console.log('\n🎉 Seeding complete! You can now run: npm run dev');
  console.log('   Login as: admin@ghummoo.com / priya@ghummoo.com / rahul@ghummoo.com');
  console.log('   Password for all: Password@123');
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
