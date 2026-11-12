# Ghumo AI: security audit

*8 November 2026, branch `feat/ghumo-v0.1`. This is a code review plus automated checks. It is not a penetration test. Passing these checks does not make the project secure; the unresolved risks are listed in §4.*

## 1. Method

- Read the auth, role, booking, operator, admin, upload, AI and group code in `server/src/`.
- Scanned **every commit on every branch** for credential patterns: Anthropic, OpenAI, Google and AWS keys, GitHub tokens, PEM private keys, MongoDB URIs with credentials, and hard-coded JWT secrets.
- Ran `npm audit` for the root, the server and the client (production and dev dependencies). **`npm audit` alone is not enough:** it missed the multer advisories (S8). Check deprecation warnings and the GitHub advisory database for upload, auth and HTTP-parsing dependencies.
- Ran the existing security tests: `e2e/04-security.spec.js` (bundle secret scan, headers, role checks, forged booking fields) and the server access-control tests.
- Added `server/test/hardening.test.js` for the fixes made in this audit.

## 2. Secrets and Git history

| Check | Result |
| --- | --- |
| `.env` files ever committed | No. Only `server/.env.example` and `server/.env-mongo.example`, and both hold placeholders |
| Credential patterns in history | None found. The only matches were documentation placeholders (`mongodb+srv://USER:PASS@…`, `username:password@…`) |
| Secrets in the client bundle | None. `e2e/04-security.spec.js` scans `client/dist` for key patterns |
| `server/.env` in `.gitignore` | Yes (`.env` and `server/.env`) |
| Local SQLite file from the legacy app | `server/database.sqlite` is gitignored (`*.sqlite`) and untracked |

**What this does not prove.** A pattern scan can miss custom secrets. Keys that were pasted in chats, tickets or screenshots never appear in Git. **Rotate any key that has ever been shared outside a secret manager.** That includes any GitHub personal access token pasted into a chat, which should be revoked under GitHub → Settings → Developer settings → Personal access tokens. A secret removed from the latest commit stays in history and in every fork. Because this repository is public and already forked, a leaked secret must be **rotated**: rewriting history does not help.

## 3. Findings

### Fixed in this audit

| ID | Finding | Severity | Fix | Test |
| --- | --- | --- | --- | --- |
| S1 | **Public demo admin on production.** `render.yaml` sets `SEED_ON_EMPTY=true`, and the seed created `admin@ghumo.demo` with the password printed in `README.md`. On any deployment, anyone could sign in as admin, approve organisers and read every booking, including real travellers' names, phones and emergency contacts | **High** | In production, the demo admin now gets `DEMO_ADMIN_PASSWORD`, or an explicitly set `DEMO_PASSWORD`, or otherwise a random password (`server/src/seedData.js`). There is a new `npm run set-password --prefix server -- <email>` (password read from `NEW_PASSWORD`) to fix a deployment that was already seeded | `hardening.test.js` "Production seeding…" |
| S2 | **NoSQL operator injection in list filters.** `?status[$ne]=x` was parsed by Express into an object and passed to Mongo (`routes/operator.js bookingQuery`, `routes/admin.js` four lists). Impact was limited to the caller's own scope, but it bypassed the intended filters | Medium | `queryFilter()` in `server/src/utils/http.js` accepts only strings and otherwise returns 400 | `hardening.test.js` "Query filters…" |
| S3 | **AI grounding false positives.** A substring check let invented prices and capacities through when their digits appeared inside a larger number. This is a product-honesty failure, not only a security one | High (product rule) | Whole-number token matching, with support for Indian digit grouping, `k` and `lakh` | `hardening.test.js` "AI grounding…" |
| S4 | **No cost limit on AI Package Studio.** Any operator account, including unapproved ones, could call the paid provider without limit | Medium | 30 per account per hour by default (`AI_EXTRACTIONS_PER_HOUR`) | `hardening.test.js` "AI Package Studio extraction…" |
| S5 | **CSV formula injection guard incomplete.** It did not cover tab and CR prefixes | Low | `csvCell()` moved to `utils/text.js` and extended | `hardening.test.js` "CSV export…" |
| S6 | `qs` moderate advisories (GHSA-q8mj-m7cp-5q26, GHSA-x5fp-wj9c-mxmx, GHSA-4mjr-xmp4-gh2g, GHSA-6pq8-jhm2-2vcw) through Express 4.22.1 | Moderate | Express raised to ^4.22.3 (`qs` 6.16.2). `npm audit` now reports 0 vulnerabilities in all three packages | `npm audit` |
| S8 | **multer 1.4.5-lts.2 (image uploads) had known high-severity DoS advisories** (GHSA-4pg4-qvpc-4q3h, GHSA-44fp-w29j-9vj5, GHSA-g5hg-p3ph-g8qg, GHSA-fjgf-rc76-4x9p, and later ones). **`npm audit` did not report them**; they were found in the pre-release review from npm's deprecation notice and the GitHub advisory database. Any self-registered organiser account could reach the upload route | High | Upgraded to multer ^2.5.0, which has the same API | `hardening.test.js` "Image uploads (multer 2)…" |
| S9 | **Regular-expression denial of service on email validation**, found by CodeQL on the first GitHub run. `/^\S+@\S+\.\S+$/` is polynomial on input like `"!@"` repeated: 64,000 characters blocked the event loop for about 1.8 s, and the 1 MB body limit allowed far longer strings. It was reachable **without signing in** through `POST /api/auth/register`, and also through booking and organiser-profile emails | High | `isEmail()` in `utils/text.js` caps length at 254 before a simpler regex; the `User` model gets `maxlength: 254`. Also from CodeQL: `departureId` must be a string; booking references use unbiased rejection sampling; the API no longer parses form-encoded bodies (JSON only, matching the CSRF model in §4); the Unsplash check compares the real hostname | `hardening.test.js` (3 new tests), `client/test/images.test.js` |

