const router = require('express').Router();
const {
  Operator, OperatorVerification, TripPackage, TripDeparture, Booking, PaymentRecord, TripAnnouncement, Place, ListingView,
} = require('../models');
const mongoose = require('mongoose');
const { linkPackagePlaces } = require('../migrations/v0_1');
const { ensureGroup } = require('../services/groups');
const { verifyToken } = require('../middleware/auth');
const { requireRole, loadOperator } = require('../middleware/roleGuard');
const { asyncHandler } = require('../middleware/errorHandler');
const { badRequest, notFoundErr, conflict, forbidden, queryFilter } = require('../utils/http');
const { uniqueSlug, toList, escapeRegex, csvCell, isEmail } = require('../utils/text');
const { releaseSeats, adjustConfirmedSeats } = require('../services/seats');

router.use(verifyToken, requireRole('operator'));

/* ---------------------------- Profile & onboarding --------------------------- */

const PROFILE_FIELDS = ['businessName', 'organiserType', 'description', 'contactEmail', 'contactPhone', 'location', 'instagram', 'website', 'logoUrl', 'foundedYear'];
const ORGANISER_TYPES = ['independent', 'company', 'community', 'creator'];
const pick = (src, fields) => Object.fromEntries(fields.filter((f) => src[f] !== undefined).map((f) => [f, src[f]]));

function validateProfile(data, creating) {
  if (creating || data.businessName !== undefined) {
    if (!data.businessName || String(data.businessName).trim().length < 2) throw badRequest('Business name is required');
  }
  if (data.organiserType !== undefined && data.organiserType !== null && !ORGANISER_TYPES.includes(data.organiserType)) throw badRequest('Choose what kind of organiser you are');
  if (creating && !data.organiserType) throw badRequest('Choose what kind of organiser you are');
  if (creating) {
    if (!data.description || String(data.description).trim().length < 30) throw badRequest('Tell travellers about your business (at least 30 characters)');
    if (!data.contactPhone) throw badRequest('Contact phone is required');
    if (!data.contactEmail || !isEmail(data.contactEmail)) throw badRequest('A valid contact email is required');
    if (!data.location) throw badRequest('Location is required');
  }
  if (data.foundedYear) {
    const y = Number(data.foundedYear);
    if (!Number.isInteger(y) || y < 1950 || y > new Date().getFullYear()) throw badRequest('Founded year looks invalid');
  } else if (data.foundedYear === '') data.foundedYear = null;
}

router.get('/profile', loadOperator({ required: false }), asyncHandler(async (req, res) => {
  const verification = req.operator
    ? await OperatorVerification.findOne({ operator: req.operator._id }).sort({ createdAt: -1 }).lean()
    : null;
  res.json({ success: true, data: { operator: req.operator, verification } });
}));

router.post('/profile', loadOperator({ required: false }), asyncHandler(async (req, res) => {
  if (req.operator) throw conflict('Operator profile already exists');
  const data = pick(req.body || {}, PROFILE_FIELDS);
  validateProfile(data, true);
  const op = await Operator.create({ ...data, owner: req.user._id, slug: await uniqueSlug(Operator, data.businessName), status: 'pending' });
  res.status(201).json({ success: true, data: op });
}));

router.put('/profile', loadOperator(), asyncHandler(async (req, res) => {
  const data = pick(req.body || {}, PROFILE_FIELDS);
  validateProfile(data, false);
  Object.assign(req.operator, data);
  // A rejected operator who edits their profile goes back into the review queue.
  if (req.operator.status === 'rejected') req.operator.status = 'pending';
  await req.operator.save();
  res.json({ success: true, data: req.operator });
}));

router.post('/verification', loadOperator(), asyncHandler(async (req, res) => {
  const { registrationType, registrationNumber, legalName, documentUrl, notes } = req.body || {};
  const v = await OperatorVerification.create({ operator: req.operator._id, registrationType, registrationNumber, legalName, documentUrl, notes });
  res.status(201).json({ success: true, data: v });
}));

/* ---------------------------------- Stats ----------------------------------- */

