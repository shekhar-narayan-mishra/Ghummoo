import { useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowDown, ArrowRight, Landmark, MapPin } from 'lucide-react';
import { Button, cx } from '../components/ui';
import useAsync from '../lib/useAsync';
import usePageTitle from '../lib/usePageTitle';
import { getLandscapes, getLandscape, getCities, getPlace, listTrips } from '../lib/catalog';
import { TripCard, DestinationCard } from '../design/Cards';
import { GuideLabel, ErrorState, Bone, GridSkeleton } from '../design/Feedback';
import { usePaths } from '../design/context';
import { LANDSCAPE_SCENES, CITY_SCENES, LandscapeArt } from '../scenes';
import { useSceneMotion, useReveal, refreshScroll } from '../motion/useSceneMotion';

const FEATURED = ['jaipur', 'varanasi', 'delhi', 'mumbai'];

async function loadExplore() {
  const [landscapes, cities, soon] = await Promise.all([getLandscapes(), getCities(), listTrips({ available: true, limit: 3 })]);
  const [chapters, stories] = await Promise.all([
    Promise.all(landscapes.map((l) => getLandscape(l.slug))),
    Promise.all(FEATURED.map((s) => getPlace(s))),
  ]);
  return { landscapes, chapters, cities, stories, soon: soon.items };
}

