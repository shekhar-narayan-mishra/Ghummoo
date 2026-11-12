# Ghumo AI API reference (V0.1)

This document describes the HTTP API served by `server/` (Express 4, Mongoose 8). It was written from the route files in `server/src/routes/`, the middleware in `server/src/middleware/` and `server/src/utils/http.js`. When the code changes, this document must change with it. Where the code does not make something clear, this document says "not documented in code".

## Basics

- **Base URL:** every endpoint lives under `/api`. In production the same Express service also serves the built web app (`client/dist`), so the API and the site share an origin.
- **Format:** requests and responses are JSON. The JSON body limit is 1 MB (a larger body returns `413 Request is too large`). Form-encoded bodies are also parsed. The only non-JSON endpoints are the image upload (multipart) and the operator CSV export.
- **Uploaded images** are served as static files from `/uploads/<file>` (outside `/api`), cached for 7 days.
- **CORS:** only origins listed in `CLIENT_URL` (comma-separated, default `http://localhost:5173`) or requests with no `Origin` are allowed, with credentials.

### Response envelope

Success:

```json
{ "success": true, "data": { } }
```

Error:

```json
{ "success": false, "message": "Human-readable reason", "code": "OPTIONAL_CODE", "details": { } }
```

- `message` is always present and written for the end user.
- `code` appears at the top level only on these errors: `DB_UNAVAILABLE` (503), `RATE_LIMITED` (429) and `ONBOARDING_REQUIRED` (409).
- `details` appears when the route attaches it. Known uses: trip-group access errors (`details.code`, see Groups), AI provider errors (`details.code`, see AI) and publish blockers (`details.blockers`).
- `requestId` appears in the body of 5xx errors and matches the `X-Request-Id` response header (see the next section).

### Request correlation (X-Request-Id)

Every response — including static `/uploads/*` files and the 503 database-unavailable reply — carries an `X-Request-Id` header. A client-supplied header is echoed only when it is a safe short string (1–64 characters of `A-Za-z0-9._-`); otherwise (or when absent) the server answers with a freshly generated UUID. Users can quote this id so support can find the matching server log entry.

The id is stored as `req.id` in server code. Each request writes exactly one JSON log line: `{ time, level, requestId, method, path, status, durationMs, role }`, where `path` is the route path without its query string and `role` is the authenticated role or `anonymous`. Log lines never contain query strings, request bodies, headers or any other personal data. Static files (`/assets/*`, `/uploads/*`) log at `debug` level, everything else at `info`. Set `LOG_REQUESTS=false` to turn the request lines off — see `server/.env.example`.

### Error statuses produced by shared middleware

| Status | When |
| --- | --- |
| 400 | Route validation failed; Mongoose `ValidationError` (messages joined with ". "); Mongoose `CastError`, for example a malformed ObjectId (`Invalid <path>`); upload larger than 5 MB; a list filter given as an object (see below). |
| 401 | No valid token on a route that needs one (`Please log in to continue`). |
| 403 | Signed in but the role is not allowed (`Your account does not have access to this area`), or a route-specific refusal. |
| 404 | Resource not found, or hidden from this caller. Unknown `/api/*` paths return `Route <url> not found`. |
| 409 | Conflict with current state; a duplicate unique key (`That <field> is already in use`); `ONBOARDING_REQUIRED`. |
| 413 | JSON body over 1 MB. |
| 429 | Rate limit exceeded (`code: RATE_LIMITED`, with a `Retry-After` header in seconds). |
| 500 | Unexpected error. In production (`NODE_ENV=production`) the message of any 5xx error raised through the error handler is replaced with `Something went wrong on our side`. This also applies to AI errors with status 502, 503 and 504; their `details.code` is kept. |
| 503 | Database not ready (`code: DB_UNAVAILABLE`), or AI not configured (`details.code: AI_NOT_CONFIGURED`). |

### Database readiness

Until the database is connected (and, with the embedded database, seeded), every `/api/*` request except `GET /api/health` returns immediately with:

```json
{ "success": false, "code": "DB_UNAVAILABLE", "message": "The server is starting up. Please try again in a few seconds." }
```

If the connection failed, the message is `The server can't reach its database. <reason>`. In production (`NODE_ENV=production`) the reason is left out, so host names and driver errors are not exposed, and the message is `The server can't reach its database right now. Please try again shortly.`; the reason is in the server logs. This response is sent before the router, so it is not affected by the production message rewrite.

### List filters on operator and admin endpoints

Operator and admin list endpoints read their filters (`status`, `q`, `departure`, `package`) through `queryFilter` in `server/src/utils/http.js`. A filter must be a plain string. Express parses `?status[$ne]=x` into an object, and such values are rejected with `400 Invalid <name> filter` so they never reach MongoDB as operators. Empty strings are treated as "no filter". Public endpoints (`/api/trips` and so on) do not use `queryFilter`; they convert values with `String()` or `Number()` and escape text before building regular expressions.

## Authentication and roles

- **Token:** a JWT signed with `JWT_SECRET`, payload `{ id }`, expiry `JWT_EXPIRES_IN` (default `7d`).
- **Cookie:** `POST /api/auth/register` and `POST /api/auth/login` set an httpOnly cookie named `token` (max age 7 days). `secure` follows the actual connection (`trust proxy` is on). `SameSite` is `none` when the request is cross-site over HTTPS, otherwise `lax`.
- **Bearer header:** `Authorization: Bearer <jwt>` is also accepted. The cookie wins if both are present.
- **User lookup:** the token is verified and the user is re-read from the database on every request. An invalid, expired or orphaned token behaves as "no token".

### Roles

| Role | Value in `User.role` | How it is obtained |
| --- | --- | --- |
| Traveller | `traveler` | Default at registration. |
| Operator (organiser) | `operator` | Registration with `role: "operator"`. |
| Admin | `admin` | Not available through the API. Registration only ever creates `traveler` or `operator`. How admins are created is not documented in the routes. |

Access levels used in this document:

| Label | Meaning |
| --- | --- |
| Anonymous | No token needed. |
| Optional auth | Works without a token; a valid token changes what is visible (owners and admins). |
| Signed in | Any role with a valid token (`verifyToken`). |
| Traveller / Operator / Admin | `requireRole(...)`: 401 without a token, 403 with the wrong role. |
| Operator + profile | Operator role **and** an operator profile owned by the user (`loadOperator()`). Without a profile: `409 { code: "ONBOARDING_REQUIRED", message: "Complete your operator profile first" }`. |

