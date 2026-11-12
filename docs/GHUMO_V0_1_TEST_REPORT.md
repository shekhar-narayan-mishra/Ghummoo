# Ghumo AI V0.1: test report

*V0.1 integration and product quality audit, 7 November 2026, branch `feat/ghumo-v0.1`. No new product features were added in this milestone; the changes listed below are fixes and tests only.*

## Summary

| Suite | Command | Result |
| --- | --- | --- |
| Server unit and API tests | `npm test --prefix server` | **50 / 50 pass** |
| Client unit tests | `npm test --prefix client` | **6 / 6 pass** |
| End-to-end (Playwright, Chromium) | `npm run test:e2e` | **25 / 25 pass** (about 4 minutes) |
| Lint | `npm run lint` | **0 errors**, 50 warnings (see known limitations) |
| Production build | `npm run build` | Pass |

`npm run test:all` runs the unit suites and then the e2e suite. No test is skipped, retried or marked as expected-to-fail (`retries: 0`).

## How the end-to-end suite runs

- `npm run test:e2e` builds the client and starts the real Express server in **production mode** on port 5198, with a fresh embedded MongoDB seeded with demo data (`e2e/start-app.js`). Your own database is never touched.
- AI calls go to a **deterministic OpenAI-compatible stub** on port 5199 (`e2e/ai-stub.js`), so AI Package Studio, natural-language interpretation and Ask This Trip are exercised through the real server code (grounding, validation, missing-field computation) without a paid key or flaky answers.
- Specs run in order with one worker because they share one database: `01-traveller`, `02-organiser`, `03-quality`, `04-security`.

## A. Traveller journey: `e2e/01-traveller.spec.js` (6 tests)

| Test | Steps | Result |
| --- | --- | --- |
| A1–A4 | Home → Explore India → Delhi city page → related real packages | Pass |
| A5–A8 | Guided preferences (Mountains, ₹5,000–₹10,000, weekend, from Delhi) → summary sentence → results start in Delhi and cost ≤ ₹10,000 → "why it matches" with no percentage scores → remove a filter chip | Pass |
| A5b | Natural language ("A beach weekend from Mumbai under 8k") becomes editable "From Mumbai" and "Under ₹8,000" chips | Pass |
| A9–A11 | Compare two trips (rows show real values) → trip detail → Ask: a cancellation question gets a cited answer, a question the listing can't answer gets "This detail hasn't been confirmed by the organiser." | Pass |
| A12–A13 | Request to book → sign-in redirect → traveller details → "Booking request sent" → status visible; trip group returns 403 before confirmation | Pass |
| A14–A16 | Organiser confirms in the bookings dialog → traveller sees Confirmed → opens the trip group and sends a message → another departure's group is refused | Pass |

## B. Organiser journey: `e2e/02-organiser.spec.js` (6 tests)

| Test | Steps | Result |
| --- | --- | --- |
| B1–B4 | Partners page → create account → business profile (validation checked) → MSME verification → submit → "Pending review" status; public profile shows no Verified badge | Pass |
| B5 | Manual package | Pass |
| B6–B7 | AI Package Studio drafts from an itinerary text; missing list shows Seat capacity, Cancellation policy, Day-wise itinerary; saved as a draft marked "From AI Studio" | Pass |
| B8–B9 | Fill the gaps (itinerary, policy, photo) → add a departure with 14 seats → preview banner → publish is blocked until admin approval → approved → published | Pass |
| B10–B13 | Booking request arrives in the activity feed → confirm → manifest shows the traveller → record a ₹5,000 offline payment (UPI reference) → CSV export link | Pass |
| B14–B15 | Trip-board announcement → group announcement → traveller reply arrives by polling | Pass |

## C. Security and permissions: `e2e/04-security.spec.js` (4 tests) and server tests

| Check | Evidence | Result |
| --- | --- | --- |
| Bundle contains no OpenAI, Anthropic, Google/Gemini or GitHub keys, MongoDB credentials, JWT secret values or the demo password; no source maps shipped | e2e bundle scan of `client/dist` | Pass |
| CSP `default-src 'self'`, `nosniff`, HSTS, no `X-Powered-By` | e2e headers | Pass |
| Anonymous users get 401; travellers get 403 on organiser, admin, AI Studio and insights APIs | e2e roles; `api.test.js` access control | Pass |
| Another organiser cannot edit a package (404) or see a booking, departure or manifest | e2e; `organiser.test.js` | Pass |
| A booking is visible to its traveller and the trip's organiser only | e2e (owner 200, other traveller 404, other organiser 404) | Pass |
| Client-sent `status`, `pricePerSeat` and `totalAmount` are ignored | e2e (booking stays `requested` at the real price) | Pass |
| Asking for more seats than remain is refused; concurrent requests never oversell | e2e; `api.test.js` T10 | Pass |
| Trip group: pending, declined, unrelated travellers and other organisers refused; access is rechecked on every request | `groups.test.js`; e2e | Pass |
| AI input caps (400) and rate limit (429 with `Retry-After`) | e2e; `discovery.test.js` | Pass |
| Sign-in: 10 failed attempts per IP and email lock that pair for 15 minutes; successful sign-ins never count; other accounts unaffected | `api.test.js` (new) | Pass |
| Logging | Code review: only 5xx errors are logged, production responses hide error details, the database URI is never printed, request bodies are never logged | Pass (review) |

