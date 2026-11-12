import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { CalendarDays, Compass, ChevronRight } from 'lucide-react';
import api from '../lib/api';
import useAsync from '../lib/useAsync';
import { useAuth } from '../lib/auth';
import { Button, Tabs, StatusBadge, SafeImage, Spinner, EmptyState, ErrorState, Input, Badge } from '../components/ui';
import { money, dateRange, daysUntil } from '../lib/format';
import { NEXT_STEP } from '../design/BookingProgress';
import { getMyGroups } from '../lib/groups';
import { TripCard } from '../design/Cards';
import { GridSkeleton } from '../design/Feedback';
import { optionalPhoneError, PHONE_MAX_LENGTH } from '../lib/validation';

function Profile() {
  const { user, refresh } = useAuth();
  const [name, setName] = useState(user.name);
  const [phone, setPhone] = useState(user.phone || '');
  const [phoneError, setPhoneError] = useState();
  const [busy, setBusy] = useState(false);
  const save = async (e) => {
    e.preventDefault();
    if (name.trim().length < 2) return toast.error('Please enter your name');
    const badPhone = optionalPhoneError(phone);
    setPhoneError(badPhone);
    if (badPhone) return null;
    setBusy(true);
    try { await api.put('/auth/me', { name, phone }); await refresh(); toast.success('Profile updated'); } catch (err) { toast.error(err.message); } finally { setBusy(false); }
    return null;
  };
  return (
    <form onSubmit={save} className="rounded-3xl border border-line bg-white p-5 sm:p-6">
      <h2 className="text-lg font-extrabold">Traveller details</h2>
      <p className="text-sm text-subtle">Used to pre-fill your booking requests.</p>
      <div className="mt-4 space-y-4">
        <Input label="Full name" value={name} onChange={(e) => setName(e.target.value)} />
        <Input label="Email" value={user.email} disabled hint="Email can't be changed" />
        <Input label="Phone" type="tel" value={phone} error={phoneError} maxLength={PHONE_MAX_LENGTH} onChange={(e) => { setPhone(e.target.value); setPhoneError(undefined); }} hint="Optional. Leave blank to remove it." autoComplete="tel" />
      </div>
      <Button type="submit" className="mt-5" loading={busy}>Save</Button>
    </form>
  );
}

export default function MyTripsPage() {
  const { user } = useAuth();
  const { data, loading, error, reload } = useAsync(() => api.get('/bookings/mine'), []);
  const [tab, setTab] = useState('upcoming');
  const groups = useMemo(() => {
    const now = new Date();
    const list = data || [];
    return {
      upcoming: list.filter((b) => ['requested', 'confirmed'].includes(b.status) && new Date(b.departure?.endDate) >= now),
      past: list.filter((b) => b.status === 'confirmed' && new Date(b.departure?.endDate) < now),
      closed: list.filter((b) => ['rejected', 'cancelled'].includes(b.status)),
    };
  }, [data]);
  const items = groups[tab] || [];
  const saved = useAsync(() => api.get('/saved'), []);
  const chats = useAsync(getMyGroups, []);
  const unreadFor = (depId) => chats.data?.items.find((g) => String(g.departureId) === String(depId))?.unread || 0;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
      <p className="text-sm font-bold text-brand-ink">Hi {user.name.split(' ')[0]}</p>
      <h1 className="text-3xl font-extrabold sm:text-4xl">My trips</h1>
      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_340px]">
        <div className="min-w-0">
          <Tabs value={tab} onChange={setTab} className="w-fit max-w-full" tabs={[
            { value: 'upcoming', label: 'Upcoming', count: groups.upcoming.length },
            { value: 'past', label: 'Past trips', count: groups.past.length },
            { value: 'closed', label: 'Cancelled & declined', count: groups.closed.length },
            { value: 'saved', label: 'Saved', count: saved.data?.items.length ?? 0 },
          ]} />
          {tab === 'saved' ? (
            <div className="mt-5">
              {saved.loading ? <GridSkeleton count={2} label="Loading saved trips" /> : saved.error ? <ErrorState error={saved.error} onRetry={saved.reload} /> : saved.data.items.length === 0 ? (
                <EmptyState icon={Compass} title="No saved trips yet" action={<Button to="/trips">Browse trips</Button>}>Tap the heart on any trip to keep it here for later.</EmptyState>
              ) : (
                <>
                  <div className="grid gap-5 sm:grid-cols-2">{saved.data.items.map((t) => <TripCard key={t._id} trip={t} />)}</div>
                  {saved.data.unavailable > 0 && <p className="mt-3 text-sm text-subtle">{saved.data.unavailable} saved trip{saved.data.unavailable > 1 ? 's are' : ' is'} no longer listed by the organiser.</p>}
                </>
              )}
            </div>
          ) : (
          <div className="mt-5 space-y-3">
            {loading ? <Spinner /> : error ? <ErrorState error={error} onRetry={reload} /> : items.length === 0 ? (
              <EmptyState icon={Compass} title={tab === 'upcoming' ? 'No upcoming trips' : tab === 'past' ? 'No past trips yet' : 'Nothing here'} action={tab === 'upcoming' && <Button to="/trips">Find a trip</Button>}>
                {tab === 'upcoming' ? 'When you request a booking, it appears here with its status and trip updates.' : null}
              </EmptyState>
            ) : items.map((b) => {
              const days = daysUntil(b.departure.startDate);
              return (
                <Link key={b._id} to={`/bookings/${b._id}`} className="group flex overflow-hidden rounded-3xl border border-line bg-white transition hover:border-brand-soft hover:shadow-soft">
                  <SafeImage src={b.package?.coverImage} alt="" className="w-28 shrink-0 sm:w-44" sizes="180px" />
                  <div className="flex min-w-0 flex-1 items-center gap-3 p-4 sm:p-5">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2"><StatusBadge status={b.status} />{tab === 'upcoming' && days >= 0 && <Badge tone="brand">{days === 0 ? 'Today' : `in ${days} day${days > 1 ? 's' : ''}`}</Badge>}</div>
                      <h3 className="mt-1.5 truncate text-[17px] font-extrabold group-hover:text-brand-ink">{b.package?.title}</h3>
                      <p className="mt-0.5 flex items-center gap-1.5 text-sm font-semibold text-subtle"><CalendarDays className="size-4 shrink-0 text-brand" /><span className="truncate">{dateRange(b.departure.startDate, b.departure.endDate)}</span></p>
                      <p className="mt-0.5 text-[13px] text-subtle">{b.seats} traveller{b.seats > 1 ? 's' : ''} · <span className="num">{money(b.totalAmount, b.currency)}</span> · {b.reference}</p>
                      <p className="mt-1.5 text-[13px] font-semibold text-ink/80">{NEXT_STEP[b.status]}</p>
                      {b.status === 'confirmed' && unreadFor(b.departure._id) > 0 && <p className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-brand px-2.5 py-0.5 text-xs font-extrabold text-white">{unreadFor(b.departure._id)} new in trip group</p>}
                    </div>
                    <ChevronRight className="size-5 shrink-0 text-muted transition group-hover:translate-x-0.5" />
                  </div>
                </Link>
              );
            })}
          </div>
          )}
        </div>
        <aside><Profile /></aside>
      </div>
    </div>
  );
}