router.get('/stats', loadOperator(), asyncHandler(async (req, res) => {
  const opId = req.operator._id;
  const now = new Date();
  const [published, drafts, upcomingDepartures, bookingsByStatus, payments, recent, nextDeps] = await Promise.all([
    TripPackage.countDocuments({ operator: opId, status: 'published' }),
    TripPackage.countDocuments({ operator: opId, status: { $in: ['draft', 'unpublished'] } }),
    TripDeparture.countDocuments({ operator: opId, status: { $ne: 'cancelled' }, startDate: { $gte: now } }),
    Booking.aggregate([{ $match: { operator: opId } }, { $group: { _id: '$status', count: { $sum: 1 }, seats: { $sum: '$seats' } } }]),
    PaymentRecord.aggregate([{ $match: { operator: opId } }, { $group: { _id: '$currency', total: { $sum: '$amount' }, count: { $sum: 1 } } }]),
    Booking.find({ operator: opId }).sort({ createdAt: -1 }).limit(6).populate('package', 'title slug').populate('departure', 'startDate').lean(),
    TripDeparture.find({ operator: opId, status: { $ne: 'cancelled' }, startDate: { $gte: now } }).sort({ startDate: 1 }).limit(5).populate('package', 'title').lean(),
  ]);
  const by = Object.fromEntries(bookingsByStatus.map((b) => [b._id, b]));
  const upcomingIds = await TripDeparture.find({ operator: opId, status: { $ne: 'cancelled' }, startDate: { $gte: now } }).distinct('_id');
  const [travellers, archived, activity] = await Promise.all([
    Booking.aggregate([{ $match: { operator: opId, status: 'confirmed', departure: { $in: upcomingIds } } }, { $group: { _id: null, seats: { $sum: '$seats' } } }]),
    TripPackage.countDocuments({ operator: opId, status: 'archived' }),
    recentActivity(opId),
  ]);
  res.json({
    success: true,
    data: {
      publishedTrips: published,
      draftTrips: drafts,
      upcomingDepartures,
      totalReservations: bookingsByStatus.reduce((s, b) => s + b.count, 0),
      pendingRequests: by.requested?.count || 0,
      confirmedBookings: by.confirmed?.count || 0,
      confirmedSeats: by.confirmed?.seats || 0,
      // Only money the operator has actually recorded as received.
      recordedPayments: payments.map((p) => ({ currency: p._id, total: p.total, count: p.count })),
      recentBookings: recent,
      nextDepartures: nextDeps,
      archivedTrips: archived,
      // Travellers on confirmed bookings for departures that haven't started yet.
      confirmedTravellersUpcoming: travellers[0]?.seats || 0,
      recentActivity: activity,
    },
  });
}));

/* Recent activity: real events only (booking status changes, recorded payments, announcements). */
async function recentActivity(opId, limit = 10) {
  const [bookings, payments, posts] = await Promise.all([
    Booking.find({ operator: opId }).sort({ updatedAt: -1 }).limit(limit).select('reference seats history package').populate('package', 'title').lean(),
    PaymentRecord.find({ operator: opId }).sort({ createdAt: -1 }).limit(limit).populate({ path: 'booking', select: 'reference package', populate: { path: 'package', select: 'title' } }).lean(),
    TripAnnouncement.find({ operator: opId }).sort({ createdAt: -1 }).limit(limit).populate('package', 'title').lean(),
  ]);
  const events = [];
  for (const b of bookings) {
    for (const h of b.history || []) {
      events.push({ kind: `booking_${h.status}`, at: h.at, bookingId: b._id, reference: b.reference, seats: b.seats, trip: b.package?.title || '' });
    }
  }
  for (const p of payments) events.push({ kind: 'payment_recorded', at: p.createdAt, bookingId: p.booking?._id, reference: p.booking?.reference, amount: p.amount, currency: p.currency, method: p.method, trip: p.booking?.package?.title || '' });
  for (const a of posts) events.push({ kind: 'announcement_posted', at: a.createdAt, departureId: a.departure, title: a.title, trip: a.package?.title || '' });
  return events.filter((e) => e.at).sort((x, y) => new Date(y.at) - new Date(x.at)).slice(0, limit);
}

