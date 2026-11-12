/* Demo data for Ghumo AI. Every record is marked isDemo. No bookings, reviews, payments or
   verified badges are fabricated: those come only from real use of the app. */
const { User, Operator, OperatorVerification, TripPackage, TripDeparture, Booking, PaymentRecord, TripAnnouncement, Review, Report } = require('./models');

const img = (id, w = 1600) => `https://images.unsplash.com/photo-${id}?w=${w}&q=72&auto=format&fit=crop`;
const IMG = {
  solang: img('1593181629936-11c609b8db9b'), parvati: img('1609920658906-8223bd289001'), snowtrek: img('1626621341517-bbf3d9990a23'),
  campfire: img('1478131143081-80f7f84ca84d'), pines: img('1605649487212-47bdab064df7'), river: img('1581791534721-e599df4417f7'),
  stupa: img('1544735716-392fe2489ffa'), flags: img('1571401835393-8c5f35328320'), peaks: img('1454496522488-7a8e488e8606'), sunrise: img('1506905925346-21bda4d32df4'),
  rafting: img('1530866495561-507c9faab2ed'), tent: img('1504280390367-361c6d9f38f4'),
  clouds: img('1622308644420-b20142dc993c'), valley: img('1464822759023-fed622ff2c3b'),
  hawa: img('1477587458883-47145ed94245'), fort: img('1599661046289-e31897846e41'), taj: img('1548013146-72479768bada'),
  ulun: img('1537996194471-e657df975ab4'), tanah: img('1518548419970-58e3b4079ab2'), terraces: img('1555400038-63f5ba517a47'), penida: img('1539367628448-4bc5c9d171c8'),
  goa: img('1512343879784-a960bf40e7f2'), kerala: img('1506461883276-594a12b11cf3'), nainital: img('1610715936287-6c2ad208cdbf'),
};

const DEMO_PASSWORD = process.env.DEMO_PASSWORD || 'GhumoDemo#2026';

// The demo admin can approve organisers and read every booking, including real travellers'
// contact details once real people use a deployment. So in production it never gets the
// password published in the README: it uses DEMO_ADMIN_PASSWORD (or an explicitly set
// DEMO_PASSWORD), otherwise a random password that nobody knows.
function demoAdminPassword() {
  if (process.env.DEMO_ADMIN_PASSWORD) return process.env.DEMO_ADMIN_PASSWORD;
  if (process.env.NODE_ENV !== 'production' || process.env.DEMO_PASSWORD) return DEMO_PASSWORD;
  console.warn('[seed] admin@ghumo.demo was given a random password because this is production and neither '
    + 'DEMO_ADMIN_PASSWORD nor DEMO_PASSWORD is set. To use it, run: npm run set-password --prefix server -- admin@ghumo.demo');
  return require('crypto').randomBytes(24).toString('base64url');
}

const day = (n) => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + n); return d; };

const OPERATORS = [
  {
    key: 'pahadi', email: 'operator@ghumo.demo', owner: 'Aarav Negi', businessName: 'Wandering Pahadi Co.', location: 'New Delhi',
    description: 'Small-batch Himalayan group trips from Delhi. We run Manali, Kasol and Rishikesh departures every month with trip captains who grew up in the hills.',
    contactPhone: '+91 98100 00001', instagram: '@wanderingpahadi.demo', foundedYear: 2019, status: 'approved',
  },
  {
    key: 'altitude', email: 'altitude@ghumo.demo', owner: 'Tenzin Dolma', businessName: 'High Altitude Collective', location: 'Chandigarh',
    description: 'Road expeditions into Spiti, Lahaul and Ladakh with acclimatisation built into every itinerary and oxygen on board every vehicle.',
    contactPhone: '+91 98100 00002', instagram: '@highaltitude.demo', foundedYear: 2017, status: 'approved',
  },
  {
    key: 'northeast', email: 'northeast@ghumo.demo', owner: 'Ibapynhun Lyngdoh', businessName: 'Northeast Trails', location: 'Guwahati',
    description: 'Community-led journeys across Meghalaya and Assam, staying in local homestays and walking with Khasi village guides.',
    contactPhone: '+91 98100 00003', instagram: '@northeasttrails.demo', foundedYear: 2020, status: 'approved',
  },
  {
    key: 'desert', email: 'desert@ghumo.demo', owner: 'Meera Rathore', businessName: 'Desert Route Travels', location: 'Jaipur',
    description: 'Heritage-focused small group tours through Rajasthan: forts, havelis, folk music and desert camps with hosts from each town.',
    contactPhone: '+91 98100 00004', instagram: '@desertroute.demo', foundedYear: 2015, status: 'approved',
  },
  {
    key: 'island', email: 'island@ghumo.demo', owner: 'Rohan Mehta', businessName: 'Island Circle Holidays', location: 'Mumbai',
    description: 'International group departures for first-time travellers, with an Indian trip leader from the moment you land.',
    contactPhone: '+91 98100 00005', instagram: '@islandcircle.demo', foundedYear: 2021, status: 'approved',
  },
  {
    key: 'pending', email: 'newoperator@ghumo.demo', owner: 'Kavya Iyer', businessName: 'Coastal Weekenders', location: 'Bengaluru',
    description: 'Weekend coastal getaways from Bengaluru to Gokarna, Varkala and Pondicherry. Applying to list on Ghumo AI.',
    contactPhone: '+91 98100 00006', instagram: '@coastalweekenders.demo', foundedYear: 2023, status: 'pending',
  },
];

