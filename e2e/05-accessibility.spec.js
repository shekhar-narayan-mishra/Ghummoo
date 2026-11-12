// F. Automated accessibility checks. Runs the axe-core rule engine (WCAG 2.1 A and AA) over the
// same public, traveller and organiser pages the quality sweep visits, at a desktop and a 390px
// viewport. A violation with impact `serious` or `critical` fails the suite; `moderate` and `minor`
// are recorded in e2e/quality-metrics.json for the report. axe cannot catch everything (focus order
// and meaningful alt text still need a human), so this complements, not replaces, manual review.
const fs = require('fs');
const path = require('path');
const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;
const { accounts, apiLogin, PUBLIC, TRAVELLER, ORGANISER } = require('./helpers');

// WCAG 2.1 levels A and AA. (wcag2* are the 2.0 rules, wcag21* the 2.1 additions.)
const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];
const VIEWPORTS = [
  { label: 'desktop', width: 1440, height: 900 },
  { label: 'mobile', width: 390, height: 844 },
];

// Temporary allow-list for violations tracked separately and fixed later. Each entry MUST name a
// rule id, the exact page scope it applies to, and the tracking issue — never disable a rule
// globally and never add an entry without an issue link. Matching is by (rule id + exact path), so
// a known violation on one page never hides the same rule on another page, and a brand-new
// violation (a different rule, or the same rule on a page not listed here) is never silenced.
//
// All current entries are `color-contrast` (serious): the brand palette fails WCAG AA by small
// margins, driven by white text on the brand-orange CTA (3.05:1) which is a design decision for
// the maintainers. Tracked in issue #75; fixes must use the tokens in
// client/src/index.css. `/cities` and `/decide` are deliberately NOT listed — they pass today, so
// a regression there fails the build. Remove each entry as its page is fixed. (The one other
// violation first-run found, `label-content-name-mismatch` on the logo link, was a small bug and
// is fixed in this PR — client/src/components/Logo.jsx — not allow-listed.)
const CONTRAST_ISSUE = 'https://github.com/shekhar-narayan-mishra/Ghummoo/issues/75';
const CONTRAST_PAGES = [
  '/', '/india', '/places/jaipur', '/trips', '/trips/rishikesh-adventure-weekend',
  '/compare?trips=rishikesh-adventure-weekend,nainital-lakes-weekend', '/partners', '/login',
  '/me/trips', '/operator', '/operator/packages', '/operator/bookings', '/operator/insights', '/operator/studio',
];
const ALLOWLIST = CONTRAST_PAGES.map((path) => ({ rule: 'color-contrast', path, issue: CONTRAST_ISSUE }));

const metrics = { tags: TAGS, viewports: VIEWPORTS.map((v) => `${v.label} ${v.width}px`), allowlist: ALLOWLIST, violations: [] };

function isAllowListed(rule, pagePath) {
  return ALLOWLIST.some((e) => e.rule === rule && e.path === pagePath);
}

// Runs axe on one page and records every violation; returns the serious/critical ones that are
// not allow-listed (these block the build).
async function auditPage(page, pagePath, viewport, group) {
  await page.goto(pagePath);
  await page.waitForLoadState('networkidle');
  const { violations } = await new AxeBuilder({ page }).withTags(TAGS).analyze();
  const blocking = [];
  for (const v of violations) {
    const record = {
      group, path: pagePath, viewport: viewport.label, rule: v.id, impact: v.impact,
      nodes: v.nodes.length, help: v.help, allowListed: isAllowListed(v.id, pagePath),
    };
    metrics.violations.push(record);
    if ((v.impact === 'serious' || v.impact === 'critical') && !record.allowListed) blocking.push(record);
  }
  return blocking;
}

async function auditPages(page, paths, viewport, group) {
  const blocking = [];
  for (const p of paths) blocking.push(...(await auditPage(page, p, viewport, group)));
  return blocking;
}

// Merge the accessibility results into quality-metrics.json without clobbering what the quality
// spec (which runs first) wrote. Only moderate and minor violations are kept for the report; the
// serious and critical ones have already failed the run.
test.afterAll(() => {
  const file = path.join(__dirname, 'quality-metrics.json');
  let report = {};
  try { report = JSON.parse(fs.readFileSync(file, 'utf8')); } catch { /* quality spec may not have run */ }
  report.accessibility = {
    tags: metrics.tags,
    viewports: metrics.viewports,
    allowlist: metrics.allowlist,
    seriousCritical: metrics.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical'),
    moderateMinor: metrics.violations.filter((v) => v.impact === 'moderate' || v.impact === 'minor'),
  };
  fs.writeFileSync(file, `${JSON.stringify(report, null, 2)}\n`);
});

for (const viewport of VIEWPORTS) {
  test(`Accessibility: axe WCAG 2.1 A/AA at ${viewport.label} (${viewport.width}px)`, async ({ browser }) => {
    const blocking = [];

    const ctx = await browser.newContext({ viewport });
    const page = await ctx.newPage();
    blocking.push(...(await auditPages(page, PUBLIC, viewport, 'public')));
    await apiLogin(page.request, accounts.traveller);
    blocking.push(...(await auditPages(page, TRAVELLER, viewport, 'traveller')));
    await ctx.close();

    const orgCtx = await browser.newContext({ viewport });
    const org = await orgCtx.newPage();
    await apiLogin(org.request, accounts.operator);
    blocking.push(...(await auditPages(org, ORGANISER, viewport, 'organiser')));
    await orgCtx.close();

    const summary = blocking.map((b) => `  ${b.path} [${b.viewport}] ${b.rule} (${b.impact}, ${b.nodes} node(s)) — ${b.help}`).join('\n');
    expect(blocking, `Serious/critical accessibility violations at ${viewport.label}:\n${summary}`).toHaveLength(0);
  });
}