/* --------------------------------- Insights --------------------------------- */

const istDay = (d) => new Date(d).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

// Only metrics backed by recorded events: public listing views, booking requests, confirmations
// and departure occupancy. No revenue projections or conversion scores.
router.get('/insights', loadOperator(), asyncHandler(async (req, res) => {
  const days = [7, 30, 90].includes(Number(req.query.days)) ? Number(req.query.days) : 30;
  const opId = req.operator._id;
  const since = new Date(Date.now() - days * 86400000);
  const sinceDay = istDay(since);
  const [pkgs, views, requests, confirmed, deps] = await Promise.all([
    TripPackage.find({ operator: opId, status: { $ne: 'removed' } }, 'title slug status').lean(),
    ListingView.aggregate([{ $match: { operator: opId, day: { $gte: sinceDay } } }, { $group: { _id: '$package', views: { $sum: '$count' } } }]),
    Booking.aggregate([{ $match: { operator: opId, createdAt: { $gte: since } } }, { $group: { _id: '$package', count: { $sum: 1 } } }]),
    Booking.aggregate([
      { $match: { operator: opId } },
      { $unwind: '$history' },
      { $match: { 'history.status': 'confirmed', 'history.at': { $gte: since } } },
      { $group: { _id: '$package', count: { $sum: 1 } } },
    ]),
    TripDeparture.find({ operator: opId, status: { $ne: 'cancelled' }, startDate: { $gte: new Date() } }).sort({ startDate: 1 }).limit(50).populate('package', 'title').lean(),
  ]);
  const m = (rows, key) => new Map(rows.map((r) => [String(r._id), r[key]]));
  const vm = m(views, 'views'); const rm = m(requests, 'count'); const cm = m(confirmed, 'count');
  const perPackage = pkgs.map((p) => ({ _id: p._id, title: p.title, slug: p.slug, status: p.status, views: vm.get(String(p._id)) || 0, requests: rm.get(String(p._id)) || 0, confirmed: cm.get(String(p._id)) || 0 }))
    .sort((a, b) => b.views - a.views || b.requests - a.requests);
  const sum = (k) => perPackage.reduce((t, p) => t + p[k], 0);
  res.json({
    success: true,
    data: {
      days,
      totals: { views: sum('views'), requests: sum('requests'), confirmed: sum('confirmed') },
      perPackage,
      occupancy: deps.map((d) => {
        const confirmedSeats = d.confirmedSeats || 0;
        const held = Math.max(0, d.totalCapacity - d.seatsAvailable - confirmedSeats); // requested, awaiting you
        return { _id: d._id, trip: d.package?.title, startDate: d.startDate, totalCapacity: d.totalCapacity, confirmedSeats, requestedSeats: held, seatsAvailable: d.seatsAvailable, status: d.status };
      }),
    },
  });
}));

/* -------------------------------- Packages ---------------------------------- */

const PKG_FIELDS = [
  'title', 'destination', 'region', 'country', 'startLocation', 'categories', 'durationDays', 'durationNights', 'basePrice',
  'currency', 'coverImage', 'images', 'summary', 'overview', 'highlights', 'itinerary', 'accommodation', 'transport', 'meals',
  'inclusions', 'exclusions', 'pickupInfo', 'cancellationPolicy', 'groupSize', 'source', 'aiWarnings',
  'destinationRefs', 'departureCityRefs',
];

// Validates optional links to the India content directory. Departure cities must be cities.
async function validatePlaceRefs(data) {
  for (const [field, label, onlyCities] of [['destinationRefs', 'Destination', false], ['departureCityRefs', 'Departure city', true]]) {
    if (data[field] === undefined) continue;
    const ids = Array.isArray(data[field]) ? [...new Set(data[field].map(String))] : null;
    if (!ids || ids.some((id) => !mongoose.isValidObjectId(id))) throw badRequest(`${label} links must be a list of place IDs`);
    if (ids.length > 12) throw badRequest(`Link at most 12 places in ${label.toLowerCase()}s`);
    const found = await Place.find({ _id: { $in: ids }, contentStatus: 'published' }, 'kind').lean();
    if (found.length !== ids.length) throw badRequest(`${label}: one or more places were not found`);
    if (onlyCities && found.some((p) => p.kind !== 'city')) throw badRequest('Departure cities must be cities');
    data[field] = ids;
  }
}

