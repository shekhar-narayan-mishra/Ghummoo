import { Link, useOutletContext } from 'react-router-dom';
import { Package, CalendarDays, Clock, Plus, Sparkles, ArrowRight, Wallet, Users, FileText, ShieldCheck, CheckCircle2, Circle } from 'lucide-react';
import api from '../../lib/api';
import useAsync from '../../lib/useAsync';
import { money, shortDate, dateRange, dateTime } from '../../lib/format';
import { Button, Card, Stat, Spinner, ErrorState, PageHeader, StatusBadge } from '../../components/ui';

const ACTIVITY = {
  booking_requested: (e) => `New booking request ${e.reference} for ${e.seats} seat${e.seats > 1 ? 's' : ''}`,
  booking_confirmed: (e) => `You confirmed ${e.reference}`,
  booking_rejected: (e) => `You declined ${e.reference}`,
  booking_cancelled: (e) => `${e.reference} was cancelled and its seats released`,
  payment_recorded: (e) => `${money(e.amount, e.currency)} recorded for ${e.reference} (${String(e.method).replace('_', ' ')})`,
  announcement_posted: (e) => `Trip update posted: “${e.title}”`,
};
const activityLink = (e) => (e.kind === 'announcement_posted' ? `/operator/departures/${e.departureId}` : e.bookingId ? `/operator/bookings?focus=${e.bookingId}` : null);