`loadOperator()` only checks that a profile exists. It does **not** require the profile to be approved. Approval (`Operator.status === "approved"`) is checked only when publishing a package (`POST /api/operator/packages/:id/publish`), and public listings show only packages of approved operators.

### Rate limits

Rate limiting is in memory with fixed windows, per process (single-instance deployment). Setting `RATE_LIMIT=off` disables every limiter. Normal limiters send `RateLimit-Limit` and `RateLimit-Remaining` headers. When a limit is hit the API returns `429` with `code: RATE_LIMITED` and `Retry-After`.

| Limiter | Applies to | Key | Window | Default max | Env override |
| --- | --- | --- | --- | --- | --- |
| `login` | `POST /api/auth/login` | IP + lower-cased email | 15 min | 10 **failed** attempts (responses with status 400 or above) | `LOGIN_FAILURES_PER_15_MIN` |
| `register` | `POST /api/auth/register` | IP | 15 min | 20 | `REGISTRATIONS_PER_15_MIN` |
| `ai` | `POST /api/discover/interpret`, `POST /api/discover/trips/:slug/ask` (shared bucket) | IP | 1 min | 20 | `AI_RATE_LIMIT_PER_MIN` |
| `search` | `POST /api/discover/search` | IP | 1 min | 60 | none |
| `ai-extract` | `POST /api/ai/extract-package` | user id | 60 min | 30 | `AI_EXTRACTIONS_PER_HOUR` |
| `group-send` | `POST /api/groups/:departureId/messages` | user id | 1 min | 12 | `GROUP_MESSAGES_PER_MIN` |
| `group-report` | `POST /api/groups/:departureId/messages/:messageId/report` | user id | 1 min | 5 | none |

No other endpoint is rate limited.

### Payments

There is no payment gateway. Bookings are requests that an organiser confirms or declines. Organisers record money received offline (UPI, bank transfer, cash and so on) with `POST /api/operator/bookings/:id/payments`, which creates a `PaymentRecord` with `gateway: "offline"`. No endpoint takes card details or moves money.

## Endpoint index

| # | Method | Path | Access |
| --- | --- | --- | --- |
| 1 | GET | `/api/health` | Anonymous |
| 2 | POST | `/api/auth/register` | Anonymous |
| 3 | POST | `/api/auth/login` | Anonymous |
| 4 | POST | `/api/auth/logout` | Anonymous |
| 5 | GET | `/api/auth/me` | Optional auth |
| 6 | PUT | `/api/auth/me` | Signed in |
| 7 | GET | `/api/trips` | Anonymous |
| 8 | GET | `/api/trips/meta` | Anonymous |
| 9 | GET | `/api/trips/:slug` | Optional auth |
| 10 | GET | `/api/india/places` | Anonymous |
| 11 | GET | `/api/india/landscapes` | Anonymous |
| 12 | GET | `/api/india/landscapes/:slug` | Anonymous |
| 13 | GET | `/api/india/cities` | Anonymous |
| 14 | GET | `/api/india/places/:slug` | Anonymous |
| 15 | GET | `/api/saved` | Traveller |
| 16 | PUT | `/api/saved/:slug` | Traveller |
| 17 | DELETE | `/api/saved/:slug` | Traveller |
| 18 | GET | `/api/discover/status` | Anonymous |
| 19 | POST | `/api/discover/interpret` | Anonymous |
| 20 | POST | `/api/discover/search` | Anonymous |
| 21 | POST | `/api/discover/trips/:slug/ask` | Optional auth |
| 22 | GET | `/api/groups/mine` | Signed in |
| 23 | GET | `/api/groups/:departureId` | Group member |
| 24 | GET | `/api/groups/:departureId/messages` | Group member |
| 25 | POST | `/api/groups/:departureId/messages` | Group member |
| 26 | POST | `/api/groups/:departureId/read` | Group member |
| 27 | POST | `/api/groups/:departureId/mute` | Group member |
| 28 | POST | `/api/groups/:departureId/leave` | Group member (traveller) |
| 29 | POST | `/api/groups/:departureId/join` | Eligible member who left |
| 30 | POST | `/api/groups/:departureId/messages/:messageId/report` | Group member |
| 31 | GET | `/api/organisers/:slug` | Anonymous |
| 32 | POST | `/api/bookings` | Signed in (traveller only) |
| 33 | GET | `/api/bookings/mine` | Signed in |
| 34 | GET | `/api/bookings/:id` | Booking owner, its operator, admin |
| 35 | POST | `/api/bookings/:id/cancel` | Booking owner |
| 36 | GET | `/api/bookings/:id/announcements` | Booking owner, its operator, admin |
| 37 | POST | `/api/bookings/:id/review` | Booking owner |
| 38 | GET | `/api/operator/profile` | Operator |
| 39 | POST | `/api/operator/profile` | Operator |
| 40 | PUT | `/api/operator/profile` | Operator + profile |
| 41 | POST | `/api/operator/verification` | Operator + profile |
| 42 | GET | `/api/operator/stats` | Operator + profile |
| 43 | GET | `/api/operator/insights` | Operator + profile |
| 44 | GET | `/api/operator/packages` | Operator + profile |
| 45 | POST | `/api/operator/packages` | Operator + profile |
| 46 | GET | `/api/operator/packages/:id` | Operator + profile |
| 47 | PUT | `/api/operator/packages/:id` | Operator + profile |
| 48 | POST | `/api/operator/packages/:id/publish` | Operator + approved profile |
| 49 | POST | `/api/operator/packages/:id/unpublish` | Operator + profile |
| 50 | POST | `/api/operator/packages/:id/archive` | Operator + profile |
| 51 | POST | `/api/operator/packages/:id/restore` | Operator + profile |
| 52 | POST | `/api/operator/packages/:id/duplicate` | Operator + profile |
| 53 | DELETE | `/api/operator/packages/:id` | Operator + profile |
| 54 | POST | `/api/operator/packages/:id/departures` | Operator + profile |
| 55 | GET | `/api/operator/departures/:id` | Operator + profile |
| 56 | PUT | `/api/operator/departures/:id` | Operator + profile |
| 57 | DELETE | `/api/operator/departures/:id` | Operator + profile |
| 58 | POST | `/api/operator/departures/:id/announcements` | Operator + profile |
| 59 | DELETE | `/api/operator/announcements/:id` | Operator + profile |
| 60 | GET | `/api/operator/bookings` | Operator + profile |
| 61 | GET | `/api/operator/bookings/export.csv` | Operator + profile |
| 62 | GET | `/api/operator/bookings/:id` | Operator + profile |
| 63 | POST | `/api/operator/bookings/:id/confirm` | Operator + profile |
| 64 | POST | `/api/operator/bookings/:id/reject` | Operator + profile |
| 65 | POST | `/api/operator/bookings/:id/payments` | Operator + profile |
| 66 | GET | `/api/ai/status` | Operator or admin |
| 67 | POST | `/api/ai/extract-package` | Operator or admin |
| 68 | GET | `/api/admin/stats` | Admin |
| 69 | GET | `/api/admin/operators` | Admin |
| 70 | POST | `/api/admin/operators/:id/approve` | Admin |
| 71 | POST | `/api/admin/operators/:id/reject` | Admin |
| 72 | POST | `/api/admin/operators/:id/verification` | Admin |
| 73 | GET | `/api/admin/packages` | Admin |
| 74 | POST | `/api/admin/packages/:id/remove` | Admin |
| 75 | POST | `/api/admin/packages/:id/restore` | Admin |
| 76 | GET | `/api/admin/bookings` | Admin |
| 77 | GET | `/api/admin/reports` | Admin |
| 78 | POST | `/api/admin/reports/:id/resolve` | Admin |
| 79 | POST | `/api/reports` | Signed in |
| 80 | POST | `/api/uploads` | Operator or admin |

