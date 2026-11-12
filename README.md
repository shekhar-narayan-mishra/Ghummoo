# ghumo AI

**Your next group trip, minus the chaos.**

Ghumo AI is a marketplace for **fixed-departure group trips in India run by independent organisers**. Travellers discover, compare and request bookings in one place, instead of piecing trips together from Instagram posts, WhatsApp chats and PDFs. Organisers run their packages, departures, seats, booking requests and trip updates from one dashboard. **AI Package Studio** turns an organiser's unstructured caption into a structured listing draft, and it never invents a price, date or capacity.

> **Project status:** V0.1, pre-release. It is not running in production with real organisers yet, and there is no payment gateway (see [Current limitations](#current-limitations)). Licensed under **AGPL-3.0**; see [Licence](#licence).

## The problem

- **Travellers** find trips through social media, then struggle to compare price, itinerary, stay, inclusions and real availability, because those details are scattered across DMs and brochures.
- **Independent organisers** answer the same questions again and again, and track seats, traveller details and payments by hand across several apps.

Ghumo makes trip information structured and comparable, and gives organisers a simple system for the whole booking flow.

## Who this repository is for

- **Developers and contributors** who want to work on a real, honest marketplace: React, Express and MongoDB, with grounded LLM features.
- **Developers building LLM extraction**: the grounding approach in `server/src/services/ai/` (no number may appear unless it is in the source; missing fields computed in code) is planned to become a standalone package. See [docs/OPEN_SOURCE_ARCHITECTURE.md](docs/OPEN_SOURCE_ARCHITECTURE.md).

## Implemented features

These are verified against the code and tests. Statuses come from [docs/PROJECT_AUDIT.md](docs/PROJECT_AUDIT.md).

**Travellers**
- Trip discovery and search, with filters for budget, dates, duration, category and departure city.
- Explore India: landscape and city pages that link to real trips.
- Trip pages with photos, a day-wise itinerary, inclusions and exclusions, policies and organiser details.
- Side-by-side comparison of trips.
- Saved trips.
- "Help me decide": describe the trip you want and get matching real trips, each with its reasons. A deterministic fallback works when no AI provider is configured.
- **Ask this trip**: answers come only from the listing, and it says so when the organiser hasn't stated something.
- Booking requests with atomic seat holds and a booking reference (`GHM-XXXXXX`).
- My trips; cancellation; a trip updates board and a trip group once a booking is confirmed.

**Organisers**
- Onboarding with admin approval, and a business-verification submission.
- Packages: create, edit, duplicate, archive and publish, with publish blockers listing anything still missing.
- Multiple departures per package, with real seat inventory.
- Booking requests: confirm or decline with a note, export a CSV traveller manifest, record offline payments.
- Trip announcements and trip groups; an insights page built only from real events.
- **AI Package Studio**: paste a caption, get a grounded draft with a list of missing fields, review it, then save.

**Admins**
- Approve or reject organisers, record business verification, remove or restore listings, view bookings, handle reports.

## Architecture

```
client/   React 19 · React Router 7 · Vite 8 · Tailwind CSS 4 · lucide-react
server/   Express 4 · Mongoose 8 · JWT in an httpOnly cookie · helmet · multer
  src/routes/      HTTP handlers (auth, trips, bookings, operator, admin, ai, discover, groups, …)
  src/services/    seats (atomic holds) · trips · discovery · ai (providers, grounding) · groups
  src/models/      17 Mongoose models
e2e/      Playwright journeys (traveller, organiser, quality, security)
```

- **In production**, one Express process serves both the API and the built app.
- **Without `MONGODB_URI`**, an embedded MongoDB is used.
- **AI runs only on the server**, through either Anthropic or any OpenAI-compatible API (for example Gemini).

Details are in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Quick start

Requires **Node.js 20.19+** (22 recommended; see `.nvmrc`). No database install and no API key are needed.

```bash
npm run setup      # installs root, server and client dependencies
npm run dev        # API on :5050, web app on http://localhost:5173
```

On the first start, the server downloads an embedded MongoDB binary (about 66 MB) and seeds demo data. The full guide is [docs/LOCAL_SETUP.md](docs/LOCAL_SETUP.md).

### Demo accounts

Locally, all demo accounts share the password **`GhumoDemo#2026`**. Override it with `DEMO_PASSWORD` before seeding.

| Role | Email |
| --- | --- |
| Traveller | `traveller@ghumo.demo` |
| Organiser (approved) | `operator@ghumo.demo`, plus `altitude@`, `northeast@`, `desert@` and `island@ghumo.demo` |
| Organiser (pending) | `newoperator@ghumo.demo` |
| Admin | `admin@ghumo.demo` (**in production it gets a random password** unless `DEMO_ADMIN_PASSWORD` is set) |

Every seeded record is flagged `isDemo` and labelled "Demo" in the UI. No bookings, reviews, payments or "Verified" badges are seeded.

### Run with Docker

Requires Docker with Compose v2.24+. Builds the production app and runs it with MongoDB.

```bash
docker compose up --build    # http://localhost:5050
docker compose down          # stop; data and uploads are kept in volumes
docker compose down -v       # stop and delete data and uploads
```

The first start seeds demo data. The container runs with `NODE_ENV=production`, so the demo admin gets a random password unless `DEMO_ADMIN_PASSWORD` is set.

Secrets are never built into the image. Put them in an untracked `.env` next to `docker-compose.yml` (see `server/.env.example`):

| Variable | Default | Notes |
| --- | --- | --- |
| `JWT_SECRET` | random per start | Set it, or everyone is logged out on restart. |
| `DEMO_PASSWORD` | `GhumoDemo#2026` | Demo accounts. |
| `DEMO_ADMIN_PASSWORD` | random | Demo admin. |
| `AI_PROVIDER`, `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `OPENAI_BASE_URL`, `AI_MODEL` | unset | AI Package Studio. |
| `MONGODB_URI` | `mongodb://mongo:27017/ghumo` | Set by compose. |
| `SEED_ON_EMPTY` | `true` | Set by compose. |
| `PORT` | `5050` | Set by compose. |

Uploads are stored in `/app/server/uploads` (the `uploads` volume). The compose MongoDB is for local use and self-hosting, not a managed production database. Without compose, run the image with `MONGODB_URI` set; it does not include the embedded database.

## Configuration

Copy `server/.env.example` to `server/.env`. Every variable is documented there, and none is needed locally. To try the AI features, set one provider:

```bash
# Anthropic
AI_PROVIDER=anthropic
ANTHROPIC_API_KEY=...

# or Google Gemini through its OpenAI-compatible API
AI_PROVIDER=openai
OPENAI_API_KEY=...
OPENAI_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai
AI_MODEL=gemini-3.5-flash,gemini-flash-latest,gemini-flash-lite-latest
```

Deployment to Render or Replit is covered in [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

## API

The API lives under `/api` and returns JSON in the envelope `{ success, data }`, or `{ success: false, message, code? }` on errors. For example:

```bash
curl 'http://localhost:5050/api/trips?category=weekend&maxPrice=10000'
curl -c cookies.txt -H 'content-type: application/json' \
  -d '{"email":"traveller@ghumo.demo","password":"GhumoDemo#2026"}' http://localhost:5050/api/auth/login
curl -b cookies.txt http://localhost:5050/api/bookings/mine
```

All endpoints are listed in [docs/API_REFERENCE.md](docs/API_REFERENCE.md).

## Testing

```bash
npm test             # server API and logic tests, plus client logic tests (throwaway databases)
npm run lint         # ESLint (client)
npm run build        # production build
npm run test:e2e     # Playwright: builds, starts a seeded server and an AI stub
```

See [docs/TESTING_GUIDE.md](docs/TESTING_GUIDE.md), and [docs/TESTING_AND_CI.md](docs/TESTING_AND_CI.md) for current results and CI.

## Contributing

Contributions go through `feature/*` or `fix/*` branches into `staging`, then into `main` via release PRs. Start with [CONTRIBUTING.md](CONTRIBUTING.md) and the issue roadmap in [docs/GITHUB_ISSUE_ROADMAP.md](docs/GITHUB_ISSUE_ROADMAP.md). Report security problems privately ([SECURITY.md](SECURITY.md)). The project is run by two owners, [@shekhar-narayan-mishra](https://github.com/shekhar-narayan-mishra) and [@vedansha07](https://github.com/vedansha07); see [GOVERNANCE.md](GOVERNANCE.md). Everyone taking part follows the [Code of Conduct](CODE_OF_CONDUCT.md).

## Roadmap

See [docs/ROADMAP.md](docs/ROADMAP.md). The next priorities are:
- reliable core workflows: persistent photos, seat-hold limits, atomic payment records;
- testing AI Package Studio with real organiser content;
- extracting the grounded-extraction library.

## Current limitations

- **No payment gateway.** Bookings are requests; organisers record payments made offline.
- **No email:** no notifications, password reset or email verification.
- **Uploaded photos are stored on local disk** and are lost on hosts with ephemeral filesystems.
- **Live AI quality is not measured.** The AI features are tested against a deterministic stub. A real provider has been tried manually, but there is no evaluation set of real organiser posts yet.
- **Organiser verification** is a manual admin review, not a check against a government register.
- **Rate limits are in memory**, per process.
- **No real organiser supply or traveller demand yet.**

The full list is in [docs/GHUMO_V0_1_KNOWN_LIMITATIONS.md](docs/GHUMO_V0_1_KNOWN_LIMITATIONS.md) and [docs/SECURITY_AUDIT.md](docs/SECURITY_AUDIT.md).

## History

Ghumo AI began as the *Ghummoo* local-guide project and was rebuilt for CoNSTruct 2.0 (Track B). The original code is kept on the `backup/ghummoo-legacy` branch. See [CHANGELOG.md](CHANGELOG.md).

## Licence

Copyright (C) 2026 shekhar-narayan-mishra and vedansha07.

Ghumo AI is free software: you can redistribute it and/or modify it under the terms of the **GNU Affero General Public License, version 3** ([LICENSE](LICENSE), SPDX `AGPL-3.0-only`). It is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.

In short: you may use, study, change and share the code. If you run a modified version for other people over a network, you must offer them its source code under the same licence. The "Ghumo AI" name, logo and brand illustrations are **not** covered; see [TRADEMARKS.md](TRADEMARKS.md). Why this licence was chosen is explained in [docs/LICENSING_RECOMMENDATION.md](docs/LICENSING_RECOMMENDATION.md).
