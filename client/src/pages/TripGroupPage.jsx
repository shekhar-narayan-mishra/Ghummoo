/* Trip group: a private chat for one departure's organiser and confirmed travellers.
   Mobile-first; polls for new messages every few seconds while the tab is visible (no
   real-time transport in V0.1). Access is decided by the server on every request. */
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowLeft, Bell, BellOff, Flag, Info, Lock, LogOut, Megaphone, MoreHorizontal, Pin, SendHorizontal, Users } from 'lucide-react';
import api from '../lib/api';
import { useAuth } from '../lib/auth';
import usePageTitle from '../lib/usePageTitle';
import { dateRange } from '../lib/format';
import { Button, Spinner, cx } from '../components/ui';
import { Dialog, Drawer } from '../design/Dialog';
import { PreferenceSelector } from '../design/Inputs';

const POLL_MS = 6000;
const MAX = 1000;
const time = (d) => new Date(d).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
const dayLabel = (d) => {
  const x = new Date(d); const t = new Date();
  const y = new Date(t); y.setDate(t.getDate() - 1);
  if (x.toDateString() === t.toDateString()) return 'Today';
  if (x.toDateString() === y.toDateString()) return 'Yesterday';
  return x.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
};

function Locked({ error, back }) {
  return (
    <div className="mx-auto max-w-md px-4 py-20 text-center">
      <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-sand text-subtle"><Lock className="size-7" aria-hidden /></span>
      <h1 className="mt-4 text-xl font-extrabold">{error.status === 404 ? 'Trip group not found' : 'This trip group is private'}</h1>
      <p className="mt-2 text-[15px] text-subtle">{error.message}</p>
      <Button className="mt-6" variant="secondary" to={back}>Go back</Button>
    </div>
  );
}

function Message({ m, showAuthor, onReport }) {
  if (m.kind === 'announcement') {
    return (
      <li className="my-3 rounded-2xl bg-peach/60 p-4 ring-1 ring-[#f8cfb2]">
        <p className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-brand-ink"><Megaphone className="size-3.5" aria-hidden />Announcement · {m.author.name}</p>
        <p className={cx('mt-1.5 whitespace-pre-line text-[15px] [overflow-wrap:anywhere]', m.hidden && 'italic text-subtle')}>{m.body}</p>
        <p className="mt-1.5 text-[11px] text-subtle"><time dateTime={m.createdAt}>{time(m.createdAt)}</time></p>
      </li>
    );
  }
  return (
    <li className={cx('group flex flex-col', m.mine ? 'items-end' : 'items-start', showAuthor ? 'mt-3' : 'mt-1')}>
      {showAuthor && !m.mine && (
        <p className="mb-0.5 px-1 text-xs font-bold text-subtle">{m.author.name}{m.author.role === 'organiser' && <span className="ml-1 rounded-full bg-ink px-1.5 py-0.5 text-[10px] text-white">Organiser</span>}</p>
      )}
      <div className="flex max-w-[85%] items-end gap-1 sm:max-w-[70%]">
        {!m.mine && !m.hidden && (
          <button type="button" onClick={() => onReport(m)} className="order-last grid size-7 shrink-0 place-items-center rounded-full text-subtle opacity-60 hover:bg-sand hover:opacity-100 focus:opacity-100 sm:opacity-0 sm:group-hover:opacity-100" aria-label={`Report message from ${m.author.name}`}>
            <MoreHorizontal className="size-4" />
          </button>
        )}
        <div className={cx('rounded-2xl px-3.5 py-2 text-[15px] leading-snug [overflow-wrap:anywhere]', m.mine ? 'rounded-br-md bg-action text-white' : m.author.role === 'organiser' ? 'rounded-bl-md bg-ink text-white' : 'rounded-bl-md bg-white ring-1 ring-line', m.hidden && 'italic opacity-70', m.pending && 'opacity-60')}>
          <p className="whitespace-pre-line">{m.body}</p>
          <p className={cx('mt-0.5 text-right text-[10px]', m.mine || m.author.role === 'organiser' ? 'text-white/70' : 'text-subtle')}>
            <time dateTime={m.createdAt}>{m.pending ? 'Sending…' : time(m.createdAt)}</time>
          </p>
        </div>
      </div>
    </li>
  );
}

