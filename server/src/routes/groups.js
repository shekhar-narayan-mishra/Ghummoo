/* Trip groups (signed-in users; membership re-checked on every request by services/groups.js).

     GET  /api/groups/mine                          groups I can open, with unread counts
     GET  /api/groups/:departureId                   group info: trip, departure, members, me
     GET  /api/groups/:departureId/messages          history; ?after=<iso> for polling, ?before= for older
     POST /api/groups/:departureId/messages          { body, kind?: 'announcement' (organiser only) }
     POST /api/groups/:departureId/read              mark read up to now
     POST /api/groups/:departureId/mute              { muted }
     POST /api/groups/:departureId/leave             travellers only
     POST /api/groups/:departureId/join              rejoin after leaving (if still eligible)
     POST /api/groups/:departureId/messages/:id/report  { reason, details }

   V0.1 uses polling (no real-time transport exists in this stack). */
const router = require('express').Router();
const mongoose = require('mongoose');
const { GroupMessage, GroupMember, TripGroup, TripAnnouncement, Report, User } = require('../models');
const { verifyToken } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { badRequest, notFoundErr, forbidden } = require('../utils/http');
const { rateLimit } = require('../middleware/rateLimit');
const { access, members, groupsFor, displayName } = require('../services/groups');

router.use(verifyToken);

const sendLimiter = rateLimit({ windowMs: 60000, max: Number(process.env.GROUP_MESSAGES_PER_MIN) || 12, name: 'group-send', key: (req) => String(req.user._id) });
const reportLimiter = rateLimit({ windowMs: 60000, max: 5, name: 'group-report', key: (req) => String(req.user._id) });

const MAX_LEN = 1000;
// Groups are not for contact or payment details: keep those between traveller and organiser.
const SENSITIVE = [
  // Indian mobiles in any grouping ("98765 43210", "+91-98765-43210"): checked with separators removed.
  [{ test: (t) => /(?<!\d)(?:\+?91)?[6-9]\d{9}(?!\d)/.test(t.replace(/(?<=\d)[\s-]+(?=\d)/g, '')) }, 'phone numbers'],
  [/\b[\w.-]{2,}@(?:upi|ok(?:axis|hdfcbank|icici|sbi)|ybl|paytm|ibl|axl|apl|ybl)\b/i, 'UPI IDs'],
  [/(?<!\d)(?:\d[ -]?){15}\d(?!\d)/, 'card numbers'],
  [/\b[\w.+-]+@[\w-]+\.[\w.]+\b/, 'email addresses'],
];

const present = (m, me, authors) => ({
  _id: m._id,
  kind: m.kind,
  body: m.hidden ? 'This message was removed by moderators.' : m.body,
  hidden: m.hidden,
  createdAt: m.createdAt,
  mine: String(m.author) === String(me),
  author: { role: m.authorRole, name: authors.get(String(m.author)) || (m.authorRole === 'organiser' ? 'Organiser' : 'Traveller') },
});

async function authorNames(msgs, ctx) {
  const ids = [...new Set(msgs.map((m) => String(m.author)))];
  const users = await User.find({ _id: { $in: ids } }, 'name').lean();
  const map = new Map(users.map((u) => [String(u._id), displayName(u.name)]));
  map.set(String(ctx.operator.owner), ctx.operator.businessName);
  return map;
}

async function unreadFor(groupId, userId, since) {
  return GroupMessage.countDocuments({ group: groupId, author: { $ne: userId }, hidden: false, ...(since ? { createdAt: { $gt: since } } : {}) });
}

router.get('/mine', asyncHandler(async (req, res) => {
  const deps = await groupsFor(req.user);
  const groups = await TripGroup.find({ departure: { $in: deps.map((d) => d._id) } }).populate('package', 'title slug').lean();
  const byDep = new Map(groups.map((g) => [String(g.departure), g]));
  const memberships = await GroupMember.find({ user: req.user._id, departure: { $in: deps.map((d) => d._id) } }).lean();
  const mm = new Map(memberships.map((m) => [String(m.departure), m]));
  const activeDeps = deps.filter((d) => !mm.get(String(d._id))?.leftAt);
  const items = await Promise.all(
    activeDeps.map(async (d) => {
      const g = byDep.get(String(d._id));
      const m = mm.get(String(d._id));
      const [last, unread] = await Promise.all([
        g ? GroupMessage.findOne({ group: g._id, hidden: false }).sort({ createdAt: -1 }).select('createdAt kind').lean() : null,
        g ? unreadFor(g._id, req.user._id, m?.lastReadAt) : 0,
      ]);
      return {
        departureId: d._id,
        trip: g?.package?.title || null,
        startDate: d.startDate,
        endDate: d.endDate,
        unread,
        muted: Boolean(m?.muted),
        lastMessageAt: last?.createdAt || null,
      };
    })
  );
  items.sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
  res.json({ success: true, data: { items, unreadTotal: items.filter((i) => !i.muted).reduce((n, i) => n + i.unread, 0) } });
}));

