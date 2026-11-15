import { useRef } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowRight, Landmark, MapPin, MapPinOff } from 'lucide-react';
import { Button } from '../components/ui';
import useAsync from '../lib/useAsync';
import usePageTitle from '../lib/usePageTitle';
import { getPlace } from '../lib/catalog';
import { usePaths } from '../design/context';
import { TripCard, DestinationCard } from '../design/Cards';
import { GuideLabel, ErrorState, EmptyState, Bone, GridSkeleton } from '../design/Feedback';
import { PlaceArt } from '../scenes';
import { useSceneMotion } from '../motion/useSceneMotion';
import { EXPERIENCE_LABEL } from '../design/labels';

function TripRail({ id, title, trips, empty }) {
  return (
    <section aria-labelledby={id} className="mt-12">
      <h2 id={id} className="text-2xl font-extrabold">{title}</h2>
      {trips.length
        ? <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{trips.map((t) => <TripCard key={t._id || t.slug} trip={t} />)}</div>
        : <p className="mt-3 rounded-2xl bg-white p-4 text-sm font-semibold text-subtle ring-1 ring-line">{empty}</p>}
    </section>
  );
}

export default function PlacePage() {
  const paths = usePaths();
  const { slug } = useParams();
  const { data: p, error, loading, reload } = useAsync(() => getPlace(slug), [slug]);
  usePageTitle(p?.name || (error ? (error.status === 404 ? 'Place not found' : 'Something went wrong') : undefined));
  const sceneRef = useRef(null);
  useSceneMotion(sceneRef, [p?.slug]);

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 pt-10 sm:px-6 lg:px-8" role="status" aria-busy="true">
        <span className="sr-only">Loading place</span>
        <Bone className="aspect-[16/7] w-full rounded-[32px]" /><Bone className="mt-6 h-10 w-1/2" /><Bone className="mt-3 h-5 w-3/4" />
        <div className="mt-10"><GridSkeleton count={3} /></div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="mx-auto max-w-3xl px-4 pt-16">
        {error.status === 404
          ? <EmptyState icon={MapPinOff} title="We don't have a page for that place yet" action={<Button to={paths.cities}>Browse cities</Button>}>Try the city index or search for another place.</EmptyState>
          : <ErrorState error={error} onRetry={reload} />}
      </div>
    );
  }

  const pal = p.theme?.palette || p.landscapes[0]?.palette || { primary: '#E07B4F', secondary: '#FBE3D2', ink: '#2B2320' };
  const tripCount = p.relatedPackages.to.length + p.relatedPackages.from.length;
  return (
    <div>
      <section style={{ background: pal.secondary }} className="pb-12 pt-8">
        <div ref={sceneRef} className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <nav aria-label="Breadcrumb" className="mb-4 text-sm font-semibold" style={{ color: pal.ink }}>
            <Link to={paths.india()} className="underline-offset-2 hover:underline">Explore India</Link><span className="mx-2 opacity-50">/</span>
            {p.kind === 'city' && p.featured ? <Link to={paths.cities} className="underline-offset-2 hover:underline">Cities</Link> : <span>{p.state}</span>}
            <span className="mx-2 opacity-50">/</span><span aria-current="page">{p.name}</span>
          </nav>
          <div className="grid gap-8 lg:grid-cols-[1.2fr_1fr] lg:items-end">
            <div data-scene className="aspect-[16/10] overflow-hidden rounded-[32px] ring-1 ring-black/5 [&_svg]:size-full">
              <PlaceArt place={p} palette={pal} className="size-full [&>svg]:size-full" label={p.featured ? `Illustration of ${p.name}` : undefined} />
            </div>
            <div style={{ color: pal.ink }}>
              {p.intro && <GuideLabel inherit />}
              <h1 className="mt-2 text-5xl font-extrabold leading-none sm:text-6xl">{p.name}</h1>
              <p className="mt-2 font-bold opacity-80">{p.kind === 'city' ? 'City' : 'Destination'} · {p.state}{p.theme?.name ? ` · ${p.theme.name}` : ''}</p>
              {p.intro ? <p className="mt-4 text-[17px] leading-relaxed">{p.intro}</p> : <p className="mt-4 text-[15px] opacity-80">We haven't written a guide for {p.name} yet.</p>}
              {(p.landscapes.length > 0 || p.experiences.length > 0) && (
                <p className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[14px] font-bold">
                  {p.landscapes.map((l) => <Link key={l.slug} to={paths.india(`#${l.slug}`)} className="inline-flex min-h-8 items-center gap-1.5 underline decoration-2 underline-offset-4 hover:opacity-80" style={{ textDecorationColor: l.palette.primary }}><span className="size-2.5 rounded-full" style={{ background: l.palette.primary }} aria-hidden />{l.name}</Link>)}
                  {p.experiences.length > 0 && <span className="opacity-80">{p.experiences.map((e) => EXPERIENCE_LABEL[e]).join(' · ')}</span>}
                </p>
              )}
              <Button className="mt-6" href="#trips">{tripCount ? `See ${tripCount} trip${tripCount > 1 ? 's' : ''}` : 'Trips'}<ArrowRight className="size-4" /></Button>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {(p.landmarks.length > 0 || p.highlights.length > 0) && (
          <div className="mt-12 grid gap-10 lg:grid-cols-[1.4fr_1fr]">
            {p.landmarks.length > 0 && (
              <section aria-labelledby="lm">
                <h2 id="lm" className="text-2xl font-extrabold">Landmarks</h2>
                <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                  {p.landmarks.map((m) => (
                    <li key={m.slug} className="flex gap-3 rounded-2xl bg-white p-4 ring-1 ring-line">
                      <span className="grid size-10 shrink-0 place-items-center rounded-xl text-white" style={{ background: pal.primary }}><Landmark className="size-5" aria-hidden /></span>
                      <span><span className="block font-extrabold">{m.name}</span><span className="mt-0.5 block text-sm text-subtle">{m.description}</span></span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
            {p.highlights.length > 0 && (
              <section aria-labelledby="hl">
                <h2 id="hl" className="text-2xl font-extrabold">Highlights</h2>
                <ul className="mt-4 space-y-2">{p.highlights.map((h) => <li key={h} className="flex items-center gap-2 rounded-2xl bg-sand px-4 py-3 font-bold"><span className="size-2 rounded-full" style={{ background: pal.primary }} aria-hidden />{h}</li>)}</ul>
              </section>
            )}
          </div>
        )}

        {p.nearby.length > 0 && (
          <section aria-labelledby="nb" className="mt-12">
            <h2 id="nb" className="text-2xl font-extrabold">Often visited with {p.name}</h2>
            <p className="mt-1 text-sm text-subtle">Places trips commonly combine with {p.name}. No distance or travel time is implied.</p>
            <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">{p.nearby.map((n) => <li key={n.slug}><DestinationCard place={n} size="sm" /></li>)}</ul>
          </section>
        )}

        <div id="trips" className="scroll-mt-20">
          <TripRail id="to" title={`Trips to ${p.name}`} trips={p.relatedPackages.to} empty={`No organiser lists a trip to ${p.name} yet.`} />
          {p.kind === 'city' && <TripRail id="from" title={`Trips departing from ${p.name}`} trips={p.relatedPackages.from} empty={`No trip departs from ${p.name} yet.`} />}
          {p.relatedPackages.nearby.length > 0 && <TripRail id="near" title="Trips to nearby places" trips={p.relatedPackages.nearby} />}
          <Button variant="secondary" className="mt-8" to={paths.trips(`?place=${p.slug}`)}><MapPin className="size-4" />All trips for {p.name}</Button>
        </div>
      </div>
    </div>
  );
}