---

## Health

### `GET /api/health`

Anonymous. Not blocked by the database-readiness gate.

- **200** when the database is ready (or no readiness state is attached, as in tests): `{ success: true, data: { status: "ok", database: "ready" } }`.
- **503** otherwise: `{ success: false, data: { status, database } }`, where `status` is the startup state (`starting`, `seeding` or `error`, set in `server/src/index.js`) and `database` is `connecting` or the error reason. In production the error reason is replaced with `unavailable`.

## Auth (`/api/auth`)

The user profile returned by these endpoints is:

```
{ _id, name, email, role, phone, isDemo, operator? }
```

For operators, `operator` is `{ _id, businessName, slug, status, verified }` or `null` when no profile exists yet. `verified` is true only when an admin has verified the documents **and** the operator is approved.

### `POST /api/auth/register`

Anonymous. Rate limited (`register`). Sets the `token` cookie.

| Field | Rule |
| --- | --- |
| `name` | Required, at least 2 characters after trimming (model: max 100). |
| `email` | Required, must match `^\S+@\S+\.\S+$`. Stored lower-cased and trimmed. |
| `password` | Required, at least 8 characters. Stored as a bcrypt hash. |
| `phone` | Optional, not validated. |
| `role` | Optional. `"operator"` creates an operator; any other value creates a `traveler`. |

- **201** `data`: the user profile.
- **400** invalid field, or `An account with this email already exists`.
- **409** `That email is already in use` if two registrations race past the existence check (unique index).
- **429** too many registrations from this IP.

### `POST /api/auth/login`

Anonymous. Rate limited (`login`, counts failures only). Sets the `token` cookie.

Body: `email`, `password` (both required).

- **200** `data`: the user profile.
- **400** `Email and password are required`.
- **401** `Incorrect email or password` (same message for an unknown email and a wrong password).
- **429** too many failed attempts for this IP and email.

### `POST /api/auth/logout`

Anonymous. Clears the `token` cookie. **200** `data: null`.

### `GET /api/auth/me`

Optional auth. **200** `data`: the user profile, or `null` for anonymous visitors (never 401).

### `PUT /api/auth/me`

Signed in. Body: `name` (optional, at least 2 characters after trimming if given), `phone` (optional, not validated). Other fields are ignored.

- **200** `data`: the updated user profile.
- **400** name too short.

## Trips (`/api/trips`)

Public listings include only packages with `status: "published"` whose operator is `approved`. Departures shown are upcoming (start date in the future) and not cancelled.

**Trip card** (used by many endpoints):

```
{ _id, slug, title, destination, region, country, startLocation, categories, durationDays, durationNights,
  coverImage, summary, currency, priceFrom, nextDeparture, departureCount, seatsLeftNext,
  operator: { _id, businessName, slug, location, logoUrl, verified, isDemo },
  isDemo, places: { destinations: [place], departureCities: [place] }, landscapes: [slug] }
```

- `priceFrom` is the lowest price among bookable departures, or the package `basePrice` when none is bookable.
- `nextDeparture` is the first bookable departure, or `null`.
- A departure is **bookable** when its status is `open`, it has seats, and neither its booking deadline (or start date) nor its start date has passed.

**Departure** (public shape): `{ _id, startDate, endDate, price, totalCapacity, seatsAvailable, bookingDeadline, pickupPoint, reportingTime, status, isBookable, availability }`, where `availability` is one of `cancelled`, `departed`, `closed`, `booking_closed`, `sold_out`, `available`.

### `GET /api/trips`

Anonymous. All query parameters are optional.

| Parameter | Effect |
| --- | --- |
| `q` | Case-insensitive text match on title, destination, region, country, summary or highlights. |
| `destination` | Text match on destination, region or country. |
| `category` | Comma-separated categories (any match). |
| `city` | Text match on `startLocation`. |
| `minDays`, `maxDays` | Duration bounds (`Number()`; not otherwise validated). |
| `place` | Comma-separated place slugs; trips going to or departing from any of them. |
| `departureCity` | Comma-separated city slugs; trips departing from them. |
| `landscape` | Comma-separated landscape slugs; trips going to any place in them. |
| `slugs` | Comma-separated package slugs (first 10 used). |
| `from`, `to` | Date window (`to` is inclusive to 23:59:59). Keeps only trips with a bookable departure in the window and recomputes `nextDeparture`, `seatsLeftNext` and `priceFrom` from those departures. |
| `minPrice`, `maxPrice` | Filter on `priceFrom`. Trips without a price are dropped when either is set. |
| `available` | `true` keeps only trips with a bookable next departure. |
| `sort` | `price_asc`, `price_desc`, `departure` (default: soonest bookable departure first) or `duration`. |
| `limit` | Default 60, maximum 100. |

**200** `data: { items: [card], total }`. `total` is the count before `limit`.

### `GET /api/trips/meta`

Anonymous. Facets over all public trips.

**200** `data: { destinations: [{ name, region, country, tripCount, image, priceFrom }], cities: [string], categories: [{ name, count }], priceRange: { min, max } | null, totalTrips, places: { destinations: [{ slug, name, tripCount }], departureCities: [...] }, landscapes: [slug] }`.

### `GET /api/trips/:slug`

Optional auth. Public trips are visible to everyone. Unpublished trips, or trips of an operator who is not approved, are visible only to the owning operator and to admins (with `preview: true`).

A public view by anyone other than the owner or an admin, from a user agent that does not look like a bot, increments that day's listing-view count (India time). Counting failures are ignored.

