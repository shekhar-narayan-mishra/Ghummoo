# Ghumo AI: current state of the repository and the app

*Snapshot: 9 November 2026. Everything below was checked against GitHub and the code on this date. Update this file whenever the state changes in a way contributors or the owners need to know.*

## 1. At a glance

| Area | State |
| --- | --- |
| Repository | `shekhar-narayan-mishra/Ghummoo`: public, **AGPL-3.0-only**, 0 stars, 3 forks |
| Owners | `@shekhar-narayan-mishra` (admin, repository owner), `@vedansha07` (Write; Admin needs an organisation, see §6) |
| Branches | `main` (released), `staging` (integration; 1 commit ahead of `main`), `feat/ghumo-v0.1` (merged, can be deleted), `ghumo-ai` (old, fully contained in `main`), `backup/ghummoo-legacy` (archive) |
| Branch rules | Rulesets on `main` and `staging`: PR required, 1 approval, 4 required checks, no force-push or deletion, **empty bypass list**. `main` also needs code-owner approval; `staging` needs linear history |
| CI | Lint, tests, build, audit, Playwright e2e, gitleaks, CodeQL. All green on `main` |
| Security settings | Dependabot alerts and security updates, private vulnerability reporting, secret scanning with push protection: all on |
| Open security alerts | Dependabot 0 · secret scanning 0 · **CodeQL 89** (§5) |
| Issues | 25 open (#2 to #26), 0 closed. 6 drafts held back. No one assigned yet |
| Pull requests | **12 open**: 10 Dependabot, 2 from first-time contributors (§4) |
| Contributor terms | **DCO** (decided 9 November 2026). The `DCO sign-off` CI check arrives with the DCO PR; make it a required check once it has run (§3) |

## 2. The app (V0.1)

A marketplace for fixed-departure group trips in India run by independent organisers. It runs locally with `npm run setup && npm run dev`, with an embedded MongoDB and demo data, and needs no API keys.

**Works and is tested:**
- **Traveller:** discovery with filters, Explore India, trip pages, comparison, saved trips, "Help me decide", Ask this trip, booking requests with atomic seat holds, My trips, cancellation, the trip board and trip groups.
- **Organiser:** onboarding with admin approval, packages, departures, the booking queue, confirm and decline, CSV manifest, offline payment records, announcements, insights.
- **AI Package Studio:** a caption becomes a draft. Numbers are grounded in the source text; missing fields are computed in code.
- **Admin:** approve organisers, verification, moderation, bookings, reports.

**Not built, by design or not yet:**
- **Payments:** there is no payment gateway. Bookings are requests and payments are recorded offline.
- **Email:** no email notifications, password reset or email verification.
- **Photos:** uploaded photos live on local disk and are lost on redeploy.
- **AI quality:** live AI quality is unmeasured; there is no evaluation set.
- **Real users:** there are no real organisers or travellers yet.

The full list is in [GHUMO_V0_1_KNOWN_LIMITATIONS.md](GHUMO_V0_1_KNOWN_LIMITATIONS.md) and [SECURITY_AUDIT.md](SECURITY_AUDIT.md) §4.

**Test status on `main`:** 57 server and 6 client unit/API tests; 25 Playwright e2e tests. All pass.

## 3. Contributor terms: DCO (decided 9 November 2026)

The owners chose the **DCO**: every commit carries a `Signed-off-by` line, there is no CLA, and all contributions stay AGPL-3.0. Comparison kept for the record:

| | **DCO** (Developer Certificate of Origin) | **CLA** (Contributor Licence Agreement) |
| --- | --- | --- |
| What the contributor does | Adds `Signed-off-by: Name <email>` to each commit (`git commit -s`) | Signs an agreement once, usually by clicking through a bot on their first PR |
| What it says | "I wrote this, or have the right to submit it, under the project's licence" ([developercertificate.org](https://developercertificate.org)) | Grants the owners a broad licence to the contribution, often including the right to **relicense** it |
| What the owners get | Clear provenance. Contributions come in under AGPL-3.0, like everything else | Provenance, **plus** the freedom to sell the code under other terms later (for example a closed commercial licence alongside the AGPL) |
| Friction for contributors | Very low: one flag on `git commit` | Higher. Some developers and companies won't sign CLAs |
| Setup | The free DCO GitHub app, or a small CI check | The CLA Assistant bot, plus agreement text that should be reviewed by a lawyer |
| Used by | The Linux kernel, GitLab, Docker, many CNCF projects | Google, Microsoft, Apache (for corporate contributors), many open-core companies |

**Consequence of choosing the DCO:** relicensing Ghumo under non-AGPL terms later would need the permission of every outside contributor whose code remains.

**Setup:**
1. ✅ `.github/workflows/dco.yml` checks every PR commit for a sign-off; Dependabot is exempt. It needs no third-party app. It arrives with the DCO PR (`chore/dco-and-status`).
2. ✅ `CONTRIBUTING.md` and the PR template explain `git commit -s`.
3. ⏳ After the check has run once, add **DCO sign-off** to the required checks of both rulesets.
4. ⏳ Ask the authors of PRs #28 and #29 to sign off their commits (neither is signed off today).

## 4. Open pull requests and what to do with each

Approval rules:
- A Dependabot PR has no human author, so **either owner can approve and merge it alone**.
- A contributor's PR needs one owner's approval.
- First-time contributors' CI runs only after a maintainer clicks **"Approve and run workflows"** on the PR.

### Contributor PRs

| PR | Author | What it is | Verdict |
| --- | --- | --- | --- |
| #28 `fix(seed): refuse to wipe a remote database without --force` | `bfs2021` (first-time) | Fixes issue #4. It adds a pure, unit-tested `seedTarget()` helper, makes `npm run seed` print its target and refuse remote databases, and fixes the root `seed` script's argument forwarding. 6 files, +163/−8, with a clear description | **Good contribution.** Before merging: (1) change the base to `staging`; (2) approve the workflows and wait for green CI; (3) review the code; (4) DCO sign-off, if chosen; (5) check its `docs/DEPLOYMENT.md` edit against the current wording |
| #29 `Complete Ghummoo Admin Dashboard and Management FeaturesFix/report rate limit` | `Manikanta-Achar` (first-time) | 3 commits, +463/−183 across 10 files: a large rewrite of `server/src/routes/admin.js` (+258/−114), `server/src/models/User.js` and `server/src/routes/reports.js`. It links no issue and the PR template is unfilled. It was branched from `staging` but targets `main`, so it also carries our docs commit from #27 | **Don't merge as it is.** It goes well beyond any published issue, and the closest one is #14 (report rate limit). Ask the author to: target `staging`; split out just the #14 change with tests; fill in the template; and open a discussion before larger admin changes. Changes to the user model need careful review |

### Dependabot PRs (all target `staging`)

| PR | Update | CI | Verdict |
| --- | --- | --- | --- |
| #31 | nodemon 3.1.11 → 3.1.14 (dev) | ✅ | Merge |
| #30 | @playwright/test 1.64.1 → 1.65.0 (dev) | ✅ | Merge |
| #37 | 13 client minor and patch updates | ✅ | Merge (it's the largest; skim the lockfile) |
| #32 | concurrently 8 → 10 (dev, major) | ✅ | Merge after checking that `npm run dev` still starts both servers |
| #35 | bcryptjs 2 → 3 (major) | ✅ | Probably fine: existing `$2a$`/`$2b$` hashes stay valid, and the tests sign in with seeded hashes. Merge after a manual sign-in check |
| #34 | mongodb-memory-server 10 → 11 (major) | ✅ | Merge. It's the embedded test and dev database, so check the first `npm run dev` |
| #38 | eslint 9 → 10 (dev, major) | ✅ | Merge **together with** #39 |
| #39 | @eslint/js 9 → 10 (dev, major) | ❌ peer-dependency conflict with eslint 9 | After #38 merges, comment `@dependabot rebase` |
| #36 | mongoose 8 → 9 (major) | ❌ `next is not a function` | Needs code changes: Mongoose 9 drops `next()` in async `pre('save')` hooks (`server/src/models/User.js`). **Close for now**, and plan it as its own issue |
| #33 | express 4 → 5 (major) | ❌ | Needs a migration. Express 5's default query parser no longer builds objects, which changes the `queryFilter` test expectations, and route syntax rules changed. **Close for now**, and plan it as its own issue |

To stop Dependabot reopening the two big framework majors until you're ready, add `ignore` rules for `express` and `mongoose` major versions in `.github/dependabot.yml`.

## 5. Security alerts (CodeQL, 89 open)

| Count | Rule | Status |
| --- | --- | --- |
| 3 | Polynomial ReDoS on email validation (`auth.js`, `bookings.js`) | **Real; fixed in PR #40** (§7). Reachable without signing in; a crafted 64,000-character email froze the API for 1.8 s |
| 1 | `findById` with user input | Fixed in PR #40 (non-string IDs now rejected) |
| 1 | Biased random in booking references | Fixed in PR #40 (rejection sampling) |
| 2 | Unsplash URL substring check (client) | Fixed in PR #40 (real hostname check) |
| 1 | CSRF on cookie auth | Fixed in PR #40: the API now refuses form-encoded bodies, so it is JSON-only as documented |
| 1 | Regex in an e2e test | False positive. Dismiss as "used in tests" |
| 80 | "Missing rate limiting" | CodeQL doesn't recognise the project's own rate limiter. Sensitive routes are limited. Dismiss as "won't fix" with that reason, and consider an app-wide limit as a new issue |

## 6. Ownership, licence and legal

| Item | State |
| --- | --- |
| Licence | **AGPL-3.0-only**, on `main` since PR #1 |
| Copyright line | "Copyright (C) 2026 shekhar-narayan-mishra and vedansha07" |
| Brand | `TRADEMARKS.md`: the name and logo are not covered by the licence |
| Written copyright agreement between the owners | **Open** (L1) |
| `vedansha07`'s licence approval | **Open:** PR #1 was merged before their review. Record their agreement in writing |
| Earlier *Ghummoo* contributors | **Open** (L4) |
| DCO or CLA | **Open** (§3), and **urgent** |
| GSAP is not GPL-compatible | **Open** (L9). Issue draft medium/14 replaces it |
| `vedansha07` as admin | Needs the repository moved into a GitHub organisation (MANUAL_ACTIONS G6) |
| Code of Conduct contact | **Open:** `CONDUCT_CONTACT_EMAIL` is still a placeholder |
| Two GitHub tokens pasted into a chat | **Revoke them** (M2) |

## 7. Work in progress

- **PR #40 (`fix/codeql-findings` → `staging`):** the ReDoS fix and the small CodeQL fixes in §5, plus 3 server tests and 1 client test. Verified locally: 60 server and 7 client tests, lint, build and 25/25 e2e. Waiting for `vedansha07`'s approval.
- **The DCO setup and this document** arrive in the companion PR (`chore/dco-and-status` → `staging`).
- `docs/PRE_RELEASE_REVIEW_DIFFS.md`: a local review artefact, deliberately not committed.

## 8. Next actions, in order

1. **DCO** (§3): merge the check, make it required, and ask #28 and #29 to sign off.
2. **Revoke the two pasted tokens.** Rotate deployment secrets if anything is deployed.
3. **Ship the CodeQL fix:** `vedansha07` approves PR #40, then merge it.
4. **Work through the PRs** (§4):
   - merge the green Dependabot updates;
   - close #33 and #36 for now;
   - retarget #28 and run its CI;
   - reply to #29 with the requested changes.
5. **Dismiss the 81 non-bug CodeQL alerts**, with reasons.
6. **Cut a release:** a PR from `staging` into `main`, approved by the other owner, then tag `v0.2.0`.
7. Then: the Code of Conduct email; the written copyright agreement; the GSAP decision; the organisation transfer (optional); the `operator.js` split (medium/07) before publishing the held issues.
