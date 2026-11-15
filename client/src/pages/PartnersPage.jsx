import { ArrowRight, BadgeCheck, CalendarRange, ClipboardList, Download, FileText, Link2, Megaphone, Search, ShieldCheck, Sparkles, Users, Wallet, X, Check } from 'lucide-react';
import { Button, SafeImage } from '../components/ui';
import { useAuth } from '../lib/auth';
import usePageTitle from '../lib/usePageTitle';

const IMG = 'https://images.unsplash.com/photo-1530866495561-507c9faab2ed?w=1400&q=72&auto=format&fit=crop';
const CAPTION = 'Manali Kasol trip 🏔️ 5D/4N · ₹7,999 per person · Delhi to Delhi Volvo · 2 nights hotel, breakfast + dinner · bonfire, Solang Valley · starting 15 Dec. DM to book!';

const VALUE = [
  [Link2, 'A real page for every trip', 'Itinerary, dates, seats, inclusions and your cancellation policy on one link you can share anywhere, instead of the same answers in fifty DMs.'],
  [Search, 'Be found by people looking for group trips', 'Travellers browse by place, budget, dates and mood. Your published trips appear in those results alongside everyone else\'s. We can\'t promise how many people will book.'],
  [Sparkles, 'Turn your caption into a listing', 'Paste the description you already use. AI Package Studio drafts a structured trip and lists what\'s missing. It never fills gaps with guesses, and you review everything.'],
  [CalendarRange, 'Departures, seats and requests in one place', 'Run several dates per trip, each with its own price and capacity. Seats are held as requests come in, so you can\'t be overbooked.'],
  [ClipboardList, 'Less back-and-forth', 'Traveller details arrive with each request, you confirm or decline in a tap, and one board carries pickup points and updates to confirmed travellers.'],
];

const STEPS = [
  ['Create your organiser account', 'Your business name, how travellers reach you and where you operate. About five minutes.'],
  ['Add your first trip', 'Paste a description or build it by hand, add departure dates and seats, and preview it.'],
  ['Get approved, then publish', 'Our team reviews new organisers before their trips go live. You can prepare drafts meanwhile.'],
  ['Manage requests and your group', 'Confirm requests, record payments you receive, export traveller lists and post trip updates.'],
];