function cleanPackage(body) {
  const data = pick(body || {}, PKG_FIELDS);
  for (const k of ['highlights', 'inclusions', 'exclusions', 'images', 'aiWarnings']) if (data[k] !== undefined) data[k] = toList(data[k]);
  if (data.categories !== undefined) data.categories = toList(data.categories).filter((c) => TripPackage.CATEGORIES.includes(c));
  for (const k of ['durationDays', 'durationNights', 'basePrice']) {
    if (data[k] === '' || data[k] === null) data[k] = null;
    else if (data[k] !== undefined) {
      const n = Number(data[k]);
      if (!Number.isFinite(n) || n < 0) throw badRequest(`${k} must be a positive number`);
      data[k] = n;
    }
  }
  if (data.itinerary !== undefined) {
    if (!Array.isArray(data.itinerary)) throw badRequest('Itinerary must be a list of days');
    data.itinerary = data.itinerary
      .filter((d) => d && String(d.title || '').trim())
      .map((d, i) => ({ day: i + 1, title: String(d.title).trim(), description: String(d.description || '').trim(), meals: String(d.meals || '').trim(), stay: String(d.stay || '').trim() }));
  }
  if (data.source !== undefined && !['manual', 'ai'].includes(data.source)) delete data.source;
  if (data.title !== undefined && String(data.title).trim().length < 4) throw badRequest('Title must be at least 4 characters');
  return data;
}

async function ownPackage(req) {
  const pkg = await TripPackage.findOne({ _id: req.params.id, operator: req.operator._id });
  if (!pkg) throw notFoundErr('Package not found');
  return pkg;
}

router.get('/packages', loadOperator(), asyncHandler(async (req, res) => {
  const pkgs = await TripPackage.find({ operator: req.operator._id }).sort({ updatedAt: -1 }).lean();
  const deps = await TripDeparture.aggregate([
    { $match: { operator: req.operator._id, status: { $ne: 'cancelled' }, startDate: { $gte: new Date() } } },
    { $group: { _id: '$package', count: { $sum: 1 }, seatsLeft: { $sum: '$seatsAvailable' }, capacity: { $sum: '$totalCapacity' }, next: { $min: '$startDate' } } },
  ]);
  const pending = await Booking.aggregate([
    { $match: { operator: req.operator._id, status: 'requested' } },
    { $group: { _id: '$package', count: { $sum: 1 } } },
  ]);
  const dm = new Map(deps.map((d) => [String(d._id), d]));
  const pm = new Map(pending.map((d) => [String(d._id), d.count]));
  res.json({
    success: true,
    data: pkgs.map((p) => ({ ...p, upcoming: dm.get(String(p._id)) || null, pendingRequests: pm.get(String(p._id)) || 0 })),
  });
}));

router.post('/packages', loadOperator(), asyncHandler(async (req, res) => {
  const data = cleanPackage(req.body);
  if (!data.title) throw badRequest('Title is required');
  await validatePlaceRefs(data);
  const pkg = new TripPackage({ ...data, operator: req.operator._id, slug: await uniqueSlug(TripPackage, data.title), status: 'draft' });
  await linkPackagePlaces(pkg); // fills empty links from the package's own text; never guesses
  await pkg.save();
  res.status(201).json({ success: true, data: pkg });
}));