**200** `data`: every stored package field, merged with the card fields, plus:

- `preview` (boolean),
- `departures`: upcoming, non-cancelled departures (public shape),
- `operator`: public operator fields plus `description`, `contactEmail`, `contactPhone`, `instagram`, `website`, `foundedYear`, `memberSince`,
- `reviews: { average, count, items: [{ _id, rating, comment, createdAt, author }] }` (visible reviews only; `author` is the first name),
- `similar`: up to 4 cards sharing a category or region (empty for previews).

**404** `Trip not found` (also returned when the caller may not see the trip).

## India content directory (`/api/india`)

Anonymous and read-only. Only content with `contentStatus: "published"` is returned. Every response carries `Cache-Control: public, max-age=300`. Related trips are trip cards built from live data.

### `GET /api/india/places`

**200** `data: [{ slug, name, kind, placeType, state, featured, aliases, theme, landscapes: [slug] }]`, sorted featured first.

### `GET /api/india/landscapes`

**200** `data: [{ slug, name, order, tagline, intro, palette, assets, placeCount, tripCount }]`. Counts come from published places and public trips linked to them.

### `GET /api/india/landscapes/:slug`

**200** `data`: the landscape fields plus `places` (place summaries) and `trips` (cards for trips going to those places). **404** `Landscape not found`.

Place summary: `{ slug, name, kind, placeType, state, country, featured, intro, theme, experiences, assets, landmarks: [{ slug, name }] }`.

### `GET /api/india/cities`

Featured places with `kind: "city"`. **200** `data: [placeSummary + tripCounts: { to, from }]`.

### `GET /api/india/places/:slug`

**200** `data`: the place summary plus `aliases`, full `landmarks`, `highlights`, `landscapes: [{ slug, name, palette }]`, `nearby: [placeSummary]` and `relatedPackages: { to, from, nearby }`. `from` is filled only for cities. `nearby` trips exclude trips already in `to`. **404** `Place not found`.

## Saved trips (`/api/saved`)

Traveller only (401 without a token, 403 for operators and admins). At most 100 saved trips per user.

### `GET /api/saved`

**200** `data: { items: [card], slugs: [slug], unavailable }`. Newest save first. Trips that are no longer public are left out and counted in `unavailable`.

### `PUT /api/saved/:slug`

Saves a public trip. Idempotent.

- **200** `data: { slug, saved: true }`.
- **404** `Trip not found` (not published, or operator not approved).
- **409** `You can save up to 100 trips`.

### `DELETE /api/saved/:slug`

Removes a saved trip. Idempotent, and works even if the trip is no longer public. **200** `data: { slug, saved: false }` (also when the slug does not exist).

## AI discovery (`/api/discover`)

Anonymous. Search never calls an AI provider: it is deterministic over public trips and live inventory. Interpretation and trip questions use the configured AI provider when there is one, and fall back to rule-based logic otherwise. These endpoints do not return AI errors to the client; failures are reported through `mode`, `aiAvailable`, `aiError` and `notice`.

### `GET /api/discover/status`

**200** `data: { ai: boolean }` (whether an AI provider is configured).

### `POST /api/discover/interpret`

Rate limited (`ai`). Turns a free-text request into search preferences.

Body: `text`, a string of 3 to 500 characters after trimming.

- **200** `data: { prefs, ambiguities: [{ field, message }], mode: "ai" | "basic", aiAvailable, aiError?, notice?, summary }`.
- **400** `Tell us a little about the trip you want` (too short) or `Please keep it under 500 characters`.
- **429** rate limited.

With an AI provider, values that act as hard filters (budget, length, departure city, dates) are kept only when they are grounded in the user's own words.

### `POST /api/discover/search`

Rate limited (`search`). Body: `prefs` (object; anything invalid is dropped silently, never a 400). Accepted preference fields:

| Field | Accepted values |
| --- | --- |
| `moods` | Array of `mountains`, `beaches`, `adventure`, `nature`, `culture`, `heritage`, `luxury`, `peaceful`, `nightlife`, `food`. |
| `interests` | Array of strings (each up to 30 characters, at most 6). |
| `destination`, `departureCity` | `{ slug, name }` (slug must match `^[a-z0-9-]+$`) or `{ text }`; strings up to 60 characters. |
| `budget` | `under_5k`, `5k_10k`, `10k_20k`, `20k_plus`, `flexible`. |
| `maxPrice` | Number from 500 to 1,000,000 (rounded). Overrides the budget band. |
| `affordable` | `true` sorts cheaper first. |
| `duration` | `weekend`, `3_5`, `6_8`, `flexible`. |
| `days` | Integer from 1 to 30 (matches N-1 to N+1 days). |
| `dates` | `{ mode: "weekend" }` or `{ mode: "range", from: "YYYY-MM-DD", to: "YYYY-MM-DD" }` with `from <= to`. |

Hard constraints are price, duration, departure city and dates; moods, interests and destination only affect ranking.

**200** `data: { prefs, summary, results, alternatives, explanation, counts: { published, exact } }`.

- `results`: up to 6 `{ trip: card, departure, reasons: [string], caveats: [string] }`.
- `alternatives`: only when there are no exact results; up to 4, each with `relaxed` (`city`, `duration`, `dates` or `budget`) and `difference` explaining what does not match.
- `explanation`: a plain sentence when nothing matches, otherwise `null`.

### `POST /api/discover/trips/:slug/ask`

Rate limited (`ai`, shared with interpret). Optional auth. Answers a question about one trip from that trip's stored data only.

Body: `question`, a string of 3 to 300 characters after trimming.

Visibility follows `GET /api/trips/:slug`: public trips for everyone, otherwise only the owning operator or an admin.

- **200** `data: { answered, answer, sources: [{ key, ... }], mode: "ai" | "basic", aiAvailable, aiError?, notice? }`. When the listing does not contain the answer, `answered` is `false` and `answer` is a fixed "not confirmed" message.
- **400** question too short or too long.
- **404** `Trip not found`.
- **429** rate limited.

## Trip groups (`/api/groups`)

Signed in. Membership is re-checked against the database on every request:

- **organiser:** an operator who owns the departure's operator profile;
- **traveller:** a traveller with a **confirmed** booking on that exact departure who has not left the group.

Admins and everyone else are refused. Groups use polling; there is no real-time transport.

Access errors from `:departureId` routes:

