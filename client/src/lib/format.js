const inr = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });

export function money(amount, currency = 'INR') {
  if (amount == null || Number.isNaN(Number(amount))) return '—';
  if (currency === 'INR') return `₹${inr.format(amount)}`;
  try {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount);
  } catch {
    return `${currency} ${inr.format(amount)}`;
  }
}

export const date = (d, opts = { day: 'numeric', month: 'short', year: 'numeric' }) =>
  d ? new Date(d).toLocaleDateString('en-IN', opts) : '—';
export const shortDate = (d) => date(d, { day: 'numeric', month: 'short' });
export const weekdayDate = (d) => date(d, { weekday: 'short', day: 'numeric', month: 'short' });
export const dateTime = (d) => (d ? new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : '—');

export function dateRange(a, b) {
  if (!a) return '—';
  const s = new Date(a);
  const e = b ? new Date(b) : null;
  if (!e) return date(s);
  const sameYear = s.getFullYear() === e.getFullYear();
  const sameMonth = sameYear && s.getMonth() === e.getMonth();
  if (sameMonth) return `${s.getDate()}–${e.getDate()} ${s.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}`;
  return `${date(s, { day: 'numeric', month: 'short', ...(sameYear ? {} : { year: 'numeric' }) })} – ${date(e)}`;
}

export const duration = (d, n) => (d ? `${d}D${n != null ? ` / ${n}N` : ''}` : '—');
export const durationLong = (d, n) => (d ? `${d} day${d > 1 ? 's' : ''}${n != null ? `, ${n} night${n === 1 ? '' : 's'}` : ''}` : 'Duration not set');

export const toInputDate = (d) => {
  if (!d) return '';
  const x = new Date(d);
  const off = x.getTimezoneOffset();
  return new Date(x.getTime() - off * 60000).toISOString().slice(0, 10);
};

export const CATEGORY_LABELS = {
  weekend: 'Weekend getaways', mountains: 'Mountain escapes', adventure: 'Adventure', international: 'International',
  cultural: 'Culture & heritage', beach: 'Beaches', wildlife: 'Wildlife', spiritual: 'Spiritual', trek: 'Treks',
};

// True only when the URL's host really is Unsplash's image CDN (not just a URL containing that text).
export function isUnsplash(url) {
  try { return new URL(url).hostname === 'images.unsplash.com'; } catch { return false; }
}

// Request a resized Unsplash image; other URLs pass through unchanged.
export function sized(url, w) {
  if (!url) return url;
  if (isUnsplash(url)) return url.replace(/([?&])w=\d+/, `$1w=${w}`);
  return url;
}

export const daysUntil = (d) => Math.ceil((new Date(d).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)) / 86400000);
