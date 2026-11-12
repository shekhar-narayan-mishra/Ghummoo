<!-- Target branch: `staging` (not `main`). Release PRs from staging to main are opened by maintainers. -->

## What this changes

<!-- One or two sentences. Link the issue: "Closes #123". -->

## Why

## How it was tested

- [ ] `npm test` passes (server and client unit/API tests)
- [ ] `npm run lint` shows no new errors
- [ ] `npm run build` succeeds
- [ ] `npm run test:e2e` passes, or this change cannot affect the browser journeys (say why)
- [ ] New business logic has tests in `server/test/` or `client/test/`

## Product and safety checklist

- [ ] No invented data: prices, seats, reviews, organisers, availability and booking status come only from the database or the organiser's own text
- [ ] No secrets, `.env` files, real personal data or production exports are included
- [ ] Private traveller or organiser data is visible only to the roles allowed to see it
- [ ] Nothing claims online payments (bookings are requests; payments are offline records)
- [ ] UI changes work on mobile, with a keyboard and with reduced motion; colours use tokens from `client/src/index.css`
- [ ] Any API contract change is documented in `docs/API_REFERENCE.md`

## Screenshots (UI changes)

<!-- Before / after, mobile and desktop. -->

---

- [ ] Every commit is signed off (`git commit -s`), certifying the [Developer Certificate of Origin](https://developercertificate.org). The **DCO sign-off** check enforces this.

Contributions are distributed under the project's licence, AGPL-3.0 (see CONTRIBUTING.md, "Licensing of contributions").