| Status | `details.code` | When |
| --- | --- | --- |
| 404 | none | `departureId` is not a valid ObjectId or the departure does not exist (`Trip group not found`). |
| 403 | `GROUP_NOT_CONFIRMED` | The traveller's latest booking on the departure is requested, declined or cancelled. |
| 403 | `GROUP_LEFT` | The traveller left the group (all routes except `join`). |
| 403 | `GROUP_ACCESS_DENIED` | Any other caller. |

The group record and the caller's membership record are created on first access if they do not exist.

### `GET /api/groups/mine`

**200** `data: { items: [{ departureId, trip, startDate, endDate, unread, muted, lastMessageAt }], unreadTotal }`. Lists departures where the traveller has a confirmed booking, or where the operator has at least one confirmed booking, excluding groups the user left. `unreadTotal` ignores muted groups.

### `GET /api/groups/:departureId`

**200** `data: { departureId, trip: { title, slug, destination, coverImage }, departure: { startDate, endDate, pickupPoint, reportingTime, status }, organiser: { name, slug }, members: [{ _id, name, role }], pinned: [announcement], me: { role, muted, canLeave } }`.

Member names are shortened ("Priya S."); no contact details are returned. `pinned` holds up to 5 pinned trip announcements (`title`, `body`, `kind`, `createdAt`).

### `GET /api/groups/:departureId/messages`

Query: `after` (ISO date; newer messages, oldest first, for polling), `before` (ISO date; older messages), `limit` (default 50, maximum 100). `after` wins if both are valid; invalid dates are ignored.

**200** `data: { items: [message], hasMore, lastReadAt, serverTime }`. A message is `{ _id, kind, body, hidden, createdAt, mine, author: { role, name } }`. Hidden messages are returned with the body `This message was removed by moderators.` `hasMore` is only meaningful when not polling with `after`.

### `POST /api/groups/:departureId/messages`

Rate limited (`group-send`). Body:

| Field | Rule |
| --- | --- |
| `body` | Required, 1 to 1000 characters after trimming. Rejected (400) if it contains an Indian mobile number, a UPI ID, a 16-digit card-like number or an email address. |
| `kind` | Optional. `"announcement"` is allowed only for the organiser; anything else is a normal message. |

- **201** `data`: the new message. The sender's read position moves to it.
- **400** empty, too long, or contains contact or payment details.
- **403** a traveller tried to post an announcement, or an access error.
- **429** rate limited.

### `POST /api/groups/:departureId/read`

Marks the group as read up to now. **200** `data: { unread: 0 }`.

### `POST /api/groups/:departureId/mute`

Body: `muted` (only the boolean `true` mutes; anything else unmutes). **200** `data: { muted }`.

### `POST /api/groups/:departureId/leave`

Travellers only. **200** `data: { left: true }`. **403** `Organisers stay in their trip groups so travellers can reach them`.

### `POST /api/groups/:departureId/join`

Rejoins after leaving, if the caller is still eligible. **200** `data: { joined: true }`.

### `POST /api/groups/:departureId/messages/:messageId/report`

Rate limited (`group-report`). Body: `reason` (required: `harassment`, `spam`, `safety`, `fraud` or `other`), `details` (optional, truncated to 1000 characters).

- **201** `data: { _id }` (a `Report` with `targetType: "message"`).
- **400** `You can't report your own message` or `Choose a reason`.
- **404** `Message not found` (invalid id, or not in this group).

## Organisers (`/api/organisers`)

### `GET /api/organisers/:slug`

Anonymous. Approved operators only.

**200** `data`: public operator fields plus `description`, `contactEmail`, `contactPhone`, `instagram`, `website`, `foundedYear`, `memberSince`, `rating: { average, count }` (visible reviews) and `trips: [card]`. **404** `Organiser not found`.

## Bookings (`/api/bookings`)

Signed in. A booking is a request: creating one holds seats atomically, and the organiser then confirms or declines it. Status values: `requested`, `confirmed`, `rejected`, `cancelled`.

Bookings returned here are populated with `package` (`title`, `slug`, `destination`, `coverImage`, `durationDays`, `durationNights`, `itinerary`, `cancellationPolicy`, `pickupInfo`, `inclusions`, `exclusions`), the full `departure` and `operator` (`businessName`, `slug`, `contactEmail`, `contactPhone`, `verifiedAt`).

Access for `:id` routes: the traveller who made the booking, the operator who owns it, or an admin. Anyone else gets **404** `Booking not found`.

### `POST /api/bookings`

Traveller role only (operators and admins get **403** `Please use a traveller account to book trips`).

| Field | Rule |
| --- | --- |
| `departureId` | Required. A malformed id returns 400 (`CastError`). |
| `seats` | Integer from 1 to 10. |
| `travelers` | Array with exactly `seats` entries. Each: `fullName` (at least 2 characters), `age` (integer 1 to 110), optional `email` (must look like an email), optional `gender` (`female`, `male`, `other`, `prefer_not`; anything else becomes `prefer_not`), optional `phone` and `emergencyContact`. |
| `contact` | Required `name`, `email` (must look like an email) and `phone` (must match `^[+\d][\d\s-]{7,16}$` after trimming). |
| `specialRequests` | Optional, truncated to 1000 characters. |

The price per seat and the total are taken from the departure, never from the request.

- **201** `data`: the booking (`reference` such as `GHM-7K3P9Q`, `status: "requested"`, `seats`, `pricePerSeat`, `totalAmount`, `currency`, `travelers`, `contact`, `specialRequests`, `history`, ids of user, operator, package and departure).
- **400** validation error, or `This trip is not accepting bookings` (package not published or operator not approved).
- **404** `Departure not found`.
- **409** `This departure is no longer accepting bookings`, or `Only N seat(s) left on this departure` (also when another booking took the seats first).

### `GET /api/bookings/mine`

**200** `data: [booking]` for the signed-in user, newest first (populated).

### `GET /api/bookings/:id`

**200** `data`: the populated booking plus `review` (the review for this booking, or `null`).

### `POST /api/bookings/:id/cancel`

Booking owner only. Body: `reason` (optional, truncated to 300 characters).

- **200** `data`: the updated booking. Seats are released; if the booking was confirmed, the departure's confirmed-seat count is reduced too.
- **403** `Only the traveller who made this booking can cancel it`.
- **409** the booking is not `requested` or `confirmed`, the trip has already started, or the status changed meanwhile (`Booking status changed, please refresh`).

### `GET /api/bookings/:id/announcements`

The departure's trip updates board.

**200** `data: { locked, items: [announcement] }`, pinned first, then newest. For the booking owner, `locked` is `true` and `items` is empty unless the booking is confirmed. The operator and admins always see the items.

### `POST /api/bookings/:id/review`