### Reviewed and acceptable for V0.1

- **Authentication.**
  - bcrypt (cost 10) hashes passwords.
  - The JWT sits in an `httpOnly` cookie, `SameSite=Lax`, with `Secure` following the connection.
  - Failed sign-ins are rate-limited per IP and email (10 per 15 minutes), and registrations per IP.
  - Passwords must be at least 8 characters.
  - Self-registration as `admin` is impossible: the role is forced to traveler or operator (`routes/auth.js`).
- **Authorisation.**
  - Role guards are checked on the server (`middleware/roleGuard.js`).
  - Ownership is checked on every booking, package, departure and group query. Other users' resources return 404, not 403, so their existence isn't revealed.
  - This is covered by `api.test.js` "Access control", `organiser.test.js` and `groups.test.js`.
- **Booking integrity.**
  - Seats are held atomically (`$gte` with `findOneAndUpdate`), with a concurrency test (T10).
  - Prices are taken from the departure, never from the client. Forged fields are ignored (`e2e/04-security`).
- **Headers.**
  - helmet with a CSP: `connect-src 'self'`; images from `https:` only.
  - `trust proxy` is set, so secure cookies work behind TLS proxies.
- **CORS.** An allow-list from `CLIENT_URL`, with credentials.
- **Input size.** JSON bodies are capped at 1 MB, and Studio input at 8,000 characters. Uploads are capped at 5 MB, one file, image MIME types only.
- **Private data.**
  - Trip-group members see names only.
  - Organisers see the contacts of travellers on their own bookings only.
  - Public trip cards carry no personal data (`traveller.test.js` "Cards…").
- **Logging.** `explain()` masks credentials in connection strings. 5xx details are hidden from clients in production.
- **AI keys** live only on the server. `GET /api/ai/status` reveals the provider and model name to operators, not the key.

## 4. Unresolved risks

These are honest gaps, ordered by priority. Each has an issue draft in `docs/github-issues/`.