router.get('/packages/:id', loadOperator(), asyncHandler(async (req, res) => {
  const pkg = await ownPackage(req);
  const departures = await TripDeparture.find({ package: pkg._id }).sort({ startDate: 1 }).lean();
  const counts = await Booking.aggregate([
    { $match: { package: pkg._id } },
    { $group: { _id: { d: '$departure', s: '$status' }, count: { $sum: 1 }, seats: { $sum: '$seats' } } },
  ]);
  const byDep = {};
  for (const c of counts) {
    const k = String(c._id.d);
    byDep[k] = byDep[k] || {};
    byDep[k][c._id.s] = { count: c.count, seats: c.seats };
  }
  const activeDeps = departures.filter((d) => d.status !== 'cancelled' && new Date(d.startDate) >= new Date()).length;
  res.json({
    success: true,
    data: {
      package: pkg,
      departures: departures.map((d) => ({ ...d, bookingCounts: byDep[String(d._id)] || {} })),
      publishBlockers: pkg.publishBlockers(activeDeps),
      operatorStatus: req.operator.status,
    },
  });
}));

router.put('/packages/:id', loadOperator(), asyncHandler(async (req, res) => {
  const pkg = await ownPackage(req);
  if (pkg.status === 'removed') throw forbidden('This listing was removed by moderators');
  const data = cleanPackage(req.body);
  await validatePlaceRefs(data);
  Object.assign(pkg, data);
  await linkPackagePlaces(pkg);
  if (data.title && pkg.status === 'draft') pkg.slug = await uniqueSlug(TripPackage, data.title, pkg._id);
  if (pkg.status === 'published') {
    const active = await TripDeparture.countDocuments({ package: pkg._id, status: { $ne: 'cancelled' }, startDate: { $gte: new Date() } });
    const blockers = pkg.publishBlockers(active);
    if (blockers.length) throw badRequest(`A published trip needs: ${blockers.join(', ')}. Unpublish it first to save an incomplete version.`);
  }
  await pkg.save();
  res.json({ success: true, data: pkg });
}));

router.post('/packages/:id/publish', loadOperator(), asyncHandler(async (req, res) => {
  const pkg = await ownPackage(req);
  if (pkg.status === 'removed') throw forbidden('This listing was removed by moderators');
  if (pkg.status === 'archived') throw conflict('Restore this package from the archive before publishing it');
  if (req.operator.status !== 'approved') throw forbidden('Your operator profile must be approved before you can publish trips');
  const active = await TripDeparture.countDocuments({ package: pkg._id, status: { $ne: 'cancelled' }, startDate: { $gte: new Date() } });
  const blockers = pkg.publishBlockers(active);
  if (blockers.length) throw badRequest(`Add these before publishing: ${blockers.join(', ')}`, { blockers });
  pkg.status = 'published';
  await pkg.save();
  res.json({ success: true, data: pkg });
}));

router.post('/packages/:id/unpublish', loadOperator(), asyncHandler(async (req, res) => {
  const pkg = await ownPackage(req);
  if (pkg.status !== 'published') throw conflict('Package is not published');
  pkg.status = 'unpublished';
  await pkg.save();
  res.json({ success: true, data: pkg });
}));

// Archive: hide a package you no longer run. Existing bookings are untouched.
router.post('/packages/:id/archive', loadOperator(), asyncHandler(async (req, res) => {
  const pkg = await ownPackage(req);
  if (pkg.status === 'removed') throw forbidden('This listing was removed by moderators');
  if (pkg.status === 'archived') throw conflict('Package is already archived');
  pkg.status = 'archived';
  await pkg.save();
  res.json({ success: true, data: pkg });
}));

router.post('/packages/:id/restore', loadOperator(), asyncHandler(async (req, res) => {
  const pkg = await ownPackage(req);
  if (pkg.status !== 'archived') throw conflict('Only archived packages can be restored');
  pkg.status = 'draft';
  await pkg.save();
  res.json({ success: true, data: pkg });
}));

// Duplicate: a new draft with the same content and no departures, bookings or history.
const COPY_FIELDS = PKG_FIELDS.filter((f) => !['source', 'aiWarnings'].includes(f));
router.post('/packages/:id/duplicate', loadOperator(), asyncHandler(async (req, res) => {
  const pkg = await ownPackage(req);
  if (pkg.status === 'removed') throw forbidden('This listing was removed by moderators');
  const src = pkg.toObject();
  const data = Object.fromEntries(COPY_FIELDS.filter((f) => src[f] !== undefined).map((f) => [f, src[f]]));
  const title = `Copy of ${src.title}`.slice(0, 140);
  const copy = await TripPackage.create({ ...data, title, operator: req.operator._id, slug: await uniqueSlug(TripPackage, title), status: 'draft', source: 'manual' });
  res.status(201).json({ success: true, data: copy });
}));

