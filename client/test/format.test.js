import { test } from 'node:test';
import assert from 'node:assert/strict';
import { env } from 'node:process';
import { money, date, shortDate, weekdayDate, dateTime, dateRange, duration, durationLong, toInputDate, sized, daysUntil } from '../src/lib/format.js';

env.TZ = 'Asia/Kolkata';

const departure = '2026-12-10T12:00:00Z';

test('money formats INR and other currencies and handles missing or invalid values', () => {
  assert.equal(money(12999), '₹12,999');
  assert.equal(money(125000), '₹1,25,000');
  assert.equal(money(12999, 'USD'), '$12,999');
  assert.equal(money(1000, 'INVALID'), 'INVALID 1,000');
  assert.equal(money(null), '—');
  assert.equal(money(NaN), '—');
});

test('date helpers use the local calendar and handle missing dates', () => {
  assert.equal(date(departure), '10 Dec 2026');
  assert.equal(shortDate(departure), '10 Dec');
  assert.equal(weekdayDate(departure), 'Thu, 10 Dec');
  assert.equal(dateTime(departure).replace(/\s+/g, ' ').toLowerCase(), '10 dec, 5:30 pm');
  for (const formatDate of [date, shortDate, weekdayDate, dateTime]) {
    assert.equal(formatDate(null), '—');
  }
});

test('dateRange formats same-month, same-year and cross-year trips', () => {
  assert.equal(dateRange(departure, '2026-12-12T12:00:00Z'), '10–12 Dec 2026');
  assert.equal(dateRange(departure, '2027-01-02T12:00:00Z'), '10 Dec 2026 – 2 Jan 2027');
  assert.equal(dateRange('2026-11-28T12:00:00Z', departure), '28 Nov – 10 Dec 2026');
  assert.equal(dateRange(departure), '10 Dec 2026');
  assert.equal(dateRange(null), '—');
});

test('duration helpers distinguish zero nights from an omitted night count', () => {
  assert.equal(duration(5, 4), '5D / 4N');
  assert.equal(duration(1, 0), '1D / 0N');
  assert.equal(duration(2), '2D');
  assert.equal(duration(null), '—');
  assert.equal(durationLong(1, 1), '1 day, 1 night');
  assert.equal(durationLong(2, 0), '2 days, 0 nights');
  assert.equal(durationLong(3, 2), '3 days, 2 nights');
  assert.equal(durationLong(1), '1 day');
  assert.equal(durationLong(null), 'Duration not set');
});

test('toInputDate uses the local date even when the UTC date is different', () => {
  assert.equal(toInputDate('2026-12-09T20:00:00Z'), '2026-12-10');
  assert.equal(toInputDate(null), '');
});

test('sized replaces the width for Unsplash URLs only', () => {
  assert.equal(sized('https://images.unsplash.com/photo-1?fit=crop&w=1200&q=80', 480), 'https://images.unsplash.com/photo-1?fit=crop&w=480&q=80');
  assert.equal(sized('https://example.com/photo-1?w=1200', 480), 'https://example.com/photo-1?w=1200');
  assert.equal(sized('', 480), '');
});

test('daysUntil counts calendar days relative to today', (t) => {
  t.mock.timers.enable({ apis: ['Date'], now: new Date(departure) });

  assert.equal(daysUntil('2026-12-09T20:00:00Z'), 0);
  assert.equal(daysUntil('2026-12-10T19:00:00Z'), 1);
  assert.equal(daysUntil('2026-12-09T12:00:00Z'), -1);
});