| Risk | Why it matters | Issue |
| --- | --- | --- |
| **Already-seeded deployments still have the public admin password.** S1 only affects new seeds | Anyone who has read the README can administer an existing demo deployment | Manual action M1 in [MANUAL_ACTIONS.md](MANUAL_ACTIONS.md) |
| **Pending requests can hold seats indefinitely**, with no per-traveller cap | One account can block a departure (inventory denial of service) | medium/03 |
| **Payment recording races** | Recorded payments can exceed the booking total | medium/02 |
| **Uploads trust the client's `Content-Type`** and live on local disk | Non-image bytes can be stored under an image extension; files vanish on redeploy | easy/03, medium/04 |
| **JWTs cannot be revoked** before they expire (7 days) | A stolen cookie stays valid; changing a password doesn't end sessions | medium/06 |
| **In-memory rate limits** | With more than one instance, every limit multiplies | medium/05 |
| **No email verification or password reset** | Accounts can be registered with emails the person doesn't own; a forgotten password can't be recovered | hard/03 |
| **Health and 503 responses can reveal the database host name** | Minor information disclosure | easy/05 |
| **Account enumeration** through the registration error | Reveals which emails have accounts | Accepted for V0.1 (documented in `GHUMO_V0_1_KNOWN_LIMITATIONS.md`) |
| **No CSRF token** | Relies on `SameSite=Lax`, JSON-only bodies and the CORS allow-list. Acceptable while the app is single-origin | Revisit if the API is served cross-site |
| **No CAPTCHA or second factor** for admin | Admin accounts are high-value | Roadmap |
| **Organiser verification is a manual admin review** | Nothing is checked against a government register; it must not be marketed as "verified business" beyond what was checked | Product process |
| **The embedded MongoDB runs in production** if `MONGODB_URI` is unset | Data lives on the instance disk with no backups | Deployment docs: set `MONGODB_URI` |

## 5. Dependency licences

From the lockfiles, production dependencies only:

| Package set | Licences |
| --- | --- |
| Server (167 packages) | MIT 142, Apache-2.0 13, ISC 4, BSD-3-Clause 3, BSD-2-Clause 2, 0BSD 1. `busboy` and `streamsearch` have no `license` field in the lockfile but ship MIT licence files |
| Client (40 packages) | MIT 38, ISC 1, **GSAP: "Standard no-charge licence"** (not OSI-approved) |

Points to consider before any release under an open-source licence:
- **GSAP** is free to use, including commercially, under its own licence (https://gsap.com/standard-license). It is not open source. Shipping it as an npm dependency is fine. Contributors and redistributors must accept GSAP's terms, so the licence documents need to say so. Replacing it with CSS or the Web Animations API is possible because it is used only in lazy scroll scenes.
- **`mongodb-memory-server`** (MIT) downloads the **MongoDB Community Server** binary at runtime, and that binary is licensed under the **SSPL**. The repository does not redistribute the binary. Anyone who ships a Docker image containing `server/.cache/` would be redistributing SSPL software. Recommendation: make it a dev or optional dependency for production images.
- **Photos.** Seed data and the `/v01` prototype hotlink Unsplash photos (the Unsplash Licence, not an open-source licence). They must be excluded from any open-source licence grant. Do not vendor them into the repository.
- **Fonts.** Manrope is loaded from Google Fonts (SIL Open Font License 1.1). Fine.
- **Brand.** The "Ghumo AI" name, logo and the custom landmark illustrations are brand assets. An open-source code licence does not need to grant trademark rights (see [LICENSING_RECOMMENDATION.md](LICENSING_RECOMMENDATION.md)).

## 6. Deployment configuration

| Item | Status |
| --- | --- |
| `JWT_SECRET` | Generated by Render (`generateValue`). On other hosts it must be set; without it, the server uses a random per-process secret and warns |
| `MONGODB_URI` | `sync: false` on Render, so it is never in the repository |
| `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` | `sync: false` |
| `SEED_ON_EMPTY=true` | Now safe for the admin account. The other demo accounts still use the public password **by design** so visitors can try the demo. Turn seeding off before inviting real organisers |
| HTTPS | Provided by the host's proxy; cookies follow `req.secure` |

## 7. Recommended next security work

1. Rotate the admin password on every existing deployment (manual action M1).
2. In GitHub, enable private vulnerability reporting, Dependabot alerts and secret scanning with push protection (see [MANUAL_ACTIONS.md](MANUAL_ACTIONS.md)).
3. Fix medium/03 and medium/02 before real organisers onboard.
4. Make CodeQL (included in the CI workflow added here) a required check once it is green.
