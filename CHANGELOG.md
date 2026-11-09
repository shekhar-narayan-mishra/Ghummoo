# Changelog

All notable changes are recorded here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Releases will follow [Semantic Versioning](https://semver.org/) once the first one is tagged. No version has been released yet.

## [Unreleased]

### Security
- Email validation can no longer be used to freeze the server (regular-expression DoS found by CodeQL): inputs are capped at 254 characters before matching. Booking `departureId` must be a string; booking references are unbiased; the API accepts JSON bodies only; the Unsplash image check compares the real hostname.
- In production, `/api/health` and the `DB_UNAVAILABLE` response no longer include the database connection error (it can contain the MongoDB host or raw driver messages). They say the database is unavailable; the reason stays in the server logs. Development responses are unchanged.
- In production, the demo admin is no longer seeded with the password published in the README. It gets `DEMO_ADMIN_PASSWORD`, or an explicitly set `DEMO_PASSWORD`, or otherwise a random password. There is a new `npm run set-password --prefix server -- <email>` to secure existing deployments.
- Organiser and admin list filters reject query-string objects (`?status[$ne]=…`), so MongoDB operators can't be injected.
- AI Package Studio extraction is limited per account (`AI_EXTRACTIONS_PER_HOUR`, default 30).
- The CSV manifest export also neutralises cells that start with a tab or carriage return.
- Express raised to ^4.22.3 to resolve the `qs` advisories.
- multer (image uploads) upgraded from 1.4.5-lts.2 to ^2.5.0, fixing several high-severity denial-of-service advisories that `npm audit` did not report.
- The root and client lockfiles were refreshed. The committed versions had 15 known client advisories (axios, react-router and Vite among them) and one critical dev-only advisory (shell-quote).
- `npm run set-password` prints which database it will change and never needs the password on the command line.

### Fixed
- AI grounding no longer accepts a number that only appears inside a larger one; for example, a price of 500 is not grounded by "₹15,000". It now understands Indian digit grouping, "15k" and "1.2 lakh".
- These requests now return 4xx instead of 500:
  - "Ask this trip" for an unknown trip when signed in as admin;
  - a booking with `contact: null`;
  - an upload with the wrong field name.
- The e2e login helper waits for the sign-in response before navigating, which removes a flaky failure.

### Added
- The project is licensed under the GNU Affero General Public License v3.0 (`LICENSE`, `AGPL-3.0-only` in every `package.json`). Copyright (C) 2026 shekhar-narayan-mishra and vedansha07. `TRADEMARKS.md` keeps the Ghumo AI name and brand outside the code licence.
- CI (lint, tests, build, dependency audit, Playwright e2e, secret scan), CodeQL and Dependabot.
- Contributor documentation and templates: CONTRIBUTING, CODE_OF_CONDUCT, SECURITY, PR and issue templates, CODEOWNERS.
- Project, security, open-source and licensing documents in `docs/`, plus contributor issue drafts in `docs/github-issues/`.
- `server/test/hardening.test.js`.
- `.nvmrc` (Node 22).
- `Dockerfile` and `docker-compose.yml` with MongoDB.

## History before this changelog

The earlier work is in Git history. In brief:
- **V0.1** (`2a160ed` → `78ce55d`, November 2026):
  - the India content model;
  - the traveller experience on the real API;
  - AI discovery and Ask this trip;
  - the organiser experience;
  - trip groups;
  - the Playwright audit suite;
  - design simplification.
- **Ghumo AI marketplace** (`56ad883`): rebuilt from the earlier *Ghummoo* local-guide project into a group-travel marketplace with AI Package Studio.
- **Ghummoo** (April 2026): the original local-guide booking project, preserved on `backup/ghummoo-legacy`.
