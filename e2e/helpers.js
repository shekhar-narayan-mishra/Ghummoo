// Shared helpers for Ghumo end-to-end tests.
const DEMO_PASSWORD = 'GhumoDemo#2026'; // seeded demo password (server/src/seedData.js)

const accounts = {
  traveller: 'traveller@ghumo.demo',
  operator: 'operator@ghumo.demo', // Wandering Pahadi Co.
  admin: 'admin@ghumo.demo',
};

// The main pages the quality and accessibility sweeps visit. Shared so both specs
// stay in step: PUBLIC needs no sign-in, TRAVELLER needs the traveller account and
// ORGANISER needs the operator account (see apiLogin below).
const PUBLIC = ['/', '/india', '/cities', '/places/jaipur', '/trips', '/trips/rishikesh-adventure-weekend', '/decide', '/compare?trips=rishikesh-adventure-weekend,nainital-lakes-weekend', '/partners', '/login'];
const TRAVELLER = ['/me/trips'];
const ORGANISER = ['/operator', '/operator/packages', '/operator/bookings', '/operator/insights', '/operator/studio'];

// Signs in through the API; cookies are shared with the page's browser context.
async function apiLogin(request, email, password = DEMO_PASSWORD) {
  const res = await request.post('/api/auth/login', { data: { email, password } });
  if (!res.ok()) throw new Error(`login failed for ${email}: ${res.status()}`);
  return (await res.json()).data;
}

// Waits for the sign-in response, so a navigation straight afterwards can't cancel the request.
async function uiLogin(page, email, password = DEMO_PASSWORD) {
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await Promise.all([
    page.waitForResponse((r) => r.url().includes('/api/auth/login') && r.request().method() === 'POST'),
    page.locator('main form button[type=submit]').click(),
  ]);
}

// Page has no horizontal overflow (allows 1px rounding).
async function horizontalOverflow(page) {
  return page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
}

module.exports = { DEMO_PASSWORD, accounts, PUBLIC, TRAVELLER, ORGANISER, apiLogin, uiLogin, horizontalOverflow };
