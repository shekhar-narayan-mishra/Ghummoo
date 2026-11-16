import { Link } from 'react-router-dom';
import { ArrowUpRight, BadgeCheck, CalendarDays, Heart, MapPin } from 'lucide-react';
import { SafeImage, cx } from '../components/ui';
import { shortDate, durationLong } from '../lib/format';
import { PlaceArt, LandscapeArt } from '../scenes';
import { PriceLabel, AvailabilityBadge } from './Booking';
import { DataBadge } from './Feedback';
import { CompareToggle } from './Compare';
import { usePaths, useSaved } from './context';

/* Save toggle: shown only where saving is supported (live app). */
export function SaveToggle({ trip, className, onImage }) {
  const saved = useSaved();
  if (!saved) return null;
  const on = saved.has(trip.slug);
  return (
    <button
      type="button"
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); saved.toggle(trip); }}
      aria-pressed={on}
      className={cx('grid size-9 shrink-0 place-items-center rounded-full transition', on ? 'bg-action text-white' : onImage ? 'bg-white/90 text-ink hover:bg-white' : 'bg-white text-ink ring-1 ring-line hover:ring-brand-soft', className)}
    >
      <Heart className={cx('size-4', on && 'fill-current')} aria-hidden />
      <span className="sr-only">{on ? `Remove ${trip.title} from saved trips` : `Save ${trip.title}`}</span>
    </button>
  );
}

const cityNames = (trip) => (trip.places?.departureCities?.length ? trip.places.departureCities.map((c) => c.name).join(', ') : trip.startLocation);

/* TripCard: the information needed to decide is always visible: where, who runs it, from
   where and when, how long, price, and seats from the real inventory. */
export function TripCard({ trip, className, showCompare = true, reason, caveats, difference }) {
  const paths = usePaths();
  const next = trip.nextDeparture;
  const firstPlace = trip.places?.destinations?.[0];
  const from = cityNames(trip);
  return (
    <article className={cx('group relative flex flex-col overflow-hidden rounded-[24px] bg-white ring-1 ring-line transition duration-300 hover:-translate-y-0.5 hover:shadow-lift motion-reduce:hover:translate-y-0', className)}>
      <div className="relative aspect-[16/9] overflow-hidden bg-sand sm:aspect-[4/3]">
        {trip.coverImage
          ? <SafeImage src={trip.coverImage} alt={trip.coverAlt || trip.title} sizes="(min-width:1024px) 30vw, (min-width:640px) 45vw, 90vw" className="size-full transition duration-700 group-hover:scale-[1.03] motion-reduce:group-hover:scale-100" />
          : firstPlace && <PlaceArt place={firstPlace} className="size-full [&>svg]:size-full" />}
        <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-3">
          <DataBadge trip={trip} onImage />
          <SaveToggle trip={trip} onImage className="relative z-10 ml-auto" />
        </div>
      </div>
      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <p className="flex items-center gap-1 text-[13px] font-bold text-brand-ink"><MapPin className="size-3.5 shrink-0" aria-hidden /><span className="truncate">{trip.destination}{trip.country && trip.country !== 'India' ? `, ${trip.country}` : ''}</span></p>
        <h3 className="mt-1 text-[17px] font-extrabold leading-snug">
          <Link to={paths.trip(trip.slug)} className="after:absolute after:inset-0 after:content-[''] focus-visible:outline-none group-focus-within:underline">{trip.title}</Link>
        </h3>
        <p className="mt-1 flex flex-wrap items-center gap-x-1 text-[13px] font-medium text-subtle">
          <span>by {trip.operator?.businessName}</span>
          {trip.operator?.verified && <BadgeCheck className="size-4 text-success" aria-label="Verified organiser" />}
        </p>
        <p className="mt-0.5 text-[13px] font-medium text-subtle">
          {durationLong(trip.durationDays, trip.durationNights)}{from && <> · from {from}</>}
        </p>
        {difference && <p className="relative z-10 mt-3 rounded-2xl bg-warning-bg p-3 text-[13px] font-bold text-warning">{difference}</p>}
        {reason && (
          <div className="relative z-10 mt-3 rounded-2xl bg-peach/50 p-3 text-[13px]">
            <p className="font-extrabold text-brand-ink">Why it matches</p>
            <ul className="mt-1 space-y-1 font-semibold text-ink/85">{reason.map((r) => <li key={r}>• {r}</li>)}</ul>
          </div>
        )}
        {caveats?.length > 0 && <ul className="relative z-10 mt-2 space-y-0.5 text-[13px] text-subtle">{caveats.map((c) => <li key={c}>– {c}</li>)}</ul>}
        <div className="mt-3 flex flex-wrap items-center gap-2 text-[13px] font-semibold">
          {next ? <span className="flex items-center gap-1"><CalendarDays className="size-3.5 text-brand" aria-hidden />Next {shortDate(next.startDate)}{trip.departureCount > 1 && <span className="font-medium text-subtle"> +{trip.departureCount - 1} more</span>}</span> : null}
          <AvailabilityBadge departure={next} />
        </div>
        <div className="mt-auto flex items-end justify-between gap-3 pt-4">
          <PriceLabel amount={trip.priceFrom} currency={trip.currency} />
          {reason
            ? <span className="text-sm font-extrabold text-brand-ink" aria-hidden>View details →</span>
            : showCompare && <CompareToggle trip={trip} plain className="relative z-10" />}
        </div>
      </div>
    </article>
  );
}

