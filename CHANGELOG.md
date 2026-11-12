# Changelog

All notable changes are recorded here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow [Semantic Versioning](https://semver.org/). While the version is below 1.0, a minor release may contain breaking changes; they are called out when they happen.

Contributions land in `staging` and reach `main` in a release. Each release names the people who contributed to it. Thank you!

## [Unreleased]

Changes merged into `staging` since v0.2.0. They will be released as v0.3.0.

### Added
- Every response carries an `X-Request-Id`. The server writes one JSON log line per request (`time`, `level`, `requestId`, `method`, `path`, `status`, `durationMs`, `role`) and never logs query strings, bodies, cookies, IPs or personal data. 5xx responses include the `requestId`, so a user can quote it. `LOG_REQUESTS=false` turns the lines off. (#50)
- Automated accessibility checks: axe-core (WCAG 2.1 A/AA) over the main public, traveller and organiser pages, at desktop and phone widths. Serious and critical violations fail CI; the known brand-colour contrast problem is tracked in #75. The logo link's accessible name is fixed. (#76, from #56)
- ESLint for the server. `npm run lint` now lints the server and the client; independent sequential database writes run in parallel. (#71)
- Owners can finish a contributor's PR in place. The `dco-maintainer-signoff` label lets an owner certify unsigned commits, so the contributor keeps the merged PR. (#79)
- The PR review bot accepts `Closes #N` in the PR title or a commit message. (#74)

### Fixed
- Phone and emergency-contact fields are validated and length-limited on the server and in the forms (sign-up, profile, booking contact, travellers). (#55)
- Content reports are rate-limited (5 per user per minute), and the reported item must exist. A booking can be reported only by its traveller or its organiser. (#29)
- React lint: the five `react-hooks/set-state-in-effect` warnings are fixed properly, and the rule is now an error. (#73)
- The required DCO check runs when a PR is retargeted from `main` to `staging`; before, it waited forever. (#69)

### Changed
- GitHub Actions run on Node 24, because GitHub removed Node 20 from its runners: `setup-node` 7, `cache` 6, `upload-artifact` 7, `gitleaks-action` 3, `github-script` 9 (pinned by commit). (#60, #62, #65, #66, #67)
- Dependencies: helmet 8, dotenv 18 (loaded quietly), eslint 10 and `@eslint/js` 10 for the client, concurrently 10.0.7, and the client minor and patch group. (#38, #39, #61, #63, #64, #68)
- `staging` needs no approval to merge (all required checks still apply); `main` still needs a code owner's approval. (#74)

### Contributors
@AnshS-GIT · @Imposon · @Manikanta-Achar · @sivaram-challa · @AyushCodes160 · @Lakshith7748

## [0.2.0] - 2026-11-10

The first release built with outside contributors (PR #59).

### Security
- Email validation can no longer be used to freeze the server (a regular-expression DoS found by CodeQL): inputs are capped at 254 characters before matching. A booking's `departureId` must be a string; booking references are unbiased; the API accepts JSON bodies only; the Unsplash image check compares the real hostname. (#40)
- In production, `/api/health` and the `DB_UNAVAILABLE` response no longer include database error details; the reason stays in the server logs. (#43)
- Image uploads are checked by their file signature (JPEG, PNG, WebP, AVIF), not just the claimed Content-Type, and rejected files never reach the disk. (#54)
- `npm run seed` prints the database it is about to wipe, and refuses remote databases unless `--force` is passed. (#28)

### Added
- `Dockerfile` and `docker-compose.yml` with MongoDB, for local development and self-hosting. (#44)
- The contribution workflow: DCO sign-off is required on PRs into `staging` (#41, #42), and an automated first-pass PR review comments on every contribution (#48). Also `docs/PROJECT_STATUS.md` (#41).
- Tests: traveller cancellation edge cases (#53), and server text utilities (#49, #57).

### Fixed
- AI Package Studio warns when it clears a seat capacity that isn't in the source text. (#46)
- Trip filters ignore invalid months such as `2026-13`. (#47)

### Changed
- Dependencies: bcryptjs 3, mongodb-memory-server 11 (MongoDB 8.2), concurrently 10, Playwright 1.65, nodemon, and the client minor and patch group. (#30, #31, #32, #34, #35, #37)
- Dependabot no longer proposes Express or Mongoose major versions; those are planned migrations. (#42)

### Contributors
@Anirudh-020505 · @yureiblack · @devanshuprakash · @DevaanshKathuria · @bfs2021 · @Albez0-An7h · @AnshS-GIT · @anya-xcode · @sunny5491

## [0.1.0] - 2026-11-08

The V0.1 marketplace, plus a security audit, a licence and the open-source groundwork (PR #1).

### Added
- The V0.1 product:
  - Explore India;
  - trip discovery, comparison and "Help me decide";
  - Ask this trip;
  - booking requests with atomic seat holds;
  - the organiser dashboard and AI Package Studio;
  - trip groups;
  - admin moderation.
- Licensed under the GNU Affero General Public License v3.0 (`LICENSE`, `AGPL-3.0-only`). Copyright (C) 2026 shekhar-narayan-mishra and vedansha07. `TRADEMARKS.md` keeps the Ghumo AI name and brand outside the code licence.
- CI (lint, tests, build, dependency audit, Playwright e2e, secret scan), CodeQL and Dependabot.
- Contributor documentation and templates: CONTRIBUTING, CODE_OF_CONDUCT, SECURITY, GOVERNANCE, PR and issue templates, CODEOWNERS. Also the project, security and licensing documents in `docs/`, and the first 25 issues.

### Security
- In production, the demo admin is no longer seeded with the README password; `npm run set-password` secures existing deployments.
- Organiser and admin list filters reject query-string objects, which blocks MongoDB operator injection.
- AI grounding matches whole numbers, so a price of 500 is no longer "grounded" by "₹15,000". It understands Indian digit grouping, "15k" and "1.2 lakh".
- AI Package Studio extraction is limited per account (`AI_EXTRACTIONS_PER_HOUR`, default 30).
- The CSV export neutralises formula, tab and carriage-return prefixes.
- Express ^4.22.3 (the `qs` advisories) and multer ^2.5.0 (high-severity DoS advisories). The lockfiles were refreshed, clearing 15 client advisories and one critical dev-only advisory.
- Malformed requests return 4xx instead of 500.

## History before this changelog

- **V0.1 development** (`2a160ed` → `78ce55d`, November 2026):
  - the India content model;
  - the traveller experience on the real API;
  - AI discovery and Ask this trip;
  - the organiser experience;
  - trip groups;
  - the Playwright audit suite.
- **Ghumo AI marketplace** (`56ad883`): rebuilt from the earlier *Ghummoo* local-guide project into a group-travel marketplace with AI Package Studio.
- **Ghummoo** (April 2026): the original local-guide booking project, preserved on `backup/ghummoo-legacy`.

[Unreleased]: https://github.com/shekhar-narayan-mishra/Ghummoo/compare/v0.2.0...staging
[0.2.0]: https://github.com/shekhar-narayan-mishra/Ghummoo/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/shekhar-narayan-mishra/Ghummoo/releases/tag/v0.1.0
