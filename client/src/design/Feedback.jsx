import { AlertTriangle, Compass, FlaskConical, BookOpen } from 'lucide-react';
import { Button, cx } from '../components/ui';

/* Labels ------------------------------------------------------------------ */

export function SampleBadge({ className, onImage }) {
  return (
    <span className={cx('inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wide',
      onImage ? 'bg-ink/75 text-white backdrop-blur' : 'bg-ink text-white', className)}>
      <FlaskConical className="size-3" aria-hidden />Sample
    </span>
  );
}

/* Demo listings are real records seeded for the preview (isDemo); real published listings
   carry no badge. Prototype sample cards use SampleBadge. */
export function DemoBadge({ className, onImage }) {
  return (
    <span className={cx('inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wide',
      onImage ? 'bg-ink/75 text-white backdrop-blur' : 'bg-sand text-ink ring-1 ring-line', className)} title="Demo listing: sample data for this preview">
      Demo
    </span>
  );
}

export function DataBadge({ trip, className, onImage }) {
  if (trip.isSample) return <SampleBadge className={className} onImage={onImage} />;
  if (trip.isDemo) return <DemoBadge className={className} onImage={onImage} />;
  return null;
}

// `inherit` takes the surrounding text colour, for tinted panels where orange text falls below AA.
export function GuideLabel({ className, light, inherit }) {
  return (
    <span className={cx('inline-flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-[0.14em]', light ? 'text-white/85' : inherit ? null : 'text-brand-ink', className)}>
      <BookOpen className="size-3.5" aria-hidden />Ghumo guide
    </span>
  );
}

export function NotStated({ children = 'Not stated by organiser' }) {
  return <span className="italic text-subtle">{children}</span>;
}

/* Skeletons --------------------------------------------------------------- */

export function Bone({ className }) {
  return <div className={cx('animate-pulse rounded-lg bg-sand motion-reduce:animate-none', className)} aria-hidden />;
}

export function TripCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-[24px] bg-white ring-1 ring-line" aria-hidden>
      <Bone className="aspect-[4/3] rounded-none" />
      <div className="space-y-3 p-4"><Bone className="h-5 w-3/4" /><Bone className="h-4 w-1/2" /><Bone className="h-7 w-1/3" /></div>
    </div>
  );
}

export function DestinationCardSkeleton() {
  return <Bone className="aspect-[3/4] rounded-[24px]" />;
}

export function GridSkeleton({ count = 6, kind = 'trip', label = 'Loading' }) {
  const Item = kind === 'trip' ? TripCardSkeleton : DestinationCardSkeleton;
  return (
    <div role="status" aria-busy="true">
      <span className="sr-only">{label}</span>
      <div className={cx('grid gap-4 sm:gap-5', kind === 'trip' ? 'sm:grid-cols-2 lg:grid-cols-3' : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5')}>
        {Array.from({ length: count }, (_, i) => <Item key={i} />)}
      </div>
    </div>
  );
}

/* Empty and error --------------------------------------------------------- */

export function EmptyState({ icon: Icon = Compass, title, children, action, className }) {
  return (
    <div className={cx('flex flex-col items-center rounded-[28px] border border-dashed border-line bg-white/60 px-6 py-12 text-center', className)}>
      <span className="grid size-14 place-items-center rounded-2xl bg-peach text-brand-ink"><Icon className="size-7" aria-hidden /></span>
      <h3 className="mt-4 text-lg font-extrabold">{title}</h3>
      {children && <div className="mt-1.5 max-w-md text-[15px] text-subtle">{children}</div>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({ error, onRetry, className }) {
  return (
    <div role="alert" className={cx('flex flex-col items-center rounded-[28px] bg-danger-bg px-6 py-10 text-center', className)}>
      <AlertTriangle className="size-8 text-danger" aria-hidden />
      <h3 className="mt-3 text-lg font-extrabold text-ink">Something went wrong</h3>
      <p className="mt-1 max-w-md text-[15px] text-ink/80">{error?.message || 'Please try again.'}</p>
      {onRetry && <Button variant="secondary" className="mt-5" onClick={onRetry}>Try again</Button>}
    </div>
  );
}
