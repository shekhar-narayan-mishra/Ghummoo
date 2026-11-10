import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowLeft, Check, CalendarDays, Minus, Plus, ShieldAlert, X, MapPin } from 'lucide-react';
import api from '../lib/api';
import useAsync from '../lib/useAsync';
import { useAuth } from '../lib/auth';
import { Button, Input, Select, Textarea, Notice, Spinner, EmptyState, SafeImage, cx } from '../components/ui';
import { money, dateRange, durationLong } from '../lib/format';
import { isPhone, optionalPhoneError, PHONE_MAX_LENGTH, EMERGENCY_CONTACT_MAX_LENGTH } from '../lib/validation';

const STEPS = ['Departure', 'Travellers', 'Review'];
const blankTraveller = () => ({ fullName: '', age: '', gender: 'prefer_not', phone: '', email: '', emergencyContact: '' });

function validateTravellers(list) {
  const errs = list.map((t) => {
    const e = {};
    if (t.fullName.trim().length < 2) e.fullName = 'Enter the full name as on ID';
    const age = Number(t.age);
    if (!Number.isInteger(age) || age < 1 || age > 110) e.age = 'Enter a valid age';
    if (t.email && !/^\S+@\S+\.\S+$/.test(t.email)) e.email = 'Email looks invalid';
    const phoneError = optionalPhoneError(t.phone);
    if (phoneError) e.phone = phoneError;
    if (t.emergencyContact.trim().length > EMERGENCY_CONTACT_MAX_LENGTH) e.emergencyContact = `Keep it under ${EMERGENCY_CONTACT_MAX_LENGTH} characters`;
    return e;
  });
  return errs.some((e) => Object.keys(e).length) ? errs : null;
}
function validateContact(c) {
  const e = {};
  if (c.name.trim().length < 2) e.name = 'Required';
  if (!/^\S+@\S+\.\S+$/.test(c.email)) e.email = 'Enter a valid email';
  if (!isPhone(c.phone)) e.phone = 'Enter a valid phone number';
  return Object.keys(e).length ? e : null;
}