router.delete('/packages/:id', loadOperator(), asyncHandler(async (req, res) => {
  const pkg = await ownPackage(req);
  if (await Booking.exists({ package: pkg._id })) throw conflict('This package has bookings. Unpublish it instead of deleting.');
  await TripDeparture.deleteMany({ package: pkg._id });
  await pkg.deleteOne();
  res.json({ success: true, data: { deleted: true } });
}));

/* ------------------------------- Departures --------------------------------- */

function parseDeparture(body, existing) {
  const out = {};
  const date = (v, label) => {
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) throw badRequest(`${label} is invalid`);
    return d;
  };
  if (body.startDate !== undefined) out.startDate = date(body.startDate, 'Departure date');
  if (body.endDate !== undefined) out.endDate = date(body.endDate, 'Return date');
  if (body.bookingDeadline !== undefined) out.bookingDeadline = body.bookingDeadline ? date(body.bookingDeadline, 'Booking deadline') : null;
  if (body.price !== undefined) {
    out.price = Number(body.price);
    if (!Number.isFinite(out.price) || out.price < 0) throw badRequest('Price must be a positive number');
  }
  if (body.totalCapacity !== undefined) {
    out.totalCapacity = Number(body.totalCapacity);
    if (!Number.isInteger(out.totalCapacity) || out.totalCapacity < 1 || out.totalCapacity > 500) throw badRequest('Capacity must be between 1 and 500');
  }
  for (const k of ['pickupPoint', 'reportingTime']) if (body[k] !== undefined) out[k] = String(body[k]).trim();
  if (body.status !== undefined) {
    if (!['open', 'closed', 'cancelled'].includes(body.status)) throw badRequest('Invalid status');
    out.status = body.status;
  }
  const start = out.startDate || existing?.startDate;
  const end = out.endDate || existing?.endDate;
  if (start && end && end < start) throw badRequest('Return date must be on or after the departure date');
  const deadline = out.bookingDeadline !== undefined ? out.bookingDeadline : existing?.bookingDeadline;
  if (deadline && start && deadline > start) throw badRequest('Booking deadline must be before the departure date');
  return out;
}

router.post('/packages/:id/departures', loadOperator(), asyncHandler(async (req, res) => {
  const pkg = await ownPackage(req);
  const data = parseDeparture(req.body || {});
  if (!data.startDate || !data.endDate) throw badRequest('Departure and return dates are required');
  if (data.startDate < new Date(new Date().toDateString())) throw badRequest('Departure date must be in the future');
  if (data.price === undefined) {
    if (pkg.basePrice == null) throw badRequest('Price is required');
    data.price = pkg.basePrice;
  }
  if (!data.totalCapacity) throw badRequest('Seat capacity is required');
  const dep = await TripDeparture.create({ ...data, package: pkg._id, operator: req.operator._id, seatsAvailable: data.totalCapacity });
  res.status(201).json({ success: true, data: dep });
}));

async function ownDeparture(req) {
  const dep = await TripDeparture.findOne({ _id: req.params.id, operator: req.operator._id });
  if (!dep) throw notFoundErr('Departure not found');
  return dep;
}

async function heldSeats(depId) {
  const agg = await Booking.aggregate([
    { $match: { departure: depId, status: { $in: ['requested', 'confirmed'] } } },
    { $group: { _id: null, seats: { $sum: '$seats' } } },
  ]);
  return agg[0]?.seats || 0;
}

