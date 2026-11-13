# Testing guide

## The test layers

| Layer | Location | Runner | Command | Needs |
| --- | --- | --- | --- | --- |
| Server API and logic | `server/test/*.test.js` | `node --test` (one file at a time) | `npm test --prefix server` | Nothing: each file starts its own throwaway embedded MongoDB in a temporary folder |
| Client logic | `client/test/*.test.js` | `node --test` | `npm test --prefix client` | Nothing |
| Both of the above | | | `npm test` | |
| End-to-end | `e2e/*.spec.js` | Playwright (Chromium) | `npm run test:e2e` | `npx playwright install chromium` once. It builds the client, starts a production server on :5198 with a temporary database, and an AI stub on :5199 |
| Lint | `client/` | ESLint 9 | `npm run lint` | |

No test touches `server/.data`, a real `MONGODB_URI` or a real AI provider.

## Writing a server test

Copy the harness at the top of `server/test/hardening.test.js`. It:
1. sets `MONGODB_URI=''` and `EMBEDDED_DB_PATH` to a temporary folder;
2. connects and seeds;
3. starts the app on a random port;
4. provides a small `client()` helper that keeps the session cookie.

```js
test('organisers cannot see other organisers\' bookings', async () => {
  const op = client();
  await op.login('altitude@ghumo.demo');
  const r = await op.get(`/api/operator/bookings/${someOtherBookingId}`);
  assert.equal(r.status, 404);
});
```

Guidelines:
- Test behaviour through the HTTP API where you can. That is what protects the contract.
- For pure functions (grounding, preference parsing), import them directly.
- **Every bug fix gets a test that fails without the fix.**
- Use demo accounts, or register fresh ones with unique emails (`` `name-${Date.now()}@ghumo.test` ``).
- Rate limits: set `RATE_LIMIT=off` in a file that doesn't test limits. Files run in separate processes, so environment variables don't leak between files.
- AI: never call a real provider. Use `setFetch()` from `server/src/services/ai/provider.js` to inject a stub, as `server/test/discovery.test.js` does.

## Things to test in particular

These follow `.agents/skills/test-and-qa/SKILL.md`:
- seat holds and status transitions, including concurrency (see T10 in `api.test.js`);
- role and ownership checks: traveller, organiser and admin each see only their own data;
- filters and sorting;
- AI grounding: no invented prices, capacities or dates; missing fields listed;
- every new validation rule, including that bad input returns 4xx and not 500.

## End-to-end tests

- The specs run **in order with one worker** because they share one seeded database. `01-traveller` creates a booking that later specs use.
- `05-reviews` needs a trip that has already ended, which the API cannot create. `e2e/fixtures.js` connects to the temporary e2e database (fixed port, `E2E_DB_PORT`, default 5197) and adds one through `server/test/fixtures/completedTrip.js`, then removes it after the spec. Fixtures are never part of `seed()` or demo data.
- `03-quality` checks horizontal overflow and console errors at five widths, plus reduced motion, layout shift and long tasks. It writes `e2e/quality-metrics.json`, which is gitignored.
- `04-security` scans the built bundle for secrets, checks headers and role boundaries, and confirms that forged booking fields are ignored.
- When a test fails, run `npx playwright show-trace test-results/<test>/trace.zip`.

## Manual QA

Before a release, walk through `docs/GHUMO_V0_1_RELEASE_CHECKLIST.md` in a real browser, on a phone-width screen and with the keyboard only.
