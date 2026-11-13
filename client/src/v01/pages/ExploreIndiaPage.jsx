import { useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowDown, ArrowRight, Landmark, MapPin } from 'lucide-react';
import { Button, cx } from '../../components/ui';
import { TripCard, DestinationCard } from '../../design/Cards';
import { GuideLabel } from '../../design/Feedback';
import { LANDSCAPE_SCENES, CITY_SCENES } from '../../scenes';
import { landscapeSync, landscapesSync, citiesSync, placeSync, FEATURED_CITY_SCENES, filterTrips } from '../data/store';
import { useSceneMotion, useReveal, refreshScroll } from '../../motion/useSceneMotion';
import usePageTitle from '../usePageTitle';

const EXPERIENCE_LABEL = {
  heritage_walks: 'Heritage walks', architecture: 'Architecture', food_trails: 'Food trails', spiritual: 'Spiritual', markets_crafts: 'Markets & crafts',
  arts_culture: 'Arts & culture', nature: 'Nature', trekking: 'Trekking', river_water: 'River & water', wildlife: 'Wildlife', beaches: 'Beaches',
};
// eslint-disable-next-line react-refresh/only-export-components
export { EXPERIENCE_LABEL };

function useHashScroll() {
  const { hash } = useLocation();
  useEffect(() => {
    if (!hash) return;
    const el = document.getElementById(decodeURIComponent(hash.slice(1)));
    if (el) requestAnimationFrame(() => { el.scrollIntoView({ block: 'start' }); refreshScroll(); });
  }, [hash]);
}