router.put('/departures/:id', loadOperator(), asyncHandler(async (req, res) => {
  const dep = await ownDeparture(req);
  const data = parseDeparture(req.body || {}, dep);
  const held = await heldSeats(dep._id);
  if (data.status === 'cancelled' && held > 0) throw conflict('Reject or cancel the active bookings on this departure before cancelling it');
  if (data.totalCapacity !== undefined) {
    if (data.totalCapacity < held) throw conflict(`Capacity can't be lower than the ${held} seat(s) already requested or confirmed`);
    data.seatsAvailable = data.totalCapacity - held;
  }
  // Price changes only apply to new bookings; existing bookings keep their price.
  const updated = await TripDeparture.findOneAndUpdate({ _id: dep._id }, { $set: data }, { new: true, runValidators: true });
  res.json({ success: true, data: updated });
}));

router.delete('/departures/:id', loadOperator(), asyncHandler(async (req, res) => {
  const dep = await ownDeparture(req);
  if (await Booking.exists({ departure: dep._id })) throw conflict('This departure has bookings. Close or cancel it instead.');
  await dep.deleteOne();
  res.json({ success: true, data: { deleted: true } });
}));

// Departure manifest + announcements board.
router.get('/departures/:id', loadOperator(), asyncHandler(async (req, res) => {
  const dep = await TripDeparture.findOne({ _id: req.params.id, operator: req.operator._id }).populate('package', 'title slug destination coverImage').lean();
  if (!dep) throw notFoundErr('Departure not found');
  const [bookings, announcements] = await Promise.all([
    Booking.find({ departure: dep._id }).sort({ createdAt: -1 }).lean(),
    TripAnnouncement.find({ departure: dep._id }).sort({ pinned: -1, createdAt: -1 }).lean(),
  ]);
  res.json({ success: true, data: { departure: dep, bookings, announcements } });
}));

router.post('/departures/:id/announcements', loadOperator(), asyncHandler(async (req, res) => {
  const dep = await ownDeparture(req);
  const { title, body, kind, pinned } = req.body || {};
  const a = await TripAnnouncement.create({
    departure: dep._id, package: dep.package, operator: req.operator._id, author: req.user._id,
    title, body, kind: ['announcement', 'pickup', 'instruction', 'itinerary'].includes(kind) ? kind : 'announcement', pinned: Boolean(pinned),
  });
  res.status(201).json({ success: true, data: a });
}));

router.delete('/announcements/:id', loadOperator(), asyncHandler(async (req, res) => {
  const a = await TripAnnouncement.findOneAndDelete({ _id: req.params.id, operator: req.operator._id });
  if (!a) throw notFoundErr('Announcement not found');
  res.json({ success: true, data: { deleted: true } });
}));

/* -------------------------------- Bookings ---------------------------------- */

async function bookingQuery(req) {
  const q = { operator: req.operator._id };
  for (const f of ['status', 'departure', 'package']) {
    const v = queryFilter(req.query, f);
    if (v) q[f] = v;
  }
  const text = queryFilter(req.query, 'q');
  if (text) {
    const rx = new RegExp(escapeRegex(text), 'i');
    q.$or = [{ reference: rx }, { 'contact.name': rx }, { 'contact.email': rx }, { 'contact.phone': rx }, { 'travelers.fullName': rx }];
  }
  return q;
}

router.get('/bookings', loadOperator(), asyncHandler(async (req, res) => {
  const items = await Booking.find(await bookingQuery(req))
    .sort({ createdAt: -1 })
    .limit(300)
    .populate('package', 'title slug')
    .populate('departure', 'startDate endDate seatsAvailable totalCapacity')
    .lean();
  const paid = await PaymentRecord.aggregate([
    { $match: { booking: { $in: items.map((b) => b._id) } } },
    { $group: { _id: '$booking', total: { $sum: '$amount' } } },
  ]);
  const pm = new Map(paid.map((p) => [String(p._id), p.total]));
  res.json({ success: true, data: items.map((b) => ({ ...b, amountReceived: pm.get(String(b._id)) || 0 })) });
}));