router.get('/:departureId', asyncHandler(async (req, res) => {
  const ctx = await access(req.user, req.params.departureId);
  const [list, pinned] = await Promise.all([
    members(ctx),
    TripAnnouncement.find({ departure: ctx.dep._id, pinned: true }).sort({ createdAt: -1 }).limit(5).select('title body kind createdAt').lean(),
  ]);
  res.json({
    success: true,
    data: {
      departureId: ctx.dep._id,
      trip: { title: ctx.pkg?.title, slug: ctx.pkg?.slug, destination: ctx.pkg?.destination, coverImage: ctx.pkg?.coverImage },
      departure: { startDate: ctx.dep.startDate, endDate: ctx.dep.endDate, pickupPoint: ctx.dep.pickupPoint, reportingTime: ctx.dep.reportingTime, status: ctx.dep.status },
      organiser: { name: ctx.operator.businessName, slug: ctx.operator.slug },
      members: list,
      pinned,
      me: { role: ctx.role, muted: ctx.member.muted, canLeave: ctx.role === 'traveller' },
    },
  });
}));

router.get('/:departureId/messages', asyncHandler(async (req, res) => {
  const ctx = await access(req.user, req.params.departureId);
  const q = { group: ctx.group._id };
  const after = req.query.after ? new Date(req.query.after) : null;
  const before = req.query.before ? new Date(req.query.before) : null;
  if (after && !Number.isNaN(after.getTime())) q.createdAt = { $gt: after };
  else if (before && !Number.isNaN(before.getTime())) q.createdAt = { $lt: before };
  const limit = Math.min(Number(req.query.limit) || 50, 100);
  const sortAsc = Boolean(q.createdAt?.$gt);
  let msgs = await GroupMessage.find(q).sort({ createdAt: sortAsc ? 1 : -1 }).limit(limit).lean();
  if (!sortAsc) msgs = msgs.reverse();
  const names = await authorNames(msgs, ctx);
  res.json({
    success: true,
    data: {
      items: msgs.map((m) => present(m, req.user._id, names)),
      hasMore: !sortAsc && msgs.length === limit,
      lastReadAt: ctx.member.lastReadAt,
      serverTime: new Date(),
    },
  });
}));

router.post('/:departureId/messages', sendLimiter, asyncHandler(async (req, res) => {
  const ctx = await access(req.user, req.params.departureId);
  const body = String(req.body?.body || '').trim();
  const kind = req.body?.kind === 'announcement' ? 'announcement' : 'message';
  if (!body) throw badRequest('Write a message first');
  if (body.length > MAX_LEN) throw badRequest(`Messages can be up to ${MAX_LEN} characters`);
  if (kind === 'announcement' && ctx.role !== 'organiser') throw forbidden('Only the organiser can post announcements');
  const hit = SENSITIVE.find(([rx]) => rx.test(body));
  if (hit) throw badRequest(`For everyone's privacy, ${hit[1]} can't be shared in the group. Contact the organiser directly from your booking page.`);
  const msg = await GroupMessage.create({ group: ctx.group._id, departure: ctx.dep._id, author: req.user._id, authorRole: ctx.role, kind, body });
  await GroupMember.updateOne({ group: ctx.group._id, user: req.user._id }, { $set: { lastReadAt: msg.createdAt } });
  const names = await authorNames([msg], ctx);
  res.status(201).json({ success: true, data: present(msg, req.user._id, names) });
}));

router.post('/:departureId/read', asyncHandler(async (req, res) => {
  const ctx = await access(req.user, req.params.departureId);
  await GroupMember.updateOne({ _id: ctx.member._id }, { $set: { lastReadAt: new Date() } });
  res.json({ success: true, data: { unread: 0 } });
}));

router.post('/:departureId/mute', asyncHandler(async (req, res) => {
  const ctx = await access(req.user, req.params.departureId);
  const muted = req.body?.muted === true;
  await GroupMember.updateOne({ _id: ctx.member._id }, { $set: { muted } });
  res.json({ success: true, data: { muted } });
}));

router.post('/:departureId/leave', asyncHandler(async (req, res) => {
  const ctx = await access(req.user, req.params.departureId);
  if (ctx.role === 'organiser') throw forbidden('Organisers stay in their trip groups so travellers can reach them');
  await GroupMember.updateOne({ _id: ctx.member._id }, { $set: { leftAt: new Date() } });
  res.json({ success: true, data: { left: true } });
}));

router.post('/:departureId/join', asyncHandler(async (req, res) => {
  const ctx = await access(req.user, req.params.departureId, { allowLeft: true });
  await GroupMember.updateOne({ _id: ctx.member._id }, { $set: { leftAt: null } });
  res.json({ success: true, data: { joined: true } });
}));

router.post('/:departureId/messages/:messageId/report', reportLimiter, asyncHandler(async (req, res) => {
  const ctx = await access(req.user, req.params.departureId);
  if (!mongoose.isValidObjectId(req.params.messageId)) throw notFoundErr('Message not found');
  const msg = await GroupMessage.findOne({ _id: req.params.messageId, group: ctx.group._id }).lean();
  if (!msg) throw notFoundErr('Message not found');
  if (String(msg.author) === String(req.user._id)) throw badRequest('You can\'t report your own message');
  const reason = ['harassment', 'spam', 'safety', 'fraud', 'other'].includes(req.body?.reason) ? req.body.reason : null;
  if (!reason) throw badRequest('Choose a reason');
  const report = await Report.create({ reporter: req.user._id, targetType: 'message', targetId: msg._id, reason, details: String(req.body?.details || '').slice(0, 1000) });
  res.status(201).json({ success: true, data: { _id: report._id } });
}));

module.exports = router;
