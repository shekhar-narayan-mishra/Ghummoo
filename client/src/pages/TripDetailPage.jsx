import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  MapPin, Clock, Users, BusFront, BedDouble, Utensils, Check, X, ChevronDown, BadgeCheck, Phone, Mail, AtSign, Globe,
  CalendarDays, Minus, Plus, Flag, ShieldAlert, Star, Images, ChevronLeft, ChevronRight, Navigation, Info,
} from 'lucide-react';
import api from '../lib/api';
import useAsync from '../lib/useAsync';
import { useAuth } from '../lib/auth';
import { Button, Badge, SafeImage, Spinner, EmptyState, Notice, Modal, Select, Textarea, cx } from '../components/ui';
import { TripCard, SaveToggle } from '../design/Cards';
import { CompareToggle } from '../design/Compare';
import { AvailabilityBadge } from '../design/Booking';
import { AIInput } from '../design/Inputs';
import { DemoBadge } from '../design/Feedback';
import { askTripQuestion } from '../lib/discover';
import { money, dateRange, durationLong, date, weekdayDate, CATEGORY_LABELS } from '../lib/format';

function Section({ id, title, children, className }) {
  return (
    <section id={id} className={cx('scroll-mt-28 border-t border-line pt-8', className)}>
      <h2 className="mb-4 text-xl font-extrabold sm:text-2xl">{title}</h2>
      {children}
    </section>
  );
}

function Gallery({ images, title }) {
  const [open, setOpen] = useState(null);
  const list = images.length ? images : [null];
  return (
    <>
      <div className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-2 overflow-x-auto px-4 sm:hidden">
        {list.map((src, i) => (
          <button key={i} type="button" onClick={() => setOpen(i)} className="relative aspect-[4/3] w-[88%] shrink-0 snap-center overflow-hidden rounded-3xl">
            <SafeImage src={src} alt={`${title} photo ${i + 1}`} eager={i === 0} className="size-full" sizes="90vw" />
            <span className="glass absolute bottom-3 right-3 rounded-full px-2.5 py-1 text-xs font-bold">{i + 1}/{list.length}</span>
          </button>
        ))}
      </div>
      <div className="relative hidden h-[460px] grid-cols-4 grid-rows-2 gap-2 overflow-hidden rounded-[28px] sm:grid lg:h-[520px]">
        {list.slice(0, 5).map((src, i) => (
          <button key={i} type="button" onClick={() => setOpen(i)} className={cx('group relative overflow-hidden', i === 0 ? 'col-span-2 row-span-2' : list.length < 5 && i === list.slice(0, 5).length - 1 ? 'col-span-2 row-span-1' : '', list.length === 1 && 'col-span-4')}>
            <SafeImage src={src} alt={`${title} photo ${i + 1}`} eager={i === 0} sizes={i === 0 ? '50vw' : '25vw'} className="size-full transition duration-700 group-hover:scale-[1.03]" />
          </button>
        ))}
        {list.length > 1 && (
          <button type="button" onClick={() => setOpen(0)} className="glass absolute bottom-4 right-4 flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold"><Images className="size-4" />View all {list.length} photos</button>
        )}
      </div>
      {open != null && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-ink/95 p-4" role="dialog" aria-modal="true" aria-label="Photo viewer" onKeyDown={(e) => { if (e.key === 'Escape') setOpen(null); }}>
          <button type="button" className="absolute right-4 top-4 grid size-11 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20" onClick={() => setOpen(null)} aria-label="Close" autoFocus><X className="size-6" /></button>
          <button type="button" className="absolute left-3 grid size-11 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20" onClick={() => setOpen((open - 1 + list.length) % list.length)} aria-label="Previous photo"><ChevronLeft className="size-6" /></button>
          <SafeImage src={list[open]} alt={`${title} photo ${open + 1}`} eager widths={[800, 1200, 1600, 2000]} sizes="90vw" className="max-h-[85vh] w-auto max-w-full rounded-2xl object-contain" />
          <button type="button" className="absolute right-3 grid size-11 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20" onClick={() => setOpen((open + 1) % list.length)} aria-label="Next photo"><ChevronRight className="size-6" /></button>
          <p className="absolute bottom-5 text-sm font-bold text-white/70">{open + 1} / {list.length}</p>
        </div>
      )}
    </>
  );
}

