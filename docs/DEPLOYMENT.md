# Deploying Ghumo AI

*Moved from README.md. Production runs as one Express process that serves the API and the built web app from the same origin.*

> **Before any deployment that real people will use:** set `MONGODB_URI` (the embedded database is not backed up and resets on many hosts), set a long `JWT_SECRET`, set `DEMO_ADMIN_PASSWORD` or turn seeding off (`SEED_ON_EMPTY=false`), and read [SECURITY_AUDIT.md](SECURITY_AUDIT.md) §4. If a deployment was seeded before 8 November 2026, its demo admin still has the public README password. Fix it with step M1 in [MANUAL_ACTIONS.md](MANUAL_ACTIONS.md), which also rotates `JWT_SECRET` to sign out existing sessions.

## Database setup

- **Local/demo:** nothing to do (embedded MongoDB).
- **Production:** create a free MongoDB Atlas cluster, allow network access from your host, and set
  `MONGODB_URI`. On first deploy, either set `SEED_ON_EMPTY=true` for one boot or run
  `npm run seed -- --force` once (from the repo root; the seed script refuses a remote or production
  database without `--force`).
- Note: the Atlas URI in the old `server/.env` points to a cluster that no longer exists
  (DNS NXDOMAIN), so it has been commented out.

## Deploying to Replit

The repo includes a `.replit` file.

1. Import the GitHub repo into Replit (Node.js).
2. In **Secrets**, add `JWT_SECRET` (long random string) and, recommended, `MONGODB_URI` plus
   `SEED_ON_EMPTY=true`. Add an AI key to enable AI Package Studio.
3. Press **Run** (`npm run replit` = setup → build → start) or **Deploy**
   (build: `npm run setup && npm run build`, run: `npm start`).

Without `MONGODB_URI` the app falls back to the embedded DB. That works for a quick preview, but
deployment filesystems are ephemeral, so data resets on redeploy. Use Atlas for the checkpoint link.

> **Not yet verified:** the Replit deployment itself hasn't been tested from this environment.
> The production build and `npm start` were tested locally (see below).

## Deploying to Render

**Recommended: one web service** (`render.yaml` is included). Express serves the API and the built
web app from the same origin, so there are no CORS settings, cross-site cookie problems or
static-site rewrite rules to configure.

1. Render dashboard → **New → Blueprint** → select this repo.
2. Fill in `MONGODB_URI` (MongoDB Atlas, with Network Access allowing `0.0.0.0/0`) and, for AI
   Package Studio, `OPENAI_API_KEY` (your Gemini key). `JWT_SECRET` is generated for you.
3. Deploy. The demo data loads automatically into the empty database.

Or configure a web service manually: build `npm run setup && npm run build`, start `npm start`,
health check `/api/health`, with the same environment variables. Don't set `VITE_API_URL`.

### Troubleshooting: pages stuck on loading placeholders

The web app is waiting for an API that never answers. Open `<api-url>/api/health`:

- **It never responds:** the API process is crashing and Render keeps restarting it. Check the
  service **Logs**. The usual cause is a `MONGODB_URI` pointing at a cluster that no longer exists
  (the old Ghummoo cluster is gone).
- **It returns 503 with a `database` message:** the server is up but can't reach MongoDB. In
  production (`NODE_ENV=production`) the response only says `unavailable`; the reason (wrong host,
  wrong password, or Atlas Network Access blocking Render) is in the service **Logs**, repeated on
  every retry. Outside production the response includes the reason.

If you keep the **old split setup** (static site `ghummoo-client` + API `ghummoo-api`):
- On the API, set `CLIENT_URL=https://ghummoo-client.onrender.com` (CORS) and a valid `MONGODB_URI`.
- On the static site, add a **Rewrite** rule `/*` → `/index.html`, so links like `/trips` don't 404.
- Logins rely on a cross-site cookie (`SameSite=None`), which Safari and strict tracking protection
  block. The single-service setup doesn't have this problem.