Booking owner only. Body: `rating` (integer 1 to 5), `comment` (optional, truncated to 2000 characters). One review per booking.

- **201** `data`: the review.
- **400** invalid rating.
- **403** not the owner.
- **409** booking not confirmed, trip has not ended yet, or `That booking is already in use` (a review already exists, via the unique index).

## Operator workspace (`/api/operator`)

Every route requires the `operator` role. All routes except `GET` and `POST /profile` also require an operator profile (`409 ONBOARDING_REQUIRED` otherwise). Packages, departures, announcements and bookings are always scoped to the caller's own operator profile; another operator's id returns **404**.

### Profile and verification

Profile fields accepted: `businessName`, `organiserType`, `description`, `contactEmail`, `contactPhone`, `location`, `instagram`, `website`, `logoUrl`, `foundedYear`. Other fields are ignored.

#### `GET /api/operator/profile`

**200** `data: { operator, verification }`. Both are `null` before onboarding. `verification` is the latest submission.

#### `POST /api/operator/profile`

Creates the profile with `status: "pending"` and a unique slug.

| Field | Rule on create |
| --- | --- |
| `businessName` | Required, at least 2 characters after trimming (model: max 120). |
| `organiserType` | Required: `independent`, `company`, `community` or `creator`. |
| `description` | Required, at least 30 characters after trimming (model: max 2000). |
| `contactPhone` | Required. |
| `contactEmail` | Required, must look like an email. |
| `location` | Required. |
| `foundedYear` | Optional integer from 1950 to the current year; `""` becomes `null`. |

- **201** `data`: the operator.
- **400** validation error.
- **409** `Operator profile already exists`.

#### `PUT /api/operator/profile`

Partial update with the same fields. Only `businessName` (if sent), `organiserType` (if sent and not `null`) and `foundedYear` are validated on update. A rejected operator who saves goes back to `pending`.

**200** `data`: the operator. **400** validation error.

#### `POST /api/operator/verification`

Submits business verification details for admin review. A new record is created on each call.

| Field | Rule (model validation) |
| --- | --- |
| `registrationType` | Required: `gst`, `msme`, `company`, `tourism_license` or `other`. |
| `registrationNumber` | Required, max 60 characters. |
| `legalName` | Optional, max 160 characters. |
| `documentUrl` | Optional. |
| `notes` | Optional, max 1000 characters. |

**201** `data`: the verification (`status: "submitted"`). **400** validation error.

### Dashboard

#### `GET /api/operator/stats`

**200** `data: { publishedTrips, draftTrips, upcomingDepartures, totalReservations, pendingRequests, confirmedBookings, confirmedSeats, recordedPayments: [{ currency, total, count }], recentBookings, nextDepartures, archivedTrips, confirmedTravellersUpcoming, recentActivity }`.

- `draftTrips` counts `draft` and `unpublished` packages.
- `recordedPayments` is money the operator has recorded, not a projection.
- `recentActivity` holds up to 10 events from booking history, payment records and announcements, each with a `kind` such as `booking_requested`, `booking_confirmed`, `payment_recorded` or `announcement_posted`.

#### `GET /api/operator/insights`

Query: `days` (`7`, `30` or `90`; anything else becomes 30).

**200** `data: { days, totals: { views, requests, confirmed }, perPackage: [{ _id, title, slug, status, views, requests, confirmed }], occupancy: [{ _id, trip, startDate, totalCapacity, confirmedSeats, requestedSeats, seatsAvailable, status }] }`.

Views are public listing views counted per day in India time. `requests` counts bookings created in the window; `confirmed` counts confirmations in the window. Removed packages are excluded. Occupancy covers up to 50 upcoming, non-cancelled departures.

### Packages

Package fields accepted on create and update: `title`, `destination`, `region`, `country`, `startLocation`, `categories`, `durationDays`, `durationNights`, `basePrice`, `currency`, `coverImage`, `images`, `summary`, `overview`, `highlights`, `itinerary`, `accommodation`, `transport`, `meals`, `inclusions`, `exclusions`, `pickupInfo`, `cancellationPolicy`, `groupSize`, `source`, `aiWarnings`, `destinationRefs`, `departureCityRefs`. Other fields (including `status`, `slug` and `operator`) are ignored.

Validation applied by the route:

- `highlights`, `inclusions`, `exclusions`, `images`, `aiWarnings`: an array of strings, or a string split on new lines; empty items are dropped.
- `categories`: as above, keeping only `weekend`, `mountains`, `adventure`, `international`, `cultural`, `beach`, `wildlife`, `spiritual`, `trek`.
- `durationDays`, `durationNights`, `basePrice`: `""` or `null` clears the value; otherwise a finite number of 0 or more (`<k> must be a positive number`). Model limits: `durationDays` 1 to 60, `durationNights` 0 to 60.
- `itinerary`: must be an array (`Itinerary must be a list of days`). Days without a title are dropped and days are renumbered from 1.
- `source`: `manual` or `ai`; any other value is ignored.
- `title`: at least 4 characters after trimming when sent (model: max 140).
- `destinationRefs`, `departureCityRefs`: arrays of published place ids, at most 12 each after removing duplicates. Departure cities must be places with `kind: "city"`.
- Model limits: `summary` max 300, `overview` max 5000 characters.

After validation, empty place links are filled from the package's own text where a place name matches.

**Publish blockers** (required before publishing): Title, Destination, Duration, Price, Cover photo, Overview (or summary), Itinerary, Inclusions, Cancellation policy, and at least one upcoming non-cancelled departure.

Package statuses: `draft`, `published`, `unpublished`, `archived`, `removed` (set by an admin).

#### `GET /api/operator/packages`

**200** `data: [package + upcoming: { count, seatsLeft, capacity, next } | null, pendingRequests]`, most recently updated first.

#### `POST /api/operator/packages`

Creates a `draft` with a unique slug. `title` is required.

**201** `data`: the package. **400** validation error.

#### `GET /api/operator/packages/:id`

**200** `data: { package, departures: [departure + bookingCounts: { <status>: { count, seats } }], publishBlockers: [string], operatorStatus }`. All departures are included, past and cancelled too. **404** `Package not found`.

#### `PUT /api/operator/packages/:id`

Partial update. While the package is a draft, a new title also changes the slug. A published package must still pass the publish blockers after the change.

- **200** `data`: the package.
- **400** validation error, or `A published trip needs: ... Unpublish it first to save an incomplete version.`
- **403** `This listing was removed by moderators`.
- **404** `Package not found`.

#### `POST /api/operator/packages/:id/publish`

Requires the operator to be **approved**.

