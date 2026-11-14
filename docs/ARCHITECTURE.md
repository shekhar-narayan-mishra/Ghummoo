# Architecture

This is the current architecture, the place to start. Deeper background:
- [V0_1_PRODUCT_ARCHITECTURE.md](V0_1_PRODUCT_ARCHITECTURE.md): product structure and information architecture;
- [V0_1_DATA_DICTIONARY.md](V0_1_DATA_DICTIONARY.md): every model field;
- [V0_1_ROUTE_MAP.md](V0_1_ROUTE_MAP.md): client routes;
- [API_REFERENCE.md](API_REFERENCE.md): every endpoint;
- [OPEN_SOURCE_ARCHITECTURE.md](OPEN_SOURCE_ARCHITECTURE.md): the proposed package extraction.

## System overview

```
┌──────────── Browser ────────────┐
│ React 19 SPA (client/dist)      │  same origin; JWT in an httpOnly cookie
│ React Router 7 · Tailwind 4     │
└───────────────┬─────────────────┘
                │ /api/*  (axios, client/src/lib/api.js)
┌───────────────▼─────────────────────────────────────────────────┐
│ Express 4 (server/src/app.js)                                   │
│  helmet CSP → CORS allow-list → JSON 1 MB → DB-ready gate (503) │
│  routes/      auth trips india saved discover groups organisers │
│               bookings operator ai admin reports uploads        │
│  middleware/  auth (verifyToken, optionalAuth) · roleGuard      │
│               rateLimit (in-memory) · errorHandler              │
│  services/    seats · trips · discovery/* · ai/* · groups       │
│  models/      17 Mongoose models                                │
│  static       /uploads (disk) · client/dist (SPA fallback)      │
└───────┬─────────────────────────────────────────┬───────────────┘
        │ Mongoose                                │ fetch (server-side only)
┌───────▼──────────────────┐        ┌─────────────▼──────────────────────┐
│ MongoDB Atlas, or the    │        │ Anthropic Messages API, or any     │
│ embedded mongod          │        │ OpenAI-compatible API (e.g. Gemini)│
│ (mongodb-memory-server,  │        └────────────────────────────────────┘
│  data in server/.data)   │
└──────────────────────────┘
```

## Request lifecycle

1. `helmet` sets security headers.
2. CORS allows only the origins listed in `CLIENT_URL`.
3. Until the database is ready, every `/api` call gets `503 DB_UNAVAILABLE` with a reason. The server keeps retrying the connection every 15 seconds (`server/src/index.js`).
4. `verifyToken` or `optionalAuth` reads the `token` cookie (or a Bearer header) and loads the user.
5. `requireRole(...)` enforces the role, and `loadOperator()` attaches the caller's organiser profile.
6. The handler validates input and checks ownership in the query itself (for example `{ _id, operator: req.operator._id }`). Resources that aren't the caller's return 404.
7. Errors reach `errorHandler`: validation errors become 400, cast errors 400, duplicates 409, upload errors 400. Errors of 500 and above are hidden in production.

## Core domain: booking a seat

```
traveller ──POST /api/bookings──▶ validate → package published & organiser approved & departure bookable
                                   → holdSeats(): findOneAndUpdate({ seatsAvailable: { $gte: n } }, { $inc: -n })
                                   → Booking{ status: requested }   (seats released if the create fails)
organiser ──confirm──▶ requested → confirmed  (confirmedSeats += n; trip group created)
organiser ──reject───▶ requested|confirmed → rejected   (seats released)
traveller ──cancel───▶ requested|confirmed → cancelled  (seats released; before the trip starts)
```

The status transitions use conditional `findOneAndUpdate` on the expected current status, so two concurrent actions can't both succeed. There is no payment step: `PaymentRecord` documents are an organiser's own record of money received offline.

## AI layer

`server/src/services/ai/provider.js` exposes `callStructured({ system, user, schema })`:
- **Anthropic:** tool use with a forced tool.
- **OpenAI-compatible:** JSON mode with the schema in the prompt, and a list of fallback models.
- **Failures:** typed `AiError` codes (`AI_NOT_CONFIGURED`, `AI_TIMEOUT`, `AI_RATE_LIMITED`, `AI_INVALID_OUTPUT`, `AI_PROVIDER_ERROR`).
- **Validation:** the reply is checked against a minimal built-in JSON-Schema validator.

Three features build on it:

| Feature | File | Grounding |
| --- | --- | --- |
| Package Studio | `services/ai/index.js` | `normalise()` clears any price or capacity that isn't a whole number in the source, drops past dates, and computes `missing[]` in code |
| Interpret a traveller's request | `services/discovery/interpret.js` | Hard filters the model invents are dropped; a deterministic parser is the fallback |
| Ask this trip | `services/discovery/ask.js` | An answer must cite listing sections, or it is replaced by "not stated" |

Every traveller-facing AI feature works without a provider.

## Client structure

```
client/src/
  main.jsx          routes (lazy pages), providers
  index.css         design tokens (the single source of truth for colours and type)
  lib/              api client, auth context, discovery, formatting, useAsync
  components/ui.jsx shared primitives (Button, states, inputs)
  design/           marketplace components (cards, comparison, search, navbar, dialogs)
  traveller/        traveller pages
  pages/            booking, trip detail, organiser (pages/operator/*), admin
  scenes/ motion/   illustrated landscapes and city scenes, lazy GSAP scroll motion
```

## Deployment shape

- **One process:** `npm run build` builds the client, then `npm start` runs the server, which serves both.
- **Hosts:** `render.yaml` (Render Blueprint) and `.replit` describe the same shape.
- **Scaling limits today:**
  - the rate-limit counters are in memory, per process;
  - uploads are on local disk.

  Both must change before running more than one instance (issues medium/04 and medium/05).

## Decisions worth knowing

| Decision | Reason |
| --- | --- |
| No AI SDKs; plain `fetch` | One small code path for two provider families, easy to stub in tests, no extra dependencies |
| The embedded MongoDB fallback | Contributors can run everything with `npm run setup && npm run dev` |
| Validation inside routes rather than a schema library | Kept dependencies minimal. As routes grow, it is the first candidate for extraction |
| Seats are held on *request*, not on confirmation | Travellers aren't told a seat is theirs and then lose it. The cost is the hold-abuse risk in issue medium/03 |
| Same-origin deployment | Avoids third-party cookie problems (Safari) and CORS configuration |
