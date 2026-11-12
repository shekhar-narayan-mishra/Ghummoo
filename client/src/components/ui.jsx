import { forwardRef, useEffect, useId, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, CheckCircle2, Info, Loader2, X, TriangleAlert, ImageOff } from 'lucide-react';
import { isUnsplash, sized } from '../lib/format';

export const cx = (...c) => c.filter(Boolean).join(' ');

/* ---------------------------------- Button --------------------------------- */
const BTN = {
  primary: 'bg-brand text-white hover:bg-brand-hover shadow-[0_6px_16px_-8px_rgb(242_106_46/0.8)]',
  dark: 'bg-ink text-white hover:bg-black',
  secondary: 'bg-white text-ink border border-line hover:border-brand-soft hover:bg-peach/40',
  ghost: 'text-ink hover:bg-sand',
  soft: 'bg-peach text-brand-ink hover:bg-[#ffd9bf]',
  danger: 'bg-white text-danger border border-danger/30 hover:bg-danger-bg',
  success: 'bg-success text-white hover:brightness-110',
};
const SIZE = { sm: 'h-9 px-3.5 text-sm gap-1.5', md: 'h-11 px-5 text-[15px] gap-2', lg: 'h-13 px-7 text-base gap-2' };

export const Button = forwardRef(function Button({ variant = 'primary', size = 'md', loading, disabled, className, children, to, href, type = 'button', ...rest }, ref) {
  const cls = cx(
    'inline-flex items-center justify-center rounded-full font-bold whitespace-nowrap transition-all duration-200 select-none',
    'active:scale-[0.98] disabled:opacity-55 disabled:pointer-events-none',
    BTN[variant], SIZE[size], className
  );
  const content = <>{loading && <Loader2 className="size-4 animate-spin" aria-hidden />}{children}</>;
  if (to) return <Link ref={ref} to={to} className={cls} {...rest}>{content}</Link>;
  if (href) return <a ref={ref} href={href} className={cls} {...rest}>{content}</a>;
  return <button ref={ref} type={type} className={cls} disabled={disabled || loading} aria-busy={loading || undefined} {...rest}>{content}</button>;
});

/* ---------------------------------- Inputs --------------------------------- */
const fieldBase = 'w-full rounded-xl border border-line bg-white px-3.5 text-[15px] text-ink placeholder:text-muted/80 transition focus:outline-none focus:border-brand focus:ring-4 focus:ring-brand/10 disabled:bg-sand disabled:text-muted';

export function Field({ label, hint, error, required, children, className, htmlFor }) {
  return (
    <div className={cx('space-y-1.5', className)}>
      {label && (
        <label htmlFor={htmlFor} className="block text-sm font-semibold text-ink">
          {label}{required && <span className="text-brand-ink"> *</span>}
        </label>
      )}
      {children}
      {error ? <p className="text-[13px] font-medium text-danger">{error}</p> : hint ? <p className="text-[13px] text-subtle">{hint}</p> : null}
    </div>
  );
}

export const Input = forwardRef(function Input({ label, hint, error, required, className, inputClassName, icon: Icon, ...rest }, ref) {
  const id = useId();
  return (
    <Field label={label} hint={hint} error={error} required={required} className={className} htmlFor={rest.id || id}>
      <div className="relative">
        {Icon && <Icon className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />}
        <input ref={ref} id={rest.id || id} required={required} aria-invalid={error ? true : undefined} className={cx(fieldBase, 'h-11', Icon && 'pl-10', error && 'border-danger', inputClassName)} {...rest} />
      </div>
    </Field>
  );
});

export const Textarea = forwardRef(function Textarea({ label, hint, error, required, className, rows = 4, ...rest }, ref) {
  const id = useId();
  return (
    <Field label={label} hint={hint} error={error} required={required} className={className} htmlFor={rest.id || id}>
      <textarea ref={ref} id={rest.id || id} rows={rows} required={required} className={cx(fieldBase, 'py-2.5 leading-relaxed', error && 'border-danger')} {...rest} />
    </Field>
  );
});

export const Select = forwardRef(function Select({ label, hint, error, required, className, children, ...rest }, ref) {
  const id = useId();
  return (
    <Field label={label} hint={hint} error={error} required={required} className={className} htmlFor={rest.id || id}>
      <select ref={ref} id={rest.id || id} required={required} className={cx(fieldBase, 'h-11 appearance-none bg-[url("data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2381766D%22%20stroke-width%3D%222.5%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22/%3E%3C/svg%3E")] bg-[length:12px] bg-[right_14px_center] bg-no-repeat pr-9', error && 'border-danger')} {...rest}>
        {children}
      </select>
    </Field>
  );
});

