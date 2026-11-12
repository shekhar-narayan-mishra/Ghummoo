# Testing and CI

*The latest full run was on 8 November 2026, on macOS with Node 22, against the working tree of `feat/ghumo-v0.1` including this audit's changes. CI has **not run on GitHub yet**: the workflow files are local until they are pushed.*

## Results of the latest run

| Command | Result |
| --- | --- |
| `npm test --prefix server` | **57 / 57 passed** (7 files; the multer 2 upload test was added in the pre-release review) |
| `npm test --prefix client` | **6 / 6 passed** |
| `npm run lint` | **0 errors**, 50 warnings (45 `react-refresh/only-export-components`, 5 `react-hooks/set-state-in-effect`; tracked as easy/09 and easy/08) |
| `npm run build` | **Succeeded** |
| `npm run test:e2e` | **25 / 25 passed** (4 specs; re-run after the multer upgrade: 25/25 in 3.3 minutes) |
| `npm audit --omit=dev` (root, server, client) | **0 vulnerabilities** |

One e2e test, `A14–A16`, failed in an earlier run during this audit:
- **Cause:** the login helper clicked "Log in" and navigated away immediately, so on a busy machine the navigation could cancel the sign-in request.
- **Fix:** `uiLogin` in `e2e/helpers.js` now waits for the sign-in response.
- **Verified:** the spec was rerun on its own (6/6), and then the full suite (25/25).

## Test status by category

| Category | Implemented | Run successfully | Failing | Not yet run | Needs credentials or services |
| --- | --- | --- | --- | --- | --- |
| Booking, seats and concurrency | ✅ `api.test.js` T4–T10, `india.test.js` | ✅ | — | — | — |
| Authentication and roles | ✅ `api.test.js`, `organiser.test.js`, `groups.test.js`, `e2e/04-security` | ✅ | — | — | — |
| Input validation | ✅ many; the new 4xx cases are in `hardening.test.js` | ✅ | — | — | — |
| NoSQL operator injection in filters | ✅ `hardening.test.js` (new) | ✅ | — | — | — |
| AI grounding (prices and capacities) | ✅ `api.test.js` T11, `hardening.test.js` (new) | ✅ | — | — | — |
| AI provider failures (timeouts, invalid JSON, schema errors, 429s) | ✅ `discovery.test.js` (injected `fetch`) | ✅ | — | — | — |
| AI with a live provider | ❌ no automated test | — | — | ✅ | **Yes**: needs a provider key, plus an evaluation set (hard/02) |
| Discovery and recommendation logic | ✅ `discovery.test.js`, `traveller.test.js`, `client/test/discovery.test.js` | ✅ | — | — | — |
| Budget constraints (price bands as hard limits) | ✅ `discovery.test.js` "Hard constraints…", `traveller.test.js` "Filtering…" | ✅ | — | — | — |
| Itinerary generation | Not applicable: no generator exists (itineraries come from organisers) | — | — | — | — |
| Rate limits | ✅ `discovery.test.js`, `api.test.js` sign-in, `hardening.test.js` AI extraction | ✅ | — | — | — |
| Cancellation edge cases | Partial | ✅ | — | Gaps: easy/13 | — |
| Reviews | API only | ✅ | — | Browser journey: medium/10 | — |
| Payments under concurrency | ❌ | — | — | medium/02 | — |
| Accessibility rules (axe) | ❌ (only keyboard, reduced-motion and overflow checks exist) | — | — | medium/09 | — |
| Multiple instances | ❌ | — | — | medium/05 | Needs more than one process |
| Real MongoDB Atlas | ❌ (tests use the embedded mongod) | — | — | — | Needs an Atlas cluster |
| Deployment (Render, Replit) | ❌ | — | — | — | Needs host accounts |

## CI workflows (added in this audit, not yet run on GitHub)

| Workflow | File | Triggers | Jobs |
| --- | --- | --- | --- |
| CI | `.github/workflows/ci.yml` | PRs and pushes to `main` and `staging`; manual | **Lint, test, build**: `npm ci` ×3, lint, unit and API tests, build, `npm audit --audit-level=high` on production dependencies. **End-to-end (Playwright)**: Chromium, temporary database, AI stub, traces uploaded on failure. **Secret scan**: gitleaks over the full history |
| CodeQL | `.github/workflows/codeql.yml` | PRs and pushes to `main` and `staging`; weekly | JavaScript analysis with the `security-extended` query set |
| Dependabot | `.github/dependabot.yml` | Weekly npm updates (server, client, root), monthly Actions updates | Grouped minor and patch PRs **targeting `staging`**, which must exist first |

| PR review | `.github/workflows/pr-review.yml` | PRs into `main` and `staging` (not Dependabot) | **PR checklist**: posts and updates one summary comment; labels `needs-tests` and `needs-careful-review`; fails on a wrong target branch or a missing issue link. Logic in `.github/scripts/pr-review.js`, with tests in `.github/scripts/pr-review.test.js` that run in CI (`node --test .github/scripts/*.test.js`; Node 22 needs file names, not a folder). Uses `pull_request_target` and never checks out the PR's code. Actions are pinned to commit SHAs. **Advisory: not a required check** |

Design choices:
- **No new test framework.** The workflows use the existing `node --test` and Playwright.
- **No type-checking step.** The project is plain JavaScript, so there is nothing to type-check. ESLint covers only the client until easy/10 adds server lint.
- **No secrets are needed.** Tests use embedded databases and a local AI stub. The `mongod` binary is cached between runs.
- **Minimal permissions:** `contents: read` throughout; CodeQL also gets `security-events: write`.

## What to expect on the first GitHub run

- **gitleaks** scans all history. This audit found no real secrets. If gitleaks flags a test fixture password, such as the demo password, add an allow-list entry in a `.gitleaks.toml` rather than disabling the job.
- **Dependabot** reports an error until `staging` exists ([MANUAL_ACTIONS.md](MANUAL_ACTIONS.md) G2).
- Branch protection can list the required checks only after each has run once.
