/* Organiser onboarding: a short, step-by-step setup shown until an organiser profile exists.
   Collects only what travellers see or what review needs, explains why at each step, saves a
   draft in this browser, and ends by helping the organiser create their first trip.

   Steps: 1 Account (done at sign-up) · 2 Business · 3 Contact · 4 About · 5 Verification
          (optional) · 6 Review & submit · 7 First trip */
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowLeft, ArrowRight, Building2, Check, Info, PenLine, ShieldCheck, Sparkles, Users, UserRound, Megaphone, Clock } from 'lucide-react';
import api from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { Button, Input, Textarea, Select, Card, cx } from '../../components/ui';
import { LogoPicker, REG_TYPES } from './ProfilePage';
import { isPhone } from '../../lib/validation';

export const ORGANISER_TYPES = [
  { value: 'independent', label: 'Independent organiser', hint: 'You lead or run trips yourself, often with a small team.', icon: UserRound },
  { value: 'company', label: 'Travel company', hint: 'A registered business running group departures.', icon: Building2 },
  { value: 'community', label: 'Community or club', hint: 'A trekking club, college group or community that runs trips.', icon: Users },
  { value: 'creator', label: 'Travel creator', hint: 'You host trips for your audience on Instagram or YouTube.', icon: Megaphone },
];

const STEPS = ['Account', 'Business', 'Contact', 'About', 'Verification', 'Review', 'First trip'];
const DRAFT_KEY = (id) => `ghumo.onboarding.${id}`;
const blank = (user) => ({
  businessName: '', organiserType: '', contactEmail: user?.email || '', contactPhone: user?.phone || '', location: '',
  description: '', instagram: '', website: '', foundedYear: '', logoUrl: '',
  verify: { registrationType: 'gst', registrationNumber: '', legalName: '', documentUrl: '', notes: '' },
});