/* --------------------------------- Display --------------------------------- */
const BADGE = {
  neutral: 'bg-sand text-subtle',
  brand: 'bg-peach text-brand-ink',
  success: 'bg-success-bg text-success',
  warning: 'bg-warning-bg text-warning',
  danger: 'bg-danger-bg text-danger',
  dark: 'bg-ink text-white',
  glass: 'glass text-ink',
};
export function Badge({ tone = 'neutral', icon: Icon, className, children }) {
  return (
    <span className={cx('inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold leading-none', BADGE[tone], className)}>
      {Icon && <Icon className="size-3.5" aria-hidden />}{children}
    </span>
  );
}

const STATUS = {
  requested: ['warning', 'Awaiting confirmation'], confirmed: ['success', 'Confirmed'], rejected: ['danger', 'Declined'], cancelled: ['neutral', 'Cancelled'],
  draft: ['neutral', 'Draft'], published: ['success', 'Published'], unpublished: ['warning', 'Unpublished'], archived: ['neutral', 'Archived'], removed: ['danger', 'Removed'],
  pending: ['warning', 'Pending review'], approved: ['success', 'Approved'],
  open: ['success', 'Open'], closed: ['neutral', 'Closed'],
  submitted: ['warning', 'Submitted'], verified: ['success', 'Verified'],
  resolved: ['success', 'Resolved'], dismissed: ['neutral', 'Dismissed'],
};
export function StatusBadge({ status, label }) {
  const [tone, text] = STATUS[status] || ['neutral', status];
  return <Badge tone={tone}>{label || text}</Badge>;
}

export function Card({ className, children, as: As = 'div', ...rest }) {
  return <As className={cx('rounded-2xl border border-line bg-white', className)} {...rest}>{children}</As>;
}

export function Spinner({ className, label = 'Loading' }) {
  return (
    <div role="status" className={cx('flex items-center justify-center gap-2 py-16 text-subtle', className)}>
      <Loader2 className="size-5 animate-spin text-brand" aria-hidden /><span className="text-sm font-medium">{label}…</span>
    </div>
  );
}

export function Skeleton({ className }) {
  return <div className={cx('animate-pulse rounded-xl bg-sand', className)} />;
}

export function EmptyState({ icon: Icon = Info, title, children, action, className }) {
  return (
    <div className={cx('flex flex-col items-center rounded-2xl border border-dashed border-line bg-white/60 px-6 py-14 text-center', className)}>
      <div className="mb-4 grid size-12 place-items-center rounded-2xl bg-peach text-brand-ink"><Icon className="size-6" aria-hidden /></div>
      <h3 className="text-lg font-bold">{title}</h3>
      {children && <div className="mt-1.5 max-w-md text-[15px] text-subtle">{children}</div>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({ error, onRetry, className }) {
  return (
    <EmptyState icon={AlertCircle} title="Something went wrong" className={className} action={onRetry && <Button variant="secondary" onClick={() => onRetry()}>Try again</Button>}>
      {error?.message || 'Please try again in a moment.'}
    </EmptyState>
  );
}

const NOTICE = {
  info: ['bg-sand border-line text-ink', Info],
  warning: ['bg-warning-bg border-[#f1dcae] text-[#6b4a0c]', TriangleAlert],
  danger: ['bg-danger-bg border-[#efc9c2] text-[#7d2f27]', AlertCircle],
  success: ['bg-success-bg border-[#c9e0cf] text-[#2a5a3d]', CheckCircle2],
  brand: ['bg-peach/70 border-[#f8cfb2] text-ink', Info],
};
export function Notice({ tone = 'info', title, children, className, action }) {
  const [cls, Icon] = NOTICE[tone];
  return (
    <div className={cx('flex gap-3 rounded-xl border p-4 text-[14px] leading-relaxed', cls, className)} role={tone === 'danger' ? 'alert' : undefined}>
      <Icon className="mt-0.5 size-[18px] shrink-0" aria-hidden />
      <div className="min-w-0 flex-1">
        {title && <p className="font-bold">{title}</p>}
        {children && <div className={title ? 'mt-0.5' : ''}>{children}</div>}
      </div>
      {action}
    </div>
  );
}

export function Modal({ open, onClose, title, children, footer, size = 'md' }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label={title}>
      <button type="button" aria-label="Close" data-cursor-passthrough className="absolute inset-0 bg-ink/40 backdrop-blur-[2px]" onClick={onClose} />
      <div className={cx('relative max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-white shadow-lift animate-fade-up sm:rounded-3xl', size === 'lg' ? 'sm:max-w-2xl' : 'sm:max-w-lg')}>
        <div className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-line bg-white/95 px-6 py-4 backdrop-blur">
          <h2 className="text-lg font-bold">{title}</h2>
          <button type="button" onClick={onClose} className="grid size-9 place-items-center rounded-full hover:bg-sand" aria-label="Close dialog"><X className="size-5" /></button>
        </div>
        <div className="px-6 py-5">{children}</div>
        {footer && <div className="sticky bottom-0 flex flex-wrap justify-end gap-2 border-t border-line bg-white/95 px-6 py-4 backdrop-blur">{footer}</div>}
      </div>
    </div>
  );
}

export function Tabs({ tabs, value, onChange, className }) {
  return (
    <div className={cx('no-scrollbar flex gap-1 overflow-x-auto rounded-full border border-line bg-white p-1', className)} role="tablist">
      {tabs.map((t) => (
        <button key={t.value} type="button" role="tab" aria-selected={value === t.value} onClick={() => onChange(t.value)}
          className={cx('flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-sm font-bold transition', value === t.value ? 'bg-ink text-white' : 'text-subtle hover:bg-sand hover:text-ink')}>
          {t.label}
          {t.count != null && <span className={cx('num rounded-full px-1.5 text-[11px]', value === t.value ? 'bg-white/20' : 'bg-sand')}>{t.count}</span>}
        </button>
      ))}
    </div>
  );
}

export function Stat({ label, value, hint, icon: Icon, tone }) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-semibold text-subtle">{label}</p>
        {Icon && <div className={cx('grid size-9 place-items-center rounded-xl', tone === 'warning' ? 'bg-warning-bg text-warning' : 'bg-peach text-brand-ink')}><Icon className="size-[18px]" aria-hidden /></div>}
      </div>
      <p className="num mt-2 text-3xl font-extrabold tracking-tight">{value}</p>
      {hint && <p className="mt-1 text-[13px] text-subtle">{hint}</p>}
    </Card>
  );
}