export default function BookPage() {
  const { slug } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: trip, loading, error } = useAsync(() => api.get(`/trips/${slug}`), [slug]);

  const [step, setStep] = useState(0);
  const [departureId, setDepartureId] = useState(params.get('departure'));
  const [seats, setSeats] = useState(Math.max(1, Number(params.get('seats')) || 1));
  const [travellers, setTravellers] = useState([blankTraveller()]);
  const [contact, setContact] = useState({ name: user?.name || '', email: user?.email || '', phone: user?.phone || '' });
  const [special, setSpecial] = useState('');
  const [agree, setAgree] = useState(false);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const dep = useMemo(() => trip?.departures.find((d) => d._id === departureId), [trip, departureId]);
  const maxSeats = dep ? Math.min(10, dep.seatsAvailable) : 10;

  useEffect(() => {
    if (trip && (!dep || !dep.isBookable)) setDepartureId(trip.departures.find((d) => d.isBookable)?._id || null);
  }, [trip, dep]);
  useEffect(() => { if (seats > maxSeats) setSeats(Math.max(1, maxSeats)); }, [maxSeats, seats]);
  useEffect(() => {
    setTravellers((list) => {
      const next = list.slice(0, seats);
      while (next.length < seats) next.push(blankTraveller());
      if (!next[0].fullName && user?.name && list.length === 1 && !list[0].fullName) next[0] = { ...next[0], fullName: user.name, email: user.email, phone: user.phone || '' };
      return next;
    });
  }, [seats, user]);

  if (loading) return <Spinner className="py-40" />;
  if (error || !trip) return <div className="mx-auto max-w-2xl px-4 py-24"><EmptyState title="Trip not available" action={<Button to="/trips">Browse trips</Button>}>{error?.message}</EmptyState></div>;
  if (trip.preview) return <div className="mx-auto max-w-2xl px-4 py-24"><EmptyState title="This trip isn't open for booking" action={<Button to={`/trips/${slug}`}>Back to trip</Button>} /></div>;

  const updateT = (i, patch) => setTravellers((l) => l.map((t, j) => (j === i ? { ...t, ...patch } : t)));

  const next = () => {
    if (step === 0) {
      if (!dep || !dep.isBookable) return toast.error('Please choose an available departure');
      setStep(1);
    } else if (step === 1) {
      const tErr = validateTravellers(travellers);
      const cErr = validateContact(contact);
      setErrors({ travellers: tErr, contact: cErr });
      if (tErr || cErr) return toast.error('Please fix the highlighted fields');
      setStep(2);
    }
    return window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const submit = async () => {
    if (submitting) return;
    if (!agree) return toast.error('Please confirm you have read the policies');
    setSubmitting(true);
    try {
      const booking = await api.post('/bookings', {
        departureId: dep._id, seats,
        travelers: travellers.map((t) => ({ ...t, age: Number(t.age) })),
        contact, specialRequests: special,
      });
      navigate(`/bookings/${booking._id}?new=1`, { replace: true });
    } catch (e) {
      toast.error(e.message);
      setSubmitting(false);
    }
  };

  const total = dep ? dep.price * seats : 0;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
      <Link to={`/trips/${slug}`} className="inline-flex items-center gap-1.5 text-sm font-bold text-subtle hover:text-ink"><ArrowLeft className="size-4" />Back to trip</Link>
      <h1 className="mt-3 text-3xl font-extrabold sm:text-4xl">Request to book</h1>

      <ol className="mt-6 flex items-center gap-2 sm:gap-3" aria-label="Booking steps">
        {STEPS.map((s, i) => (
          <li key={s} className="flex flex-1 items-center gap-2 sm:flex-none">
            <span className={cx('grid size-8 shrink-0 place-items-center rounded-full text-sm font-extrabold', i < step ? 'bg-success text-white' : i === step ? 'bg-brand text-white' : 'bg-sand text-subtle')}>{i < step ? <Check className="size-4" strokeWidth={3} /> : i + 1}</span>
            <span className={cx('text-sm font-bold', i === step ? 'text-ink' : 'text-subtle', i !== step && 'hidden sm:inline')}>{s}</span>
            {i < STEPS.length - 1 && <span className="h-0.5 flex-1 rounded bg-line sm:w-10 sm:flex-none" />}
          </li>
        ))}
      </ol>

      <div className="mt-8 lg:grid lg:grid-cols-[1fr_360px] lg:gap-10">
        <div className="min-w-0 space-y-6">
          {step === 0 && (
            <section className="rounded-3xl border border-line bg-white p-5 sm:p-6">
              <h2 className="text-xl font-extrabold">Choose your departure</h2>
              <div className="mt-4 grid gap-2" role="radiogroup">
                {trip.departures.map((d) => (
                  <button key={d._id} type="button" role="radio" aria-checked={d._id === departureId} disabled={!d.isBookable} onClick={() => setDepartureId(d._id)}
                    className={cx('flex items-center justify-between gap-3 rounded-2xl border px-4 py-3.5 text-left transition', d._id === departureId ? 'border-brand bg-peach/40 ring-2 ring-brand/20' : 'border-line hover:border-brand-soft', !d.isBookable && 'cursor-not-allowed opacity-50')}>
                    <span><span className="flex items-center gap-2 font-bold"><CalendarDays className="size-4 text-brand" />{dateRange(d.startDate, d.endDate)}</span>
                      <span className="text-[13px] font-semibold text-subtle">{d.isBookable ? `${d.seatsAvailable} seats left` : d.seatsAvailable === 0 ? 'Sold out' : 'Closed'}</span></span>
                    <span className="num font-extrabold">{money(d.price, trip.currency)}</span>
                  </button>
                ))}
              </div>
              <div className="mt-6 flex items-center justify-between rounded-2xl bg-sand p-4">
                <div><p className="font-bold">Number of travellers</p><p className="text-[13px] text-subtle">{dep ? `Up to ${maxSeats} for this departure` : 'Select a departure first'}</p></div>
                <div className="flex items-center gap-1 rounded-full bg-white p-1 ring-1 ring-line">
                  <button type="button" onClick={() => setSeats(Math.max(1, seats - 1))} disabled={seats <= 1} className="grid size-9 place-items-center rounded-full hover:bg-sand disabled:opacity-40" aria-label="Fewer travellers"><Minus className="size-4" /></button>
                  <span className="num w-8 text-center text-lg font-extrabold">{seats}</span>
                  <button type="button" onClick={() => setSeats(Math.min(maxSeats, seats + 1))} disabled={seats >= maxSeats} className="grid size-9 place-items-center rounded-full hover:bg-sand disabled:opacity-40" aria-label="More travellers"><Plus className="size-4" /></button>
                </div>
              </div>
            </section>
          )}

          {step === 1 && (
            <>
              {travellers.map((t, i) => {
                const e = errors.travellers?.[i] || {};
                return (
                  <section key={i} className="rounded-3xl border border-line bg-white p-5 sm:p-6">
                    <h2 className="text-lg font-extrabold">Traveller {i + 1}{i === 0 && <span className="ml-2 text-sm font-semibold text-subtle">(lead traveller)</span>}</h2>
                    <div className="mt-4 grid gap-4 sm:grid-cols-2">
                      <Input label="Full name" required value={t.fullName} error={e.fullName} onChange={(ev) => updateT(i, { fullName: ev.target.value })} autoComplete={i === 0 ? 'name' : 'off'} />
                      <div className="grid grid-cols-2 gap-3">
                        <Input label="Age" required type="number" inputMode="numeric" min={1} max={110} value={t.age} error={e.age} onChange={(ev) => updateT(i, { age: ev.target.value })} />
                        <Select label="Gender" value={t.gender} onChange={(ev) => updateT(i, { gender: ev.target.value })}>
                          <option value="prefer_not">Prefer not to say</option><option value="female">Female</option><option value="male">Male</option><option value="other">Other</option>
                        </Select>
                      </div>
                      <Input label="Phone" type="tel" value={t.phone} error={e.phone} maxLength={PHONE_MAX_LENGTH} onChange={(ev) => updateT(i, { phone: ev.target.value })} hint="Optional" />
                      <Input label="Email" type="email" value={t.email} error={e.email} onChange={(ev) => updateT(i, { email: ev.target.value })} hint="Optional" />
                      <Input label="Emergency contact" className="sm:col-span-2" value={t.emergencyContact} error={e.emergencyContact} maxLength={EMERGENCY_CONTACT_MAX_LENGTH} onChange={(ev) => updateT(i, { emergencyContact: ev.target.value })} placeholder="Name and phone number" hint="Optional, but recommended" />
                    </div>
                  </section>
                );
              })}
              <section className="rounded-3xl border border-line bg-white p-5 sm:p-6">
                <h2 className="text-lg font-extrabold">Booking contact</h2>
                <p className="text-sm text-subtle">The organiser will use these details to confirm your booking.</p>
                <div className="mt-4 grid gap-4 sm:grid-cols-3">
                  <Input label="Name" required value={contact.name} error={errors.contact?.name} onChange={(e) => setContact({ ...contact, name: e.target.value })} />
                  <Input label="Email" required type="email" value={contact.email} error={errors.contact?.email} onChange={(e) => setContact({ ...contact, email: e.target.value })} />
                  <Input label="Phone" required type="tel" value={contact.phone} error={errors.contact?.phone} maxLength={PHONE_MAX_LENGTH} onChange={(e) => setContact({ ...contact, phone: e.target.value })} placeholder="+91 98xxx xxxxx" />
                </div>
                <Textarea className="mt-4" label="Special requests" rows={3} value={special} onChange={(e) => setSpecial(e.target.value)} placeholder="Dietary needs, room sharing preferences, etc." hint="Optional" />
              </section>
            </>
          )}

          {step === 2 && (
            <>
              <section className="rounded-3xl border border-line bg-white p-5 sm:p-6">
                <h2 className="text-lg font-extrabold">Travellers</h2>
                <ul className="mt-3 divide-y divide-line">
                  {travellers.map((t, i) => <li key={i} className="flex justify-between py-2.5 text-[15px]"><span className="font-bold">{t.fullName}</span><span className="text-subtle">{t.age} yrs</span></li>)}
                </ul>
                <p className="mt-3 text-sm text-subtle">Contact: {contact.name} · {contact.email} · {contact.phone}</p>
                <button type="button" className="mt-2 text-sm font-bold text-brand-ink hover:underline" onClick={() => setStep(1)}>Edit details</button>
              </section>
              <section className="rounded-3xl border border-line bg-white p-5 sm:p-6">
                <h2 className="flex items-center gap-2 text-lg font-extrabold"><ShieldAlert className="size-5 text-brand" />Before you book</h2>
                <h3 className="mt-4 text-sm font-extrabold uppercase tracking-wider text-subtle">Cancellation & refund</h3>
                <p className="mt-1 text-[15px] leading-relaxed">{trip.cancellationPolicy || 'No cancellation policy provided by the organiser.'}</p>
                <h3 className="mt-5 text-sm font-extrabold uppercase tracking-wider text-subtle">Not included in the price</h3>
                {trip.exclusions?.length ? <ul className="mt-2 space-y-1.5">{trip.exclusions.map((x) => <li key={x} className="flex gap-2 text-[15px]"><X className="mt-0.5 size-4 shrink-0 text-danger" strokeWidth={3} />{x}</li>)}</ul>
                  : <p className="mt-1 text-[15px] text-subtle">The organiser hasn't listed exclusions.</p>}
                {trip.pickupInfo && <><h3 className="mt-5 text-sm font-extrabold uppercase tracking-wider text-subtle">Pickup</h3><p className="mt-1 flex gap-2 text-[15px]"><MapPin className="mt-0.5 size-4 shrink-0 text-brand" />{trip.pickupInfo}</p></>}
                <label className="mt-6 flex cursor-pointer items-start gap-3 rounded-2xl bg-sand p-4">
                  <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-0.5 size-5 accent-[#F26A2E]" />
                  <span className="text-[14px] font-medium leading-relaxed">I have read the cancellation policy and exclusions. I understand this is a booking request and {trip.operator.businessName} will confirm it.</span>
                </label>
              </section>
              <Notice tone="brand" title="No payment is taken on Ghumo AI">Your seats are held while the organiser reviews your request. They will contact you to confirm and share payment details directly.</Notice>
            </>
          )}

          <div className="flex items-center justify-between gap-3">
            {step > 0 ? <Button variant="ghost" onClick={() => setStep(step - 1)} disabled={submitting}><ArrowLeft className="size-4" />Back</Button> : <span />}
            {step < 2 ? <Button size="lg" onClick={next}>Continue</Button> : <Button size="lg" onClick={submit} loading={submitting} disabled={!agree}>Submit booking request</Button>}
          </div>
        </div>

        <aside className="mt-8 lg:mt-0">
          <div className="sticky top-24 overflow-hidden rounded-3xl border border-line bg-white">
            <SafeImage src={trip.coverImage} alt={trip.title} className="aspect-[16/9] w-full" sizes="360px" />
            <div className="p-5">
              <h2 className="text-lg font-extrabold leading-snug">{trip.title}</h2>
              <p className="mt-1 text-sm font-semibold text-subtle">by {trip.operator.businessName} · {durationLong(trip.durationDays, trip.durationNights)}</p>
              <dl className="mt-4 space-y-2 text-[14px]">
                <div className="flex justify-between gap-3"><dt className="text-subtle">Departure</dt><dd className="text-right font-bold">{dep ? dateRange(dep.startDate, dep.endDate) : '—'}</dd></div>
                <div className="flex justify-between"><dt className="text-subtle">Travellers</dt><dd className="font-bold">{seats}</dd></div>
                <div className="flex justify-between"><dt className="text-subtle">Price per person</dt><dd className="num font-bold">{dep ? money(dep.price, trip.currency) : '—'}</dd></div>
              </dl>
              <div className="mt-4 flex items-end justify-between border-t border-line pt-4">
                <span className="font-bold">Total</span><span className="num text-2xl font-extrabold">{money(total, trip.currency)}</span>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
