import { useId, useState } from 'react';
import { Check, CornerDownRight, Sparkles, ArrowUp } from 'lucide-react';
import { cx } from '../components/ui';

/* PreferenceSelector: chip group built on native radio/checkbox inputs, so keyboard and
   screen-reader behaviour come for free. */
export function PreferenceSelector({ legend, hint, options, value, onChange, multiple = false, className, size = 'md' }) {
  const name = useId();
  const selected = (v) => (multiple ? (value || []).includes(v) : value === v);
  const toggle = (v) => {
    if (multiple) onChange(selected(v) ? value.filter((x) => x !== v) : [...(value || []), v]);
    else onChange(selected(v) ? '' : v);
  };
  return (
    <fieldset className={className}>
      <legend className="text-sm font-extrabold text-ink">{legend}</legend>
      {hint && <p className="mt-0.5 text-xs text-subtle">{hint}</p>}
      <div className="mt-2.5 flex flex-wrap gap-2">
        {options.map((o) => {
          const on = selected(o.value);
          return (
            <label key={o.value} className={cx('relative inline-flex cursor-pointer items-center gap-1.5 rounded-full font-bold ring-1 transition', size === 'sm' ? 'min-h-10 px-3 text-[13px]' : 'min-h-11 px-4 text-sm',
              'has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-brand',
              on ? 'bg-ink text-white ring-ink' : 'bg-white text-ink ring-line hover:ring-brand-soft')}>
              <input
                type={multiple ? 'checkbox' : 'radio'}
                name={name}
                value={o.value}
                checked={on}
                onChange={() => toggle(o.value)}
                onClick={(e) => { if (!multiple && on) { e.preventDefault(); toggle(o.value); } }}
                className="sr-only"
              />
              {on && <Check className="size-3.5" aria-hidden />}
              {o.swatch && <span className="size-2.5 rounded-full" style={{ background: o.swatch }} aria-hidden />}
              {o.label}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

/* AIInput: one focused prompt with suggestions, a character limit and an honest note about
   what the assistant can see. Not a chat thread. */
export function AIInput({ label, placeholder, suggestions = [], max = 300, busy, onSubmit, note, buttonLabel = 'Ask', className }) {
  const id = useId();
  const [text, setText] = useState('');
  const send = (value) => {
    const v = (value ?? text).trim();
    if (!v || busy) return;
    onSubmit(v);
    if (value) setText(value);
  };
  return (
    <div className={className}>
      <label htmlFor={id} className="flex items-center gap-1.5 text-sm font-extrabold"><Sparkles className="size-4 text-brand" aria-hidden />{label}</label>
      <div className="mt-2 flex items-end gap-2 rounded-[22px] bg-white p-2 ring-1 ring-line focus-within:ring-2 focus-within:ring-brand">
        <textarea
          id={id}
          rows={2}
          value={text}
          maxLength={max}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder={placeholder}
          aria-describedby={`${id}-n`}
          className="min-h-[52px] flex-1 resize-none bg-transparent px-2 py-1.5 text-[15px] font-medium placeholder:text-subtle focus:outline-none"
        />
        <button type="button" onClick={() => send()} disabled={!text.trim() || busy}
          className="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-full bg-action px-4 text-sm font-extrabold text-white transition hover:bg-action-hover disabled:opacity-50">
          {buttonLabel}<ArrowUp className="size-4" aria-hidden />
        </button>
      </div>
      <p id={`${id}-n`} className="mt-1.5 flex justify-between gap-3 text-xs text-subtle">
        <span>{note}</span><span className="num shrink-0" aria-live="polite">{text.length}/{max}</span>
      </p>
      {suggestions.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1" aria-label="Suggestions">
          {suggestions.map((s) => (
            <li key={s}><button type="button" disabled={busy} onClick={() => send(s)} className="inline-flex min-h-9 items-center gap-1.5 text-left text-[14px] font-bold text-ink underline decoration-line decoration-2 underline-offset-4 transition hover:text-brand-ink hover:decoration-brand disabled:opacity-50"><CornerDownRight className="size-3.5 shrink-0 text-brand" aria-hidden />{s}</button></li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* Filter primitives ----------------------------------------------------------- */

export function FilterSelect({ label, value, onChange, children }) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="text-sm font-extrabold">{label}</label>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)}
        className="mt-1.5 h-11 w-full rounded-xl border border-line bg-white px-3 text-[15px] font-semibold focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand/10">
        {children}
      </select>
    </div>
  );
}

export function ActiveFilters({ items, onClear }) {
  if (!items.length) return null;
  return (
    <div className="flex flex-wrap items-center gap-2" aria-label="Active filters">
      {items.map((f) => (
        <button key={f.key} type="button" onClick={f.onRemove} className="inline-flex h-9 items-center gap-1.5 rounded-full bg-peach px-3 text-[13px] font-bold text-brand-ink hover:bg-[#ffd9bf]">
          {f.label}<span aria-hidden>×</span><span className="sr-only">Remove filter</span>
        </button>
      ))}
      <button type="button" onClick={onClear} className="h-9 rounded-full px-3 text-[13px] font-bold text-subtle underline-offset-2 hover:underline">Clear all</button>
    </div>
  );
}