// Image with lazy loading, responsive srcset for Unsplash, and a graceful fallback.
export function SafeImage({ src, alt, className, sizes = '100vw', widths = [480, 800, 1200, 1600], eager, ...rest }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <div className={cx('grid place-items-center bg-gradient-to-br from-peach to-sand text-brand-soft', className)} role="img" aria-label={alt}>
        <ImageOff className="size-7" aria-hidden />
      </div>
    );
  }
  const fromUnsplash = isUnsplash(src);
  return (
    <img
      src={fromUnsplash ? sized(src, widths[1] || 800) : src}
      srcSet={fromUnsplash ? widths.map((w) => `${sized(src, w)} ${w}w`).join(', ') : undefined}
      sizes={fromUnsplash ? sizes : undefined}
      alt={alt}
      loading={eager ? 'eager' : 'lazy'}
      fetchPriority={eager ? 'high' : undefined}
      decoding="async"
      onError={() => setFailed(true)}
      className={cx('bg-sand object-cover', className)}
      {...rest}
    />
  );
}

export function PageHeader({ eyebrow, title, children, actions, className }) {
  return (
    <div className={cx('flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between', className)}>
      <div className="min-w-0">
        {eyebrow && <p className="mb-1 text-sm font-bold text-brand-ink">{eyebrow}</p>}
        <h1 className="text-2xl font-extrabold sm:text-3xl">{title}</h1>
        {children && <div className="mt-1.5 text-[15px] text-subtle">{children}</div>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

// Editable list of strings (inclusions, exclusions, highlights).
export function ListEditor({ label, value = [], onChange, placeholder, hint }) {
  const [draft, setDraft] = useState('');
  const add = () => {
    const v = draft.trim();
    if (!v) return;
    onChange([...value, v]);
    setDraft('');
  };
  return (
    <Field label={label} hint={hint}>
      {value.length > 0 && (
        <ul className="mb-2 space-y-1.5">
          {value.map((item, i) => (
            <li key={`${item}-${i}`} className="flex items-start gap-2 rounded-xl bg-sand px-3 py-2 text-[14px]">
              <span className="min-w-0 flex-1">{item}</span>
              <button type="button" className="text-muted hover:text-danger" aria-label={`Remove ${item}`} onClick={() => onChange(value.filter((_, j) => j !== i))}><X className="size-4" /></button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex gap-2">
        <input value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }} placeholder={placeholder} className={cx(fieldBase, 'h-10')} />
        <Button variant="secondary" size="sm" className="h-10" onClick={add}>Add</Button>
      </div>
    </Field>
  );
}
