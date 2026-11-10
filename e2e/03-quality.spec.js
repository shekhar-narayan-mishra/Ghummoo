// D/E. Design, usability and performance checks across breakpoints. Measurements are written to
// e2e/quality-metrics.json for the test report; hard limits are deliberately modest so the
// suite flags real regressions without being flaky.
const fs = require('fs');
const path = require('path');
const { test, expect } = require('@playwright/test');
const { accounts, apiLogin, horizontalOverflow, PUBLIC, TRAVELLER, ORGANISER } = require('./helpers');

const WIDTHS = [360, 390, 768, 1024, 1440];
const metrics = { overflow: [], consoleErrors: [], cls: {}, longTasks: {}, images: {}, reducedMotion: {} };

test.afterAll(() => {
  fs.writeFileSync(path.join(__dirname, 'quality-metrics.json'), `${JSON.stringify(metrics, null, 2)}\n`);
});

async function sweep(page, paths, width) {
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(String(e)));
  for (const p of paths) {
    await page.goto(p);
    await page.waitForLoadState('networkidle');
    const over = await horizontalOverflow(page);
    metrics.overflow.push({ width, path: p, overflow: over });
    expect.soft(over, `${p} at ${width}px overflows by ${over}px`).toBeLessThanOrEqual(1);
    // Search stays reachable: the header search button or a search box is on every public page.
    if (!p.startsWith('/operator') && !p.startsWith('/me')) {
      await expect.soft(page.getByRole('button', { name: /Search destinations/ }).first(), `search on ${p} at ${width}`).toBeVisible();
    }
  }
  const real = errors.filter((e) => !/Failed to load resource.*(401|403|404)/.test(e) && !/images\.unsplash\.com/.test(e));
  metrics.consoleErrors.push(...real.map((e) => ({ width, error: e.slice(0, 200) })));
  expect.soft(real, `console errors at ${width}px`).toEqual([]);
}

for (const width of WIDTHS) {
  test(`No horizontal overflow or console errors at ${width}px`, async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width, height: 900 } });
    const page = await ctx.newPage();
    await sweep(page, PUBLIC, width);
    await apiLogin(page.request, accounts.traveller);
    await sweep(page, TRAVELLER, width);
    await ctx.close();

    const orgCtx = await browser.newContext({ viewport: { width, height: 900 } });
    const org = await orgCtx.newPage();
    await apiLogin(org.request, accounts.operator);
    await sweep(org, ORGANISER, width);
    await orgCtx.close();
  });
}

test('Mobile filters open in a drawer and stay usable at 360px', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 360, height: 780 } });
  const page = await ctx.newPage();
  await page.goto('/trips');
  await page.getByRole('button', { name: /^Filters/ }).click();
  const drawer = page.getByRole('dialog', { name: 'Filters' });
  await expect(drawer).toBeVisible();
  await drawer.getByText('Up to 3 days', { exact: true }).click();
  await expect(page).toHaveURL(/maxDays=3/);
  await drawer.getByRole('button', { name: /^Show \d+ trips/ }).click();
  await expect(drawer).toHaveCount(0);
  await expect(page.getByLabel('Active filters').getByRole('button', { name: /Up to 3 days/ })).toBeVisible();
  await ctx.close();
});

test('Forms show clear validation messages', async ({ page }) => {
  await page.goto('/register');
  await page.locator('main form button[type=submit]').click();
  await expect(page.locator('main').getByText(/full name|valid email|8 characters/i).first()).toBeVisible();
  await page.goto('/decide');
  await page.getByLabel('Describe the trip you want').fill('x');
  await expect(page.getByRole('button', { name: /^Find trips/ })).toBeEnabled();
});

test('Reduced motion: scenes stay still and content stays visible', async ({ browser }) => {
  const ctx = await browser.newContext({ reducedMotion: 'reduce', viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.goto('/india');
  await page.locator('#himalayas').scrollIntoViewIfNeeded();
  await page.mouse.wheel(0, 1500);
  await page.waitForTimeout(800);
  const state = await page.evaluate(() => ({
    movedLayers: [...document.querySelectorAll('[data-depth]')].filter((el) => (el.getAttribute('transform') || el.style.transform || '').match(/matrix|translate/)).length,
    hiddenReveals: [...document.querySelectorAll('[data-reveal]')].filter((el) => getComputedStyle(el).opacity === '0').length,
  }));
  metrics.reducedMotion = state;
  expect(state.movedLayers).toBe(0);
  expect(state.hiddenReveals).toBe(0);
  await ctx.close();

  // With motion allowed the same page does animate (proves the check is meaningful).
  const motion = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const p2 = await motion.newPage();
  await p2.goto('/india');
  await p2.locator('#desert').scrollIntoViewIfNeeded();
  await p2.waitForTimeout(800);
  const moved = await p2.evaluate(() => [...document.querySelectorAll('[data-depth]')].filter((el) => (el.getAttribute('transform') || el.style.transform || '').match(/matrix|translate/)).length);
  expect(moved).toBeGreaterThan(0);
  await motion.close();
});

test('Layout shift, long tasks while scrolling, and image sizing', async ({ browser }) => {
  for (const [label, width] of [['mobile', 390], ['desktop', 1440]]) {
    const ctx = await browser.newContext({ viewport: { width, height: 900 }, deviceScaleFactor: label === 'mobile' ? 3 : 1 });
    const page = await ctx.newPage();
    await page.addInitScript(() => {
      window.__cls = 0; window.__long = [];
      new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value; }).observe({ type: 'layout-shift', buffered: true });
      new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__long.push(Math.round(e.duration)); }).observe({ type: 'longtask', buffered: true });
    });
    for (const p of ['/', '/trips', '/india']) {
      await page.goto(p);
      await page.waitForLoadState('networkidle');
      if (p === '/india') {
        await page.evaluate(() => { window.__long = []; });
        for (let i = 0; i < 25; i += 1) { await page.mouse.wheel(0, 600); await page.waitForTimeout(60); }
      }
      const r = await page.evaluate(() => ({ cls: Math.round(window.__cls * 1000) / 1000, long: window.__long }));
      metrics.cls[`${label} ${p}`] = r.cls;
      if (p === '/india') metrics.longTasks[label] = { count: r.long.length, max: r.long.length ? Math.max(...r.long) : 0 };
      expect.soft(r.cls, `CLS on ${p} (${label})`).toBeLessThan(0.25);
    }
    // Images: rendered pixels vs downloaded pixels for photos on the home page.
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    metrics.images[label] = await page.evaluate(() => {
      const imgs = [...document.querySelectorAll('img')].filter((i) => i.complete && i.naturalWidth && i.getBoundingClientRect().width > 0);
      const ratios = imgs.map((i) => i.naturalWidth / (i.getBoundingClientRect().width * devicePixelRatio));
      const lazy = [...document.querySelectorAll('img')].filter((i) => i.loading === 'lazy').length;
      return { count: imgs.length, lazy, maxOversize: Math.round(Math.max(1, ...ratios) * 100) / 100 };
    });
    await ctx.close();
  }
});