function validateStep(step, f) {
  const e = {};
  if (step === 1) {
    if (f.businessName.trim().length < 2) e.businessName = 'Enter the name travellers know you by';
    if (!f.organiserType) e.organiserType = 'Choose the option that fits best';
  }
  if (step === 2) {
    if (!/^\S+@\S+\.\S+$/.test(f.contactEmail.trim())) e.contactEmail = 'Enter a valid email address';
    if (!isPhone(f.contactPhone)) e.contactPhone = 'Enter a phone number, e.g. +91 98765 43210';
    if (f.location.trim().length < 2) e.location = 'Enter the city you operate from';
  }
  if (step === 3) {
    const n = f.description.trim().length;
    if (n < 30) e.description = `Write at least 30 characters (${n} so far)`;
    if (f.website && !/^https?:\/\//i.test(f.website.trim())) e.website = 'Start with https://';
    if (f.foundedYear) {
      const y = Number(f.foundedYear);
      if (!Number.isInteger(y) || y < 1950 || y > new Date().getFullYear()) e.foundedYear = 'Enter a year between 1950 and now';
    }
  }
  if (step === 4) {
    const v = f.verify;
    if (v.registrationNumber && v.registrationNumber.trim().length < 3) e.registrationNumber = 'That looks too short';
    if (v.documentUrl && !/^https?:\/\//i.test(v.documentUrl.trim())) e.documentUrl = 'Start with https://';
  }
  return e;
}

function Progress({ step }) {
  return (
    <div>
      <p className="text-sm font-bold text-subtle">Step {step + 1} of {STEPS.length}: <span className="text-ink">{STEPS[step]}</span></p>
      <ol className="mt-3 grid grid-cols-7 gap-1.5" aria-label="Setup progress">
        {STEPS.map((s, i) => (
          <li key={s} className={cx('h-1.5 rounded-full', i <= step ? 'bg-brand' : 'bg-line')} aria-current={i === step ? 'step' : undefined}>
            <span className="sr-only">{s}{i < step ? ' (done)' : i === step ? ' (current)' : ''}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function Why({ children }) {
  return <p className="mt-4 flex gap-2 rounded-2xl bg-sand p-3 text-[13px] text-subtle"><Info className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden /><span>{children}</span></p>;
}

function ReviewRow({ label, value, onEdit }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-line py-3 last:border-0">
      <div className="min-w-0"><p className="text-xs font-extrabold uppercase tracking-wider text-subtle">{label}</p><p className="mt-0.5 whitespace-pre-line break-words text-[15px]">{value || <span className="italic text-subtle">Not added</span>}</p></div>
      <button type="button" onClick={onEdit} className="shrink-0 text-sm font-bold text-brand-ink hover:underline">Edit</button>
    </div>
  );
}

export default function Onboarding({ onCreated }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const key = DRAFT_KEY(user?._id);
  const [form, setForm] = useState(() => {
    try { const saved = JSON.parse(localStorage.getItem(key)); if (saved) return { ...blank(user), ...saved, verify: { ...blank(user).verify, ...saved.verify } }; } catch { /* storage unavailable */ }
    return blank(user);
  });
  const [step, setStep] = useState(1);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [created, setCreated] = useState(null);

  // Saved draft: kept in this browser until the profile is submitted.
  useEffect(() => { if (!created) { try { localStorage.setItem(key, JSON.stringify(form)); } catch { /* storage unavailable */ } } }, [form, key, created]);

  const set = (k) => (e) => { const v = e?.target ? e.target.value : e; setForm((f) => ({ ...f, [k]: v })); setErrors((x) => ({ ...x, [k]: undefined })); };
  const setV = (k) => (e) => { const v = e.target.value; setForm((f) => ({ ...f, verify: { ...f.verify, [k]: v } })); setErrors((x) => ({ ...x, [k]: undefined })); };
  const next = () => {
    const e = validateStep(step, form);
    setErrors(e);
    if (Object.keys(e).length) { toast.error('Please check the highlighted fields'); return; }
    setStep((s) => s + 1);
    window.scrollTo({ top: 0 });
  };
  const back = () => { setErrors({}); setStep((s) => Math.max(1, s - 1)); };
  const typeLabel = useMemo(() => ORGANISER_TYPES.find((t) => t.value === form.organiserType)?.label, [form.organiserType]);

  const submit = async () => {
    for (const s of [1, 2, 3, 4]) {
      const e = validateStep(s, form);
      if (Object.keys(e).length) { setErrors(e); setStep(s); toast.error('Something needs fixing before you submit'); return; }
    }
    setSaving(true);
    try {
      const { verify, ...profile } = form;
      const op = await api.post('/operator/profile', { ...profile, foundedYear: profile.foundedYear === '' ? '' : Number(profile.foundedYear) });
      let verification = null;
      if (verify.registrationNumber.trim()) {
        try { verification = await api.post('/operator/verification', verify); } catch (err) { toast.error(`Profile saved, but verification details weren't: ${err.message}. You can add them from Business profile.`); }
      }
      try { localStorage.removeItem(key); } catch { /* storage unavailable */ }
      setCreated({ op, verification });
      setStep(6);
      window.scrollTo({ top: 0 });
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };
  const finish = async (to) => { await onCreated?.(); navigate(to); };

  return (
    <div className="mx-auto max-w-2xl">
      <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-brand-ink">Set up your organiser profile</p>
      <h1 className="mt-1 text-3xl font-extrabold sm:text-4xl">{step === 6 ? 'You\'re set up' : 'Tell travellers who runs the trip'}</h1>
      <div className="mt-6"><Progress step={step} /></div>

      <Card className="mt-6 p-5 sm:p-7">
        {step === 1 && (
          <div className="space-y-6">
            <p className="flex items-center gap-2 rounded-2xl bg-success-bg px-3 py-2 text-sm font-semibold text-success"><Check className="size-4" aria-hidden />Account created for {user?.email}</p>
            <Input label="Business or brand name" required value={form.businessName} onChange={set('businessName')} error={errors.businessName} placeholder="e.g. Monsoon Trails" hint="Shown on every trip you list." />
            <fieldset>
              <legend className="text-sm font-bold">What kind of organiser are you? <span className="text-danger">*</span></legend>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {ORGANISER_TYPES.map((t) => (
                  <label key={t.value} className={cx('flex cursor-pointer gap-3 rounded-2xl border p-4 transition has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-brand', form.organiserType === t.value ? 'border-brand bg-peach/40 ring-2 ring-brand/20' : 'border-line bg-white hover:border-brand-soft')}>
                    <input type="radio" name="organiserType" value={t.value} checked={form.organiserType === t.value} onChange={() => set('organiserType')(t.value)} className="sr-only" />
                    <t.icon className={cx('mt-0.5 size-5 shrink-0', form.organiserType === t.value ? 'text-brand-ink' : 'text-subtle')} aria-hidden />
                    <span><span className="block font-extrabold">{t.label}</span><span className="block text-[13px] text-subtle">{t.hint}</span></span>
                  </label>
                ))}
              </div>
              {errors.organiserType && <p className="mt-2 text-sm font-semibold text-danger" role="alert">{errors.organiserType}</p>}
            </fieldset>
            <Why>This helps travellers understand who they're booking with. It doesn't change what you can do on Ghumo.</Why>
          </div>
        )}

        {step === 2 && (
          <div className="grid gap-5 sm:grid-cols-2">
            <Input label="Contact email" type="email" required value={form.contactEmail} onChange={set('contactEmail')} error={errors.contactEmail} autoComplete="email" />
            <Input label="Phone / WhatsApp" type="tel" required value={form.contactPhone} onChange={set('contactPhone')} error={errors.contactPhone} placeholder="+91 98765 43210" autoComplete="tel" />
            <Input label="Where do you operate from?" required value={form.location} onChange={set('location')} error={errors.location} placeholder="e.g. Pune, Maharashtra" className="sm:col-span-2" hint="Usually the city most of your trips start from." />
            <div className="sm:col-span-2"><Why>Travellers see these on your trips so they can ask questions before booking. We don't share them anywhere else.</Why></div>
          </div>
        )}

        {step === 3 && (
          <div className="grid gap-5 sm:grid-cols-2">
            <Textarea label="About your trips" required rows={5} value={form.description} onChange={set('description')} error={errors.description} className="sm:col-span-2"
              placeholder="e.g. We run small-group monsoon treks in the Western Ghats, led by two certified trek leaders. Groups of 12–20, mostly from Pune and Mumbai, since 2021."
              hint={`${form.description.trim().length} characters. What you run, who leads, group size and how long you've been doing it.`} />
            <Input label="Instagram" value={form.instagram} onChange={set('instagram')} placeholder="@yourhandle" />
            <Input label="Website" value={form.website} onChange={set('website')} error={errors.website} placeholder="https://" />
            <Input label="Running trips since" type="number" inputMode="numeric" value={form.foundedYear} onChange={set('foundedYear')} error={errors.foundedYear} placeholder="e.g. 2021" />
            <div className="sm:col-span-2"><LogoPicker value={form.logoUrl} onChange={set('logoUrl')} /></div>
          </div>
        )}

        {step === 4 && (
          <div>
            <div className="flex gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-peach text-brand-ink"><ShieldCheck className="size-5" aria-hidden /></span>
              <div>
                <h2 className="text-lg font-extrabold">Business verification <span className="text-sm font-semibold text-subtle">(optional)</span></h2>
                <p className="mt-1 text-[14px] text-subtle">If you have a GST, Udyam/MSME, company or state tourism registration, add it here. Our team checks it, and once your profile is also approved, travellers see a Verified badge. You can skip this and add it later from Business profile.</p>
              </div>
            </div>
            <div className="mt-5 grid gap-5 sm:grid-cols-2">
              <Select label="Registration type" value={form.verify.registrationType} onChange={setV('registrationType')}>{REG_TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select>
              <Input label="Registration number" value={form.verify.registrationNumber} onChange={setV('registrationNumber')} error={errors.registrationNumber} placeholder="e.g. UDYAM-MH-26-0001234" />
              <Input label="Legal business name" value={form.verify.legalName} onChange={setV('legalName')} hint="If different from your brand name." />
              <Input label="Link to a document" value={form.verify.documentUrl} onChange={setV('documentUrl')} error={errors.documentUrl} placeholder="https:// (Drive or Dropbox)" hint="Only our review team opens this." />
            </div>
            <Why>We ask so travellers can trust who they're paying. Registration details are never shown publicly; only the badge is.</Why>
          </div>
        )}

        {step === 5 && (
          <div>
            <h2 className="text-lg font-extrabold">Check your details</h2>
            <p className="mt-1 text-sm text-subtle">This is what travellers will see on your trips. You can change it later from Business profile.</p>
            <div className="mt-4">
              <ReviewRow label="Business" value={[form.businessName, typeLabel].filter(Boolean).join(' · ')} onEdit={() => setStep(1)} />
              <ReviewRow label="Contact" value={[form.contactEmail, form.contactPhone, form.location].filter(Boolean).join('\n')} onEdit={() => setStep(2)} />
              <ReviewRow label="About" value={form.description} onEdit={() => setStep(3)} />
              <ReviewRow label="Links" value={[form.instagram, form.website, form.foundedYear && `Since ${form.foundedYear}`].filter(Boolean).join(' · ')} onEdit={() => setStep(3)} />
              <ReviewRow label="Verification" value={form.verify.registrationNumber ? `${REG_TYPES.find(([v]) => v === form.verify.registrationType)?.[1]}: ${form.verify.registrationNumber}` : ''} onEdit={() => setStep(4)} />
            </div>
            <Why>After you submit, our team reviews your profile before your trips can go public. You can create and preview draft trips straight away.</Why>
          </div>
        )}

        {step === 6 && created && (
          <div>
            <div className="space-y-2">
              <p className="flex items-center gap-2 text-[15px] font-bold"><Check className="size-5 text-success" aria-hidden />Profile submitted</p>
              <p className="flex items-center gap-2 text-[15px]"><Clock className="size-5 text-warning" aria-hidden />Approval: <span className="font-bold">waiting for review</span>. Publishing unlocks once approved.</p>
              <p className="flex items-center gap-2 text-[15px]"><ShieldCheck className="size-5 text-subtle" aria-hidden />Verification: <span className="font-bold">{created.verification ? 'details submitted, waiting for review' : 'not submitted'}</span>. No badge is shown until it's checked and you're approved.</p>
            </div>
            <h2 className="mt-8 text-xl font-extrabold">Create your first trip</h2>
            <p className="mt-1 text-sm text-subtle">It's saved as a draft. You can preview it, add dates and publish once approved.</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <button type="button" onClick={() => finish('/operator/studio')} className="rounded-2xl border border-line p-5 text-left transition hover:border-brand hover:bg-peach/30">
                <Sparkles className="size-6 text-brand" aria-hidden /><span className="mt-2 block font-extrabold">Paste a trip description</span><span className="mt-1 block text-sm text-subtle">Use the caption or message you already send. We draft it and flag what's missing.</span>
              </button>
              <button type="button" onClick={() => finish('/operator/packages/new')} className="rounded-2xl border border-line p-5 text-left transition hover:border-brand hover:bg-peach/30">
                <PenLine className="size-6 text-brand" aria-hidden /><span className="mt-2 block font-extrabold">Fill in a form</span><span className="mt-1 block text-sm text-subtle">Build the trip section by section.</span>
              </button>
            </div>
            <button type="button" onClick={() => finish('/operator')} className="mt-4 text-sm font-bold text-subtle underline">I'll do this later, take me to my dashboard</button>
          </div>
        )}
      </Card>

      {step < 6 && (
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          {step > 1 ? <Button variant="ghost" onClick={back}><ArrowLeft className="size-4" />Back</Button> : <span className="text-xs text-subtle">Your answers are saved in this browser as you go.</span>}
          <div className="flex gap-2">
            {step === 4 && !form.verify.registrationNumber && <Button variant="secondary" onClick={() => setStep(5)}>Skip for now</Button>}
            {step < 5 ? <Button onClick={next}>Continue<ArrowRight className="size-4" /></Button> : <Button onClick={submit} loading={saving}>Submit profile</Button>}
          </div>
        </div>
      )}
    </div>
  );
}