export default function PartnersPage() {
  usePageTitle('For organisers');
  const { user } = useAuth();
  const cta = user?.role === 'operator'
    ? { to: '/operator', label: 'Go to your dashboard' }
    : user ? { to: '/register?role=operator', label: 'List your trips', note: 'You\'re signed in as a traveller. Organiser accounts are separate, so you\'ll create a new one.' }
      : { to: '/register?role=operator', label: 'List your trips' };

  return (
    <div className="pb-8">
      <section className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-10 sm:px-6 lg:grid-cols-2 lg:px-8 lg:py-16">
        <div>
          <p className="text-sm font-extrabold uppercase tracking-wider text-brand-ink">For independent travel organisers</p>
          <h1 className="mt-2 text-[40px] font-extrabold leading-[1.04] tracking-[-0.03em] sm:text-[58px]">Your trips deserve more than a DM.</h1>
          <p className="mt-5 max-w-lg text-[17px] leading-relaxed text-subtle">Give every group trip its own page, take booking requests with seats tracked for you, and keep your travellers updated from one dashboard.</p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Button size="lg" to={cta.to}>{cta.label}<ArrowRight className="size-4" /></Button>
            <Button size="lg" variant="secondary" href="#how">How it works</Button>
          </div>
          {cta.note && <p className="mt-3 max-w-md text-sm text-subtle">{cta.note}</p>}
          <ul className="mt-8 grid gap-2 text-[15px] font-semibold sm:grid-cols-2">
            {['No listing fees or commission during the preview', 'You set prices and take payment directly', 'Works with the captions you already write', 'You confirm every booking yourself'].map((x) => <li key={x} className="flex items-start gap-2"><Check className="mt-0.5 size-4 shrink-0 text-success" strokeWidth={3} />{x}</li>)}
          </ul>
        </div>
        <div className="relative">
          <SafeImage src={IMG} alt="A group rafting on a mountain river" eager className="aspect-[4/5] w-full rounded-[32px] sm:aspect-[4/3] lg:aspect-[4/5]" sizes="(min-width:1024px) 50vw, 100vw" />
          <div id="studio" className="glass absolute inset-x-4 bottom-4 scroll-mt-24 rounded-3xl p-5 shadow-lift sm:inset-x-8 sm:bottom-8">
            <p className="flex items-center gap-2 text-sm font-extrabold text-brand-ink"><Sparkles className="size-4" />From caption to listing</p>
            <p className="mt-2 line-clamp-3 rounded-2xl bg-white/80 p-3 text-[13px] italic text-subtle">“{CAPTION}”</p>
            <div className="mt-3 flex flex-wrap gap-1.5 text-[12px] font-bold">
              {['5D / 4N', '₹7,999 per person', 'Delhi → Delhi', 'Volvo', '15 Dec'].map((t) => <span key={t} className="rounded-full bg-success-bg px-2.5 py-1 text-success">{t}</span>)}
              {['Seat capacity missing', 'Cancellation policy missing'].map((t) => <span key={t} className="rounded-full bg-warning-bg px-2.5 py-1 text-warning">{t}</span>)}
            </div>
            <p className="mt-2 text-[11px] text-subtle">Example of what the studio extracts and flags</p>
          </div>
        </div>
      </section>

      <section aria-labelledby="value-h" className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h2 id="value-h" className="max-w-2xl text-3xl font-extrabold leading-tight sm:text-4xl">What Ghumo does for you</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {VALUE.map(([Icon, t, d]) => (
            <div key={t} className="rounded-3xl border border-line bg-white p-6">
              <div className="grid size-11 place-items-center rounded-2xl bg-peach text-brand-ink"><Icon className="size-5" aria-hidden /></div>
              <h3 className="mt-4 text-lg font-extrabold">{t}</h3><p className="mt-1.5 text-[15px] leading-relaxed text-subtle">{d}</p>
            </div>
          ))}
          <div className="rounded-3xl bg-ink p-6 text-white">
            <div className="grid size-11 place-items-center rounded-2xl bg-white/10 text-brand-soft"><Users className="size-5" aria-hidden /></div>
            <h3 className="mt-4 text-lg font-extrabold">Also included</h3>
            <ul className="mt-2 space-y-1.5 text-[15px] text-white/85">
              <li className="flex gap-2"><Download className="mt-1 size-4 shrink-0" aria-hidden />Traveller lists as CSV</li>
              <li className="flex gap-2"><Wallet className="mt-1 size-4 shrink-0" aria-hidden />A record of offline payments</li>
              <li className="flex gap-2"><Megaphone className="mt-1 size-4 shrink-0" aria-hidden />Updates for confirmed travellers</li>
              <li className="flex gap-2"><FileText className="mt-1 size-4 shrink-0" aria-hidden />Views and requests per trip</li>
            </ul>
          </div>
        </div>
      </section>

      <section id="how" aria-labelledby="how-h" className="mx-auto mt-20 max-w-7xl scroll-mt-24 px-4 sm:px-6 lg:px-8">
        <h2 id="how-h" className="text-3xl font-extrabold leading-tight sm:text-4xl">From sign-up to your first request</h2>
        <ol className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map(([t, d], i) => (
            <li key={t} className="rounded-3xl bg-sand p-6">
              <span className="grid size-9 place-items-center rounded-full bg-action text-sm font-extrabold text-white">{i + 1}</span>
              <h3 className="mt-4 font-extrabold">{t}</h3><p className="mt-1.5 text-[15px] text-subtle">{d}</p>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="honest-h" className="mx-auto mt-20 grid max-w-7xl gap-6 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
        <div className="rounded-3xl border border-line bg-white p-6 sm:p-8">
          <h2 id="honest-h" className="flex items-center gap-2 text-2xl font-extrabold"><ShieldCheck className="size-6 text-brand" aria-hidden />Approval and the Verified badge</h2>
          <p className="mt-3 text-[15px] leading-relaxed text-subtle">Every new organiser is reviewed before their trips go public. Separately, you can submit business registration details (GST, Udyam/MSME, company or state tourism registration). The <span className="inline-flex items-center gap-1 font-bold text-ink"><BadgeCheck className="size-4 text-success" aria-hidden />Verified</span> badge shows only after our team has checked them <em>and</em> your profile is approved.</p>
        </div>
        <div className="rounded-3xl border border-line bg-white p-6 sm:p-8">
          <h2 className="text-2xl font-extrabold">What we don't do</h2>
          <ul className="mt-3 space-y-2 text-[15px] text-subtle">
            {['Promise a number of travellers, bookings or revenue', 'Take payments or hold your money: travellers pay you directly', 'Publish anything on your behalf: you review every listing', 'Share travellers\' details with anyone but the trip\'s organiser'].map((x) => <li key={x} className="flex gap-2"><X className="mt-0.5 size-4 shrink-0 text-danger" aria-hidden />{x}</li>)}
          </ul>
        </div>
      </section>

      <section className="mx-auto mt-20 max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-start justify-between gap-6 rounded-[32px] bg-ink px-6 py-10 text-white sm:flex-row sm:items-center sm:px-12">
          <div><h2 className="text-3xl font-extrabold">Ready to put a trip online?</h2><p className="mt-2 text-white/75">Start with one trip. You can save drafts and come back any time.</p></div>
          <Button size="lg" to={cta.to}>{cta.label}<ArrowRight className="size-4" /></Button>
        </div>
      </section>
    </div>
  );
}
