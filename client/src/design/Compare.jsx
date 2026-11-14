import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Scale, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { cx } from '../components/ui';
import { usePaths } from './context';

const MAX = 3;
const KEY = 'ghumo.v01.compare';
const Ctx = createContext(null);

function read() {
  try { return JSON.parse(sessionStorage.getItem(KEY)) || []; } catch { return []; }
}

/* Compare selection: a per-tab convenience (sessionStorage); losing it is harmless. */
export function CompareProvider({ children }) {
  const [items, setItems] = useState(read);
  useEffect(() => { try { sessionStorage.setItem(KEY, JSON.stringify(items)); } catch { /* storage unavailable */ } }, [items]);

  const toggle = useCallback((trip) => {
    setItems((cur) => {
      if (cur.some((t) => t.slug === trip.slug)) return cur.filter((t) => t.slug !== trip.slug);
      if (cur.length >= MAX) { toast.error(`Compare up to ${MAX} trips at a time`); return cur; }
      return [...cur, { slug: trip.slug, title: trip.title }];
    });
  }, []);
  const remove = useCallback((slug) => setItems((cur) => cur.filter((t) => t.slug !== slug)), []);
  const clear = useCallback(() => setItems([]), []);
  const value = useMemo(() => ({ items, toggle, remove, clear, has: (slug) => items.some((t) => t.slug === slug), max: MAX }), [items, toggle, remove, clear]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export const useCompare = () => useContext(Ctx);

export function CompareToggle({ trip, className, onImage, plain }) {
  const { has, toggle } = useCompare();
  const on = has(trip.slug);
  return (
    <button
      type="button"
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggle(trip); }}
      aria-pressed={on}
      className={cx(plain
        ? cx('-mr-2 inline-flex h-9 items-center gap-1.5 rounded-full px-2 text-[13px] font-extrabold transition', on ? 'text-brand-ink' : 'text-subtle hover:text-ink')
        : 'inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-xs font-extrabold transition',
        plain ? '' : on ? 'bg-ink text-white' : onImage ? 'bg-white/90 text-ink hover:bg-white' : 'bg-white text-ink ring-1 ring-line hover:ring-brand-soft', className)}
    >
      <Scale className="size-3.5" aria-hidden />{on ? 'Comparing' : 'Compare'}
      <span className="sr-only"> {trip.title}</span>
    </button>
  );
}

/* Floating tray, shown once at least one trip is selected. */
export function CompareTray() {
  const { items, remove, clear } = useCompare();
  const paths = usePaths();
  if (!items.length) return null;
  const href = paths.compare(items.map((t) => t.slug));
  return (
    <div className="pointer-events-none fixed inset-x-0 z-40 flex justify-center px-4" style={{ bottom: 'calc(1rem + var(--ghumo-bottom-bar, 0px))' }}>
      <div className="pointer-events-auto flex max-w-full items-center gap-2 rounded-full bg-ink py-2 pl-4 pr-2 text-white shadow-lift" role="region" aria-label="Trips selected for comparison">
        <Scale className="size-4 shrink-0 text-brand-soft" aria-hidden />
        <ul className="no-scrollbar flex min-w-0 gap-1.5 overflow-x-auto">
          {items.map((t) => (
            <li key={t.slug} className="flex shrink-0 items-center gap-1 rounded-full bg-white/12 py-1 pl-3 pr-1 text-xs font-bold">
              <span className="max-w-[9rem] truncate">{t.title}</span>
              <button type="button" onClick={() => remove(t.slug)} className="grid size-6 place-items-center rounded-full hover:bg-white/20" aria-label={`Remove ${t.title} from comparison`}><X className="size-3.5" /></button>
            </li>
          ))}
        </ul>
        <button type="button" onClick={clear} className="hidden shrink-0 rounded-full px-3 py-2 text-xs font-bold text-white/75 hover:text-white sm:block">Clear</button>
        {items.length >= 2
          ? <Link to={href} className="shrink-0 rounded-full bg-brand px-4 py-2 text-sm font-extrabold text-white hover:bg-brand-hover">Compare {items.length}</Link>
          : <span className="shrink-0 rounded-full bg-white/10 px-3 py-2 text-xs font-bold text-white/80">Pick 1 more</span>}
      </div>
    </div>
  );
}