router.get('/bookings/export.csv', loadOperator(), asyncHandler(async (req, res) => {
  const q = await bookingQuery(req);
  if (!q.status) q.status = { $in: ['requested', 'confirmed'] };
  const items = await Booking.find(q).sort({ createdAt: 1 }).populate('package', 'title').populate('departure', 'startDate').lean();
  const rows = [['Reference', 'Status', 'Trip', 'Departure', 'Traveller', 'Age', 'Gender', 'Traveller phone', 'Emergency contact', 'Booking contact', 'Contact phone', 'Contact email']];
  for (const b of items) {
    for (const t of b.travelers) {
      rows.push([b.reference, b.status, b.package?.title, b.departure ? new Date(b.departure.startDate).toISOString().slice(0, 10) : '', t.fullName, t.age, t.gender, t.phone, t.emergencyContact, b.contact.name, b.contact.phone, b.contact.email]);
    }
  }
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="ghumo-travellers.csv"');
  res.send(rows.map((r) => r.map(csvCell).join(',')).join('\n'));
}));

async function ownBooking(req) {
  const b = await Booking.findOne({ _id: req.params.id, operator: req.operator._id });
  if (!b) throw notFoundErr('Booking not found');
  return b;
}

router.get('/bookings/:id', loadOperator(), asyncHandler(async (req, res) => {
  const b = await Booking.findOne({ _id: req.params.id, operator: req.operator._id })
    .populate('package', 'title slug').populate('departure').populate('user', 'name email phone').lean();
  if (!b) throw notFoundErr('Booking not found');
  const payments = await PaymentRecord.find({ booking: b._id }).sort({ createdAt: -1 }).lean();
  res.json({ success: true, data: { ...b, payments } });
}));

router.post('/bookings/:id/confirm', loadOperator(), asyncHandler(async (req, res) => {
  const b = await ownBooking(req);
  const updated = await Booking.findOneAndUpdate(
    { _id: b._id, status: 'requested' },
    { $set: { status: 'confirmed', operatorNote: String(req.body?.note || '') }, $push: { history: { status: 'confirmed', note: String(req.body?.note || 'Confirmed by organiser'), by: req.user._id } } },
    { new: true }
  );
  if (!updated) throw conflict(`Only requested bookings can be confirmed (this one is ${b.status})`);
  await adjustConfirmedSeats(b.departure, b.seats);
  // The departure's trip group exists from its first confirmed traveller.
  const dep = await TripDeparture.findById(b.departure).lean();
  if (dep) await ensureGroup(dep);
  res.json({ success: true, data: updated });
}));

router.post('/bookings/:id/reject', loadOperator(), asyncHandler(async (req, res) => {
  const b = await ownBooking(req);
  const note = String(req.body?.note || '').trim();
  if (note.length < 3) throw badRequest('Please tell the traveller why the request was declined');
  const before = await Booking.findOneAndUpdate(
    { _id: b._id, status: { $in: ['requested', 'confirmed'] } },
    { $set: { status: 'rejected', operatorNote: note }, $push: { history: { status: 'rejected', note, by: req.user._id } } },
    { new: false }
  );
  if (!before) throw conflict(`This booking is already ${b.status}`);
  await releaseSeats(b.departure, b.seats);
  if (before.status === 'confirmed') await adjustConfirmedSeats(b.departure, -b.seats);
  const updated = await Booking.findById(b._id);
  res.json({ success: true, data: updated });
}));

router.post('/bookings/:id/payments', loadOperator(), asyncHandler(async (req, res) => {
  const b = await ownBooking(req);
  if (b.status !== 'confirmed') throw conflict('Record payments against confirmed bookings only');
  const amount = Number(req.body?.amount);
  if (!Number.isFinite(amount) || amount <= 0) throw badRequest('Enter the amount received');
  const paid = await PaymentRecord.aggregate([{ $match: { booking: b._id } }, { $group: { _id: null, t: { $sum: '$amount' } } }]);
  if ((paid[0]?.t || 0) + amount > b.totalAmount) throw badRequest('Recorded payments would exceed the booking total');
  const p = await PaymentRecord.create({
    booking: b._id, operator: req.operator._id, amount, currency: b.currency, method: req.body?.method,
    externalReference: req.body?.externalReference, note: req.body?.note, recordedBy: req.user._id,
  });
  res.status(201).json({ success: true, data: p });
}));

module.exports = router;
