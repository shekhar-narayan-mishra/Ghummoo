# Ghumo AI V0.1: release checklist

*Status after the V0.1 integration audit (7 November 2026). ✅ = done and covered by an automated test; ◐ = partial or verified by hand only; ✗ = not implemented. Evidence is in [`GHUMO_V0_1_TEST_REPORT.md`](GHUMO_V0_1_TEST_REPORT.md); gaps are in [`GHUMO_V0_1_KNOWN_LIMITATIONS.md`](GHUMO_V0_1_KNOWN_LIMITATIONS.md).*

## Traveller journey

| # | Step | Status | Covered by |
| --- | --- | --- | --- |
| 1 | Open the homepage | ✅ | e2e A1–A4 |
| 2 | Explore India | ✅ | e2e A1–A4 |
| 3 | Open a city page | ✅ | e2e A1–A4 (`/places/delhi`) |
| 4 | See related packages | ✅ | e2e A1–A4 |
| 5 | Use AI trip discovery | ✅ | e2e A5–A8 (guided), A5b (natural language) |
| 6 | Enter preferences | ✅ | e2e A5–A8 |
| 7 | Receive real package matches | ✅ | e2e A5–A8 (start city, budget, no invented match scores); server `discovery.test.js` |
| 8 | Modify preferences | ✅ | e2e A5–A8 (remove a chip) |
| 9 | Compare packages | ✅ | e2e A9–A11 |
| 10 | Open package details | ✅ | e2e A9–A11 |
| 11 | Ask a question about the package | ✅ | e2e A9–A11 (cited answer and "not confirmed") |
| 12 | Submit a booking request | ✅ | e2e A12–A13 (through sign-in) |
| 13 | See booking status | ✅ | e2e A12–A13 |
| 14 | Organiser receives the request | ✅ | e2e A14–A16 |
| 15 | Organiser confirms | ✅ | e2e A14–A16 |
| 16 | Traveller gains trip-group access | ✅ | e2e A14–A16 (403 before confirmation and for another departure) |

## Organiser journey

| # | Step | Status | Covered by |
| --- | --- | --- | --- |
| 1 | Create an organiser account | ✅ | e2e B1–B4 |
| 2 | Complete the business profile | ✅ | e2e B1–B4 |
| 3 | Submit verification details | ✅ | e2e B1–B4 |
| 4 | See verification status | ✅ | e2e B1–B4 ("Pending review", no Verified badge) |
| 5 | Create a manual package | ✅ | e2e B5 |
| 6 | Create a package with AI Package Studio | ✅ | e2e B6–B7 (deterministic AI stub) |
| 7 | Review missing fields | ✅ | e2e B6–B7 |
| 8 | Preview and publish | ✅ | e2e B8–B9 (blocked until admin approval) |
| 9 | Add departures and seats | ✅ | e2e B8–B9 |
| 10 | Receive a booking request | ✅ | e2e B10–B13 |
| 11 | Confirm the booking | ✅ | e2e B10–B13 |
| 12 | View traveller details | ✅ | e2e B10–B13 (manifest; CSV export link) |
| 13 | Record a manual payment | ✅ | e2e B10–B13 |
| 14 | Post a trip update | ✅ | e2e B14–B15 |
| 15 | Use the trip group | ✅ | e2e B14–B15 (traveller reply arrives by polling) |

## Security and permissions

| Check | Status | Covered by |
| --- | --- | --- |
| Travellers cannot reach organiser or admin APIs | ✅ | e2e security; server `api.test.js` |
| Organisers cannot edit another organiser's packages | ✅ | e2e security; server `organiser.test.js` |
| Travellers cannot see other travellers' bookings | ✅ | e2e security; server `api.test.js` |
| Only confirmed travellers and the trip's organiser reach a trip group | ✅ | e2e A14–A16 and security; server `groups.test.js` |
| Inventory is validated on the server | ✅ | e2e security (over-asking refused); server concurrency test (no overselling) |
| Booking price and status cannot be forged by the client | ✅ | e2e security |
| AI provider keys never reach the browser | ✅ | e2e bundle scan (key patterns, no source maps) |
| Inputs validated on client and server | ✅ | e2e form check; server 400 tests for AI, bookings and groups |
| Rate limits on AI, search, group messages, reports, sign-in and registration | ✅ | server `discovery.test.js`, `api.test.js`; e2e AI 429 check |
| Security headers (CSP, nosniff, HSTS, no `X-Powered-By`) | ✅ | e2e security |
| No sensitive data in logs | ◐ | Code review: only 5xx errors are logged; DB URI is not printed |
| Persistent image storage | ✗ | See known limitations |

## Design, usability and performance

| Check | Status | Covered by |
| --- | --- | --- |
| No horizontal overflow at 360, 390, 768, 1024 and 1440px (public, traveller and organiser pages) | ✅ | e2e quality (max overflow 0px) |
| No console errors on those pages | ✅ | e2e quality |
| Search reachable on every public page | ✅ | e2e quality |
| Mobile filters work in a drawer | ✅ | e2e quality |
| Validation messages are clear | ✅ | e2e quality and journeys |
| Loading, empty and error states | ◐ | Built into every data view; checked by hand and on the journeys' happy paths, not each one automatically |
| Reduced motion: scenes still, content visible | ✅ | e2e quality (and a control run proving motion otherwise) |
| Layout shift under 0.1 | ✅ | e2e quality (max 0.028, after fixing a footer jump) |
| No long tasks while scrolling scenes | ✅ | e2e quality (0 long tasks) |
| Images lazy-loaded and not oversized | ✅ | e2e quality |
| No heavy 3D engine | ✅ | GSAP and SVG scenes only, lazy-loaded |

## Before a public launch (outside this milestone)

- [ ] Move uploads to persistent storage.
- [ ] Set `JWT_SECRET`, `MONGODB_URI`, `CLIENT_URL` and the AI provider variables on the host.
- [x] Remove or gate the `/v01` prototype route. ✅ removed (issue #20)
- [ ] Replace demo seed data with real, verified organisers (`isDemo` records off).
- [ ] Decide on a refund record for declined paid bookings.
- [ ] External deployment was **not** configured or performed in this milestone.