## D. Design and usability: `e2e/03-quality.spec.js` (9 tests)

Pages checked at **360, 390, 768, 1024 and 1440px**: `/`, `/india`, `/cities`, `/places/jaipur`, `/trips`, a trip detail, `/decide`, `/compare`, `/partners`, `/login`, `/me/trips`, `/operator`, `/operator/packages`, `/operator/bookings`, `/operator/insights`, `/operator/studio`.

| Check | Measured | Result |
| --- | --- | --- |
| Horizontal overflow | 0px on every page and width | Pass |
| Console errors | None | Pass |
| Search reachable from the header | Every public page, every width | Pass |
| Mobile filters | Drawer opens at 360px, filter applies to the URL, drawer closes, active chip shown | Pass |
| Validation | Empty registration shows field messages | Pass |
| Reduced motion | 0 scene layers moved, 0 hidden reveal blocks; a control run without reduced motion confirms the layers do move | Pass |

## E. Performance

| Metric | Mobile (390px, DPR 3) | Desktop (1440px) | Result |
| --- | --- | --- | --- |
| Cumulative layout shift: `/` | 0 | 0.001 | Pass (was 0.55 / 0.38 before the fix) |
| Cumulative layout shift: `/trips` | 0.028 | 0.007 | Pass (was 0.58 / 0.20) |
| Cumulative layout shift: `/india` | 0 | 0 | Pass (was 0.55 / 0.38) |
| Long tasks while scrolling `/india` | 0 | 0 | Pass |
| Home images: lazy / oversize ratio | 6 of 6 lazy, 1.0× | 6 of 6 lazy, 1.1× | Pass |

Production bundle (gzip):

| Chunk | Size | Loaded |
| --- | --- | --- |
| `react` | 74 kB | Every page |
| `vendor` (router, axios, toast, icons) | 27 kB | Every page |
| `index` (app shell) | 8 kB | Every page |
| `gsap` | 44 kB | Scroll-scene pages only; skipped with reduced motion |
| Largest page chunk (`TripDetailPage`) | 8 kB | That route |

GSAP ScrollTriggers are created inside `gsap.context()` and reverted on unmount (`client/src/motion/useSceneMotion.js`). No 3D engine is used.

## Fixes made during the audit

| Problem found | Fix | Files |
| --- | --- | --- |
| **Large layout shift (CLS 0.38–0.58):** while a lazy route loaded, the footer rendered at mid-screen and then jumped down | The main area takes at least the viewport height | `client/src/main.jsx` |
| **No brute-force protection on sign-in or registration** | Failed-attempt limit on login (per IP and email) and a registration limit per IP, using the existing limiter with a new `onlyFailures` option; test added | `server/src/middleware/rateLimit.js`, `server/src/routes/auth.js`, `server/test/api.test.js`, `server/.env.example` |
| **AI Studio showed server configuration to organisers** (env variable names) when no AI key was set | Plain "isn't available right now" notice with manual creation; setup stays in `server/.env.example` | `client/src/pages/operator/StudioPage.jsx` |

## Tests added in this milestone

- `playwright.config.js`, `e2e/start-app.js`, `e2e/ai-stub.js`, `e2e/helpers.js`
- `e2e/01-traveller.spec.js`, `e2e/02-organiser.spec.js`, `e2e/03-quality.spec.js`, `e2e/04-security.spec.js`
- `server/test/api.test.js`: sign-in protection test
- Root scripts `test:e2e` and `test:all`; dev dependency `@playwright/test` 1.64.1 (test-only; needed because no browser test runner existed)

## Not covered automatically

- Real AI provider answers (only the stub is used in e2e; provider failures are covered in `discovery.test.js`).
- Safari, Firefox and real mobile devices (Chromium only, with viewport emulation).
- Screen reader output (keyboard focus traps, labels and roles are used by the tests, but no assistive-technology run).
- Every loading, empty and error state individually.
- Reviews after a completed trip, in a browser.
- Deployment: external deployment was not configured or performed.
