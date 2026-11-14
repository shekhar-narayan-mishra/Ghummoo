import { useRef, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Upload, ShieldCheck, Building2, ExternalLink } from 'lucide-react';
import api from '../../lib/api';
import { date } from '../../lib/format';
import { Button, Input, Textarea, Select, Field, Card, Notice, PageHeader, StatusBadge, SafeImage } from '../../components/ui';
import Onboarding, { ORGANISER_TYPES } from './Onboarding';
import { isPhone } from '../../lib/validation';

const EMPTY = { businessName: '', organiserType: '', description: '', contactEmail: '', contactPhone: '', location: '', instagram: '', website: '', logoUrl: '', foundedYear: '' };

function validate(f) {
  const e = {};
  if (f.businessName.trim().length < 2) e.businessName = 'Business name is required';
  if (f.description.trim().length < 30) e.description = `Tell travellers about your business (at least 30 characters, ${f.description.trim().length} so far)`;
  if (!/^\S+@\S+\.\S+$/.test(f.contactEmail.trim())) e.contactEmail = 'Enter a valid email address';
  if (!isPhone(f.contactPhone)) e.contactPhone = 'Enter a valid phone number';
  if (!f.location.trim()) e.location = 'Location is required';
  if (f.foundedYear) {
    const y = Number(f.foundedYear);
    if (!Number.isInteger(y) || y < 1950 || y > new Date().getFullYear()) e.foundedYear = 'Enter a year between 1950 and now';
  }
  if (f.website && !/^https?:\/\//i.test(f.website.trim())) e.website = 'Website should start with https://';
  return e;
}

export function LogoPicker({ value, onChange }) {
  const input = useRef(null);
  const [uploading, setUploading] = useState(false);
  const upload = async (file) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error('Image must be smaller than 5 MB'); return; }
    const fd = new FormData();
    fd.append('image', file);
    setUploading(true);
    try {
      const { url } = await api.post('/uploads', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      onChange(url);
      toast.success('Logo uploaded');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setUploading(false);
      if (input.current) input.current.value = '';
    }
  };
  return (
    <Field label="Logo or profile photo" hint="JPG, PNG or WebP up to 5 MB. You can also paste an image URL.">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="size-16 shrink-0 overflow-hidden rounded-2xl border border-line bg-sand">
          {value ? <SafeImage src={value} alt="Logo preview" className="size-full" /> : <div className="grid size-full place-items-center text-muted"><Building2 className="size-6" /></div>}
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row">
          <input ref={input} type="file" accept="image/jpeg,image/png,image/webp,image/avif" className="hidden" onChange={(e) => upload(e.target.files?.[0])} />
          <Button variant="secondary" size="sm" className="h-11" loading={uploading} onClick={() => input.current?.click()}><Upload className="size-4" />Upload</Button>
          <input value={value} onChange={(e) => onChange(e.target.value)} placeholder="https://…" aria-label="Logo URL"
            className="h-11 w-full min-w-0 rounded-xl border border-line bg-white px-3.5 text-[15px] focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand/10" />
        </div>
      </div>
    </Field>
  );
}

function ProfileFields({ form, set, errors }) {
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <Input label="Business name" required value={form.businessName} onChange={set('businessName')} error={errors.businessName} placeholder="e.g. Wandering Pahadi Co." />
      <Select label="Organiser type" value={form.organiserType || ''} onChange={set('organiserType')}>
        <option value="">Choose…</option>
        {ORGANISER_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
      </Select>
      <Textarea label="About your business" required rows={5} value={form.description} onChange={set('description')} error={errors.description} className="sm:col-span-2"
        hint="What kind of trips you run, how long you've been operating, what makes your trips different." />
      <Input label="Contact email" type="email" required value={form.contactEmail} onChange={set('contactEmail')} error={errors.contactEmail} />
      <Input label="Contact phone / WhatsApp" type="tel" required value={form.contactPhone} onChange={set('contactPhone')} error={errors.contactPhone} placeholder="+91 98xxx xxxxx" />
      <Input label="Based in" required value={form.location} onChange={set('location')} error={errors.location} placeholder="City, State" />
      <Input label="Operating since" type="number" inputMode="numeric" value={form.foundedYear ?? ''} onChange={set('foundedYear')} error={errors.foundedYear} placeholder="e.g. 2019" />
      <Input label="Instagram" value={form.instagram} onChange={set('instagram')} placeholder="@yourhandle" />
      <Input label="Website" value={form.website} onChange={set('website')} error={errors.website} placeholder="https://" />
      <div className="sm:col-span-2"><LogoPicker value={form.logoUrl} onChange={(v) => set('logoUrl')({ target: { value: v } })} /></div>
    </div>
  );
}

function useProfileForm(initial) {
  const [form, setForm] = useState(() => ({ ...EMPTY, ...Object.fromEntries(Object.entries(initial || {}).filter(([k]) => k in EMPTY).map(([k, v]) => [k, v ?? ''])) }));
  const [errors, setErrors] = useState({});
  const set = (k) => (e) => { setForm((f) => ({ ...f, [k]: e.target.value })); setErrors((x) => ({ ...x, [k]: undefined })); };
  const check = () => { const e = validate(form); setErrors(e); return Object.keys(e).length === 0; };
  const payload = () => ({ ...form, organiserType: form.organiserType || undefined, foundedYear: form.foundedYear === '' ? '' : Number(form.foundedYear) });
  return { form, set, errors, check, payload };
}