/* DestinationCard: a city or destination with its colour mood. */
export function DestinationCard({ place, className, tripCount, size = 'md' }) {
  const paths = usePaths();
  const pal = place.theme?.palette;
  return (
    <Link to={paths.place(place.slug)} className={cx('group relative block overflow-hidden rounded-[24px] ring-1 ring-black/5 transition duration-300 hover:-translate-y-0.5 hover:shadow-lift motion-reduce:hover:translate-y-0', size === 'sm' ? 'aspect-[4/5]' : 'aspect-[3/4]', className)} style={{ background: pal?.secondary }}>
      <PlaceArt place={place} className="absolute inset-0 [&>svg]:size-full" />
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent p-4 pt-16 text-white">
        <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-white/80">{place.state}</p>
        <p className="mt-0.5 flex items-center justify-between gap-2 text-xl font-extrabold leading-tight">{place.name}<ArrowUpRight className="size-5 shrink-0 opacity-70 transition group-hover:opacity-100" aria-hidden /></p>
        {place.theme?.name && <p className="mt-0.5 text-[13px] font-semibold text-white/85">{place.theme.name}</p>}
        {tripCount != null && <p className="mt-2 inline-block rounded-full bg-white/20 px-2.5 py-1 text-xs font-bold backdrop-blur">{tripCount ? `${tripCount} trip${tripCount > 1 ? 's' : ''}` : 'No trips listed yet'}</p>}
      </div>
    </Link>
  );
}

/* LandscapeTile: entry point into a landscape chapter. */
export function LandscapeTile({ landscape, to, className }) {
  return (
    <Link to={to} className={cx('group relative block aspect-[4/3] overflow-hidden rounded-[24px] ring-1 ring-black/5 transition duration-300 hover:-translate-y-0.5 hover:shadow-lift motion-reduce:hover:translate-y-0', className)}>
      <LandscapeArt slug={landscape.slug} className="absolute inset-0 [&>svg]:size-full" />
      <div className="absolute inset-x-3 bottom-3 rounded-2xl bg-white/90 p-3 backdrop-blur">
        <p className="font-extrabold leading-tight">{landscape.name}</p>
        <p className="mt-0.5 line-clamp-1 text-xs font-semibold text-subtle">{landscape.tagline}</p>
      </div>
    </Link>
  );
}
