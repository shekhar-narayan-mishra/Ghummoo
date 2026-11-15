import { useId, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Compass, MapPin, Search } from 'lucide-react';
import { cx } from '../components/ui';
import { searchPlaces, searchExperiences } from '../lib/discovery';
import { usePaths, usePlaces } from './context';

/* Accessible combobox over destinations, cities and experiences. Picking a place opens its
   page, picking an experience filters trips, and Enter with free text searches all trips.
   Arrow keys move through suggestions, Escape closes them. */
export default function SearchBox({ size = 'lg', autoFocus, onDone, className, placeholder = 'Where do you want to go?' }) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const navigate = useNavigate();
  const paths = usePaths();
  const places = usePlaces();
  const id = useId();
  const input = useRef(null);
  const results = useMemo(() => [
    ...searchPlaces(places, q, 5).map((p) => ({ kind: 'place', key: `p-${p.slug}`, to: paths.place(p.slug), title: p.name, sub: `${p.kind === 'city' ? 'City' : 'Destination'} · ${p.state}`, color: p.theme?.palette?.primary })),
    ...searchExperiences(q).map((c) => ({ kind: 'experience', key: `c-${c.value}`, to: paths.trips(`?category=${c.value}`), title: c.label, sub: 'Experience' })),
  ], [places, q, paths]);
  const showList = open && q.trim().length > 0;

  const go = (to) => { setOpen(false); setQ(''); onDone?.(); navigate(to); };
  const submit = (e) => {
    e.preventDefault();
    if (active >= 0 && results[active]) go(results[active].to);
    else if (q.trim()) go(paths.trips(`?q=${encodeURIComponent(q.trim())}`));
    else input.current?.focus();
  };
  const onKey = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setActive((a) => Math.min(results.length - 1, a + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(-1, a - 1)); }
    else if (e.key === 'Escape') { setOpen(false); setActive(-1); }
  };

  return (
    <form role="search" onSubmit={submit} className={cx('relative', className)}>
      <label htmlFor={`${id}-q`} className="sr-only">Search destinations, cities, experiences and trips</label>
      <div className={cx('flex items-center gap-2 rounded-full bg-white ring-1 ring-line transition focus-within:ring-2 focus-within:ring-brand', size === 'lg' ? 'h-16 pl-5 pr-2 shadow-lift' : 'h-12 pl-4 pr-1.5')}>
        <Search className={cx('shrink-0 text-brand', size === 'lg' ? 'size-5' : 'size-4')} aria-hidden />
        <input
          ref={input}
          id={`${id}-q`}
          value={q}
          autoFocus={autoFocus}
          onChange={(e) => { setQ(e.target.value); setOpen(true); setActive(-1); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          onKeyDown={onKey}
          placeholder={placeholder}
          autoComplete="off"
          role="combobox"
          aria-expanded={showList}
          aria-controls={`${id}-list`}
          aria-autocomplete="list"
          aria-activedescendant={active >= 0 ? `${id}-o${active}` : undefined}
          className={cx('min-w-0 flex-1 bg-transparent font-semibold text-ink placeholder:font-medium placeholder:text-subtle focus:outline-none', size === 'lg' ? 'text-[17px]' : 'text-[15px]')}
        />
        <button type="submit" className={cx('inline-flex shrink-0 items-center gap-1.5 rounded-full bg-action font-extrabold text-white transition hover:bg-action-hover', size === 'lg' ? 'h-12 px-4 text-[15px] sm:px-5' : 'h-9 px-4 text-sm')}>
          <span className="sr-only sm:not-sr-only">Search</span><ArrowRight className="size-4" aria-hidden />
        </button>
      </div>
      {showList && (
        <ul id={`${id}-list`} role="listbox" aria-label="Suggestions" className="absolute inset-x-0 top-full z-30 mt-2 overflow-hidden rounded-3xl bg-white p-1.5 shadow-lift ring-1 ring-line">
          {results.length ? results.map((r, i) => (
            <li
              key={r.key}
              id={`${id}-o${i}`}
              role="option"
              aria-selected={active === i}
              onMouseDown={(e) => { e.preventDefault(); go(r.to); }}
              onMouseEnter={() => setActive(i)}
              className={cx('flex cursor-pointer items-center gap-3 rounded-2xl px-3 py-2.5', active === i && 'bg-peach/70')}
            >
              <span className="grid size-9 shrink-0 place-items-center rounded-xl text-white" style={{ background: r.color || (r.kind === 'experience' ? '#241F1B' : '#F26A2E') }}>
                {r.kind === 'experience' ? <Compass className="size-4" aria-hidden /> : <MapPin className="size-4" aria-hidden />}
              </span>
              <span className="min-w-0">
                <span className="block truncate font-bold">{r.title}</span>
                <span className="block truncate text-xs font-medium text-subtle">{r.sub}</span>
              </span>
            </li>
          )) : (
            <li className="px-3 py-3 text-sm text-subtle" role="option" aria-selected="false" aria-disabled="true">No place or experience matches “{q}”. Press Enter to search all trips.</li>
          )}
        </ul>
      )}
    </form>
  );
}
