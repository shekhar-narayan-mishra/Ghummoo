// Unit tests for the text helpers in src/utils/text.js. Pure functions and a fake model: no database.
// csvCell is covered in hardening.test.js.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { slugify, uniqueSlug, bookingReference, escapeRegex, toList } = require('../src/utils/text');

test('slugify lower-cases and joins words with single hyphens', () => {
  assert.equal(slugify('Spiti Valley Road Trip'), 'spiti-valley-road-trip');
  assert.equal(slugify('  Goa   __ Beach - Camp  '), 'goa-beach-camp');
});

test('slugify strips accents and punctuation', () => {
  assert.equal(slugify('Café Delhi'), 'cafe-delhi');
  assert.equal(slugify("Rishikesh: Rafting & Camping!"), 'rishikesh-rafting-camping');
});

test('slugify falls back to "item" for empty input', () => {
  for (const v of ['', null, undefined, '!!!']) assert.equal(slugify(v), 'item');
});

test('slugify removes non-Latin text entirely (current behaviour)', () => {
  // Product decision pending in issue #6: Devanagari titles get the generic fallback.
  assert.equal(slugify('मनाली ट्रिप'), 'item');
});

test('slugify keeps leading and trailing hyphens (current behaviour)', () => {
  assert.equal(slugify('--Hello--'), '-hello-');
});

test('slugify caps the slug at 70 characters', () => {
  assert.equal(slugify('a'.repeat(100)).length, 70);
  // The cut can land on a separator and leave a trailing hyphen (current behaviour).
  assert.equal(slugify(`${'a'.repeat(69)} b`), `${'a'.repeat(69)}-`);
});

const fakeModel = (taken) => {
  const queries = [];
  return {
    queries,
    exists: async (q) => {
      queries.push(q);
      return taken(q);
    },
  };
};

test('uniqueSlug returns the base slug when it is free', async () => {
  const Model = fakeModel(() => false);
  assert.equal(await uniqueSlug(Model, 'Kerala Backwaters'), 'kerala-backwaters');
  assert.deepEqual(Model.queries, [{ slug: 'kerala-backwaters' }]);
});

test('uniqueSlug adds a random hex suffix when the base slug is taken', async () => {
  const Model = fakeModel((q) => q.slug === 'kerala');
  assert.match(await uniqueSlug(Model, 'Kerala'), /^kerala-[0-9a-f]{4}$/);
});

test('uniqueSlug excludes the given document from the collision check', async () => {
  const Model = fakeModel(() => false);
  await uniqueSlug(Model, 'Kerala', 'abc123');
  assert.deepEqual(Model.queries[0], { slug: 'kerala', _id: { $ne: 'abc123' } });
});

test('uniqueSlug falls back to a time-based suffix after 20 collisions', async () => {
  const Model = fakeModel(() => true);
  const slug = await uniqueSlug(Model, 'Kerala');
  assert.equal(Model.queries.length, 20);
  assert.match(slug, /^kerala-[0-9a-z]+$/);
  assert.ok(parseInt(slug.slice('kerala-'.length), 36) <= Date.now());
});

test('bookingReference uses GHM- and 6 unambiguous characters', () => {
  for (let i = 0; i < 500; i += 1) {
    assert.match(bookingReference(), /^GHM-[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6}$/);
  }
});

test('escapeRegex makes every metacharacter match literally', () => {
  const s = '.*+?^${}()|[]\\';
  const re = new RegExp(escapeRegex(s));
  assert.ok(re.test(s));
  assert.ok(!new RegExp(`^${escapeRegex('a.c')}$`).test('abc'));
  assert.ok(new RegExp(`^${escapeRegex('a.c')}$`).test('a.c'));
});

test('toList trims arrays, drops blanks and stringifies values', () => {
  assert.deepEqual(toList([' Meals ', '', '  ', 3, 'Stay']), ['Meals', '3', 'Stay']);
});

test('toList splits newline-separated strings', () => {
  assert.deepEqual(toList('Meals\n\n  Stay  \nGuide'), ['Meals', 'Stay', 'Guide']);
});

test('toList returns an empty list for other types', () => {
  for (const v of [undefined, null, 42, { a: 1 }]) assert.deepEqual(toList(v), []);
});
