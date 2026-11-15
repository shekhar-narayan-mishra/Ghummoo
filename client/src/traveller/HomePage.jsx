import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Briefcase, Compass, MapPinned, Sparkles } from 'lucide-react';
import { Button } from '../components/ui';
import useAsync from '../lib/useAsync';
import usePageTitle from '../lib/usePageTitle';
import { listTrips, getLandscapes, getCities } from '../lib/catalog';
import SearchBox from '../design/SearchBox';
import { TripCard, DestinationCard, LandscapeTile } from '../design/Cards';
import { GridSkeleton, ErrorState, EmptyState, Bone } from '../design/Feedback';
import { usePaths } from '../design/context';
import { Himalayas } from '../scenes/landscapes';
import { useSceneMotion } from '../motion/useSceneMotion';

function SectionHead({ eyebrow, id, title, children, action }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="max-w-2xl">
        {eyebrow && <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-brand-ink">{eyebrow}</p>}
        <h2 id={id} className="mt-1 text-[28px] font-extrabold leading-tight sm:text-4xl">{title}</h2>
        {children && <p className="mt-2 text-[16px] text-subtle">{children}</p>}
      </div>
      {action}
    </div>
  );
}

export default function HomePage() {
  usePageTitle('Ghumo AI: group trips across India');
  const paths = usePaths();
  const hero = useRef(null);
  useSceneMotion(hero);
  const trips = useAsync(() => listTrips({ available: true, limit: 6 }), []);
  const landscapes = useAsync(getLandscapes, []);
  const cities = useAsync(getCities, []);
  const hasDemo = trips.data?.items.some((t) => t.isDemo);
  // When the API is down every section fails together: show one notice, not three.
  const failed = [trips, landscapes, cities].filter((x) => x.error);
  const outage = failed.length > 1;
  const retryAll = () => failed.forEach((x) => x.reload());

  return (
    <>
      <section ref={hero} className="relative isolate overflow-hidden">
        <div data-scene className="absolute inset-0 -z-10 [&_svg]:h-full [&_svg]:w-full"><Himalayas /></div>
        {/* Keeps hero text readable over the scene, stronger on phones. */}
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-ivory/85 via-ivory/70 to-ivory sm:from-ivory/55 sm:via-ivory/45" aria-hidden />
        <div className="mx-auto max-w-7xl px-4 pb-10 pt-10 sm:px-6 sm:pb-16 sm:pt-20 lg:px-8 lg:pb-24 lg:pt-24">
          <div className="max-w-3xl">
            <p className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3.5 py-1.5 text-[13px] font-extrabold text-brand-ink ring-1 ring-white backdrop-blur">
              <span className="size-1.5 rounded-full bg-brand" aria-hidden />Group trips from independent organisers
            </p>
            <h1 className="mt-5 text-[42px] font-extrabold leading-[1.02] tracking-[-0.035em] sm:text-6xl lg:text-[76px]">
              India is better<br /><span className="text-brand">explored together.</span>
            </h1>
            <p className="mt-5 max-w-xl text-[17px] font-medium leading-relaxed text-ink/80 sm:text-lg">
              Find a fixed-departure group trip, see exactly what's included, and travel with people who want the same journey.
            </p>
          </div>
          <SearchBox className="mt-6 max-w-2xl sm:mt-8" />
          <div className="mt-5 grid max-w-3xl gap-3 sm:mt-8 sm:grid-cols-2">
            <Link to={paths.trips()} className="group flex items-start gap-4 rounded-[24px] bg-white/90 p-4 sm:p-5 ring-1 ring-white backdrop-blur transition hover:-translate-y-0.5 hover:shadow-lift motion-reduce:hover:translate-y-0">
              <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-peach text-brand-ink sm:size-12"><MapPinned className="size-5 sm:size-6" aria-hidden /></span>
              <span>
                <span className="block text-lg font-extrabold">I know where I want to go</span>
                <span className="mt-0.5 hidden text-sm text-subtle sm:block">Browse trips by place, dates and budget.</span>
                <span className="mt-1 inline-flex items-center gap-1 text-sm font-extrabold text-brand-ink sm:mt-2">Browse trips<ArrowRight className="size-4 transition group-hover:translate-x-0.5" aria-hidden /></span>
              </span>
            </Link>
            <Link to={paths.decide} className="group flex items-start gap-4 rounded-[24px] bg-ink p-4 sm:p-5 text-white transition hover:-translate-y-0.5 hover:shadow-lift motion-reduce:hover:translate-y-0">
              <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-action text-white sm:size-12"><Sparkles className="size-5 sm:size-6" aria-hidden /></span>
              <span>
                <span className="block text-lg font-extrabold">Help me decide</span>
                <span className="mt-0.5 hidden text-sm text-white/75 sm:block">Tell us your budget, dates and vibe. We'll suggest listed trips that fit.</span>
                <span className="mt-1 inline-flex items-center gap-1 text-sm font-extrabold text-brand-soft sm:mt-2">Get suggestions<ArrowRight className="size-4 transition group-hover:translate-x-0.5" aria-hidden /></span>
              </span>
            </Link>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl space-y-16 px-4 pt-4 sm:space-y-20 sm:px-6 sm:pt-8 lg:px-8">
        {outage && <ErrorState error={failed[0].error} onRetry={retryAll} />}
        {!(outage && trips.error) && (
        <section aria-labelledby="curated">
          <SectionHead eyebrow="Leaving soon" id="curated" title="Trips with open seats" action={<Button variant="secondary" to={paths.trips()}>All trips<ArrowRight className="size-4" /></Button>}>
            The next departures with seats, straight from organisers' listings.{hasDemo && ' Listings marked Demo are sample data for this preview.'}
          </SectionHead>
          {trips.loading ? <GridSkeleton count={3} label="Loading trips" />
            : trips.error ? (outage ? null : <ErrorState error={trips.error} onRetry={trips.reload} />)
              : trips.data.items.length === 0 ? <EmptyState title="No departures with open seats right now">New trips appear here as soon as organisers publish dates.</EmptyState>
                : <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{trips.data.items.slice(0, 6).map((t) => <TripCard key={t._id} trip={t} />)}</div>}
        </section>
        )}

        {!(outage && landscapes.error) && (
        <section aria-labelledby="explore">
          <SectionHead eyebrow="Explore India" id="explore" title="Six landscapes, one country" action={<Button variant="secondary" to={paths.india()}>Start exploring<Compass className="size-4" /></Button>}>
            From Himalayan valleys to the backwaters of Kerala. Pick a landscape, then find the trips that go there.
          </SectionHead>
          {landscapes.loading ? <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">{Array.from({ length: 6 }, (_, i) => <Bone key={i} className="aspect-[4/3] rounded-[24px]" />)}</div>
            : landscapes.error ? (outage ? null : <ErrorState error={landscapes.error} onRetry={landscapes.reload} />)
              : <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">{landscapes.data.map((l) => <LandscapeTile key={l.slug} landscape={l} to={paths.india(`#${l.slug}`)} />)}</div>}
        </section>
        )}

        {!(outage && cities.error) && (
        <section aria-labelledby="cities">
          <SectionHead eyebrow="Cities" id="cities" title="Start from a city" action={<Button variant="secondary" to={paths.cities}>All cities<ArrowRight className="size-4" /></Button>}>
            Ten cities, each with its own landmarks, food and nearby escapes, and the trips that go there or leave from there.
          </SectionHead>
          {cities.loading ? <GridSkeleton count={5} kind="place" label="Loading cities" />
            : cities.error ? (outage ? null : <ErrorState error={cities.error} onRetry={cities.reload} />)
              : (
                <ul className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0" aria-label="Cities">
                  {cities.data.map((c) => (
                    <li key={c.slug} className="w-[62%] shrink-0 snap-start sm:w-[30%] lg:w-[19%]">
                      <DestinationCard place={c} size="sm" tripCount={c.tripCounts.to + c.tripCounts.from} />
                    </li>
                  ))}
                </ul>
              )}
        </section>
        )}

        <section className="relative overflow-hidden rounded-[32px] bg-ink px-6 py-12 text-white sm:px-12">
          <div className="absolute -right-24 -top-24 size-80 rounded-full bg-brand/30 blur-3xl" aria-hidden />
          <div className="relative grid items-center gap-8 lg:grid-cols-[1.4fr_1fr]">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-brand-soft">For organisers</p>
              <h2 className="mt-2 text-3xl font-extrabold leading-tight sm:text-4xl">Run group trips? Bring them to Ghumo.</h2>
              <p className="mt-3 max-w-xl text-white/80">Turn an Instagram post into a listing with AI Package Studio, take booking requests, and keep your group updated in one place. You confirm every booking and handle payment directly.</p>
            </div>
            <div className="flex flex-wrap gap-3 lg:justify-end">
              <Button to="/register?role=operator" size="lg"><Briefcase className="size-5" />List your trips</Button>
              <Button to="/partners" size="lg" variant="secondary">How it works for organisers</Button>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