function BookingPanel({ trip, departureId, setDepartureId, seats, setSeats, onBook }) {
  const dep = trip.departures.find((d) => d._id === departureId);
  const maxSeats = dep ? Math.min(10, dep.seatsAvailable) : 1;
  useEffect(() => { if (seats > maxSeats) setSeats(Math.max(1, maxSeats)); }, [maxSeats, seats, setSeats]);
  const bookable = trip.departures.filter((d) => d.isBookable);

  return (
    <div className="rounded-3xl border border-line bg-white p-5 shadow-soft sm:p-6">
      <p className="text-[12px] font-bold uppercase tracking-wider text-subtle">{dep ? 'Price for this departure' : 'From'}</p>
      <p className="num text-3xl font-extrabold">{money(dep ? dep.price : trip.priceFrom, trip.currency)}<span className="text-base font-semibold text-subtle"> /person</span></p>

      {trip.departures.length === 0 ? (
        <Notice className="mt-5" title="No upcoming departures">The organiser hasn't scheduled new dates yet. Check back soon or contact them directly.</Notice>
      ) : (
        <>
          <p className="mb-2 mt-5 text-sm font-bold">Choose a departure</p>
          <div className="max-h-[300px] space-y-2 overflow-y-auto pr-1" role="radiogroup" aria-label="Departures">
            {trip.departures.map((d) => {
              const active = d._id === departureId;
              const low = d.seatsAvailable > 0 && d.seatsAvailable <= 5;
              return (
                <button key={d._id} type="button" role="radio" aria-checked={active} disabled={!d.isBookable} onClick={() => setDepartureId(d._id)}
                  className={cx('flex w-full items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left transition',
                    active ? 'border-brand bg-peach/40 ring-2 ring-brand/20' : 'border-line hover:border-brand-soft', !d.isBookable && 'cursor-not-allowed opacity-55 hover:border-line')}>
                  <span className="min-w-0">
                    <span className="block text-[15px] font-bold">{dateRange(d.startDate, d.endDate)}</span>
                    <span className={cx('block text-[13px] font-semibold', !d.isBookable ? 'text-subtle' : low ? 'text-warning' : 'text-subtle')}>
                      {d.availability === 'available' ? `${d.seatsAvailable} of ${d.totalCapacity} seats left` : { sold_out: 'Sold out', booking_closed: 'Booking deadline passed', closed: 'Not taking bookings', cancelled: 'Cancelled', departed: 'Departed' }[d.availability] || 'Not bookable'}
                    </span>
                  </span>
                  <span className="num shrink-0 text-[15px] font-extrabold">{money(d.price, trip.currency)}</span>
                </button>
              );
            })}
          </div>

          {dep && (
            <>
              <div className="mt-5 flex items-center justify-between">
                <div><p className="text-sm font-bold">Travellers</p><p className="text-[13px] text-subtle">Max {maxSeats} per booking</p></div>
                <div className="flex items-center gap-1 rounded-full border border-line p-1">
                  <button type="button" onClick={() => setSeats(Math.max(1, seats - 1))} disabled={seats <= 1} className="grid size-9 place-items-center rounded-full hover:bg-sand disabled:opacity-40" aria-label="Fewer travellers"><Minus className="size-4" /></button>
                  <span className="num w-8 text-center text-lg font-extrabold" aria-live="polite">{seats}</span>
                  <button type="button" onClick={() => setSeats(Math.min(maxSeats, seats + 1))} disabled={seats >= maxSeats} className="grid size-9 place-items-center rounded-full hover:bg-sand disabled:opacity-40" aria-label="More travellers"><Plus className="size-4" /></button>
                </div>
              </div>
              <div className="mt-5 flex items-end justify-between border-t border-line pt-4">
                <span className="text-sm font-semibold text-subtle">{money(dep.price, trip.currency)} × {seats}</span>
                <span className="num text-2xl font-extrabold">{money(dep.price * seats, trip.currency)}</span>
              </div>
              {dep.bookingDeadline && <p className="mt-1 text-[13px] text-subtle">Book by {date(dep.bookingDeadline)}</p>}
            </>
          )}
          <Button className="mt-5 w-full" size="lg" disabled={!dep || !dep.isBookable || trip.preview} onClick={onBook}>
            {trip.preview ? 'Preview only' : dep ? 'Request to book' : bookable.length ? 'Select a departure' : 'No seats available'}
          </Button>
          <p className="mt-3 text-center text-[13px] leading-relaxed text-subtle">No payment is taken now. {trip.operator.businessName} reviews and confirms your request.</p>
        </>
      )}
    </div>
  );
}

