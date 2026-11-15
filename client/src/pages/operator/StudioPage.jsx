import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Sparkles, Wand2, PenLine, RotateCcw, Trash2, CalendarPlus, ShieldCheck, ListChecks, KeyRound } from 'lucide-react';
import api from '../../lib/api';
import useAsync from '../../lib/useAsync';
import { toInputDate } from '../../lib/format';
import { Button, Input, Textarea, Card, Spinner, ErrorState, Notice, PageHeader, ListEditor, Badge, cx } from '../../components/ui';
import { CategoryPicker, ItineraryEditor } from './packageForm';

const MAX = 8000;
const SAMPLE = 'Manali Kasol trip, 5 days 4 nights, 7999 per person, Delhi to Delhi Volvo, 2 nights hotel, breakfast, dinner, bonfire, Solang Valley, DJ night, starting 15 December.';

const addDays = (iso, n) => {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + n);
  return toInputDate(d);
};

const s = (v) => (v == null ? '' : String(v));

function draftToForm(d) {
  return {
    title: s(d.title), destination: s(d.destination), region: s(d.region), country: s(d.country), startLocation: s(d.startLocation),
    durationDays: s(d.durationDays), durationNights: s(d.durationNights), basePrice: s(d.basePrice), currency: s(d.currency),
    transport: s(d.transport), accommodation: s(d.accommodation), meals: s(d.meals), pickupInfo: s(d.pickupInfo),
    cancellationPolicy: s(d.cancellationPolicy), summary: s(d.summary),
    highlights: d.highlights || [], inclusions: d.inclusions || [], exclusions: d.exclusions || [], categories: d.categories || [],
    itinerary: (d.itinerary || []).map((x) => ({ title: x.title || '', description: x.description || '', meals: x.meals || '', stay: x.stay || '' })),
  };
}

export default function StudioPage() {
  const status = useAsync(() => api.get('/ai/status'), []);
  const [text, setText] = useState('');
  const [result, setResult] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [notConfigured, setNotConfigured] = useState(false);

  const generate = async () => {
    if (text.trim().length < 30) { toast.error('Paste at least a few lines of the package description'); return; }
    setGenerating(true);
    try {
      const res = await api.post('/ai/extract-package', { text });
      setResult(res);
      toast.success('Package extracted. Review every field before saving.');
    } catch (err) {
      if (err.status === 503 || err.code === 'AI_NOT_CONFIGURED') setNotConfigured(true);
      toast.error(err.message);
    } finally {
      setGenerating(false);
    }
  };

  const configured = status.data?.configured && !notConfigured;

  return (
    <div className="space-y-6">
      <PageHeader eyebrow={<span className="inline-flex items-center gap-1.5"><Sparkles className="size-4" />AI Package Studio</span>} title="Turn a social post into a trip listing"
        actions={<Button variant="secondary" to="/operator/packages/new"><PenLine className="size-4" />Create manually</Button>}>
        Paste the caption you already use on Instagram or WhatsApp. We pull out the details so you don't have to retype them.
      </PageHeader>

      <ol className="grid gap-2 sm:grid-cols-4" aria-label="Steps to a published trip">
        {['Paste your description', 'Review and fill the gaps', 'Save as a draft', 'Add dates and photos, preview, publish'].map((t, i) => {
          const current = (result ? 1 : 0) === i;
          return (
            <li key={t} aria-current={current ? 'step' : undefined} className={cx('flex items-center gap-2 rounded-2xl px-3 py-2.5 text-[13px] font-bold', current ? 'bg-ink text-white' : 'bg-white text-subtle ring-1 ring-line')}>
              <span className={cx('grid size-6 shrink-0 place-items-center rounded-full text-xs', current ? 'bg-action text-white' : 'bg-sand text-ink')}>{i + 1}</span>{t}
            </li>
          );
        })}
      </ol>

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          [ShieldCheck, 'Only what you wrote', 'Anything missing from your post stays blank. Nothing is made up.'],
          [ListChecks, 'Gaps flagged', 'Missing details like capacity or cancellation policy are listed for you.'],
          [PenLine, 'You stay in control', 'Edit everything, then save as a draft. Nothing is published automatically.'],
        ].map((row) => { const [Ico, t, d] = row; return (
          <div key={t} className="flex gap-3 rounded-2xl border border-line bg-white p-4">
            <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-peach text-brand-ink"><Ico className="size-[18px]" aria-hidden /></div>
            <div><p className="text-sm font-extrabold">{t}</p><p className="mt-0.5 text-[13px] text-subtle">{d}</p></div>
          </div>
        ); })}
      </div>

      {status.loading && <Spinner label="Checking AI setup" />}
      {status.error && <ErrorState error={status.error} onRetry={status.reload} />}

      {!status.loading && !status.error && !configured && <SetupNotice />}

      {configured && !result && (
        <Card className="overflow-hidden">
          <div className="border-b border-line bg-gradient-to-br from-peach/60 to-ivory px-5 py-4 sm:px-6">
            <p className="text-sm font-extrabold">Your package post</p>
            <p className="text-[13px] text-subtle">Caption, description or WhatsApp message. Hinglish and shorthand are fine.</p>
          </div>
          <div className="space-y-3 p-5 sm:p-6">
            <label htmlFor="studio-text" className="sr-only">Package description</label>
            <textarea id="studio-text" value={text} maxLength={MAX} onChange={(e) => setText(e.target.value)} rows={10} disabled={generating}
              placeholder="e.g. Spiti circuit 8D/7N from Chandigarh, 21,999 pp, tempo traveller, homestays, Key monastery, Chandratal…"
              className="w-full rounded-2xl border border-line bg-ivory/50 p-4 text-[15px] leading-relaxed placeholder:text-muted/80 focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand/10" />
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="sm" onClick={() => setText(SAMPLE)} disabled={generating}>Try a sample</Button>
                <span className={cx('num text-[13px]', text.length > MAX * 0.9 ? 'text-warning' : 'text-subtle')}>{text.length.toLocaleString('en-IN')} / {MAX.toLocaleString('en-IN')}</span>
              </div>
              <Button onClick={generate} loading={generating} disabled={text.trim().length < 30}>
                {!generating && <Wand2 className="size-4" />}{generating ? 'Reading your post…' : 'Generate package'}
              </Button>
            </div>
            <p className="text-[13px] text-subtle">Have the itinerary as a PDF? Copy its text and paste it here. PDF upload isn't supported yet, so nothing gets misread.</p>
            {generating && <p className="text-[13px] text-subtle" role="status">This usually takes 5–20 seconds. We're matching prices, dates and inclusions to your exact words.</p>}
          </div>
        </Card>
      )}

      {configured && result && (
        <Review result={result} onReset={() => setResult(null)} />
      )}
    </div>
  );
}