- **200** `data`: the package with `status: "published"`.
- **400** `Add these before publishing: ...` with `details: { blockers: [string] }`.
- **403** the listing was removed by moderators, or `Your operator profile must be approved before you can publish trips`.
- **409** `Restore this package from the archive before publishing it`.

#### `POST /api/operator/packages/:id/unpublish`

**200** `data`: the package with `status: "unpublished"`. **409** `Package is not published`.

#### `POST /api/operator/packages/:id/archive`

Hides a package the organiser no longer runs. Existing bookings are not changed.

**200** `data`: the package with `status: "archived"`. **403** removed by moderators. **409** `Package is already archived`.

#### `POST /api/operator/packages/:id/restore`

**200** `data`: the package back in `draft`. **409** `Only archived packages can be restored`.

#### `POST /api/operator/packages/:id/duplicate`

Creates a new draft titled `Copy of <title>` (cut to 140 characters) with the same content, `source: "manual"`, and no departures, bookings, `aiWarnings` or history.

**201** `data`: the copy. **403** removed by moderators.

#### `DELETE /api/operator/packages/:id`

Deletes the package and all its departures. This is a hard delete.

**200** `data: { deleted: true }`. **409** `This package has bookings. Unpublish it instead of deleting.`

### Departures

Departure fields: `startDate`, `endDate`, `bookingDeadline` (empty clears it), `price` (finite, 0 or more), `totalCapacity` (integer 1 to 500), `pickupPoint`, `reportingTime`, `status` (`open`, `closed`, `cancelled`). Dates must parse. The return date must be on or after the departure date, and a booking deadline must not be after the departure date (both checked against stored values on update).

#### `POST /api/operator/packages/:id/departures`

`startDate`, `endDate` and `totalCapacity` are required. `startDate` must not be before today (server time). `price` defaults to the package `basePrice`. `seatsAvailable` starts at `totalCapacity`.

**201** `data`: the departure. **400** validation error, `Departure and return dates are required`, `Departure date must be in the future`, `Price is required` (no price and no base price) or `Seat capacity is required`. **404** `Package not found`.

#### `GET /api/operator/departures/:id`

The departure manifest.

**200** `data: { departure (with package title, slug, destination, coverImage), bookings: [booking], announcements: [announcement] }`. Bookings include full traveller and contact details. **404** `Departure not found`.

#### `PUT /api/operator/departures/:id`

Partial update. Price changes apply to new bookings only. A new `totalCapacity` sets `seatsAvailable` to capacity minus seats held by requested and confirmed bookings.

- **200** `data`: the departure.
- **400** validation error.
- **404** `Departure not found`.
- **409** cancelling while requested or confirmed bookings exist, or capacity lower than held seats.

#### `DELETE /api/operator/departures/:id`

Hard delete. **200** `data: { deleted: true }`. **409** `This departure has bookings. Close or cancel it instead.`

#### `POST /api/operator/departures/:id/announcements`

Posts to the departure's trip updates board. Body: `title` (required, max 140), `body` (required, max 4000), `kind` (`announcement`, `pickup`, `instruction` or `itinerary`; default `announcement`), `pinned` (truthy pins it).

**201** `data`: the announcement. **400** missing title or body. **404** `Departure not found`.

#### `DELETE /api/operator/announcements/:id`

**200** `data: { deleted: true }`. **404** `Announcement not found`.

### Bookings

Filters for the list and the export (plain strings only, see "List filters"): `status`, `departure` (id), `package` (id), `q` (matches reference, contact name, email or phone, or traveller name). A malformed `departure` or `package` id returns 400 (`CastError`).

#### `GET /api/operator/bookings`

**200** `data: [booking + amountReceived]`, newest first, at most 300. `package` (`title`, `slug`) and `departure` (`startDate`, `endDate`, `seatsAvailable`, `totalCapacity`) are populated. `amountReceived` is the sum of recorded payments.

#### `GET /api/operator/bookings/export.csv`

The traveller manifest as CSV (`text/csv; charset=utf-8`, downloaded as `ghumo-travellers.csv`). One row per traveller with columns Reference, Status, Trip, Departure, Traveller, Age, Gender, Traveller phone, Emergency contact, Booking contact, Contact phone, Contact email. Without a `status` filter only `requested` and `confirmed` bookings are exported. Cells that start with `=`, `+`, `-`, `@`, a tab or a carriage return are prefixed with `'` so spreadsheets do not run them as formulas.

#### `GET /api/operator/bookings/:id`

**200** `data`: the booking with `package` (`title`, `slug`), full `departure`, `user` (`name`, `email`, `phone`) and `payments: [PaymentRecord]`. **404** `Booking not found`.

#### `POST /api/operator/bookings/:id/confirm`

Body: `note` (optional). Only `requested` bookings can be confirmed. Confirming adds the seats to the departure's confirmed count and creates the departure's trip group if it does not exist.

**200** `data`: the booking. **409** `Only requested bookings can be confirmed (this one is <status>)`.

#### `POST /api/operator/bookings/:id/reject`

Declines a `requested` or `confirmed` booking. Body: `note`, required, at least 3 characters after trimming (shown to the traveller). Seats are released; a confirmed booking also reduces the confirmed count.

**200** `data`: the booking with `status: "rejected"`. **400** `Please tell the traveller why the request was declined`. **409** `This booking is already <status>`.

#### `POST /api/operator/bookings/:id/payments`

Records money received offline. No money moves through Ghumo.

| Field | Rule |
| --- | --- |
| `amount` | Required, finite and greater than 0 (model: at least 1). The total recorded must not exceed the booking total. |
| `method` | Required (model): `upi`, `bank_transfer`, `cash`, `card` or `other`. |
| `externalReference`, `note` | Optional. |

The currency is copied from the booking.

**201** `data`: the payment record. **400** `Enter the amount received`, `Recorded payments would exceed the booking total`, or a model validation error. **409** `Record payments against confirmed bookings only`.

## AI Package Studio (`/api/ai`)

Operator or admin. A configured AI provider (`AI_PROVIDER`, `ANTHROPIC_API_KEY` or `OPENAI_API_KEY`, `OPENAI_BASE_URL`, `AI_MODEL`) is required for extraction.

### `GET /api/ai/status`

**200** `data: { configured: true, provider, model }` or `{ configured: false }`.

### `POST /api/ai/extract-package`

Rate limited (`ai-extract`, per user). Turns a pasted caption or post into a package draft. Nothing is saved.

Body: `text`, 30 to 8000 characters after trimming.

**200** `data: { draft, missing: [string], warnings: [string], provider, model }`.