export default function TripGroupPage({ organiserView = false }) {
  const { departureId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const back = organiserView ? `/operator/departures/${departureId}` : '/me/trips';
  const [info, setInfo] = useState(null);
  const [error, setError] = useState(null);
  const [messages, setMessages] = useState([]);
  const [lastRead, setLastRead] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [text, setText] = useState('');
  const [asAnnouncement, setAsAnnouncement] = useState(false);
  const [sending, setSending] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const [reporting, setReporting] = useState(null);
  const [leaving, setLeaving] = useState(false);
  const listRef = useRef(null);
  const stick = useRef(true);
  const latest = useRef(null);
  usePageTitle(info ? `${info.trip.title} · Trip group` : 'Trip group');

  // Tell the navbar badge to refresh once messages are marked read.
  const markRead = useCallback(() => { api.post(`/groups/${departureId}/read`).then(() => window.dispatchEvent(new Event('ghumo:groups-read'))).catch(() => {}); }, [departureId]);

  // Initial load.
  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const [i, m] = await Promise.all([api.get(`/groups/${departureId}`), api.get(`/groups/${departureId}/messages`)]);
        if (!live) return;
        setInfo(i); setMessages(m.items); setHasMore(m.hasMore); setLastRead(m.lastReadAt);
        latest.current = m.items.at(-1)?.createdAt || m.serverTime;
        markRead();
      } catch (e) { if (live) setError(e); }
    })();
    return () => { live = false; };
  }, [departureId, markRead]);

  // Polling for new messages while visible. Access is re-checked by the server on each poll.
  useEffect(() => {
    if (!info) return undefined;
    const tick = async () => {
      if (document.visibilityState !== 'visible') return;
      try {
        const m = await api.get(`/groups/${departureId}/messages`, { params: { after: latest.current } });
        if (m.items.length) {
          latest.current = m.items.at(-1).createdAt;
          setMessages((cur) => [...cur.filter((x) => !x.pending && !m.items.some((n) => n._id === x._id)), ...m.items]);
          markRead();
        }
      } catch (e) { if (e.status === 403 || e.status === 404) setError(e); }
    };
    const id = setInterval(tick, POLL_MS);
    const onVis = () => document.visibilityState === 'visible' && tick();
    document.addEventListener('visibilitychange', onVis);
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', onVis); };
  }, [info, departureId, markRead]);

  // Keep the view at the bottom when new messages arrive, unless the user scrolled up.
  useLayoutEffect(() => {
    const el = listRef.current;
    if (el && stick.current) el.scrollTop = el.scrollHeight;
  }, [messages]);
  const onScroll = () => { const el = listRef.current; stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80; };

  const loadOlder = async () => {
    const first = messages[0];
    if (!first) return;
    const el = listRef.current;
    const prevHeight = el.scrollHeight;
    const m = await api.get(`/groups/${departureId}/messages`, { params: { before: first.createdAt } });
    stick.current = false;
    setMessages((cur) => [...m.items, ...cur]);
    setHasMore(m.hasMore);
    requestAnimationFrame(() => { el.scrollTop = el.scrollHeight - prevHeight; });
  };

  const send = async (e) => {
    e?.preventDefault();
    const body = text.trim();
    if (!body || sending) return;
    const temp = { _id: `tmp-${Date.now()}`, body, kind: asAnnouncement ? 'announcement' : 'message', mine: true, pending: true, createdAt: new Date().toISOString(), author: { name: 'You', role: info.me.role } };
    stick.current = true;
    setMessages((cur) => [...cur, temp]);
    setText('');
    setSending(true);
    try {
      const msg = await api.post(`/groups/${departureId}/messages`, { body, kind: asAnnouncement ? 'announcement' : undefined });
      latest.current = msg.createdAt;
      setMessages((cur) => cur.map((x) => (x._id === temp._id ? msg : x)));
      setAsAnnouncement(false);
    } catch (err) {
      setMessages((cur) => cur.filter((x) => x._id !== temp._id));
      setText(body);
      toast.error(err.message, { duration: 6000 });
      if (err.status === 403) setError(err);
    } finally { setSending(false); }
  };

  const toggleMute = async () => {
    const muted = !info.me.muted;
    await api.post(`/groups/${departureId}/mute`, { muted });
    setInfo((i) => ({ ...i, me: { ...i.me, muted } }));
    toast.success(muted ? 'Muted. This group won\'t add to your unread badge.' : 'Unmuted');
  };
  const leave = async () => {
    try { await api.post(`/groups/${departureId}/leave`); toast.success('You left the trip group'); navigate(back); } catch (e) { toast.error(e.message); }
  };

  if (error) return <Locked error={error} back={back} />;
  if (!info) return <Spinner className="py-32" label="Opening trip group" />;

  // Day separators and a "new messages" marker at the first unread message from someone else.
  let lastDay = null;
  let lastAuthor = null;
  let markerShown = false;
  const rows = [];
  for (const m of messages) {
    const d = dayLabel(m.createdAt);
    if (d !== lastDay) { rows.push(<li key={`d-${m._id}`} className="my-4 text-center"><span className="rounded-full bg-sand px-3 py-1 text-xs font-bold text-subtle">{d}</span></li>); lastDay = d; lastAuthor = null; }
    if (!markerShown && lastRead && !m.mine && !m.pending && new Date(m.createdAt) > new Date(lastRead)) {
      rows.push(<li key={`n-${m._id}`} className="my-3 flex items-center gap-2 text-xs font-extrabold text-brand-ink" aria-label="New messages"><span className="h-px flex-1 bg-brand/40" />New<span className="h-px flex-1 bg-brand/40" /></li>);
      markerShown = true;
    }
    const authorKey = `${m.mine}-${m.author.name}`;
    rows.push(<Message key={m._id} m={m} showAuthor={authorKey !== lastAuthor} onReport={setReporting} />);
    lastAuthor = m.kind === 'announcement' ? null : authorKey;
  }

  return (
    <div className={cx('mx-auto flex max-w-3xl flex-col', organiserView ? 'h-[calc(100dvh-8rem)] lg:h-[calc(100dvh-5rem)]' : 'h-[calc(100dvh-4rem)]')}>
      <header className="flex items-center gap-2 border-b border-line bg-ivory px-3 py-2.5 sm:px-4">
        <Link to={back} className="grid size-10 shrink-0 place-items-center rounded-full hover:bg-sand" aria-label="Back"><ArrowLeft className="size-5" /></Link>
        <button type="button" onClick={() => setDrawer(true)} className="min-w-0 flex-1 rounded-xl px-1 text-left hover:bg-sand/60">
          <h1 className="truncate text-[16px] font-extrabold leading-tight">{info.trip.title}</h1>
          <p className="truncate text-xs font-semibold text-subtle">{dateRange(info.departure.startDate, info.departure.endDate)} · {info.members.length} member{info.members.length === 1 ? '' : 's'}{info.me.muted ? ' · muted' : ''}</p>
        </button>
        <button type="button" onClick={toggleMute} className="grid size-10 shrink-0 place-items-center rounded-full hover:bg-sand" aria-label={info.me.muted ? 'Unmute group' : 'Mute group'} aria-pressed={info.me.muted}>
          {info.me.muted ? <BellOff className="size-5 text-subtle" /> : <Bell className="size-5" />}
        </button>
        <button type="button" onClick={() => setDrawer(true)} className="grid size-10 shrink-0 place-items-center rounded-full hover:bg-sand" aria-label="Group info"><Info className="size-5" /></button>
      </header>

      <div ref={listRef} onScroll={onScroll} className="flex-1 overflow-y-auto px-3 pb-4 sm:px-4" role="log" aria-live="polite" aria-label="Messages">
        {hasMore && <div className="pt-3 text-center"><Button size="sm" variant="ghost" onClick={loadOlder}>Load earlier messages</Button></div>}
        {messages.length === 0 ? (
          <div className="mx-auto mt-16 max-w-sm text-center">
            <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-peach text-brand-ink"><Users className="size-6" aria-hidden /></span>
            <p className="mt-3 font-extrabold">Say hello to your group</p>
            <p className="mt-1 text-sm text-subtle">{info.me.role === 'organiser' ? 'Post an announcement with pickup details, or welcome your travellers.' : 'Only the organiser and confirmed travellers on this departure can see these messages.'}</p>
          </div>
        ) : <ul>{rows}</ul>}
      </div>

      <form onSubmit={send} className="border-t border-line bg-white px-3 py-2.5 sm:px-4" style={{ paddingBottom: 'max(10px, env(safe-area-inset-bottom))' }}>
        {info.me.role === 'organiser' && (
          <label className="mb-2 inline-flex cursor-pointer items-center gap-2 text-xs font-bold text-subtle">
            <input type="checkbox" checked={asAnnouncement} onChange={(e) => setAsAnnouncement(e.target.checked)} className="size-4 accent-[#F26A2E]" />
            <Megaphone className="size-3.5" aria-hidden />Post as announcement
          </label>
        )}
        <div className="flex items-end gap-2">
          <label htmlFor="group-msg" className="sr-only">Message</label>
          <textarea id="group-msg" value={text} onChange={(e) => setText(e.target.value)} rows={1} maxLength={MAX}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder={asAnnouncement ? 'Announcement to everyone…' : 'Message the group…'}
            className="max-h-32 min-h-11 flex-1 resize-none rounded-2xl border border-line bg-ivory/60 px-3.5 py-2.5 text-[15px] focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand/10" />
          <button type="submit" disabled={!text.trim() || sending} className="grid size-11 shrink-0 place-items-center rounded-full bg-action text-white transition hover:bg-action-hover disabled:opacity-40" aria-label="Send">
            <SendHorizontal className="size-5" />
          </button>
        </div>
        <p className="mt-1 flex justify-between gap-2 text-[11px] text-subtle">
          <span>Phone numbers and payment details can't be posted here.</span>
          {text.length > MAX * 0.8 && <span className="num shrink-0">{text.length}/{MAX}</span>}
        </p>
      </form>

      <Drawer open={drawer} onClose={() => setDrawer(false)} title="Group info">
        <div className="space-y-6">
          <section>
            <p className="text-xs font-extrabold uppercase tracking-wider text-subtle">Trip</p>
            <p className="mt-1 text-lg font-extrabold">{info.trip.title}</p>
            <p className="text-sm text-subtle">{info.trip.destination} · {dateRange(info.departure.startDate, info.departure.endDate)}</p>
            {(info.departure.pickupPoint || info.departure.reportingTime) && <p className="mt-1 text-sm">Pickup: {[info.departure.pickupPoint, info.departure.reportingTime].filter(Boolean).join(', ')}</p>}
            <p className="mt-1 text-sm">Organised by <Link to={`/organisers/${info.organiser.slug}`} className="font-bold text-brand-ink hover:underline">{info.organiser.name}</Link></p>
          </section>
          {info.pinned.length > 0 && (
            <section>
              <p className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-subtle"><Pin className="size-3.5" aria-hidden />Pinned trip updates</p>
              <ul className="mt-2 space-y-2">{info.pinned.map((p) => <li key={p._id} className="rounded-xl bg-sand p-3 text-sm"><p className="font-bold">{p.title}</p><p className="mt-0.5 whitespace-pre-line text-subtle">{p.body}</p></li>)}</ul>
            </section>
          )}
          <section>
            <p className="text-xs font-extrabold uppercase tracking-wider text-subtle">Members ({info.members.length})</p>
            <ul className="mt-2 space-y-1">
              {info.members.map((m) => (
                <li key={m._id} className="flex items-center gap-2 rounded-xl px-2 py-1.5">
                  <span className={cx('grid size-8 place-items-center rounded-full text-sm font-extrabold', m.role === 'organiser' ? 'bg-ink text-white' : 'bg-peach text-brand-ink')}>{m.name[0]}</span>
                  <span className="font-semibold">{m.name}</span>
                  {m.role === 'organiser' && <span className="text-xs font-bold text-subtle">Organiser</span>}
                  {String(m._id) === String(user?._id) && <span className="text-xs text-subtle">(you)</span>}
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-subtle">Only first names and initials are shown. Contact details stay private.</p>
          </section>
          <section className="space-y-2 border-t border-line pt-4">
            <Button variant="secondary" className="w-full" onClick={toggleMute}>{info.me.muted ? <><Bell className="size-4" />Unmute</> : <><BellOff className="size-4" />Mute this group</>}</Button>
            <p className="text-xs text-subtle">Muting stops this group from adding to your unread badge. Messages still arrive here.</p>
            {info.me.canLeave && <Button variant="danger" className="w-full" onClick={() => setLeaving(true)}><LogOut className="size-4" />Leave group</Button>}
          </section>
        </div>
      </Drawer>

      <ReportDialog departureId={departureId} message={reporting} onClose={() => setReporting(null)} />
      <Dialog open={leaving} onClose={() => setLeaving(false)} title="Leave this trip group?" size="sm"
        footer={<><Button variant="ghost" onClick={() => setLeaving(false)}>Stay</Button><Button variant="danger" onClick={leave}>Leave group</Button></>}>
        <p className="text-[15px]">You'll stop seeing messages. Your booking isn't affected, and you can rejoin from your booking page while it's confirmed.</p>
      </Dialog>
    </div>
  );
}

function ReportDialog({ departureId, message, onClose }) {
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (!reason) { toast.error('Choose a reason'); return; }
    setBusy(true);
    try {
      await api.post(`/groups/${departureId}/messages/${message._id}/report`, { reason, details });
      toast.success('Thanks. Our team will review this message.');
      setReason(''); setDetails(''); onClose();
    } catch (e) { toast.error(e.message); } finally { setBusy(false); }
  };
  return (
    <Dialog open={Boolean(message)} onClose={onClose} title="Report message" description="Reports go to the Ghumo team, not to the group."
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button onClick={submit} loading={busy}><Flag className="size-4" />Send report</Button></>}>
      {message && <p className="mb-4 rounded-xl bg-sand p-3 text-sm italic">“{message.body}”</p>}
      <PreferenceSelector legend="What's wrong?" options={[['harassment', 'Harassment'], ['spam', 'Spam'], ['safety', 'Safety concern'], ['fraud', 'Scam or fraud'], ['other', 'Something else']].map(([value, label]) => ({ value, label }))} value={reason} onChange={setReason} />
      <label htmlFor="report-details" className="mt-4 block text-sm font-bold">Details (optional)</label>
      <textarea id="report-details" value={details} onChange={(e) => setDetails(e.target.value)} rows={3} maxLength={1000} className="mt-1.5 w-full rounded-xl border border-line p-3 text-[15px] focus:border-brand focus:outline-none" />
    </Dialog>
  );
}