const STD_CANCEL = 'Free cancellation up to 21 days before departure. 50% refund between 20 and 8 days. No refund within 7 days of departure. If the organiser cancels, you get a full refund.';

const PACKAGES = [
  {
    op: 'pahadi', title: 'Manali & Kasol Escape', destination: 'Manali & Kasol', region: 'Himachal Pradesh', startLocation: 'Delhi',
    categories: ['mountains', 'adventure'], durationDays: 5, durationNights: 4, basePrice: 8499, groupSize: '12–24 travellers',
    coverImage: IMG.solang, images: [IMG.solang, IMG.parvati, IMG.snowtrek, IMG.campfire, IMG.pines],
    summary: 'Snow at Solang, riverside cafés in Kasol and a bonfire night under the pines.',
    overview: 'Our most-loved Himalayan starter trip. Overnight Volvo from Delhi, two nights in Manali for Solang Valley and Old Manali, then over to the Parvati Valley for Kasol, Chalal and Manikaran. It\'s paced for first-timers, with enough free time to wander.',
    highlights: ['Solang Valley snow point', 'Old Manali café trail', 'Kasol to Chalal riverside walk', 'Manikaran Sahib hot springs', 'Bonfire and music night'],
    itinerary: [
      { title: 'Overnight Volvo from Delhi', description: 'Board the semi-sleeper Volvo from Majnu ka Tilla at 7:00 PM. Meet your trip captain and the group.', meals: '', stay: 'Overnight bus' },
      { title: 'Manali arrival & Old Manali', description: 'Reach Manali by 9:00 AM and check in. Visit Hadimba Temple, then walk the café lanes of Old Manali in the evening.', meals: 'Dinner', stay: 'Hotel in Manali (3-star, twin/triple sharing)' },
      { title: 'Solang Valley', description: 'Full day at Solang Valley. Optional paragliding and ATV rides, paid directly. Bonfire and DJ night at the hotel.', meals: 'Breakfast, Dinner', stay: 'Hotel in Manali' },
      { title: 'Kasol, Chalal & Manikaran', description: 'Drive to Kasol (3 hrs). Riverside walk to Chalal village, then visit Manikaran Sahib. Board the Volvo back to Delhi at 6:00 PM.', meals: 'Breakfast', stay: 'Overnight bus' },
      { title: 'Arrive in Delhi', description: 'Reach Delhi by 7:00 AM. The trip ends here.', meals: '', stay: '' },
    ],
    accommodation: '2 nights in a 3-star hotel in Manali on twin/triple sharing. Rooms have heaters and hot water.',
    transport: 'Delhi–Manali–Delhi by AC semi-sleeper Volvo. Local sightseeing by tempo traveller.',
    meals: '2 breakfasts and 2 dinners (vegetarian, with egg options)',
    inclusions: ['Delhi–Manali–Delhi Volvo tickets', '2 nights hotel stay', '2 breakfasts and 2 dinners', 'All local transfers by tempo traveller', 'Bonfire and DJ night', 'Trip captain throughout'],
    exclusions: ['Paragliding, ATV and other adventure activities', 'Lunches and snacks', 'Personal expenses and tips', 'Anything not listed under inclusions'],
    pickupInfo: 'Pickup from Majnu ka Tilla, New Delhi (exact pin shared 24 hrs before). Reporting time 6:30 PM.',
    cancellationPolicy: STD_CANCEL,
    departures: [[9, 8499, 24], [23, 8499, 24], [37, 8999, 20], [58, 9499, 24]],
  },
  {
    op: 'altitude', title: 'Spiti Valley Expedition', destination: 'Spiti Valley', region: 'Himachal Pradesh', startLocation: 'Chandigarh',
    categories: ['mountains', 'adventure'], durationDays: 8, durationNights: 7, basePrice: 21999, groupSize: '8–14 travellers',
    coverImage: IMG.stupa, images: [IMG.stupa, IMG.flags, IMG.peaks, IMG.sunrise, IMG.valley],
    summary: 'A full Spiti circuit via Kinnaur: Key Monastery, Chandratal and the world\'s highest villages.',
    overview: 'A slow, acclimatisation-first road expedition through Kinnaur into Spiti and out over Kunzum La. Small groups, experienced mountain drivers and homestays in Kaza and Langza make this as much about the people as the landscapes.',
    highlights: ['Key Monastery at sunrise', 'Hikkim, Komic and Langza villages', 'Chandratal lake', 'Kunzum La pass', 'Night sky over Kaza'],
    itinerary: [
      { title: 'Chandigarh to Narkanda', description: 'Early start from Chandigarh, drive through Shimla to Narkanda (7 hrs).', meals: 'Dinner', stay: 'Hotel in Narkanda' },
      { title: 'Narkanda to Chitkul', description: 'Follow the Sutlej into Kinnaur and reach Chitkul, the last village before the Tibet border.', meals: 'Breakfast, Dinner', stay: 'Guesthouse in Chitkul' },
      { title: 'Chitkul to Nako', description: 'Drive via Reckong Peo to Nako village and its high-altitude lake.', meals: 'Breakfast, Dinner', stay: 'Homestay in Nako' },
      { title: 'Nako to Kaza via Tabo', description: 'Visit the 1,000-year-old Tabo Monastery and Dhankar on the way to Kaza.', meals: 'Breakfast, Dinner', stay: 'Hotel in Kaza' },
      { title: 'Key, Kibber & Chicham', description: 'Key Monastery, Kibber village and Asia\'s highest suspension bridge at Chicham.', meals: 'Breakfast, Dinner', stay: 'Hotel in Kaza' },
      { title: 'Langza, Hikkim & Komic', description: 'Fossil hunting at Langza, postcards from the world\'s highest post office in Hikkim.', meals: 'Breakfast, Dinner', stay: 'Homestay in Langza' },
      { title: 'Chandratal via Kunzum La', description: 'Cross Kunzum La to camp near Chandratal lake.', meals: 'Breakfast, Dinner', stay: 'Camps at Chandratal (shared)' },
      { title: 'Chandratal to Manali', description: 'Drive over Atal Tunnel to Manali. The trip ends by evening.', meals: 'Breakfast', stay: '' },
    ],
    accommodation: 'Mix of hotels, homestays and camps on triple sharing. Expect basic facilities in Nako, Langza and Chandratal.',
    transport: 'Tempo traveller with an experienced mountain driver from Chandigarh to Manali. Oxygen cylinder on board.',
    meals: '7 breakfasts and 7 dinners',
    inclusions: ['All transport Chandigarh to Manali', '7 nights stay', '7 breakfasts and 7 dinners', 'Inner line permits', 'Trip leader and first-aid kit', 'Oxygen cylinder on board'],
    exclusions: ['Travel to Chandigarh and from Manali', 'Lunches', 'Monastery donations', 'Personal expenses', 'Costs from landslides or roadblocks'],
    pickupInfo: 'Pickup at Chandigarh ISBT Sector 43 at 5:30 AM. Drop at Manali Mall Road.',
    cancellationPolicy: 'Free cancellation up to 30 days before departure. 50% refund between 29 and 15 days. No refund within 14 days. Weather-related route changes are not refundable.',
    departures: [[19, 21999, 14], [47, 21999, 14], [75, 23499, 12]],
  },
  {
    op: 'pahadi', title: 'Rishikesh Adventure Weekend', destination: 'Rishikesh', region: 'Uttarakhand', startLocation: 'Delhi',
    categories: ['weekend', 'adventure'], durationDays: 3, durationNights: 2, basePrice: 4999, groupSize: '15–30 travellers',
    coverImage: IMG.rafting, images: [IMG.rafting, IMG.tent, IMG.campfire, IMG.pines],
    summary: '16 km of Ganga rapids, riverside camping and the Triveni Ghat aarti, all in one weekend.',
    overview: 'Leave Delhi on Friday night and be back by Monday morning. Raft the Shivpuri to Rishikesh stretch, sleep in riverside Swiss tents, watch the evening Ganga aarti and wake up for a short waterfall hike.',
    highlights: ['16 km river rafting (grade II–III)', 'Riverside camping', 'Ganga aarti at Triveni Ghat', 'Neer Garh waterfall hike', 'Cliff jumping (optional)'],
    itinerary: [
      { title: 'Friday night departure', description: 'Depart Delhi at 10:00 PM by AC tempo traveller.', meals: '', stay: 'Overnight travel' },
      { title: 'Rafting & camp', description: 'Arrive at camp, breakfast, then 16 km of rafting from Shivpuri. Evening volleyball, bonfire and music.', meals: 'Breakfast, Lunch, Dinner', stay: 'Riverside Swiss tents (triple sharing)' },
      { title: 'Waterfall hike, aarti & return', description: 'Morning hike to Neer Garh waterfall, Laxman Jhula, Triveni Ghat aarti, then depart for Delhi by 9:00 PM.', meals: 'Breakfast', stay: 'Overnight travel' },
    ],
    accommodation: '1 night in riverside Swiss tents with attached washrooms, triple sharing.',
    transport: 'Delhi–Rishikesh–Delhi by AC tempo traveller.',
    meals: '2 breakfasts, 1 lunch, 1 dinner',
    inclusions: ['AC transport from Delhi', '1 night riverside camping', '16 km rafting with certified guides', '4 meals', 'Bonfire', 'Trip captain'],
    exclusions: ['Bungee and cliff jumping', 'Meals during transit', 'Personal expenses'],
    pickupInfo: 'Pickup at Akshardham Metro Station Gate 2, Delhi. Reporting time 9:30 PM Friday.',
    cancellationPolicy: 'Free cancellation up to 7 days before departure. 50% refund within 7 days. No refund within 48 hours.',
    departures: [[3, 4999, 30], [10, 4999, 30], [17, 5299, 30], [31, 4999, 30]],
  },
  {
    op: 'northeast', title: 'Meghalaya Explorer', destination: 'Shillong & Cherrapunji', region: 'Meghalaya', startLocation: 'Guwahati',
    categories: ['mountains', 'adventure', 'cultural'], durationDays: 6, durationNights: 5, basePrice: 18500, groupSize: '8–16 travellers',
    coverImage: IMG.clouds, images: [IMG.clouds, IMG.parvati, IMG.river, IMG.valley],
    summary: 'Living root bridges, the crystal-clear Umngot river and Mawlynnong village with local Khasi guides.',
    overview: 'Six days across the abode of clouds. Walk to the double-decker living root bridge at Nongriat, float on the glass-clear Umngot at Dawki, and spend a night in a village homestay. Our guides are from the villages you visit.',
    highlights: ['Double-decker living root bridge trek', 'Boating on Umngot river, Dawki', 'Mawlynnong village', 'Nohkalikai & Seven Sisters falls', 'Shillong music cafés'],
    itinerary: [
      { title: 'Guwahati to Shillong', description: 'Pickup from Guwahati airport or railway station by 11:00 AM. Stop at Umiam Lake on the way to Shillong.', meals: 'Dinner', stay: 'Hotel in Shillong' },
      { title: 'Shillong to Cherrapunji', description: 'Elephant Falls, Mawkdok valley, then Nohkalikai and Seven Sisters falls.', meals: 'Breakfast, Dinner', stay: 'Resort in Cherrapunji' },
      { title: 'Double-decker root bridge trek', description: 'The 3,500-step trek to Nongriat with a local guide. Swim at Rainbow Falls if the weather allows.', meals: 'Breakfast, Packed lunch, Dinner', stay: 'Resort in Cherrapunji' },
      { title: 'Mawlynnong & Dawki', description: 'Mawlynnong village and its sky walk, then boating on the Umngot river.', meals: 'Breakfast, Dinner', stay: 'Homestay near Dawki' },
      { title: 'Back to Shillong', description: 'Laitlum canyons at sunrise, then a free evening at Police Bazaar.', meals: 'Breakfast, Dinner', stay: 'Hotel in Shillong' },
      { title: 'Departure', description: 'Drop at Guwahati airport or station by 1:00 PM.', meals: 'Breakfast', stay: '' },
    ],
    accommodation: 'Hotels in Shillong, a resort in Cherrapunji and a village homestay near Dawki. Twin sharing.',
    transport: 'Private SUVs (Innova or similar) from Guwahati and back.',
    meals: '5 breakfasts, 5 dinners, 1 packed lunch',
    inclusions: ['Guwahati pickup and drop', '5 nights stay, twin sharing', 'Breakfast and dinner daily', 'Local Khasi guide for the root bridge trek', 'Dawki boating', 'All entry fees'],
    exclusions: ['Flights or trains to Guwahati', 'Lunches (except trek day)', 'Camera fees at viewpoints', 'Personal expenses'],
    pickupInfo: 'Guwahati airport (LGBI) or Guwahati railway station. Reporting by 11:00 AM on day 1.',
    cancellationPolicy: STD_CANCEL,
    departures: [[26, 18500, 16], [54, 18500, 16]],
  },
  {
    op: 'desert', title: 'Rajasthan Cultural Journey', destination: 'Jaipur, Jodhpur & Jaisalmer', region: 'Rajasthan', startLocation: 'Jaipur',
    categories: ['cultural'], durationDays: 6, durationNights: 5, basePrice: 16999, groupSize: '10–18 travellers',
    coverImage: IMG.hawa, images: [IMG.hawa, IMG.fort, IMG.taj],
    summary: 'Pink City bazaars, the blue lanes of Jodhpur and a night in the Thar under the stars.',
    overview: 'Three of Rajasthan\'s great cities with hosts who live in them. Old-city walks, folk music evenings and a desert camp beyond Sam dunes. Travel is by private AC coach, with heritage hotel stays.',
    highlights: ['Amber Fort and Hawa Mahal', 'Blue city walk in Jodhpur', 'Mehrangarh Fort', 'Jaisalmer Fort and Patwon ki Haveli', 'Desert camp with folk music'],
    itinerary: [
      { title: 'Arrive in Jaipur', description: 'Check in by 1:00 PM. Hawa Mahal, then an evening bazaar walk through Johari Bazaar.', meals: 'Dinner', stay: 'Heritage hotel, Jaipur' },
      { title: 'Amber Fort & Jaipur', description: 'Amber Fort in the morning, then City Palace and Jantar Mantar.', meals: 'Breakfast, Dinner', stay: 'Heritage hotel, Jaipur' },
      { title: 'Jaipur to Jodhpur', description: 'Drive to Jodhpur (6 hrs). Evening walk through the blue lanes of Navchokiya.', meals: 'Breakfast, Dinner', stay: 'Haveli stay, Jodhpur' },
      { title: 'Mehrangarh to Jaisalmer', description: 'Mehrangarh Fort in the morning, then drive to Jaisalmer.', meals: 'Breakfast, Dinner', stay: 'Hotel, Jaisalmer' },
      { title: 'Golden Fort & desert camp', description: 'Jaisalmer Fort and havelis, then on to Sam for sunset on the dunes, a camel ride, and folk music and dinner at camp.', meals: 'Breakfast, Dinner', stay: 'Swiss tent desert camp' },
      { title: 'Departure', description: 'Drop at Jaisalmer railway station or airport by 11:00 AM.', meals: 'Breakfast', stay: '' },
    ],
    accommodation: 'Heritage hotels and havelis on twin sharing, plus 1 night in a Swiss tent desert camp.',
    transport: 'Private AC coach for the whole trip.',
    meals: '5 breakfasts and 5 dinners',
    inclusions: ['5 nights stay', 'Breakfast and dinner daily', 'AC coach Jaipur to Jaisalmer', 'Monument entry fees', 'Camel ride and desert cultural evening', 'Local city hosts'],
    exclusions: ['Travel to Jaipur and from Jaisalmer', 'Lunches', 'Jeep safari', 'Camera fees', 'Tips'],
    pickupInfo: 'Meet at the group hotel in Jaipur (address shared on confirmation) by 1:00 PM on day 1.',
    cancellationPolicy: STD_CANCEL,
    departures: [[14, 16999, 18], [42, 17499, 18], [70, 16999, 18]],
  },
  {
    op: 'island', title: 'Bali Group Experience', destination: 'Bali', region: 'Bali', country: 'Indonesia', startLocation: 'Mumbai',
    categories: ['international', 'beach'], durationDays: 7, durationNights: 6, basePrice: 64999, groupSize: '12–20 travellers',
    coverImage: IMG.ulun, images: [IMG.ulun, IMG.tanah, IMG.terraces, IMG.penida],
    summary: 'Ubud rice terraces, a Nusa Penida day trip and sunsets at Tanah Lot, with an Indian trip leader.',
    overview: 'A first-international-trip favourite. Three nights in Ubud for temples, waterfalls and the Tegallalang terraces, then three nights by the beach in Seminyak with a full-day speedboat trip to Nusa Penida. Your trip leader meets you at Bali airport.',
    highlights: ['Tegallalang rice terraces', 'Ulun Danu Beratan temple', 'Nusa Penida: Kelingking beach', 'Tanah Lot sunset', 'Balinese cooking class'],
    itinerary: [
      { title: 'Arrive in Bali', description: 'Airport pickup and transfer to Ubud. Welcome dinner.', meals: 'Dinner', stay: '4-star resort, Ubud' },
      { title: 'Ubud highlights', description: 'Tegallalang terraces, Tirta Empul temple and a coffee plantation.', meals: 'Breakfast', stay: '4-star resort, Ubud' },
      { title: 'North Bali', description: 'Ulun Danu Beratan temple, Handara gate and Banyumala twin waterfalls.', meals: 'Breakfast', stay: '4-star resort, Ubud' },
      { title: 'Cooking class & Seminyak', description: 'Morning Balinese cooking class, then transfer to Seminyak.', meals: 'Breakfast, Lunch', stay: '4-star hotel, Seminyak' },
      { title: 'Nusa Penida', description: 'Speedboat day trip: Kelingking, Broken Beach and Angel\'s Billabong.', meals: 'Breakfast, Lunch', stay: '4-star hotel, Seminyak' },
      { title: 'Tanah Lot & free day', description: 'Free morning at the beach, then sunset at Tanah Lot.', meals: 'Breakfast, Dinner', stay: '4-star hotel, Seminyak' },
      { title: 'Departure', description: 'Airport transfer for your flight home.', meals: 'Breakfast', stay: '' },
    ],
    accommodation: '6 nights in 4-star properties (3 in Ubud, 3 in Seminyak), twin sharing.',
    transport: 'Private AC coach in Bali and a speedboat to Nusa Penida. Flights are not included.',
    meals: '6 breakfasts, 2 lunches, 2 dinners',
    inclusions: ['6 nights in 4-star hotels', 'Daily breakfast and listed meals', 'Airport transfers in Bali', 'All sightseeing with entry fees', 'Nusa Penida speedboat trip', 'Indian trip leader'],
    exclusions: ['International flights', 'Indonesia visa on arrival (about IDR 500,000)', 'Bali tourist levy (IDR 150,000)', 'Travel insurance', 'Personal expenses'],
    pickupInfo: 'Meet your trip leader at Ngurah Rai International Airport (DPS) arrivals. Flight guidance shared after confirmation.',
    cancellationPolicy: 'Free cancellation up to 45 days before departure. 50% refund between 44 and 21 days. No refund within 20 days. Visa rejection refunds are subject to hotel policies.',
    departures: [[34, 64999, 20], [64, 66999, 20]],
  },

  {
    op: 'pahadi', title: 'Nainital Lakes Weekend', destination: 'Nainital', region: 'Uttarakhand', startLocation: 'Delhi',
    categories: ['weekend', 'mountains'], durationDays: 3, durationNights: 2, basePrice: 6499, groupSize: '12–24 travellers',
    coverImage: IMG.nainital, images: [IMG.nainital, IMG.pines, IMG.campfire],
    summary: 'Boating on Naini Lake, sunrise at Tiffin Top and a lazy evening on Mall Road.',
    overview: 'An easy hill weekend for groups who want fresh air without long drives. Leave Delhi on Friday night, spend two nights by the lake, and be back by Monday morning.',
    highlights: ['Naini Lake boating', 'Tiffin Top sunrise walk', 'Bhimtal and Sattal lakes', 'Mall Road evening'],
    itinerary: [
      { title: 'Friday night departure', description: 'Depart Delhi at 10:00 PM by AC tempo traveller.', meals: '', stay: 'Overnight travel' },
      { title: 'Nainital lakes', description: 'Check in, Naini Lake boating, Naina Devi temple, then an evening on Mall Road.', meals: 'Breakfast, Dinner', stay: 'Hotel in Nainital (twin/triple sharing)' },
      { title: 'Tiffin Top & return', description: 'Sunrise walk to Tiffin Top, visit Bhimtal and Sattal, then depart for Delhi at 4:00 PM.', meals: 'Breakfast', stay: '' },
    ],
    accommodation: '2 nights in a hotel near Mall Road, twin/triple sharing.',
    transport: 'Delhi–Nainital–Delhi by AC tempo traveller.',
    meals: '2 breakfasts and 1 dinner',
    inclusions: ['AC transport from Delhi', '2 nights hotel stay', '2 breakfasts and 1 dinner', 'Sightseeing as per itinerary', 'Trip captain'],
    exclusions: ['Boating tickets', 'Lunches', 'Personal expenses'],
    pickupInfo: 'Pickup at Akshardham Metro Station Gate 2, Delhi. Reporting time 9:30 PM Friday.',
    cancellationPolicy: 'Free cancellation up to 7 days before departure. 50% refund within 7 days. No refund within 48 hours.',
    departures: [[10, 6499, 24], [24, 6499, 24], [38, 6999, 24]],
  },
  {
    op: 'desert', title: 'Goa Beach Weekend', destination: 'North Goa', region: 'Goa', startLocation: 'Mumbai',
    categories: ['weekend', 'beach'], durationDays: 3, durationNights: 2, basePrice: 7999, groupSize: '15–30 travellers',
    coverImage: IMG.goa, images: [IMG.goa, IMG.kerala],
    summary: 'Beach-hopping in North Goa, a sunset cruise on the Mandovi and Fontainhas walks.',
    overview: 'A sociable beach weekend with a fixed group. Overnight sleeper bus from Mumbai, two nights at a beachside stay in Calangute, and a loose plan so you can choose between beaches, cafés and markets.',
    highlights: ['Baga, Calangute and Anjuna beaches', 'Mandovi sunset cruise', 'Fontainhas Latin Quarter walk', 'Fort Aguada'],
    itinerary: [
      { title: 'Overnight from Mumbai', description: 'Board the AC sleeper bus from Borivali at 8:00 PM.', meals: '', stay: 'Overnight bus' },
      { title: 'North Goa beaches', description: 'Reach by 9:00 AM, check in, then Fort Aguada, Candolim and a Mandovi sunset cruise.', meals: 'Breakfast, Dinner', stay: 'Beach resort, Calangute (triple sharing)' },
      { title: 'Panjim & return', description: 'Fontainhas walk and the Basilica of Bom Jesus, then the bus back at 6:00 PM.', meals: 'Breakfast', stay: 'Overnight bus' },
    ],
    accommodation: '1 night at a beachside resort in Calangute, triple sharing.',
    transport: 'Mumbai–Goa–Mumbai by AC sleeper bus. Local sightseeing by tempo traveller.',
    meals: '2 breakfasts and 1 dinner',
    inclusions: ['AC sleeper bus from Mumbai', '1 night resort stay', '2 breakfasts and 1 dinner', 'Mandovi sunset cruise', 'Trip captain'],
    exclusions: ['Water sports', 'Lunches and drinks', 'Scooter rentals', 'Personal expenses'],
    pickupInfo: 'Pickup at Borivali Station (East), Mumbai. Reporting time 7:30 PM.',
    cancellationPolicy: STD_CANCEL,
    departures: [[11, 7999, 30], [25, 7999, 30]],
  },
  {
    op: 'island', title: 'Vietnam: Hanoi & Ha Long Bay', destination: 'Hanoi & Ha Long Bay', region: 'Northern Vietnam', country: 'Vietnam', startLocation: 'Delhi',
    categories: ['international', 'cultural'], durationDays: 6, durationNights: 5, basePrice: 54999, groupSize: '12–18 travellers',
    coverImage: img('1528127269322-539801943592'), images: [img('1528127269322-539801943592'), IMG.terraces],
    summary: 'Old Quarter street food, an overnight cruise in Ha Long Bay and the Ninh Binh karsts.',
    overview: 'A compact first trip to Vietnam. Two nights in Hanoi\'s Old Quarter, a night on a cruise in Ha Long Bay, and a day cycling through Ninh Binh. Indian vegetarian options are arranged at every group meal.',
    highlights: ['Overnight Ha Long Bay cruise', 'Hanoi Old Quarter food walk', 'Ninh Binh boat ride and cycling', 'Train Street café'],
    itinerary: [
      { title: 'Arrive in Hanoi', description: 'Airport pickup and check-in. Evening Old Quarter food walk.', meals: 'Dinner', stay: '4-star hotel, Hanoi' },
      { title: 'Hanoi city', description: 'Hoan Kiem Lake, Temple of Literature and Train Street.', meals: 'Breakfast', stay: '4-star hotel, Hanoi' },
      { title: 'Ha Long Bay cruise', description: 'Drive to Ha Long and board the cruise, with kayaking and Sung Sot cave.', meals: 'Breakfast, Lunch, Dinner', stay: 'Overnight cruise cabin (twin sharing)' },
      { title: 'Back to Hanoi', description: 'Tai chi on deck at sunrise, brunch, then return to Hanoi.', meals: 'Breakfast, Brunch', stay: '4-star hotel, Hanoi' },
      { title: 'Ninh Binh', description: 'Trang An boat ride and cycling through rice fields.', meals: 'Breakfast, Lunch', stay: '4-star hotel, Hanoi' },
      { title: 'Departure', description: 'Airport transfer for your flight home.', meals: 'Breakfast', stay: '' },
    ],
    accommodation: '4 nights in a 4-star hotel in Hanoi and 1 night on a Ha Long Bay cruise, twin sharing.',
    transport: 'Private AC coach in Vietnam. International flights are not included.',
    meals: '5 breakfasts, 3 lunches, 2 dinners',
    inclusions: ['5 nights stay', 'Listed meals', 'Airport transfers in Hanoi', 'Ha Long Bay overnight cruise', 'Ninh Binh day trip', 'Indian trip leader'],
    exclusions: ['International flights', 'Vietnam e-visa (about USD 25)', 'Travel insurance', 'Tips and personal expenses'],
    pickupInfo: 'Meet your trip leader at Noi Bai International Airport (HAN) arrivals.',
    cancellationPolicy: 'Free cancellation up to 45 days before departure. 50% refund between 44 and 21 days. No refund within 20 days.',
    departures: [[40, 54999, 18], [68, 56999, 18]],
  },
];

