/* Pure helpers for the trips query (no I/O), unit-tested in client/test. */

/* UI filter state → /api/trips query. Pure, so it is unit-tested. */
export function toTripParams(f = {}) {
  const p = {};
  if (f.q) p.q = f.q;
  if (f.place) p.place = f.place;
  if (f.destination) p.destination = f.destination; // older links: free-text destination/region
  if (f.from) p.departureCity = f.from;
  if (f.landscape) p.landscape = f.landscape;
  if (f.category) p.category = f.category;
  if (f.maxPrice) p.maxPrice = f.maxPrice;
  if (f.maxDays) p.maxDays = f.maxDays;
  if (typeof f.month === 'string' && /^\d{4}-(?:0[1-9]|1[0-2])$/.test(f.month)) {
    const [y, m] = f.month.split('-').map(Number);
    const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
    p.from = `${f.month}-01`;
    p.to = `${f.month}-${String(last).padStart(2, '0')}`;
  }
  if (f.available) p.available = 'true';
  if (f.sort && f.sort !== 'departure') p.sort = f.sort;
  if (f.limit) p.limit = f.limit;
  return p;
}

// The next `n` calendar months as YYYY-MM, for the month filter. A month with no open
// departure simply returns no results (the empty state explains it).
export function upcomingMonths(n = 6, now = new Date()) {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
}
