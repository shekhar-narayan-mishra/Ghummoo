// AI Package Studio: turns an unstructured social-media caption into a structured trip draft.
const { callStructured, status } = require('./provider');
// Runs server-side only. Provider is chosen with environment variables:
//   AI_PROVIDER=anthropic (default when ANTHROPIC_API_KEY is set) | openai (any OpenAI-compatible API)
//   ANTHROPIC_API_KEY / OPENAI_API_KEY, AI_MODEL, OPENAI_BASE_URL

const CATEGORIES = ['weekend', 'mountains', 'adventure', 'international', 'cultural', 'beach', 'wildlife', 'spiritual', 'trek'];

const SCHEMA = {
  type: 'object',
  properties: {
    title: { type: ['string', 'null'], description: 'Short marketable package title based on the text' },
    destination: { type: ['string', 'null'], description: 'Main destination(s), e.g. "Manali & Kasol"' },
    region: { type: ['string', 'null'], description: 'State or region if stated or unambiguous from destination' },
    country: { type: ['string', 'null'] },
    startLocation: { type: ['string', 'null'], description: 'City the group departs from' },
    durationDays: { type: ['integer', 'null'] },
    durationNights: { type: ['integer', 'null'] },
    price: { type: ['number', 'null'], description: 'Price per person exactly as stated' },
    currency: { type: ['string', 'null'], description: 'ISO code, INR if ₹/Rs/INR or Indian context with bare numbers' },
    departureDates: { type: 'array', items: { type: 'string', description: 'YYYY-MM-DD' } },
    transport: { type: ['string', 'null'] },
    accommodation: { type: ['string', 'null'] },
    meals: { type: ['string', 'null'] },
    activities: { type: 'array', items: { type: 'string' } },
    itinerary: {
      type: 'array',
      items: {
        type: 'object',
        properties: { day: { type: 'integer' }, title: { type: 'string' }, description: { type: 'string' } },
        required: ['day', 'title', 'description'],
      },
    },
    inclusions: { type: 'array', items: { type: 'string' } },
    exclusions: { type: 'array', items: { type: 'string' } },
    capacity: { type: ['integer', 'null'], description: 'Seats per departure, only if stated' },
    cancellationPolicy: { type: ['string', 'null'] },
    pickupInfo: { type: ['string', 'null'] },
    categories: { type: 'array', items: { type: 'string', enum: CATEGORIES } },
    summary: { type: ['string', 'null'], description: 'One-sentence factual summary using only stated facts' },
    warnings: { type: 'array', items: { type: 'string' }, description: 'Ambiguities or assumptions the operator must check' },
  },
  required: ['title', 'destination', 'price', 'departureDates', 'itinerary', 'inclusions', 'exclusions', 'warnings'],
};

function systemPrompt() {
  const today = new Date().toISOString().slice(0, 10);
  return `You extract structured travel-package data from informal social-media posts written by small Indian group-travel organisers.
Today is ${today}.
STRICT RULES:
- Use ONLY information present in the text. Never invent prices, dates, hotels, capacities, policies, times or activities.
- If a value is not stated, return null (or an empty array). Do not guess.
- Inclusions: only items the text says are included (e.g. "2 nights hotel", "breakfast", "bonfire").
- Exclusions: only if the text explicitly says something is excluded/not included. Otherwise empty.
- Itinerary: only build day-wise entries if the text describes days or a clear sequence. You may group stated activities into days ONLY when the text indicates which day; otherwise return an empty itinerary and add a warning.
- Dates: if day and month are given without a year, use the next future occurrence and add a warning that the year was assumed.
- Duration: "5 days 4 nights" → 5 and 4. "5D/4N" likewise.
- Price is per person unless the text says otherwise; if unclear add a warning.
- Title may be phrased nicely but must only reference stated places.
- warnings: list every assumption you made and every ambiguity. Be concise.`;
}

const str = (v) => (typeof v === 'string' && v.trim() ? v.trim() : null);
const arr = (v) => (Array.isArray(v) ? v.map((x) => (typeof x === 'string' ? x.trim() : x)).filter(Boolean) : []);
const int = (v) => (Number.isFinite(Number(v)) && v !== null && v !== '' ? Math.round(Number(v)) : null);