async function clearAll() {
  await Promise.all([User, Operator, OperatorVerification, TripPackage, TripDeparture, Booking, PaymentRecord, TripAnnouncement, Review, Report].map((M) => M.deleteMany({})));
}

async function seed() {
  const users = {};
  users.admin = await User.create({ name: 'Ghumo Admin', email: 'admin@ghumo.demo', passwordHash: demoAdminPassword(), role: 'admin', isDemo: true });
  users.traveler = await User.create({ name: 'Priya Sharma', email: 'traveller@ghumo.demo', passwordHash: DEMO_PASSWORD, role: 'traveler', phone: '+91 90000 00000', isDemo: true });

  const ops = {};
  for (const o of OPERATORS) {
    const u = await User.create({ name: o.owner, email: o.email, passwordHash: DEMO_PASSWORD, role: 'operator', phone: o.contactPhone, isDemo: true });
    ops[o.key] = await Operator.create({
      owner: u._id, businessName: o.businessName, slug: o.businessName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-$/, ''),
      description: o.description, contactEmail: o.email, contactPhone: o.contactPhone, location: o.location,
      instagram: o.instagram, foundedYear: o.foundedYear, status: o.status, isDemo: true,
    });
  }
  // Submitted (not yet reviewed) verification so the admin review flow can be demonstrated.
  await OperatorVerification.create({
    operator: ops.pahadi._id, registrationType: 'gst', registrationNumber: 'DEMO-GSTIN-0000', legalName: 'Wandering Pahadi Co. (demo)',
    notes: 'Demo submission: not a real registration.',
  });

  for (const p of PACKAGES) {
    const { op, departures, ...data } = p;
    const pkg = await TripPackage.create({
      ...data,
      itinerary: data.itinerary.map((d, i) => ({ day: i + 1, ...d })),
      operator: ops[op]._id,
      slug: data.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-$/, ''),
      status: 'published',
      isDemo: true,
    });
    for (const [offset, price, cap] of departures) {
      const startDate = day(offset);
      await TripDeparture.create({
        package: pkg._id, operator: ops[op]._id, startDate, endDate: day(offset + data.durationDays - 1),
        price, totalCapacity: cap, seatsAvailable: cap, bookingDeadline: day(offset - 2),
        pickupPoint: data.pickupInfo.split('.')[0], status: 'open',
      });
    }
  }

  // A draft from the pending operator, for the admin moderation demo.
  await TripPackage.create({
    operator: ops.pending._id, title: 'Gokarna Beach Trek Weekend', slug: 'gokarna-beach-trek-weekend', destination: 'Gokarna', region: 'Karnataka',
    startLocation: 'Bengaluru', categories: ['weekend', 'beach'], durationDays: 3, durationNights: 2, basePrice: 5499, coverImage: IMG.goa,
    summary: 'Five-beach trek, cliffside sunsets and a night by the sea.', status: 'draft', isDemo: true,
  });
}

async function seedIfEmpty() {
  // Seed when there are no trips yet. Leftover users from another app (e.g. the old Ghummoo
  // collections) don't block it; existing records are never deleted.
  if (await TripPackage.estimatedDocumentCount() > 0 || await User.exists({ email: /@ghumo\.demo$/ })) return false;
  console.log('[seed] no trips found: loading demo data');
  await seed();
  console.log('[seed] done');
  return true;
}

module.exports = { seed, seedIfEmpty, clearAll, DEMO_PASSWORD, demoAdminPassword };