function LandscapeChapter({ landscape, index }) {
  const data = landscapeSync(landscape.slug);
  const Scene = LANDSCAPE_SCENES[landscape.slug];
  const trips = data.trips.slice(0, 2);
  return (
    <section id={landscape.slug} aria-labelledby={`${landscape.slug}-h`} className="scroll-mt-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div data-scene className="relative h-[46vh] min-h-[300px] overflow-hidden rounded-[32px] sm:h-[62vh] sm:max-h-[680px] [&_svg]:size-full" style={{ background: landscape.palette.secondary }}>
          <Scene />
          <span className="absolute left-4 top-4 rounded-full bg-white/85 px-3 py-1 text-xs font-extrabold text-ink backdrop-blur">Chapter {index + 1} of 6</span>
        </div>
        <div className={cx('relative z-10 -mt-20 grid gap-5 sm:-mt-28 lg:grid-cols-[1fr_1.15fr] lg:gap-8', index % 2 && 'lg:[&>*:first-child]:order-2')}>
          <div className="rounded-[28px] bg-white/95 p-6 shadow-lift ring-1 ring-line backdrop-blur sm:p-8">
            <GuideLabel />
            <h2 id={`${landscape.slug}-h`} className="mt-2 text-3xl font-extrabold leading-tight sm:text-[40px]" style={{ color: landscape.palette.ink }}>{landscape.name}</h2>
            <p className="mt-1 flex items-center gap-2 text-[15px] font-bold text-ink/75"><span className="size-2.5 shrink-0 rounded-full" style={{ background: landscape.palette.primary }} aria-hidden />{landscape.tagline}</p>
            <p className="mt-4 text-[16px] leading-relaxed text-ink/85">{landscape.intro}</p>
            <ul className="mt-5 flex flex-wrap gap-2" aria-label={`Places in ${landscape.name}`}>
              {data.places.slice(0, 8).map((p) => (
                <li key={p.slug}><Link to={`/v01/places/${p.slug}`} className="inline-flex h-9 items-center gap-1 rounded-full bg-sand px-3 text-[13px] font-bold hover:bg-peach"><MapPin className="size-3.5 text-brand" aria-hidden />{p.name}</Link></li>
              ))}
            </ul>
            <Button variant="dark" className="mt-6" to={`/v01/trips?landscape=${landscape.slug}`}>
              {data.trips.length ? `See ${data.trips.length} trip${data.trips.length > 1 ? 's' : ''}` : 'See trips'}<ArrowRight className="size-4" />
            </Button>
          </div>
          <div data-reveal-group className="grid content-end gap-4 sm:grid-cols-2">
            {trips.length ? trips.map((t) => <div key={t.slug} data-reveal><TripCard trip={t} /></div>) : (
              <p data-reveal className="self-end rounded-[24px] bg-white/80 p-5 text-sm font-semibold text-subtle ring-1 ring-line sm:col-span-2">No organiser lists a trip here yet.</p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function CityChapter({ slug }) {
  const city = placeSync(slug);
  const Scene = CITY_SCENES[slug];
  const pal = city.theme.palette;
  const trips = [...city.relatedPackages.to, ...city.relatedPackages.from, ...city.relatedPackages.nearby]
    .filter((t, i, a) => a.findIndex((x) => x.slug === t.slug) === i).slice(0, 3);
  return (
    <section id={`city-${slug}`} aria-labelledby={`city-${slug}-h`} className="scroll-mt-16 py-16 sm:py-24" style={{ background: pal.secondary }}>
      <div className="mx-auto grid max-w-7xl gap-8 px-4 sm:px-6 lg:grid-cols-[1.1fr_1fr] lg:gap-12 lg:px-8">
        {/* Scene: sticky beside the story on large screens (CSS sticky, no pinning). */}
        <div className="lg:sticky lg:top-24 lg:self-start">
          <div data-scene data-handoff={slug === 'delhi' ? `#city-${slug}-trips` : undefined} className="aspect-[4/3] overflow-hidden rounded-[32px] shadow-lift ring-1 ring-black/5 sm:aspect-[16/11] [&_svg]:size-full">
            <Scene title={`Illustration of ${city.name}: ${city.landmarks.slice(0, 3).map((m) => m.name).join(', ')}`} />
          </div>
          <p className="mt-3 text-xs font-semibold" style={{ color: pal.ink }}>Original illustration · {city.theme.name}</p>
        </div>

        <div style={{ color: pal.ink }}>
          <GuideLabel />
          <h2 id={`city-${slug}-h`} className="mt-2 text-4xl font-extrabold leading-none sm:text-6xl">{city.name}</h2>
          <p className="mt-2 text-[15px] font-bold opacity-80">{city.state} · {city.theme.name}</p>
          <p className="mt-5 text-[17px] leading-relaxed">{city.intro}</p>

          <div data-reveal-group className="mt-8">
            <h3 className="text-xs font-extrabold uppercase tracking-[0.16em] opacity-70">Landmarks</h3>
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
            <h3 className="text-xs font-extrabold uppercase tracking-[0.16em] opacity-70">Often visited with {city.name}</h3>
            <ul className="mt-3 flex flex-wrap gap-2">
              {city.nearby.map((n) => (
                <li key={n.slug} data-reveal><Link to={`/v01/places/${n.slug}`} className="inline-flex h-10 items-center gap-1.5 rounded-full bg-white px-4 text-sm font-extrabold text-ink ring-1 ring-black/5 hover:ring-brand"><MapPin className="size-3.5" style={{ color: pal.primary }} aria-hidden />{n.name}</Link></li>
              ))}
            </ul>
            <p className="mt-2 text-xs font-semibold opacity-70">Grouped by how often trips combine them, not by distance.</p>
          </div>

          <div id={`city-${slug}-trips`} data-reveal-group className="mt-10">
            <h3 className="text-xs font-extrabold uppercase tracking-[0.16em] opacity-70">Trips</h3>
            {trips.length ? (
              <div className="mt-3 grid gap-4 sm:grid-cols-2">{trips.map((t) => <div key={t.slug} data-reveal><TripCard trip={t} /></div>)}</div>
            ) : <p data-reveal className="mt-3 rounded-2xl bg-white/80 p-4 text-sm font-semibold text-ink">No organiser lists a trip here yet.</p>}
            <Button className="mt-6" to={`/v01/trips?place=${slug}`}>All trips for {city.name}<ArrowRight className="size-4" /></Button>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function ExploreIndiaPage() {
  usePageTitle('Explore India');
  const root = useRef(null);
  useSceneMotion(root);
  useReveal(root);
  useHashScroll();
  const landscapes = landscapesSync();
  const cities = citiesSync();
  const soon = filterTrips({ available: true }).slice(0, 3);

  return (
    <div ref={root}>
      <header className="mx-auto max-w-7xl px-4 pb-10 pt-12 sm:px-6 sm:pt-16 lg:px-8">
        <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-brand-ink">Explore India</p>
        <h1 className="mt-2 max-w-3xl text-[40px] font-extrabold leading-[1.04] tracking-[-0.03em] sm:text-6xl">Six landscapes. Four city stories. Real trips at every stop.</h1>
        <p className="mt-4 max-w-2xl text-[17px] text-subtle">Scroll through India's landscapes and cities. Every chapter ends in trips you can open, compare and request.</p>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Button href="#all-trips" variant="dark"><ArrowDown className="size-4" />Skip to trips</Button>
          <Button to="/v01/trips" variant="secondary">Search all trips</Button>
        </div>
        <nav aria-label="Chapters" className="no-scrollbar -mx-4 mt-8 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
          {landscapes.map((l) => <a key={l.slug} href={`#${l.slug}`} className="inline-flex h-10 shrink-0 items-center gap-2 rounded-full bg-white px-4 text-sm font-bold ring-1 ring-line hover:ring-brand"><span className="size-2.5 rounded-full" style={{ background: l.palette.primary }} aria-hidden />{l.name}</a>)}
          <a href="#cities" className="inline-flex h-10 shrink-0 items-center rounded-full bg-peach px-4 text-sm font-bold text-brand-ink">City stories</a>
          <a href="#city-index" className="inline-flex h-10 shrink-0 items-center rounded-full bg-peach px-4 text-sm font-bold text-brand-ink">City index</a>
        </nav>
      </header>

      <div className="space-y-20 sm:space-y-28">
        {landscapes.map((l, i) => <LandscapeChapter key={l.slug} landscape={l} index={i} />)}
      </div>

      <div id="cities" className="mx-auto mt-24 max-w-7xl scroll-mt-20 px-4 pb-10 sm:px-6 lg:px-8">
        <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-brand-ink">City stories</p>
        <h2 className="mt-1 text-[32px] font-extrabold leading-tight sm:text-5xl">Four cities, four moods</h2>
        <p className="mt-2 max-w-2xl text-subtle">Jaipur's pink sandstone, Varanasi's river at dawn, Delhi's monuments and Mumbai's harbour.</p>
      </div>
      {FEATURED_CITY_SCENES.map((s) => <CityChapter key={s} slug={s} />)}

      <section id="city-index" aria-labelledby="city-index-h" className="mx-auto mt-24 max-w-7xl scroll-mt-20 px-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div><p className="text-xs font-extrabold uppercase tracking-[0.16em] text-brand-ink">City index</p><h2 id="city-index-h" className="mt-1 text-[32px] font-extrabold sm:text-4xl">All ten cities</h2></div>
          <Button variant="secondary" to="/v01/cities">Open the city index</Button>
        </div>
        <ul className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-5">
          {cities.map((c) => <li key={c.slug}><DestinationCard place={c} tripCount={c.tripCounts.to + c.tripCounts.from} /></li>)}
        </ul>
      </section>

      <section id="all-trips" aria-labelledby="all-trips-h" className="mx-auto mt-24 max-w-7xl scroll-mt-20 px-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div><p className="text-xs font-extrabold uppercase tracking-[0.16em] text-brand-ink">Trips</p><h2 id="all-trips-h" className="mt-1 text-[32px] font-extrabold sm:text-4xl">Leaving soon</h2></div>
          <Button to="/v01/trips">See every trip<ArrowRight className="size-4" /></Button>
        </div>
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{soon.map((t) => <TripCard key={t.slug} trip={t} />)}</div>
      </section>
    </div>
  );
}