// Every number written in the text, as whole tokens: "₹12,999" → 12999, "1,25,000" → 125000,
// "15k" → 15 and 15000, "1.2 lakh" → 1.2 and 120000, "5D/4N" → 5 and 4.
function numbersInText(text) {
  const found = new Set();
  const re = /(\d+(?:,\d+)*(?:\.\d+)?)(?:\s*(k|lakhs?|lacs?)\b)?/gi;
  for (const m of String(text || '').matchAll(re)) {
    const value = Number(m[1].replace(/,/g, ''));
    if (!Number.isFinite(value)) continue;
    found.add(value);
    const unit = (m[2] || '').toLowerCase();
    if (unit === 'k') found.add(Math.round(value * 1000));
    else if (unit) found.add(Math.round(value * 100000));
  }
  return found;
}

// Grounding check: a number the model returns must appear in the source text as a whole
// number, not merely as a run of digits inside a bigger one (500 is not grounded by "15,000").
function numberInText(n, text) {
  if (n == null || !Number.isFinite(Number(n))) return false;
  return numbersInText(text).has(Number(n));
}

const MONTHS = {
  jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3, apr: 4, april: 4, may: 5, jun: 6, june: 6,
  jul: 7, july: 7, aug: 8, august: 8, sep: 9, sept: 9, september: 9, oct: 10, october: 10,
  nov: 11, november: 11, dec: 12, december: 12,
};
// Words that may sit between a day and its month: "20th to 22nd Dec", "Dec 5, 12 and 19".
const DATE_JOINERS = new Set(['to', 'till', 'until', 'and', 'or', 'of', 'the', 'from', 'on']);
const MAX_DATE_GAP = 4;

// Every day-month pair written in the text, as "day-month" keys ("20-12").
// - A day (1-31, a whole number, ordinals allowed) near a month name or abbreviation, with only
//   other days or joining words between them. A day as close to the month before it as to the
//   one after it pairs with both.
// - Numeric day-first dates: 20/12, 20-12, 20.12, with or without a year; and 2026-12-20.
//   "5-6 Jan" is a range of days, not 5 June, and "10.30 am" or "1.5 lakh" are not dates.
function datesInText(text) {
  const s = String(text || '');
  const found = new Set();
  const add = (day, month) => {
    if (day >= 1 && day <= 31 && month >= 1 && month <= 12) found.add(`${day}-${month}`);
  };

  // "20th" and "20" are days; "5D" or "120" glued to letters is not. An amount with thousands
  // separators ("18,999", "1,25,000") is one word, so its "18" or "1" is never read as a day.
  // "Dec 5,12,19" still lists days: a separator group of three digits marks an amount.
  const tokens = [...s.matchAll(/\d{1,3}(?:,\d{2})*,\d{3}(?:\.\d+)?(?!\d)|(\d+)(?:st|nd|rd|th)?(?![a-z\d])|[a-z]+|\d+/gi)].map((m) => {
    if (m[1] !== undefined) return { day: Number(m[1]) };
    const word = m[0].toLowerCase();
    return MONTHS[word] ? { month: MONTHS[word] } : { word };
  });
  tokens.forEach((t, i) => {
    if (t.day === undefined) return;
    const nearest = (step) => {
      for (let j = i + step, gap = 1; j >= 0 && j < tokens.length && gap <= MAX_DATE_GAP; j += step, gap += 1) {
        if (tokens[j].month) return { month: tokens[j].month, gap };
        if (tokens[j].day === undefined && !DATE_JOINERS.has(tokens[j].word)) return null;
      }
      return null;
    };
    const before = nearest(-1);
    const after = nearest(1);
    if (before && (!after || before.gap <= after.gap)) add(t.day, before.month);
    if (after && (!before || after.gap <= before.gap)) add(t.day, after.month);
  });

  for (const m of s.matchAll(/(?<!\d)(\d{4})-(\d{1,2})-(\d{1,2})(?!\d)/g)) add(Number(m[3]), Number(m[2]));
  const names = Object.keys(MONTHS).join('|');
  const monthAfter = new RegExp(`^\\s*(?:${names})\\b`, 'i');
  const monthBefore = new RegExp(`\\b(?:${names})\\.?\\s*$`, 'i');
  for (const m of s.matchAll(/(?<![\d/.-])(\d{1,2})\s*[/.-]\s*(\d{1,2})(?![\d])/g)) {
    const rest = s.slice(m.index + m[0].length);
    if (monthAfter.test(rest) || monthBefore.test(s.slice(0, m.index))) continue; // a range: "5-6 Jan", "Jan 5-6"
    if (/^\s*(?:am|pm|hrs?|k|lakhs?|lacs?|cr)\b/i.test(rest)) continue; // a time or an amount
    add(Number(m[1]), Number(m[2]));
  }
  return found;
}

