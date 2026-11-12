/* V0.1 data foundation migration. Idempotent and non-destructive: it never deletes documents.

   1. upsertContent()          Landscape + Place records from content/india.js, matched by slug.
   2. linkAllPackages()        Fills EMPTY TripPackage.destinationRefs / departureCityRefs by
                               exact name/alias matches against the package's own text.
                               Existing links are never overwritten; no match = left empty.
   3. backfillConfirmedSeats() Sets TripDeparture.confirmedSeats from confirmed bookings where
                               the field is missing (or for every departure with { all: true }).

   Runs on server boot (src/index.js) unless AUTO_MIGRATE=false, and on demand with
   `npm run migrate` (add `-- --recount` to recount confirmed seats on every departure). */

const { Landscape, Place, TripPackage, TripDeparture } = require('../models');
const { recountConfirmedSeats } = require('../services/seats');
const content = require('../content/india');

async function upsertDoc(Model, slug, fields) {
  const doc = (await Model.findOne({ slug })) || new Model({ slug });
  doc.set(fields);
  await doc.save(); // full validation, including pre('validate') rules
  return doc;
}

async function upsertContent({ LANDSCAPES, CITIES, PLACES } = content) {
  const landscapeDocs = await Promise.all(
    LANDSCAPES.map(async (l) => {
      const { slug, ...fields } = l;
      const doc = await upsertDoc(Landscape, slug, fields);
      return [slug, doc._id];
    })
  );
  const landscapeIds = new Map(landscapeDocs);
  const resolveLandscapes = (slugs, owner) => slugs.map((s) => {
    if (!landscapeIds.has(s)) throw new Error(`Content error: ${owner} references unknown landscape "${s}"`);
    return landscapeIds.get(s);
  });

  // Pass 1: places without `nearby` (targets may not exist yet).
  const all = [
    ...CITIES.map((c) => ({ ...c, kind: 'city', featured: true })),
    ...PLACES.map((p) => ({ featured: false, ...p })),
  ];
  const placeDocs = await Promise.all(
    all.map(async (p) => {
      const { slug, nearby: _nearby, landscapes = [], ...fields } = p;
      const doc = await upsertDoc(Place, slug, { ...fields, landscapes: resolveLandscapes(landscapes, slug), nearby: [] });
      return [slug, doc._id];
    })
  );
  const placeIds = new Map(placeDocs);
  // Pass 2: nearby links.
  await Promise.all(
    all
      .filter((p) => p.nearby?.length)
      .map((p) => {
        const ids = p.nearby.map((s) => {
          if (!placeIds.has(s)) throw new Error(`Content error: ${p.slug} lists unknown nearby place "${s}"`);
          if (s === p.slug) throw new Error(`Content error: ${p.slug} lists itself as nearby`);
          return placeIds.get(s);
        });
        return Place.updateOne({ slug: p.slug }, { $set: { nearby: ids } });
      })
  );
  return { landscapes: landscapeIds.size, places: placeIds.size };
}

const norm = (s) => String(s || '').toLowerCase().replace(/\s+/g, ' ').trim();
// "Jaipur, Jodhpur & Jaisalmer" → ['jaipur, jodhpur & jaisalmer', 'jaipur', 'jodhpur', 'jaisalmer']
const tokens = (text) => {
  const whole = norm(text);
  if (!whole) return [];
  return [whole, ...whole.split(/\s*(?:,|&|\/|\+|\band\b)\s*/).map((t) => t.trim()).filter(Boolean)];
};

async function placeIndex() {
  const places = await Place.find({ contentStatus: 'published' }, 'slug name kind aliases').lean();
  const index = new Map();
  for (const p of places) {
    for (const key of [p.name, p.slug.replace(/-/g, ' '), ...(p.aliases || [])].map(norm)) {
      if (key && !index.has(key)) index.set(key, p);
    }
  }
  return index;
}

// Pure matcher: returns place IDs found in the package's own text. Never guesses.
function matchPlaces(pkg, index) {
  const pick = (text, onlyCities) => {
    const out = [];
    for (const t of tokens(text)) {
      const p = index.get(t);
      if (p && (!onlyCities || p.kind === 'city') && !out.some((id) => String(id) === String(p._id))) out.push(p._id);
    }
    return out;
  };
  return { destinationRefs: pick(pkg.destination, false), departureCityRefs: pick(pkg.startLocation, true) };
}

// Fills only empty link arrays on one package document (mutates, does not save).
async function linkPackagePlaces(pkg, index) {
  const idx = index || (await placeIndex());
  const m = matchPlaces(pkg, idx);
  if (!pkg.destinationRefs?.length && m.destinationRefs.length) pkg.destinationRefs = m.destinationRefs;
  if (!pkg.departureCityRefs?.length && m.departureCityRefs.length) pkg.departureCityRefs = m.departureCityRefs;
  return pkg;
}

async function linkAllPackages() {
  const index = await placeIndex();
  const pkgs = await TripPackage.find({}, 'destination startLocation destinationRefs departureCityRefs').lean();
  const updates = [];
  for (const pkg of pkgs) {
    const m = matchPlaces(pkg, index);
    const set = {};
    if (!pkg.destinationRefs?.length && m.destinationRefs.length) set.destinationRefs = m.destinationRefs;
    if (!pkg.departureCityRefs?.length && m.departureCityRefs.length) set.departureCityRefs = m.departureCityRefs;
    if (Object.keys(set).length) {
      updates.push(TripPackage.updateOne({ _id: pkg._id }, { $set: set }, { timestamps: false }));
    }
  }
  await Promise.all(updates);
  return { packages: pkgs.length, linked: updates.length };
}

async function backfillConfirmedSeats({ all = false } = {}) {
  const deps = await TripDeparture.find(all ? {} : { confirmedSeats: { $exists: false } }, '_id').lean();
  await Promise.all(deps.map((dep) => recountConfirmedSeats(dep._id)));
  return { departures: deps.length };
}

async function runFoundation({ recount = false, log = () => {} } = {}) {
  const c = await upsertContent();
  const l = await linkAllPackages();
  const s = await backfillConfirmedSeats({ all: recount });
  log(`[migrate] content: ${c.landscapes} landscapes, ${c.places} places; packages linked: ${l.linked}/${l.packages}; departures recounted: ${s.departures}`);
  return { content: c, links: l, seats: s };
}

module.exports = { runFoundation, upsertContent, linkAllPackages, linkPackagePlaces, matchPlaces, placeIndex, backfillConfirmedSeats, tokens };