- `draft` holds `title`, `destination`, `region`, `country`, `startLocation`, `durationDays`, `durationNights`, `basePrice`, `currency`, `departureDates` (future `YYYY-MM-DD` only), `transport`, `accommodation`, `meals`, `highlights`, `itinerary`, `inclusions`, `exclusions`, `capacity`, `cancellationPolicy`, `pickupInfo`, `categories`, `summary`. Unknown values are `null` or empty.
- `basePrice` and `capacity` are cleared unless the number appears literally in the text (a warning is added when a price is cleared).
- `missing` is computed in code from the draft, not by the model.

Errors:

| Status | `details.code` | When |
| --- | --- | --- |
| 400 | none | Text too short or too long. |
| 429 | none (`code: RATE_LIMITED`) | Extraction limit for this user reached. |
| 429 | `AI_RATE_LIMITED` | The provider stayed busy after retries and fallbacks. |
| 502 | `AI_INVALID_OUTPUT` or `AI_PROVIDER_ERROR` | Bad reply or provider failure. |
| 503 | `AI_NOT_CONFIGURED` | No provider configured. |
| 504 | `AI_TIMEOUT` | The provider took too long (60 s timeout for extraction). |

## Admin (`/api/admin`)

Admin only.

### `GET /api/admin/stats`

**200** `data: { opsPending, opsApproved, pkgsPublished, pkgsTotal, bookingsTotal, bookingsRequested, reportsOpen, users }`.

### `GET /api/admin/operators`

Query: `status` (plain string). **200** `data: [operator + owner: { name, email, phone }, verification (latest or null), packages: { total, published }]`, sorted by status, then newest.

### `POST /api/admin/operators/:id/approve`

Body: `note` (optional, stored as `statusNote`). **200** `data`: the operator with `status: "approved"`. **404** `Operator not found`. Approving does not republish packages.

### `POST /api/admin/operators/:id/reject`

Body: `note`, required, at least 3 characters after trimming. Rejecting also changes every published package of the operator to `unpublished`.

**200** `data`: the operator. **400** `Add a reason so the operator knows what to fix`. **404** `Operator not found`.

### `POST /api/admin/operators/:id/verification`

Decides the operator's latest verification submission. Body: `decision` (`verified` or `rejected`), `note` (optional). Sets the operator's `verifiedAt` to now on `verified`, or to `null` on `rejected`.

**200** `data: { operator, verification }`. **400** `This operator has not submitted verification details` or `Decision must be verified or rejected`. **404** `Operator not found`.

### `GET /api/admin/packages`

Query: `status`, `q` (title match), both plain strings. **200** `data: [package + operator: { businessName, slug, status }]`, most recently updated first, at most 300.

### `POST /api/admin/packages/:id/remove`

Moderation removal. Body: `reason`, required, at least 3 characters after trimming. Sets `status: "removed"` and `removedReason`.

**200** `data`: the package. **400** `Add a reason for removing this listing`. **404** `Package not found`.

### `POST /api/admin/packages/:id/restore`

Restores a removed package to `unpublished` and clears `removedReason`. **200** `data`: the package. **404** `Removed package not found`.

### `GET /api/admin/bookings`

Query: `status`, `q` (reference, contact name or contact email), both plain strings. **200** `data: [booking]` with `package` (`title`, `slug`), `operator` (`businessName`) and `departure` (`startDate`), newest first, at most 300.

### `GET /api/admin/reports`

Query: `status` (plain string). **200** `data: [report + reporter: { name, email }, target]`, newest first. `target` is resolved for `package` (`title`, `slug`, `status`), `operator` (`businessName`, `slug`, `status`) and `booking` (`reference`, `status`) reports; it is `null` for `message` reports. Booking target details do not include traveller contact information.

### `POST /api/admin/reports/:id/resolve`

Body: `status` (`resolved` or `dismissed`), `note` (optional). **200** `data`: the report. **400** `Status must be resolved or dismissed`. **404** `Report not found`.

No admin endpoint hides group messages or reviews; the `hidden` flags on those models are not set by any route.

## Reports (`/api/reports`)

### `POST /api/reports`

Signed in, any role. Body:

| Field | Rule |
| --- | --- |
| `targetType` | Required: `package`, `operator` or `booking`. |
| `targetId` | Required. Must be a valid ObjectId; the target must exist. A booking can be reported only by its traveller or its organiser. |
| `reason` | Required: `misleading`, `pricing`, `safety`, `fraud` or `other`. |
| `details` | Optional, truncated to 2000 characters. |

Five reports per user per minute. **201** `data`: the report (`status: "open"`). **400** `Invalid report target` or `Please choose a reason`. **404** `We couldn't find what you're reporting` for missing targets or bookings the user cannot access. **429** `RATE_LIMITED` when the per-user limit is exceeded.

Group messages are reported through `POST /api/groups/:departureId/messages/:messageId/report` instead.

## Uploads (`/api/uploads`)

### `POST /api/uploads`

Operator or admin. `multipart/form-data` with one file in the field `image`. Accepted types: JPEG, PNG, WebP, AVIF. Maximum 5 MB, one file. Files are stored in `UPLOAD_DIR` (default `server/uploads`) under a random name.

- **201** `data: { url: "/uploads/<filename>" }`.
- **400** `Please choose an image` (no file), `Only JPG, PNG, WebP or AVIF images are allowed`, or `Image must be smaller than 5 MB`.

## Known issues in the current code

These are behaviours of the code as written that differ from what a caller would expect. They are listed so the reference stays honest; they are not fixed here.

- `POST /api/discover/trips/:slug/ask` (`server/src/routes/discover.js:65-66`): for a signed-in admin, an unknown slug passes the visibility check and then fails on `pkg._id`, returning 500 instead of 404.
- `POST /api/uploads` (`server/src/routes/uploads.js:25`, `server/src/middleware/errorHandler.js:13`): only the multer `LIMIT_FILE_SIZE` error is mapped to 400. Sending the file under another field name, or more than one file, returns 500.
- `PUT /api/operator/departures/:id` (`server/src/routes/operator.js:421-428`): a new capacity sets `seatsAvailable` from a separate count of held seats, not atomically, so a booking made at the same moment can be overwritten.
- `POST /api/bookings` (`server/src/routes/bookings.js:37,42`): `contact: null` is not caught by the default value and returns 500 instead of 400.
- `POST /api/auth/register` (`server/src/routes/auth.js:50`): a duplicate email returns 400, while a race on the same email returns 409.
- `PUT /api/operator/profile` (`server/src/routes/operator.js:29-34`): the contact email format is checked only when the profile is created.
