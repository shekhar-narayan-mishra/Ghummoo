# Ghumo AI V0.1: known limitations

*Written during the V0.1 integration audit (7 November 2026). Each item is something V0.1 does not do, or does only partly. None of them is hidden in the product: where a traveller or organiser could run into one, the UI says so plainly.*

## Not implemented (by design for V0.1)

| Area | What is missing | What the product does instead |
| --- | --- | --- |
| Payments | No payment gateway. | Bookings are **requests**. Organisers confirm them and record offline payments (`PaymentRecord`, gateway `offline`). The booking and payment screens say this. |
| Email and SMS | No notifications, password reset or email verification. | Status changes appear in My trips, booking pages, the organiser activity feed and the navbar's unread trip-group badge. |
| Trip group delivery | Messages arrive by polling every 6 seconds, not over a socket. | Unread counts refresh on read and every 60 seconds. |
| Trip group media | Text only: no photos, files, reactions or editing. | Messages can be deleted by their author or the organiser, and reported. |
| Reviews | The seed has no completed trips, so demo data shows no reviews. The review rules are covered by `server/test/reviews.test.js`, and `e2e/05-reviews.spec.js` runs the browser journey on a test-only completed trip. There is no admin screen to hide a review yet (`Review.hidden` is honoured by public reads). | |
| Admin | No user management screen; approvals, verification and moderation only. | |
| Languages | English only. | |

## Partial

| Area | Limitation |
| --- | --- |
| Image uploads | Uploaded photos are stored on local disk (`server/uploads`, `UPLOAD_DIR`). **On a host with an ephemeral filesystem they disappear on redeploy.** Photo URLs entered by organisers are unaffected. This must move to persistent storage (GridFS or object storage) before a real launch. |
| Declining a paid booking | An organiser can decline a booking that already has payments recorded. The note to the traveller is required, but no refund record is created. |
| Rate limits | In-memory and per process. With more than one server instance, each instance has its own counters. |
| AI provider | AI Package Studio, natural-language interpretation and Ask This Trip depend on a configured provider. Without one, interpretation falls back to deterministic parsing, Ask answers "not confirmed", and Studio shows a plain "isn't available right now" notice with a link to manual creation. Provider quality and latency were tested only against a deterministic stub in e2e. |
| Verification | Organiser registration numbers (GST, MSME and others) are recorded and reviewed by an admin; nothing is checked against a government register. |
| Seed data | All seeded organisers, trips and travellers are demo records (`isDemo: true`) and are labelled "Demo" in the UI. |

## Security limitations

- **Account enumeration:** registering with an email that is already taken returns "That email is already in use". This is common practice but does reveal which emails have accounts.
- **Sign-in protection** is a per-IP, per-email limit on failed attempts (10 per 15 minutes) and 20 registrations per IP per 15 minutes. There is no CAPTCHA, account lockout notice by email, or second factor.
- **JWT sessions** cannot be revoked server-side before they expire; logout clears the cookie.
- **The trip-group contact filter** blocks obvious phone numbers, UPI IDs, card numbers and emails in messages. It is a nudge, not a guarantee: determined users can spell details out.
- **Without `JWT_SECRET`** the server starts with a random secret and logs a warning; every restart signs everyone out. Production must set it.
- **No CSRF token:** state changes rely on the `SameSite=Lax` session cookie and JSON-only bodies. `SameSite=None` is used only when the request is cross-site and over HTTPS, and CORS accepts only origins listed in `CLIENT_URL`.

## Performance notes

- The React runtime chunk is 232 kB (74 kB gzip). It is shared by every page and is the largest download.
- GSAP (113 kB, 44 kB gzip) loads only on pages with scroll scenes and is skipped entirely with reduced motion.
- Seeded trip photos are remote (Unsplash) images. They are lazy-loaded and size-matched, but their speed depends on that CDN.
- No service worker or offline support.

## Engineering debt

- ESLint reports **44 warnings, 0 errors**: all 44 are `react-refresh/only-export-components` (files that export helpers next to components; affects only hot reload in development). `react-hooks/set-state-in-effect` is now configured as an error with 0 violations.
- The `/v01` design prototype is still routed (lazy chunk, not linked from the live navigation). It should be removed or put behind a flag before a public launch.