function LandscapeChapter({ landscape, index, total }) {
  const paths = usePaths();
  const Scene = LANDSCAPE_SCENES[landscape.slug];
  const trips = landscape.trips.slice(0, 2);
  return (
    <section id={landscape.slug} aria-labelledby={`${landscape.slug}-h`} className="scroll-mt-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div data-scene className="relative h-[220px] overflow-hidden rounded-[32px] sm:h-[300px] lg:h-[360px] [&_svg]:size-full" style={{ background: landscape.palette.secondary }}>
          {Scene && <Scene />}
          <span className="absolute left-4 top-4 rounded-full bg-white/85 px-3 py-1 text-xs font-extrabold text-ink backdrop-blur">Chapter {index + 1} of {total}</span>
        </div>
        <div className={cx('mt-5 grid gap-5 sm:mt-6 lg:grid-cols-[1fr_1.15fr] lg:gap-8', index % 2 && 'lg:[&>*:first-child]:order-2')}>
          <div className="rounded-[28px] bg-white p-6 ring-1 ring-line sm:p-8">
            <GuideLabel />
            <h2 id={`${landscape.slug}-h`} className="mt-2 text-3xl font-extrabold leading-tight sm:text-[40px]" style={{ color: landscape.palette.ink }}>{landscape.name}</h2>
            <p className="mt-1 flex items-center gap-2 text-[15px] font-bold text-ink/75"><span className="size-2.5 shrink-0 rounded-full" style={{ background: landscape.palette.primary }} aria-hidden />{landscape.tagline}</p>
            <p className="mt-4 text-[16px] leading-relaxed text-ink/85">{landscape.intro}</p>
            <ul className="mt-5 flex flex-wrap gap-x-4 gap-y-1" aria-label={`Places in ${landscape.name}`}>
              {landscape.places.slice(0, 8).map((p) => (
                <li key={p.slug}><Link to={paths.place(p.slug)} className="inline-flex min-h-8 items-center gap-1 text-[14px] font-bold underline decoration-line decoration-2 underline-offset-4 hover:text-brand-ink hover:decoration-brand"><MapPin className="size-3.5 text-brand" aria-hidden />{p.name}</Link></li>
              ))}
            </ul>
            <Button variant="dark" className="mt-6" to={paths.trips(`?landscape=${landscape.slug}`)}>
              {landscape.trips.length ? `See ${landscape.trips.length} trip${landscape.trips.length > 1 ? 's' : ''}` : 'See trips'}<ArrowRight className="size-4" />
            </Button>
          </div>
          <div data-reveal-group className="grid content-end gap-4 sm:grid-cols-2">
            {trips.length ? trips.map((t) => <div key={t._id} data-reveal><TripCard trip={t} /></div>) : (
              <p data-reveal className="self-end rounded-[24px] bg-white/80 p-5 text-sm font-semibold text-subtle ring-1 ring-line sm:col-span-2">No organiser lists a trip here yet.</p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function CityStory({ city }) {
  const paths = usePaths();
  const Scene = CITY_SCENES[city.slug];
  const pal = city.theme.palette;
  const trips = [...city.relatedPackages.to, ...city.relatedPackages.from, ...city.relatedPackages.nearby]
    .filter((t, i, a) => a.findIndex((x) => x.slug === t.slug) === i).slice(0, 3);
  return (
    <section id={`city-${city.slug}`} aria-labelledby={`city-${city.slug}-h`} className="scroll-mt-16 py-16 sm:py-24" style={{ background: pal.secondary }}>
      <div className="mx-auto grid max-w-7xl gap-8 px-4 sm:px-6 lg:grid-cols-[1.1fr_1fr] lg:gap-12 lg:px-8">
        <div className="lg:sticky lg:top-24 lg:self-start">
          <div data-scene data-handoff={city.slug === 'delhi' ? `#city-${city.slug}-trips` : undefined} className="aspect-[4/3] overflow-hidden rounded-[32px] shadow-lift ring-1 ring-black/5 sm:aspect-[16/11] [&_svg]:size-full">
            {Scene && <Scene title={`Illustration of ${city.name}: ${city.landmarks.slice(0, 3).map((m) => m.name).join(', ')}`} />}
          </div>
          <p className="mt-3 text-xs font-semibold" style={{ color: pal.ink }}>Original illustration · {city.theme.name}</p>
        </div>
        <div style={{ color: pal.ink }}>
          <GuideLabel inherit />
          <h2 id={`city-${city.slug}-h`} className="mt-2 text-4xl font-extrabold leading-none sm:text-6xl">{city.name}</h2>
          <p className="mt-2 text-[15px] font-bold opacity-80">{city.state} · {city.theme.name}</p>
          <p className="mt-5 text-[17px] leading-relaxed">{city.intro}</p>
          <div data-reveal-group className="mt-8">
            <h3 className="text-xs font-extrabold uppercase tracking-[0.16em] opacity-80">Landmarks</h3>
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              {city.landmarks.map((m) => (
                <li key={m.slug} data-reveal className="flex gap-3 rounded-2xl bg-white/80 p-3.5 text-ink">
                  <span className="grid size-9 shrink-0 place-items-center rounded-xl text-white" style={{ background: pal.primary }}><Landmark className="size-4" aria-hidden /></span>
                  <span><span className="block font-extrabold leading-snug">{m.name}</span><span className="mt-0.5 block text-[13px] leading-snug text-subtle">{m.description}</span></span>
                </li>
              ))}
            </ul>
          </div>
          <div data-reveal-group className="mt-8">
            <h3 className="text-xs font-extrabold uppercase tracking-[0.16em] opacity-80">Often visited with {city.name}</h3>
            <ul className="mt-3 flex flex-wrap gap-2">
              {city.nearby.map((n) => (
                <li key={n.slug} data-reveal><Link to={paths.place(n.slug)} className="inline-flex h-10 items-center gap-1.5 rounded-full bg-white px-4 text-sm font-extrabold text-ink ring-1 ring-black/5 hover:ring-brand"><MapPin className="size-3.5" style={{ color: pal.primary }} aria-hidden />{n.name}</Link></li>
              ))}
            </ul>
            <p className="mt-2 text-xs font-semibold opacity-80">Grouped by how often trips combine them, not by distance.</p>
          </div>
          <div id={`city-${city.slug}-trips`} data-reveal-group className="mt-10">
            <h3 className="text-xs font-extrabold uppercase tracking-[0.16em] opacity-80">Trips</h3>
            {trips.length
              ? <div className="mt-3 grid gap-4 sm:grid-cols-2">{trips.map((t) => <div key={t._id} data-reveal><TripCard trip={t} /></div>)}</div>
              : <p data-reveal className="mt-3 rounded-2xl bg-white/80 p-4 text-sm font-semibold text-ink">No organiser lists a trip here yet.</p>}
            <Button className="mt-6" to={paths.trips(`?place=${city.slug}`)}>All trips for {city.name}<ArrowRight className="size-4" /></Button>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function ExploreIndiaPage() {
  usePageTitle('Explore India');
  const paths = usePaths();
  const root = useRef(null);
  const { hash } = useLocation();
  const { data, error, loading, reload } = useAsync(loadExplore, []);
  useSceneMotion(root, [data]);
  useReveal(root, [data]);
  useEffect(() => {
    if (!data || !hash) return;
    const el = document.getElementById(decodeURIComponent(hash.slice(1)));
    if (el) requestAnimationFrame(() => { el.scrollIntoView({ block: 'start' }); refreshScroll(); });
  }, [data, hash]);

  return (
    <div ref={root}>
      <header className="mx-auto grid max-w-7xl items-end gap-10 px-4 pb-10 pt-12 sm:px-6 sm:pt-16 lg:grid-cols-[1.15fr_1fr] lg:px-8">
        <div className="min-w-0">
          <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-brand-ink">Explore India</p>
          <h1 className="mt-2 max-w-3xl text-[40px] font-extrabold leading-[1.04] tracking-[-0.03em] sm:text-6xl lg:text-[56px]">Six landscapes. Four city stories. Real trips at every stop.</h1>
          <p className="mt-4 max-w-2xl text-[17px] text-subtle">Scroll through India's landscapes and cities. Every chapter ends in trips you can open, compare and request.</p>
          <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-3">
            <Button href="#all-trips" variant="dark"><ArrowDown className="size-4" />Skip to trips</Button>
            <Button to={paths.trips()} variant="secondary">Search all trips</Button>
          </div>
          {data && (
            <nav aria-label="Chapters" className="mt-8 lg:hidden">
              <ul className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
                {data.landscapes.map((l) => <li key={l.slug} className="shrink-0"><a href={`#${l.slug}`} className="inline-flex h-10 items-center gap-2 rounded-full bg-white px-4 text-sm font-bold ring-1 ring-line hover:ring-brand"><span className="size-2.5 rounded-full" style={{ background: l.palette.primary }} aria-hidden />{l.name}</a></li>)}
              </ul>
              <p className="mt-3 flex gap-5 text-sm font-extrabold"><a href="#cities" className="text-brand-ink underline-offset-4 hover:underline">City stories →</a><a href="#city-index" className="text-brand-ink underline-offset-4 hover:underline">All cities →</a></p>
            </nav>
          )}
        </div>
        {data && (
          <nav aria-label="Chapters" className="hidden lg:block">
            <ul className="grid grid-cols-3 gap-3">
              {data.landscapes.map((l, i) => (
                <li key={l.slug}>
                  <a href={`#${l.slug}`} className="group block">
                    <LandscapeArt slug={l.slug} className="aspect-[4/3] rounded-2xl ring-1 ring-black/5 transition group-hover:-translate-y-0.5 group-hover:shadow-lift motion-reduce:group-hover:translate-y-0 [&>svg]:size-full" />
                    <span className="mt-2 block text-[13px] font-extrabold"><span className="text-subtle">{i + 1}.</span> {l.name}</span>
                  </a>
                </li>
              ))}
            </ul>
            <p className="mt-4 flex gap-5 text-sm font-extrabold"><a href="#cities" className="text-brand-ink underline-offset-4 hover:underline">City stories →</a><a href="#city-index" className="text-brand-ink underline-offset-4 hover:underline">All cities →</a></p>
          </nav>
        )}
      </header>

      {loading ? (
        <div className="mx-auto max-w-7xl space-y-6 px-4 sm:px-6 lg:px-8" role="status" aria-busy="true"><span className="sr-only">Loading Explore India</span><Bone className="h-[220px] rounded-[32px] sm:h-[300px] lg:h-[360px]" /><Bone className="h-48 rounded-[28px]" /></div>
      ) : error ? (
        <div className="mx-auto max-w-3xl px-4"><ErrorState error={error} onRetry={reload} /></div>
      ) : (
        <>
          <div className="space-y-20 sm:space-y-28">
            {data.chapters.map((l, i) => <LandscapeChapter key={l.slug} landscape={l} index={i} total={data.chapters.length} />)}
          </div>
          <div id="cities" className="mx-auto mt-24 max-w-7xl scroll-mt-20 px-4 pb-10 sm:px-6 lg:px-8">
            <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-brand-ink">City stories</p>
            <h2 className="mt-1 text-[32px] font-extrabold leading-tight sm:text-5xl">Four cities, four moods</h2>
            <p className="mt-2 max-w-2xl text-subtle">Jaipur's pink sandstone, Varanasi's river at dawn, Delhi's monuments and Mumbai's harbour.</p>
          </div>
          {data.stories.map((c) => <CityStory key={c.slug} city={c} />)}
          <section id="city-index" aria-labelledby="city-index-h" className="mx-auto mt-24 max-w-7xl scroll-mt-20 px-4 sm:px-6 lg:px-8">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div><p className="text-xs font-extrabold uppercase tracking-[0.16em] text-brand-ink">Cities</p><h2 id="city-index-h" className="mt-1 text-[32px] font-extrabold sm:text-4xl">All ten cities</h2></div>
              <Button variant="secondary" to={paths.cities}>Browse cities</Button>
            </div>
            <ul className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-5">
              {data.cities.map((c) => <li key={c.slug}><DestinationCard place={c} tripCount={c.tripCounts.to + c.tripCounts.from} /></li>)}
            </ul>
          </section>
        </>
      )}

      <section id="all-trips" aria-labelledby="all-trips-h" className="mx-auto mt-24 max-w-7xl scroll-mt-20 px-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div><p className="text-xs font-extrabold uppercase tracking-[0.16em] text-brand-ink">Trips</p><h2 id="all-trips-h" className="mt-1 text-[32px] font-extrabold sm:text-4xl">Leaving soon</h2></div>
          <Button to={paths.trips()}>See every trip<ArrowRight className="size-4" /></Button>
        </div>
        <div className="mt-6">
          {loading ? <GridSkeleton count={3} label="Loading trips" /> : data?.soon?.length
            ? <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{data.soon.map((t) => <TripCard key={t._id} trip={t} />)}</div>
            : !error && <p className="rounded-2xl bg-white p-5 text-sm font-semibold text-subtle ring-1 ring-line">No departures with open seats right now.</p>}
        </div>
      </section>
    </div>
  );
}
