// E. Review journey: a traveller opens a confirmed booking whose trip has ended, leaves a rating and
// a comment, sees the "You reviewed this trip" notice, and finds the review on the public trip page.
// The completed trip is a test-only fixture (server/test/fixtures/completedTrip.js), added to the
// temporary e2e database here and removed afterwards so no other journey sees it.
const { test, expect } = require('@playwright/test');
const { accounts, uiLogin } = require('./helpers');
const { connectFixtures, disconnectFixtures, createCompletedTrip, removeCompletedTrip } = require('./fixtures');

test.describe.configure({ mode: 'serial' });

let bookingId;
let tripSlug;

test.beforeAll(async () => {
  await connectFixtures();
  await removeCompletedTrip(); // in case an earlier run stopped before cleaning up
  const { booking, pkg } = await createCompletedTrip({ travellerEmail: accounts.traveller, operatorEmail: accounts.operator });
  bookingId = String(booking._id);
  tripSlug = pkg.slug;
});

test.afterAll(async () => {
  await removeCompletedTrip();
  await disconnectFixtures();
});

test('E1: the traveller reviews a completed trip and the review appears on the trip page', async ({ page }) => {
  const comment = 'Great group and a well-run trip.';

  await page.goto('/login');
  await uiLogin(page, accounts.traveller);
  await page.goto(`/bookings/${bookingId}`);

  await expect(page.getByRole('heading', { name: 'How was your trip?' })).toBeVisible();
  const stars = page.getByRole('radiogroup', { name: 'Rating' });
  await stars.getByRole('radio', { name: '4 star' }).click();
  await expect(stars.getByRole('radio', { name: '4 star' })).toHaveAttribute('aria-checked', 'true');
  await page.getByPlaceholder('What should future travellers know?').fill(comment);
  await Promise.all([
    page.waitForResponse((r) => r.url().includes(`/api/bookings/${bookingId}/review`) && r.status() === 201),
    page.getByRole('button', { name: 'Post review' }).click(),
  ]);

  await expect(page.getByText('You reviewed this trip')).toBeVisible();
  await expect(page.getByText(`4 out of 5: “${comment}”`)).toBeVisible();
  await expect(page.getByRole('heading', { name: 'How was your trip?' })).toHaveCount(0);

  await page.goto(`/trips/${tripSlug}`);
  const reviews = page.locator('#reviews');
  await expect(reviews.getByText(comment)).toBeVisible();
  await expect(reviews.getByText('1 review', { exact: false })).toBeVisible();
  await expect(reviews.getByText('Priya', { exact: true })).toBeVisible(); // first name only
  await expect(reviews).not.toContainText('Sharma');
  await expect(reviews.getByText(/Verified booking/)).toBeVisible();
});