/* "Ask this trip": answered on the server from this listing only (AI when configured, keyword
   matching otherwise). Answers cite the listing section they came from; anything the listing
   doesn't cover gets "This detail hasn't been confirmed by the organiser." */
function AskThisTrip({ trip }) {
  const [qa, setQa] = useState([]);
  const [busy, setBusy] = useState(false);
  const ask = async (q) => {
    setBusy(true);
    try {
      const r = await askTripQuestion(trip.slug, q);
      setQa((cur) => [{ q, ...r }, ...cur].slice(0, 5));
    } catch (e) {
      setQa((cur) => [{ q, error: e.status === 429 ? 'You\'ve asked a lot of questions in a short time. Please wait a minute and try again.' : e.message }, ...cur].slice(0, 5));
    } finally { setBusy(false); }
  };
  return (
    <section id="ask" aria-labelledby="ask-h" className="mt-10 scroll-mt-28 rounded-[28px] bg-gradient-to-br from-peach/70 to-white p-5 ring-1 ring-line sm:p-6">
      <h2 id="ask-h" className="text-xl font-extrabold sm:text-2xl">Ask this trip</h2>
      <p className="mt-1 text-sm text-subtle">Answers come only from this listing and the organiser's details. If the organiser hasn't said, we'll tell you.</p>
      <AIInput className="mt-4" label="Your question" placeholder="Is food included? Where is pickup?" onSubmit={ask} busy={busy}
        suggestions={['Which meals are included?', 'Where is the pickup point?', 'What is the cancellation policy?', 'What is not included?']}
        note="We never guess safety, availability, meals, transport, stays or refunds." buttonLabel="Ask" />
      <div aria-live="polite" className="mt-4 space-y-3">
        {busy && <div className="h-16 animate-pulse rounded-2xl bg-white/70 motion-reduce:animate-none" aria-hidden />}
        {qa.map((r, i) => (
          <div key={`${r.q}-${i}`} className="rounded-2xl bg-white p-4 ring-1 ring-line">
            <p className="text-sm font-extrabold">{r.q}</p>
            {r.error ? <p className="mt-1.5 text-[15px] text-danger">{r.error}</p> : (
              <>
                <p className={cx('mt-1.5 text-[15px]', r.answered ? 'text-ink' : 'italic text-subtle')}>{r.answer}</p>
                {r.sources?.length > 0 && (
                  <p className="mt-2 flex flex-wrap items-center gap-1.5 text-xs font-bold text-subtle">From the listing:
                    {r.sources.map((s) => <a key={s.key} href={`#${s.anchor}`} className="rounded-full bg-peach px-2 py-0.5 text-brand-ink hover:underline">{s.label}</a>)}
                  </p>
                )}
                {!r.answered && <a href="#organiser" className="mt-2 inline-block text-xs font-bold text-brand-ink underline">Ask the organiser directly</a>}
                {r.notice && <p className="mt-2 text-xs text-subtle">{r.notice}</p>}
                {r.mode === 'basic' && !r.notice && <p className="mt-2 text-xs text-subtle">Matched to the listing without AI.</p>}
              </>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

function ReportButton({ trip }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('misleading');
  const [details, setDetails] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    setBusy(true);
    try {
      await api.post('/reports', { targetType: 'package', targetId: trip._id, reason, details });
      toast.success('Thanks. Our team will review this listing.');
      setOpen(false); setDetails('');
    } catch (e) { toast.error(e.message); } finally { setBusy(false); }
  };
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="inline-flex items-center gap-1.5 text-sm font-semibold text-subtle hover:text-danger"><Flag className="size-4" />Report this listing</button>
      <Modal open={open} onClose={() => setOpen(false)} title="Report this listing" footer={user ? <><Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={submit} loading={busy}>Submit report</Button></> : null}>
        {user ? (
          <div className="space-y-4">
            <Select label="What's wrong?" value={reason} onChange={(e) => setReason(e.target.value)}>
              <option value="misleading">Misleading information</option><option value="pricing">Pricing doesn't match</option>
              <option value="safety">Safety concern</option><option value="fraud">Possible fraud</option><option value="other">Something else</option>
            </Select>
            <Textarea label="Details" value={details} onChange={(e) => setDetails(e.target.value)} placeholder="Tell us what you noticed" />
          </div>
        ) : <p className="text-[15px] text-subtle">Please <Link to="/login" className="font-bold text-brand-ink underline">log in</Link> to report a listing.</p>}
      </Modal>
    </>
  );
}

function TripDetailView({ trip }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [departureId, setDepartureId] = useState(() => trip.departures.find((d) => d.isBookable)?._id || null);
  const [seats, setSeats] = useState(1);
  const [openDays, setOpenDays] = useState({ 0: true });
  const [sheet, setSheet] = useState(false);

  useEffect(() => {
    document.title = `${trip.title} · Ghumo AI`;
    return () => { document.title = 'Ghumo AI: Group trips, minus the chaos'; };
  }, [trip.title]);
  // Lift the compare tray above the mobile booking bar on this page.
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--ghumo-bottom-bar', window.matchMedia('(max-width: 1023.98px)').matches ? '76px' : '0px');
    return () => root.style.removeProperty('--ghumo-bottom-bar');
  }, []);

  const images = useMemo(() => [...new Set([trip.coverImage, ...(trip.images || [])].filter(Boolean))], [trip]);

  const onBook = () => {
    const target = `/trips/${trip.slug}/book?departure=${departureId}&seats=${seats}`;
    if (!user) return navigate(`/login?next=${encodeURIComponent(target)}`);
    if (user.role !== 'traveler') return toast.error('Log in with a traveller account to book trips');
    return navigate(target);
  };

  const op = trip.operator;
  const facts = [
    [Clock, 'Duration', durationLong(trip.durationDays, trip.durationNights)],
    [Navigation, 'Starts from', trip.startLocation || 'Not specified'],
    [Users, 'Group size', trip.groupSize || 'Not specified'],
    [BusFront, 'Transport', trip.transport ? trip.transport.split('.')[0] : 'Not specified'],
  ];

  return (
    <div className="pb-28 lg:pb-0">
      {trip.preview && (
        <div className="bg-warning-bg"><div className="mx-auto flex max-w-7xl items-center gap-2 px-4 py-2.5 text-sm font-semibold text-[#6b4a0c] sm:px-6 lg:px-8"><Info className="size-4" />Preview: this trip is {trip.status} and not visible to travellers.</div></div>
      )}
      <div className="mx-auto max-w-7xl px-4 pt-5 sm:px-6 lg:px-8 lg:pt-8">
        <nav className="mb-4 text-sm font-semibold text-subtle" aria-label="Breadcrumb">
          <Link to="/trips" className="hover:text-ink">Trips</Link><span className="mx-2">/</span>
          {trip.region && <><Link to={`/trips?destination=${encodeURIComponent(trip.region)}`} className="hover:text-ink">{trip.region}</Link><span className="mx-2">/</span></>}
          <span className="text-ink">{trip.title}</span>
        </nav>
        <Gallery images={images} title={trip.title} />

        <div className="mt-8 lg:grid lg:grid-cols-[1fr_380px] lg:gap-12">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              {trip.categories?.length > 0 && <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-brand-ink">{trip.categories.map((c) => CATEGORY_LABELS[c] || c).join(' · ')}</p>}
              {trip.isDemo && <DemoBadge />}
            </div>
            <h1 className="mt-3 text-[32px] font-extrabold leading-[1.08] sm:text-[44px]">{trip.title}</h1>
            <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[15px] font-semibold text-subtle">
              <span className="flex items-center gap-1.5"><MapPin className="size-4 text-brand" />{trip.destination}{trip.region && trip.region !== trip.destination ? `, ${trip.region}` : ''}{trip.country !== 'India' ? `, ${trip.country}` : ''}</span>
              <span className="flex items-center gap-1.5"><Clock className="size-4 text-brand" />{durationLong(trip.durationDays, trip.durationNights)}</span>
              {trip.reviews.count > 0 && <span className="flex items-center gap-1"><Star className="size-4 fill-brand text-brand" />{trip.reviews.average} ({trip.reviews.count})</span>}
            </p>

            {(trip.places?.destinations?.length > 0 || trip.places?.departureCities?.length > 0) && (
              <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[14px] font-bold" aria-label="Places on this trip">
                {trip.places.destinations.map((p) => <Link key={p.slug} to={`/places/${p.slug}`} className="inline-flex min-h-8 items-center gap-1 underline decoration-line decoration-2 underline-offset-4 hover:text-brand-ink hover:decoration-brand">Guide: {p.name}</Link>)}
                {trip.places.departureCities.map((p) => <Link key={`from-${p.slug}`} to={`/places/${p.slug}`} className="inline-flex min-h-8 items-center underline decoration-line decoration-2 underline-offset-4 hover:text-brand-ink hover:decoration-brand">Leaves from {p.name}</Link>)}
              </p>
            )}
            {!trip.preview && (
              <div className="mt-4 flex flex-wrap gap-2">
                <SaveToggle trip={trip} />
                <CompareToggle trip={trip} />
                <a href="#ask" className="inline-flex h-9 items-center rounded-full bg-white px-3 text-xs font-extrabold ring-1 ring-line hover:ring-brand-soft">Ask this trip</a>
              </div>
            )}

            <Link to={`/organisers/${op.slug}`} className="mt-6 flex items-center gap-3 rounded-2xl border border-line bg-white p-3 pr-4 transition hover:border-brand-soft sm:inline-flex">
              {op.logoUrl ? <SafeImage src={op.logoUrl} alt="" className="size-11 rounded-xl" /> : <div className="grid size-11 place-items-center rounded-xl bg-peach text-lg font-extrabold text-brand-ink">{op.businessName[0]}</div>}
              <div className="min-w-0">
                <p className="text-[12px] font-bold uppercase tracking-wider text-subtle">Organised by</p>
                <p className="flex items-center gap-1.5 font-extrabold">{op.businessName}{op.verified ? <Badge tone="success" icon={BadgeCheck}>Verified</Badge> : <span className="text-[12px] font-semibold text-subtle">· Not yet verified</span>}</p>
              </div>
            </Link>

            <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {facts.map(([Icon, label, value]) => (
                <div key={label} className="rounded-2xl bg-sand p-4">
                  <Icon className="size-5 text-brand" aria-hidden />
                  <p className="mt-2 text-[12px] font-bold uppercase tracking-wider text-subtle">{label}</p>
                  <p className="mt-0.5 text-[14px] font-bold leading-snug">{value}</p>
                </div>
              ))}
            </div>

            <nav className="no-scrollbar sticky top-16 z-20 -mx-4 mt-8 flex gap-1 overflow-x-auto bg-ivory/90 px-4 py-2 backdrop-blur lg:top-[72px]" aria-label="Sections">
              {[['overview', 'Overview'], ['itinerary', 'Itinerary'], ['stay', 'Stay & travel'], ['inclusions', "What's included"], ['policy', 'Policies'], ['ask', 'Ask this trip'], ['organiser', 'Organiser']].map(([id, l]) => (
                <a key={id} href={`#${id}`} className="shrink-0 rounded-full px-3.5 py-1.5 text-sm font-bold text-subtle hover:bg-sand hover:text-ink">{l}</a>
              ))}
            </nav>

            <Section id="overview" title="Overview" className="mt-2">
              <p className="whitespace-pre-line text-[16px] leading-[1.75] text-ink/85">{trip.overview || trip.summary}</p>
              {trip.highlights?.length > 0 && (
                <ul className="mt-6 grid gap-2.5 sm:grid-cols-2">
                  {trip.highlights.map((h) => <li key={h} className="flex items-start gap-2.5 text-[15px] font-semibold"><span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-peach"><Check className="size-3 text-brand-ink" strokeWidth={3} /></span>{h}</li>)}
                </ul>
              )}
            </Section>

            <Section id="itinerary" title="Day-wise itinerary" className="mt-10">
              {trip.itinerary?.length ? (
                <>
                  <div className="mb-3 flex justify-end"><button type="button" className="text-sm font-bold text-brand-ink hover:underline" onClick={() => setOpenDays(Object.keys(openDays).length === trip.itinerary.length ? {} : Object.fromEntries(trip.itinerary.map((_, i) => [i, true])))}>{Object.keys(openDays).length === trip.itinerary.length ? 'Collapse all' : 'Expand all'}</button></div>
                  <ol className="relative space-y-3 before:absolute before:bottom-6 before:left-[19px] before:top-6 before:w-0.5 before:bg-line">
                    {trip.itinerary.map((d, i) => {
                      const isOpen = !!openDays[i];
                      return (
                        <li key={i} className="relative pl-14">
                          <span className={cx('absolute left-0 top-3 grid size-10 place-items-center rounded-full text-sm font-extrabold ring-4 ring-ivory', isOpen ? 'bg-brand text-white' : 'bg-white text-ink ring-ivory border border-line')}>{d.day}</span>
                          <div className="rounded-2xl border border-line bg-white">
                            <button type="button" className="flex w-full items-center justify-between gap-3 p-4 text-left" aria-expanded={isOpen} onClick={() => setOpenDays((o) => { const n = { ...o }; if (n[i]) delete n[i]; else n[i] = true; return n; })}>
                              <span><span className="block text-[12px] font-bold uppercase tracking-wider text-brand-ink">Day {d.day}</span><span className="block text-[16px] font-extrabold">{d.title}</span></span>
                              <ChevronDown className={cx('size-5 shrink-0 text-subtle transition', isOpen && 'rotate-180')} />
                            </button>
                            {isOpen && (
                              <div className="border-t border-line px-4 pb-4 pt-3">
                                {d.description && <p className="text-[15px] leading-relaxed text-ink/80">{d.description}</p>}
                                {(d.meals || d.stay) && (
                                  <div className="mt-3 flex flex-wrap gap-2">
                                    {d.meals && <Badge icon={Utensils}>{d.meals}</Badge>}
                                    {d.stay && <Badge icon={BedDouble}>{d.stay}</Badge>}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ol>
                </>
              ) : <p className="text-subtle">The organiser hasn't added a day-wise itinerary yet.</p>}
            </Section>

            <Section id="stay" title="Stay, transport & meals" className="mt-10">
              <div className="grid gap-3 sm:grid-cols-3">
                {[[BedDouble, 'Accommodation', trip.accommodation], [BusFront, 'Transport', trip.transport], [Utensils, 'Meals', trip.meals]].map(([Icon, l, v]) => (
                  <div key={l} className="rounded-2xl border border-line bg-white p-5">
                    <div className="flex items-center gap-2"><Icon className="size-5 text-brand" /><h3 className="font-extrabold">{l}</h3></div>
                    <p className="mt-2 text-[14px] leading-relaxed text-ink/80">{v || <span className="text-subtle">Not specified by the organiser</span>}</p>
                  </div>
                ))}
              </div>
            </Section>

            <Section id="inclusions" title="What's included" className="mt-10">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl bg-success-bg/60 p-5">
                  <h3 className="font-extrabold text-success">Included</h3>
                  <ul className="mt-3 space-y-2">{(trip.inclusions || []).map((x) => <li key={x} className="flex gap-2 text-[15px]"><Check className="mt-0.5 size-4 shrink-0 text-success" strokeWidth={3} />{x}</li>)}</ul>
                  {!trip.inclusions?.length && <p className="mt-2 text-sm text-subtle">Not listed.</p>}
                </div>
                <div className="rounded-2xl bg-danger-bg/50 p-5">
                  <h3 className="font-extrabold text-danger">Not included</h3>
                  <ul className="mt-3 space-y-2">{(trip.exclusions || []).map((x) => <li key={x} className="flex gap-2 text-[15px]"><X className="mt-0.5 size-4 shrink-0 text-danger" strokeWidth={3} />{x}</li>)}</ul>
                  {!trip.exclusions?.length && <p className="mt-2 text-sm text-subtle">The organiser hasn't listed exclusions. Ask them before booking.</p>}
                </div>
              </div>
            </Section>

            <Section id="policy" title="Pickup & cancellation" className="mt-10">
              <div className="space-y-3">
                <div className="rounded-2xl border border-line bg-white p-5">
                  <h3 className="flex items-center gap-2 font-extrabold"><MapPin className="size-5 text-brand" />Pickup & departure</h3>
                  <p className="mt-2 text-[15px] leading-relaxed text-ink/80">{trip.pickupInfo || <span className="text-subtle">Pickup details will be shared by the organiser.</span>}</p>
                </div>
                <div className="rounded-2xl border border-line bg-white p-5">
                  <h3 className="flex items-center gap-2 font-extrabold"><ShieldAlert className="size-5 text-brand" />Cancellation & refund policy</h3>
                  <p className="mt-2 text-[15px] leading-relaxed text-ink/80">{trip.cancellationPolicy || <span className="text-subtle">No cancellation policy provided.</span>}</p>
                </div>
              </div>
              {trip.departures.length > 0 && (
                <div className="mt-6 overflow-hidden rounded-2xl border border-line bg-white">
                  <h3 className="border-b border-line px-5 py-3 font-extrabold">All departures</h3>
                  <ul className="divide-y divide-line">
                    {trip.departures.map((d) => (
                      <li key={d._id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 text-[14px]">
                        <span className="flex items-center gap-2 font-bold"><CalendarDays className="size-4 text-brand" />{weekdayDate(d.startDate)} → {weekdayDate(d.endDate)}</span>
                        <span className="flex items-center gap-4"><AvailabilityBadge departure={d} /><span className="num font-extrabold">{money(d.price, trip.currency)}</span></span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </Section>

            {!trip.preview && <AskThisTrip trip={trip} />}

            <Section id="organiser" title="Your organiser" className="mt-10">
              <div className="rounded-3xl border border-line bg-white p-5 sm:p-6">
                <div className="flex items-start gap-4">
                  {op.logoUrl ? <SafeImage src={op.logoUrl} alt="" className="size-14 rounded-2xl" /> : <div className="grid size-14 shrink-0 place-items-center rounded-2xl bg-peach text-xl font-extrabold text-brand-ink">{op.businessName[0]}</div>}
                  <div className="min-w-0">
                    <h3 className="flex flex-wrap items-center gap-2 text-lg font-extrabold">{op.businessName}{op.verified && <Badge tone="success" icon={BadgeCheck}>Verified organiser</Badge>}</h3>
                    <p className="text-sm font-semibold text-subtle">{op.location}{op.foundedYear ? ` · Running trips since ${op.foundedYear}` : ''}</p>
                  </div>
                </div>
                {op.description && <p className="mt-4 text-[15px] leading-relaxed text-ink/80">{op.description}</p>}
                <div className="mt-5 grid gap-2 sm:grid-cols-2">
                  {op.contactPhone && <a href={`tel:${op.contactPhone.replace(/\s/g, '')}`} className="flex items-center gap-2 rounded-xl bg-sand px-3.5 py-2.5 text-sm font-semibold hover:bg-peach"><Phone className="size-4 text-brand" />{op.contactPhone}</a>}
                  {op.contactEmail && <a href={`mailto:${op.contactEmail}`} className="flex min-w-0 items-center gap-2 rounded-xl bg-sand px-3.5 py-2.5 text-sm font-semibold hover:bg-peach"><Mail className="size-4 shrink-0 text-brand" /><span className="truncate">{op.contactEmail}</span></a>}
                  {op.instagram && <span className="flex items-center gap-2 rounded-xl bg-sand px-3.5 py-2.5 text-sm font-semibold"><AtSign className="size-4 text-brand" />{op.instagram.replace(/^@/, '')}</span>}
                  {op.website && <a href={op.website} target="_blank" rel="noreferrer noopener" className="flex min-w-0 items-center gap-2 rounded-xl bg-sand px-3.5 py-2.5 text-sm font-semibold hover:bg-peach"><Globe className="size-4 shrink-0 text-brand" /><span className="truncate">{op.website.replace(/^https?:\/\//, '')}</span></a>}
                </div>
                {!op.verified && <p className="mt-4 text-[13px] text-subtle">Ghumo AI hasn't verified this organiser's business documents yet. The organiser is responsible for running this trip.</p>}
                <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
                  <Link to={`/organisers/${op.slug}`} className="text-sm font-bold text-brand-ink hover:underline">View all trips by {op.businessName}</Link>
                  <ReportButton trip={trip} />
                </div>
              </div>
            </Section>

            <Section id="reviews" title="Reviews" className="mt-10">
              {trip.reviews.count === 0 ? (
                <p className="text-[15px] text-subtle">No reviews yet. Reviews can only be written by travellers who completed a confirmed booking.</p>
              ) : (
                <div className="space-y-3">
                  <p className="flex items-center gap-2 text-lg font-extrabold"><Star className="size-5 fill-brand text-brand" />{trip.reviews.average} · {trip.reviews.count} review{trip.reviews.count > 1 ? 's' : ''}</p>
                  {trip.reviews.items.map((r) => (
                    <div key={r._id} className="rounded-2xl border border-line bg-white p-5">
                      <div className="flex items-center justify-between"><p className="font-bold">{r.author}</p><span className="flex">{Array.from({ length: 5 }).map((_, i) => <Star key={i} className={cx('size-4', i < r.rating ? 'fill-brand text-brand' : 'text-line')} />)}</span></div>
                      {r.comment && <p className="mt-2 text-[15px] text-ink/80">{r.comment}</p>}
                      <p className="mt-2 text-xs text-subtle">{date(r.createdAt)} · Verified booking</p>
                    </div>
                  ))}
                </div>
              )}
            </Section>
          </div>

          <aside className="hidden lg:block">
            <div className="sticky top-24">
              <BookingPanel trip={trip} departureId={departureId} setDepartureId={setDepartureId} seats={seats} setSeats={setSeats} onBook={onBook} />
            </div>
          </aside>
        </div>

        {trip.similar?.length > 0 && (
          <section className="mt-20">
            <h2 className="mb-5 text-2xl font-extrabold">Similar trips</h2>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{trip.similar.map((t) => <TripCard key={t._id} trip={t} />)}</div>
          </section>
        )}
      </div>

      {/* Mobile booking bar */}
      <div className="glass fixed inset-x-0 bottom-0 z-40 !border-x-0 !border-b-0 border-t !border-t-line px-4 py-3 lg:hidden" style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
        <div className="mx-auto flex max-w-xl items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="num text-lg font-extrabold leading-tight">{money(trip.priceFrom, trip.currency)}<span className="text-[13px] font-semibold text-subtle"> /person</span></p>
            <p className="truncate text-[13px] font-semibold text-subtle">{trip.nextDeparture ? `Next: ${dateRange(trip.nextDeparture.startDate, trip.nextDeparture.endDate)}` : 'No upcoming dates'}</p>
          </div>
          <Button onClick={() => setSheet(true)} disabled={!trip.departures.length}>Select dates</Button>
        </div>
      </div>
      <Modal open={sheet} onClose={() => setSheet(false)} title="Book this trip">
        <div className="-mx-5 -my-4 sm:mx-0 sm:my-0">
          <BookingPanel trip={trip} departureId={departureId} setDepartureId={setDepartureId} seats={seats} setSeats={setSeats} onBook={() => { setSheet(false); onBook(); }} />
        </div>
      </Modal>
    </div>
  );
}

export default function TripDetailPage() {
  const { slug } = useParams();
  const { data: trip, loading, error, reload } = useAsync(() => api.get(`/trips/${slug}`), [slug]);

  if (loading) return <Spinner className="py-40" label="Loading trip" />;
  if (error || !trip) return <div className="mx-auto max-w-3xl px-4 py-24"><EmptyState icon={MapPin} title={error?.status === 404 ? 'Trip not found' : 'Could not load this trip'} action={<Button to="/trips">Browse trips</Button>}>{error?.status === 404 ? 'It may have been unpublished by the organiser.' : error?.message}</EmptyState>{error && error.status !== 404 && <div className="mt-4 text-center"><Button variant="ghost" onClick={reload}>Try again</Button></div>}</div>;

  return <TripDetailView key={trip._id} trip={trip} />;
}