function SetupNotice() {
  return (
    <Card className="p-5 sm:p-6">
      <div className="flex gap-4">
        <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-peach text-brand-ink"><KeyRound className="size-5" aria-hidden /></div>
        <div className="min-w-0 space-y-3">
          <div>
            <h2 className="text-lg font-extrabold">AI Package Studio isn't available right now</h2>
            <p className="mt-1 text-[15px] text-subtle">The AI provider isn't configured on this server, so itineraries can't be read automatically yet. You can still create the same package manually.</p>
          </div>
          <Button to="/operator/packages/new"><PenLine className="size-4" />Create package manually</Button>
        </div>
      </div>
    </Card>
  );
}

function NF({ value }) {
  return value === '' || value == null ? <Badge tone="warning" className="ml-1 align-middle">Not found in post</Badge> : null;
}

function Review({ result, onReset }) {
  const navigate = useNavigate();
  const { draft, missing = [], warnings = [], provider, model } = result;
  const [form, setForm] = useState(() => draftToForm(draft));
  const [deps, setDeps] = useState(() => (draft.departureDates || []).map((d) => ({
    key: d, startDate: d, capacity: draft.capacity != null ? String(draft.capacity) : '', price: draft.basePrice != null ? String(draft.basePrice) : '',
  })));
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const setVal = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));
  const today = toInputDate(new Date());

  const label = (text, k) => <>{text}<NF value={form[k]} /></>;

  const save = async () => {
    if (form.title.trim().length < 4) { toast.error('Add a package title (at least 4 characters)'); return; }
    const num = (v) => (v === '' ? null : Number(v));
    for (const k of ['durationDays', 'durationNights', 'basePrice']) {
      if (form[k] !== '' && (!Number.isFinite(Number(form[k])) || Number(form[k]) < 0)) { toast.error('Duration and price must be positive numbers'); return; }
    }
    if (form.durationDays !== '' && form.durationNights !== '' && Number(form.durationNights) > Number(form.durationDays)) { toast.error('Nights can’t exceed days'); return; }
    const toCreate = deps.filter((d) => d.startDate && d.capacity !== '' && d.price !== '');
    if (deps.some((d) => d.startDate && (d.capacity === '' || d.price === '') && (d.capacity !== '' || d.price !== ''))) {
      toast.error('Each departure needs both seats and price, or leave both empty to skip it');
      return;
    }
    if (toCreate.some((d) => !Number.isInteger(Number(d.capacity)) || Number(d.capacity) < 1 || Number(d.capacity) > 500)) { toast.error('Seats must be between 1 and 500'); return; }

    setSaving(true);
    try {
      const pkg = await api.post('/operator/packages', {
        title: form.title, destination: form.destination, region: form.region, country: form.country || undefined, startLocation: form.startLocation,
        durationDays: num(form.durationDays), durationNights: num(form.durationNights), basePrice: num(form.basePrice), currency: form.currency || 'INR',
        transport: form.transport, accommodation: form.accommodation, meals: form.meals, highlights: form.highlights,
        itinerary: form.itinerary.filter((d) => d.title.trim()), inclusions: form.inclusions, exclusions: form.exclusions,
        cancellationPolicy: form.cancellationPolicy, pickupInfo: form.pickupInfo, categories: form.categories, summary: form.summary.slice(0, 300),
        source: 'ai', aiWarnings: [...missing.map((m) => `Missing: ${m}`), ...warnings],
      });

      const days = Number(form.durationDays);
      let created = 0;
      let skipped = 0;
      const failed = [];
      if (toCreate.length && !days) {
        skipped = toCreate.length;
      } else {
        for (const d of toCreate) {
          try {
            await api.post(`/operator/packages/${pkg._id}/departures`, { startDate: d.startDate, endDate: addDays(d.startDate, days - 1), price: Number(d.price), totalCapacity: Number(d.capacity) });
            created += 1;
          } catch (err) {
            failed.push(`${d.startDate}: ${err.message}`);
          }
        }
      }
      toast.success(`Draft saved${created ? ` with ${created} departure${created > 1 ? 's' : ''}` : ''}`);
      if (skipped) toast.error('Departures were skipped because the duration is unknown. Add them in the Departures tab.', { duration: 6000 });
      if (failed.length) toast.error(`Some departures weren't created: ${failed.join('; ')}`, { duration: 7000 });
      navigate(`/operator/packages/${pkg._id}`);
    } catch (err) {
      toast.error(err.message);
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-extrabold">Review the extracted package</h2>
          <p className="text-[13px] text-subtle">Extracted by {provider} · {model}. Check every field against your post.</p>
        </div>
        <Button variant="ghost" size="sm" onClick={onReset} disabled={saving}><RotateCcw className="size-4" />Start over</Button>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Notice tone="warning" title={`Missing information (${missing.length})`}>
          {missing.length ? (
            <ul className="mt-1 grid gap-1 sm:grid-cols-2">{missing.map((m) => <li key={m} className="flex items-center gap-2"><span className="size-1.5 shrink-0 rounded-full bg-warning" aria-hidden />{m}</li>)}</ul>
          ) : 'Your post covered all the key fields.'}
        </Notice>
        <Notice tone="info" title="Check before publishing">
          {warnings.length ? <ul className="mt-1 list-disc space-y-0.5 pl-5">{warnings.map((w) => <li key={w}>{w}</li>)}</ul> : 'No ambiguities were flagged.'}
        </Notice>
      </div>

      <Card className="space-y-5 p-5 sm:p-6">
        <h3 className="text-base font-extrabold">Basics</h3>
        <Input label={label('Package title', 'title')} required value={form.title} onChange={set('title')} />
        <Textarea label={label('Short summary', 'summary')} rows={2} maxLength={300} value={form.summary} onChange={set('summary')} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label={label('Destination', 'destination')} value={form.destination} onChange={set('destination')} />
          <Input label={label('Region / state', 'region')} value={form.region} onChange={set('region')} />
          <Input label={label('Country', 'country')} value={form.country} onChange={set('country')} />
          <Input label={label('Starting city', 'startLocation')} value={form.startLocation} onChange={set('startLocation')} />
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Input label={label('Days', 'durationDays')} type="number" min="1" value={form.durationDays} onChange={set('durationDays')} />
          <Input label={label('Nights', 'durationNights')} type="number" min="0" value={form.durationNights} onChange={set('durationNights')} />
          <Input label={label('Price / person', 'basePrice')} type="number" min="0" value={form.basePrice} onChange={set('basePrice')} />
          <Input label={label('Currency', 'currency')} value={form.currency} onChange={set('currency')} placeholder="INR" />
        </div>
        <CategoryPicker value={form.categories} onChange={setVal('categories')} hint={form.categories.length ? undefined : 'None detected. Pick the ones that fit.'} />
        <ListEditor label="Activities & highlights" value={form.highlights} onChange={setVal('highlights')} placeholder="Add an activity" hint={form.highlights.length ? undefined : 'Not found in post'} />
      </Card>

      <Card className="space-y-5 p-5 sm:p-6">
        <h3 className="text-base font-extrabold">Logistics</h3>
        <Textarea label={label('Transport', 'transport')} rows={2} value={form.transport} onChange={set('transport')} />
        <Textarea label={label('Accommodation', 'accommodation')} rows={2} value={form.accommodation} onChange={set('accommodation')} />
        <Input label={label('Meals', 'meals')} value={form.meals} onChange={set('meals')} />
        <Textarea label={label('Pickup & reporting', 'pickupInfo')} rows={2} value={form.pickupInfo} onChange={set('pickupInfo')} />
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <ListEditor label="Inclusions" value={form.inclusions} onChange={setVal('inclusions')} placeholder="Add an inclusion" hint={form.inclusions.length ? undefined : 'Not found in post'} />
          <ListEditor label="Exclusions" value={form.exclusions} onChange={setVal('exclusions')} placeholder="Add an exclusion" hint={form.exclusions.length ? undefined : 'Not found in post. Travellers expect this.'} />
        </div>
        <Textarea label={label('Cancellation policy', 'cancellationPolicy')} rows={3} value={form.cancellationPolicy} onChange={set('cancellationPolicy')} hint="Required before publishing" />
      </Card>

      <div className="space-y-3">
        <h3 className="text-base font-extrabold">Itinerary {form.itinerary.length === 0 && <Badge tone="warning" className="ml-1 align-middle">Not found in post</Badge>}</h3>
        <ItineraryEditor value={form.itinerary} onChange={setVal('itinerary')} />
      </div>

      <Card className="space-y-4 p-5 sm:p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-base font-extrabold">Detected departures</h3>
            <p className="text-[13px] text-subtle">Add seats and price to create a departure now, or leave a row blank to skip it.</p>
          </div>
          <Button size="sm" variant="secondary" onClick={() => setDeps((x) => [...x, { key: `n${Date.now()}`, startDate: '', capacity: '', price: form.basePrice }])}><CalendarPlus className="size-4" />Add date</Button>
        </div>
        {deps.length === 0 && <p className="rounded-xl bg-sand px-4 py-3 text-sm text-subtle">No departure dates were found in your post.</p>}
        {deps.map((d, i) => (
          <div key={d.key} className="grid grid-cols-2 items-end gap-3 rounded-xl border border-line p-3 sm:grid-cols-[1.3fr_1fr_1fr_auto]">
            <Input className="col-span-2 sm:col-span-1" label="Departure date" type="date" min={today} value={d.startDate} onChange={(e) => setDeps((x) => x.map((y, j) => (j === i ? { ...y, startDate: e.target.value } : y)))} />
            <Input label={<>Seats{d.capacity === '' && <NF value="" />}</>} type="number" min="1" max="500" value={d.capacity} onChange={(e) => setDeps((x) => x.map((y, j) => (j === i ? { ...y, capacity: e.target.value } : y)))} />
            <Input label="Price" type="number" min="0" value={d.price} onChange={(e) => setDeps((x) => x.map((y, j) => (j === i ? { ...y, price: e.target.value } : y)))} />
            <button type="button" onClick={() => setDeps((x) => x.filter((_, j) => j !== i))} className="col-span-2 grid h-11 place-items-center rounded-xl text-subtle hover:bg-danger-bg hover:text-danger sm:col-span-1 sm:w-11" aria-label="Remove departure"><Trash2 className="size-4" /></button>
          </div>
        ))}
        {deps.length > 0 && !form.durationDays && (
          <Notice tone="warning">Duration is unknown, so return dates can't be calculated. Departures will be skipped until you add the number of days.</Notice>
        )}
      </Card>

      <div className="sticky bottom-4 z-30">
        <div className="flex flex-col gap-3 rounded-2xl border border-line bg-white/95 p-4 shadow-lift backdrop-blur sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-subtle">Saved as a <span className="font-bold text-ink">draft</span>. You'll add photos and publish from the editor.</p>
          <Button onClick={save} loading={saving}>Save as draft</Button>
        </div>
      </div>
    </div>
  );
}