// eslint-disable-next-line react-refresh/only-export-components
export const REG_TYPES = [['gst', 'GST registration'], ['msme', 'MSME / Udyam'], ['company', 'Company / LLP registration'], ['tourism_license', 'State tourism licence'], ['other', 'Other']];

function VerificationCard({ verification, onSubmitted }) {
  const [form, setForm] = useState({ registrationType: 'gst', registrationNumber: '', legalName: '', documentUrl: '', notes: '' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(!verification);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const submit = async (e) => {
    e.preventDefault();
    if (form.registrationNumber.trim().length < 3) { setError('Registration number is required'); return; }
    if (form.documentUrl && !/^https?:\/\//i.test(form.documentUrl)) { setError('Document link should start with https://'); return; }
    setError('');
    setSaving(true);
    try {
      await api.post('/operator/verification', form);
      toast.success('Verification details submitted');
      setShowForm(false);
      await onSubmitted?.();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };
  return (
    <Card className="p-5 sm:p-7">
      <div className="flex items-start gap-3">
        <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-peach text-brand-ink"><ShieldCheck className="size-5" /></div>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-extrabold">Business verification</h2>
          <p className="mt-1 text-[14px] text-subtle">The "Verified organiser" badge appears on your listings only after a Ghumo admin has reviewed your registration documents. Approval to list and verification are separate steps.</p>
        </div>
      </div>
      {verification && (
        <div className="mt-5 rounded-xl bg-sand p-4 text-[14px]">
          <div className="flex flex-wrap items-center gap-2"><span className="font-bold">Latest submission</span><StatusBadge status={verification.status} /><span className="text-subtle">{date(verification.createdAt)}</span></div>
          <p className="mt-1.5 text-subtle">{REG_TYPES.find(([v]) => v === verification.registrationType)?.[1]}: <span className="font-semibold text-ink">{verification.registrationNumber}</span></p>
          {verification.reviewNote && <p className="mt-1.5">Reviewer note: {verification.reviewNote}</p>}
          {!showForm && verification.status !== 'submitted' && <Button variant="secondary" size="sm" className="mt-3" onClick={() => setShowForm(true)}>Submit new details</Button>}
        </div>
      )}
      {showForm && (
        <form onSubmit={submit} noValidate className="mt-5 grid gap-5 sm:grid-cols-2">
          <Select label="Registration type" value={form.registrationType} onChange={set('registrationType')}>{REG_TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select>
          <Input label="Registration number" required value={form.registrationNumber} onChange={set('registrationNumber')} error={error} />
          <Input label="Legal business name" value={form.legalName} onChange={set('legalName')} />
          <Input label="Document link" value={form.documentUrl} onChange={set('documentUrl')} placeholder="https:// (Drive or Dropbox link)" />
          <Textarea label="Notes for the reviewer" rows={3} value={form.notes} onChange={set('notes')} className="sm:col-span-2" />
          <div className="flex justify-end gap-2 sm:col-span-2">
            {verification && <Button variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>}
            <Button type="submit" loading={saving}>Submit for verification</Button>
          </div>
        </form>
      )}
    </Card>
  );
}

function EditProfile({ operator, verification, reloadOperator }) {
  const f = useProfileForm(operator);
  const [saving, setSaving] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    if (!f.check()) { toast.error('Please fix the highlighted fields'); return; }
    setSaving(true);
    try {
      await api.put('/operator/profile', f.payload());
      toast.success(operator.status === 'rejected' ? 'Profile updated and sent back for review' : 'Profile saved');
      await reloadOperator();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };
  return (
    <div className="space-y-6">
      <PageHeader title="Business profile" actions={operator.status === 'approved' && <Button variant="secondary" size="sm" to={`/organisers/${operator.slug}`}><ExternalLink className="size-4" />Public page</Button>}>
        This is how travellers see your business.
      </PageHeader>
      <Card className="flex flex-wrap items-center gap-3 p-5">
        <span className="text-sm font-bold">Listing approval</span>
        <StatusBadge status={operator.status} />
        <span className="text-sm font-bold">Verification</span>
        {operator.verifiedAt && operator.status === 'approved' ? <StatusBadge status="verified" label="Verified organiser" />
          : operator.verifiedAt ? <span className="text-[13px] text-subtle">Documents checked. The badge appears once your profile is approved.</span>
            : verification ? <StatusBadge status={verification.status} /> : <span className="text-[13px] text-subtle">Not submitted</span>}
        {operator.statusNote && <p className="w-full text-[14px] text-subtle">Note from Ghumo: {operator.statusNote}</p>}
      </Card>
      {operator.status === 'rejected' && <Notice tone="danger">Saving changes sends your profile back to the review queue.</Notice>}
      <form onSubmit={submit} noValidate>
        <Card className="p-5 sm:p-7"><ProfileFields form={f.form} set={f.set} errors={f.errors} /></Card>
        <div className="mt-4 flex justify-end"><Button type="submit" loading={saving}>Save profile</Button></div>
      </form>
      <VerificationCard key={verification?._id || 'none'} verification={verification} onSubmitted={reloadOperator} />
    </div>
  );
}

export default function ProfilePage() {
  const { operator, verification, reloadOperator } = useOutletContext();
  if (!operator) return <Onboarding onCreated={reloadOperator} />;
  return <EditProfile key={operator.updatedAt} operator={operator} verification={verification} reloadOperator={reloadOperator} />;
}