// Grounding check for a departure date (YYYY-MM-DD): its day and month must both be written in
// the text. The year may be missing; the prompt tells the model to assume the next occurrence.
function dateInText(isoDate, text) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(isoDate || ''));
  if (!m) return false;
  return datesInText(text).has(`${Number(m[3])}-${Number(m[2])}`);
}

function normalise(raw, text) {
  const warnings = arr(raw.warnings);
  let price = raw.price == null ? null : Number(raw.price);
  if (price != null && !numberInText(price, text)) {
    warnings.push(`Price ${price} could not be found in the text and was cleared`);
    price = null;
  }
  let capacity = int(raw.capacity);
  if (capacity != null && !numberInText(capacity, text)) {
    warnings.push(`Seat capacity ${capacity} could not be found in the text and was cleared`);
    capacity = null;
  }

  const today = new Date().toISOString().slice(0, 10);
  const departureDates = arr(raw.departureDates).filter((d) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d) || Number.isNaN(Date.parse(d))) return false;
    if (d < today) {
      warnings.push(`Departure date ${d} is in the past and was cleared`);
      return false;
    }
    if (!dateInText(d, text)) {
      warnings.push(`Departure date ${d} could not be found in the text and was cleared`);
      return false;
    }
    return true;
  });

  const duration = (value, unit) => {
    const n = int(value);
    if (n == null || numberInText(n, text)) return n;
    warnings.push(`Duration ${n} ${unit} could not be found in the text and was cleared`);
    return null;
  };
  const durationDays = duration(raw.durationDays, 'days');
  const durationNights = duration(raw.durationNights, 'nights');

  const itinerary = arr(raw.itinerary)
    .filter((d) => d && typeof d === 'object' && str(d.title))
    .map((d, i) => ({ day: int(d.day) || i + 1, title: str(d.title), description: str(d.description) || '', meals: '', stay: '' }));

  const draft = {
    title: str(raw.title),
    destination: str(raw.destination),
    region: str(raw.region),
    country: str(raw.country),
    startLocation: str(raw.startLocation),
    durationDays,
    durationNights,
    basePrice: price,
    currency: (str(raw.currency) || (price != null ? 'INR' : null))?.toUpperCase() || null,
    departureDates,
    transport: str(raw.transport),
    accommodation: str(raw.accommodation),
    meals: str(raw.meals),
    highlights: arr(raw.activities),
    itinerary,
    inclusions: arr(raw.inclusions),
    exclusions: arr(raw.exclusions),
    capacity,
    cancellationPolicy: str(raw.cancellationPolicy),
    pickupInfo: str(raw.pickupInfo),
    categories: arr(raw.categories).filter((c) => CATEGORIES.includes(c)),
    summary: str(raw.summary),
  };

  // Deterministic missing-field warnings, independent of what the model says.
  const missing = [];
  if (!draft.title) missing.push('Package title');
  if (!draft.destination) missing.push('Destination');
  if (draft.basePrice == null) missing.push('Price per person');
  if (!draft.durationDays) missing.push('Duration');
  if (!draft.departureDates.length) missing.push('Departure dates');
  if (!draft.startLocation) missing.push('Starting location');
  if (!draft.transport) missing.push('Transport details');
  if (!draft.accommodation) missing.push('Accommodation details');
  if (!draft.itinerary.length) missing.push('Day-wise itinerary');
  if (!draft.exclusions.length) missing.push('Exclusions');
  if (draft.capacity == null) missing.push('Seat capacity');
  if (!draft.cancellationPolicy) missing.push('Cancellation policy');
  if (!draft.pickupInfo) missing.push('Exact pickup point and reporting time');
  if (draft.accommodation && !/star|category|3\*|4\*|5\*|boutique|hostel|camp|homestay|resort/i.test(draft.accommodation)) {
    warnings.push('Hotel category is not specified');
  }

  return { draft, missing, warnings: [...new Set(warnings)] };
}

// The model's answer before any grounding or clean-up. The evaluation harness
// (server/eval/studio) uses it to measure how often the model itself invents values.
async function extractRaw(text) {
  const { data, provider, model } = await callStructured({
    system: systemPrompt(),
    user: `Extract the package from this post:\n\n"""${text}"""`,
    schema: SCHEMA,
    name: 'record_package',
    maxTokens: 4000,
    timeoutMs: 60000,
    strict: false,
  });
  return { raw: data || {}, provider, model };
}

async function extractPackage(text) {
  const { raw, provider, model } = await extractRaw(text);
  return { ...normalise(raw, text), provider, model };
}

module.exports = { extractPackage, extractRaw, status, normalise, numberInText, dateInText };