/* First-run checklist with real states; hidden once the first trip is live and booking. */
function GettingStarted({ operator, verification, s }) {
  const items = [
    { done: true, label: 'Create your organiser profile' },
    { done: operator.status === 'approved', label: operator.status === 'approved' ? 'Profile approved' : operator.status === 'rejected' ? 'Profile needs changes before approval' : 'Profile approval (our team is reviewing it)', to: operator.status === 'rejected' ? '/operator/profile' : null },
    { done: s.publishedTrips + s.draftTrips > 0, label: 'Create your first trip', to: '/operator/studio', cta: 'Start' },
    { done: s.upcomingDepartures > 0, label: 'Add departure dates and seats', to: '/operator/packages', cta: 'Add dates' },
    { done: s.publishedTrips > 0, label: 'Publish a trip', to: '/operator/packages', cta: 'Open packages' },
  ];
  const done = items.filter((i) => i.done).length;
  if (done === items.length) return null;
  return (
    <Card className="p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-extrabold">Get your first trip live</h2>
        <p className="text-sm font-bold text-subtle">{done} of {items.length} done</p>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-sand" role="progressbar" aria-valuemin={0} aria-valuemax={items.length} aria-valuenow={done} aria-label="Setup progress">
        <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${(done / items.length) * 100}%` }} />
      </div>
      <ul className="mt-4 space-y-2">
        {items.map((i) => (
          <li key={i.label} className="flex items-center gap-3 text-[15px]">
            {i.done ? <CheckCircle2 className="size-5 shrink-0 text-success" aria-hidden /> : <Circle className="size-5 shrink-0 text-line" aria-hidden />}
            <span className={i.done ? 'text-subtle line-through' : 'font-semibold'}>{i.label}</span>
            {!i.done && i.to && <Link to={i.to} className="ml-auto shrink-0 text-sm font-bold text-brand-ink hover:underline">{i.cta || 'Open'}</Link>}
          </li>
        ))}
      </ul>
      <p className="mt-4 flex items-center gap-2 border-t border-line pt-3 text-[13px] text-subtle">
        <ShieldCheck className="size-4 shrink-0" aria-hidden />
        Verification: {operator.verifiedAt && operator.status === 'approved' ? 'Verified organiser badge is showing.' : operator.verifiedAt ? 'documents checked; the badge shows once your profile is approved.' : verification ? `details ${verification.status === 'submitted' ? 'submitted, waiting for review' : verification.status}.` : <>not submitted. <Link to="/operator/profile" className="font-bold text-brand-ink underline">Add registration details</Link> (optional).</>}
      </p>
    </Card>
  );
}

export default function OverviewPage() {
  const { operator, verification } = useOutletContext();
  const { data: s, error, loading, reload } = useAsync(() => api.get('/operator/stats'), []);
  if (loading && !s) return <Spinner />;
  if (error) return <ErrorState error={error} onRetry={reload} />;

  const payments = s.recordedPayments;
  return (
    <div className="space-y-8">
      <PageHeader eyebrow={operator.businessName} title="Overview" actions={<>
        <Button variant="secondary" size="sm" to="/operator/studio"><Sparkles className="size-4" />Paste a description</Button>
        <Button size="sm" to="/operator/packages/new"><Plus className="size-4" />New package</Button>
      </>} />

      <GettingStarted operator={operator} verification={verification} s={s} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 lg:gap-4">
        <Stat label="Published packages" value={s.publishedTrips} icon={Package} />
        <Stat label="Draft packages" value={s.draftTrips} hint={s.archivedTrips ? `${s.archivedTrips} archived` : undefined} icon={FileText} />
        <Stat label="Upcoming departures" value={s.upcomingDepartures} icon={CalendarDays} />
        <Stat label="Pending booking requests" value={s.pendingRequests} hint={s.pendingRequests ? 'Waiting for you to confirm or decline' : 'All caught up'} icon={Clock} tone={s.pendingRequests ? 'warning' : undefined} />
        <Stat label="Confirmed travellers" value={s.confirmedTravellersUpcoming} hint="On upcoming departures" icon={Users} />
        <Stat label="Offline payments recorded" value={payments.length ? payments.map((p) => money(p.total, p.currency)).join(' + ') : '₹0'} hint={payments.length ? `${payments.reduce((n, p) => n + p.count, 0)} record(s) you entered` : 'Record payments you receive on confirmed bookings'} icon={Wallet} />
      </div>
      <p className="-mt-4 text-xs text-subtle">Ghumo doesn't process payments. These are amounts you've recorded as received.</p>

      <Card className="p-5">
        <h2 className="text-lg font-extrabold">Recent activity</h2>
        {s.recentActivity.length === 0 ? <p className="mt-3 text-[14px] text-subtle">Nothing yet. Booking requests, confirmations, payments you record and trip updates will show up here.</p> : (
          <ul className="mt-3 divide-y divide-line">
            {s.recentActivity.map((e, i) => {
              const to = activityLink(e);
              const body = (
                <span className="flex items-start gap-3 py-3">
                  <span className="min-w-0 flex-1"><span className="block font-semibold">{ACTIVITY[e.kind]?.(e) || e.kind}</span>{e.trip && <span className="block truncate text-[13px] text-subtle">{e.trip}</span>}</span>
                  <span className="shrink-0 text-xs text-subtle">{dateTime(e.at)}</span>
                </span>
              );
              return <li key={`${e.kind}-${e.at}-${i}`}>{to ? <Link to={to} className="block hover:bg-ivory/60">{body}</Link> : body}</li>;
            })}
          </ul>
        )}
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="p-5">
          <div className="flex items-center justify-between"><h2 className="text-lg font-extrabold">Recent bookings</h2><Link to="/operator/bookings" className="text-sm font-bold text-brand-ink hover:underline">View all</Link></div>
          {s.recentBookings.length === 0 ? <p className="mt-4 text-[14px] text-subtle">No booking requests yet. They'll appear here as soon as a traveller books.</p> : (
            <ul className="mt-3 divide-y divide-line">
              {s.recentBookings.map((b) => (
                <li key={b._id}>
                  <Link to={`/operator/bookings?focus=${b._id}`} className="flex items-center gap-3 py-3 hover:bg-ivory/60">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-bold">{b.contact?.name} <span className="font-medium text-subtle">· {b.seats} seat{b.seats > 1 ? 's' : ''}</span></p>
                      <p className="truncate text-[13px] text-subtle">{b.package?.title} · {b.departure ? shortDate(b.departure.startDate) : ''} · {dateTime(b.createdAt)}</p>
                    </div>
                    <StatusBadge status={b.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card className="p-5">
          <div className="flex items-center justify-between"><h2 className="text-lg font-extrabold">Next departures</h2><Link to="/operator/packages" className="text-sm font-bold text-brand-ink hover:underline">Packages</Link></div>
          {s.nextDepartures.length === 0 ? <p className="mt-4 text-[14px] text-subtle">No upcoming departures. Add departures to your packages so travellers can book.</p> : (
            <ul className="mt-3 divide-y divide-line">
              {s.nextDepartures.map((d) => {
                const booked = d.totalCapacity - d.seatsAvailable;
                return (
                  <li key={d._id}>
                    <Link to={`/operator/departures/${d._id}`} className="flex items-center gap-3 py-3 hover:bg-ivory/60">
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-bold">{d.package?.title}</p>
                        <p className="text-[13px] text-subtle">{dateRange(d.startDate, d.endDate)}</p>
                      </div>
                      <div className="text-right">
                        <p className="num text-sm font-extrabold">{booked}/{d.totalCapacity}</p>
                        <p className="text-[11px] font-semibold text-subtle">seats held</p>
                      </div>
                      <ArrowRight className="size-4 text-subtle" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
