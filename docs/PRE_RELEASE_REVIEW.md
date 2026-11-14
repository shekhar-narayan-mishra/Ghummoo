# Pre-release review

*8 November 2026, branch `feat/ghumo-v0.1` (HEAD `78ce55d`) plus uncommitted work. Nothing has been committed, pushed, merged, published, licensed or changed in GitHub settings. The exact code diffs are in [PRE_RELEASE_REVIEW_DIFFS.md](PRE_RELEASE_REVIEW_DIFFS.md).*

## 1. Uncommitted changes, classified

### Required: security and correctness

| File(s) | Why it is required |
| --- | --- |
| `server/src/services/ai/index.js` | S3: AI grounding accepted invented numbers |
| `server/src/routes/ai.js` | S4: no cost limit on AI extraction |
| `server/src/utils/http.js`, `server/src/routes/operator.js`, `server/src/routes/admin.js` | S2: MongoDB operator injection through query strings |
| `server/src/utils/text.js` | S5: CSV formula-injection guard |
| `server/src/seedData.js`, `server/src/setPassword.js` (new) | S1: public admin password on deployments, and the repair script |
| `server/src/routes/discover.js`, `server/src/routes/bookings.js`, `server/src/middleware/errorHandler.js` | Three 500s that should be 4xx |
| `server/package.json`, `server/package-lock.json` | Express ^4.22.3 (S6, `qs`); **multer ^2.5.0 (S8, high-severity DoS advisories)**; the `set-password` script |
| **`client/package-lock.json`** | This predates the audit (an earlier `npm install`). It is **required**: the committed lockfile has **15 known advisories**, including high severity in **axios**, **react-router** and **Vite**, and this one has **0**. All tests in this review ran on it |
| **`package-lock.json` (root)** | This also predates the audit. It updates `shell-quote` 1.8.3 → 1.12.0, which fixes a **critical** advisory. The package is dev-only (used by `concurrently`), but it is a one-line, verified fix |
| `server/test/hardening.test.js` (new) | 7 tests for the fixes above |
| `e2e/start-app.js` | The production-mode e2e server needs `DEMO_ADMIN_PASSWORD` after S1, or the admin journeys fail |
| `e2e/helpers.js` | Fixes a flaky sign-in race. Without it, CI fails intermittently |
| `server/.env.example` | Documents the new variables (`DEMO_ADMIN_PASSWORD`, `AI_EXTRACTIONS_PER_HOUR`, …). Placeholders only |

### Required: open-source and contributor readiness

| File(s) | Notes |
| --- | --- |
| `.github/workflows/ci.yml`, `.github/workflows/codeql.yml`, `.github/dependabot.yml` | CI, verified locally (§6) |
| `.github/PULL_REQUEST_TEMPLATE.md`, `.github/ISSUE_TEMPLATE/*`, `.github/CODEOWNERS` | CODEOWNERS now lists `@shekhar-narayan-mishra` and `@vedansha07` |
| `.nvmrc` | CI reads the Node version from it |
| `README.md` (rewritten), `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`, `CHANGELOG.md` | The conduct contact is still a placeholder (§5) |
| `docs/*.md` (22 new files, including `DEPLOYMENT.md`, which the README now links to) | |
| `docs/github-issues/**` (30 drafts), `scripts/github/*` | Drafts only; nothing is published |

### Optional

| File(s) | Recommendation |
| --- | --- |
| `docs/PRE_RELEASE_REVIEW.md` and `docs/PRE_RELEASE_REVIEW_DIFFS.md` (this review) | Use them as the PR description and leave them out of the commit, or commit them as a dated record. My suggestion: leave them out, because a frozen diff goes stale |

### Unrelated: never commit

| Path | Notes |
| --- | --- |
| `.claude/` | Local tool settings |
| `query_guides.js`, `server/query_guides.js`, `reorder.py` | Untracked scratch files from May 2026. **Not opened or changed.** Delete them only if you choose to |
| `server/.env`, `server/.data/`, `server/uploads/`, `server/database.sqlite` | Already gitignored |

## 2. Security fixes: before and after

Each fix's exact `git diff` is in [PRE_RELEASE_REVIEW_DIFFS.md](PRE_RELEASE_REVIEW_DIFFS.md). In summary:

| ID | Before | After | Proof |
| --- | --- | --- | --- |
| S1 | `passwordHash: DEMO_PASSWORD` for the admin, so the README password worked in production | `passwordHash: demoAdminPassword()`: random in production unless `DEMO_ADMIN_PASSWORD` or `DEMO_PASSWORD` is set | Unit test, plus the end-to-end remediation test (§3) |
| S2 | `if (req.query.status) q.status = req.query.status` | `queryFilter(req.query, 'status')`, which returns 400 for anything that isn't a string | `?status[$ne]=x` → 400 (test) |
| S3 | `digits.includes(String(n))` | `numbersInText(text).has(Number(n))` | 500 is not grounded by "₹15,000" (test) |
| S4 | No limit | 30 per account per hour, keyed by user id | The 4th call returns 429 when the limit is 3 (test) |
| S5 | `/^[=+\-@]/` | `/^[=+\-@\t\r]/` | Test |
| S6 | Express 4.22.1 → `qs` 6.14.3 | Express ^4.22.3 → `qs` 6.16.2 | `npm audit` 0 |
| S8 | multer 1.4.5-lts.2 | multer ^2.5.0 | Upload test: valid image 201; SVG, oversize and anonymous refused |
| 4xx fixes | Unknown slug for an admin, `contact: null`, wrong upload field → 500 | 404, 400, 400 | Test |

**Lesson from S8:** `npm audit` reported 0 vulnerabilities while multer 1.x had at least four published high-severity advisories. The CI audit step catches only what `npm audit` knows. Dependabot alerts (manual action G3) use the GitHub advisory database directly and would have caught it.

## 3. Admin-password remediation: verified

I ran an end-to-end test on a throwaway embedded database:

| Step | Result |
| --- | --- |
| Seed the way an old deployment was seeded (README password) | README password **works** (the vulnerable state, reproduced) |
| Run `npm run set-password --prefix server -- admin@ghumo.demo` with `NEW_PASSWORD` set | It prints the target database, then "Password updated" |
| Try the README password | **Fails** |
| Try the new password | **Works** |
| Password shorter than 12 characters | Refused: nothing connects and nothing changes |
| An email that doesn't exist | "No account … Nothing was changed." |
| A new production seed with no `DEMO_*` variables | The admin gets a random password; the README password **fails**; a warning is logged |

Two gaps in the original instructions were found and fixed during this review:
1. **Shell history.** Writing `NEW_PASSWORD='…'` on the command line saves the password in `~/.zsh_history`. [MANUAL_ACTIONS.md](MANUAL_ACTIONS.md) M1 now uses `read -rs` for both the URI and the password, and the script prints the masked target database so a wrong URI is noticed before anything changes.
2. **Existing sessions.** Changing the password does not sign out an attacker who is already signed in. JWTs stay valid for up to 7 days. M1 now includes rotating `JWT_SECRET` on the host, which signs every user out once.

Not verified, because it needs access to your hosts:
- running the script against a real Atlas cluster;
- rotating `JWT_SECRET` on Render or Replit.

Whether any deployment exists at all is unknown to me. If none does, M1 is unnecessary.

## 4. Unresolved legal, ownership and licensing questions

| # | Question | Who decides | Blocks |
| --- | --- | --- | --- |
| L1 | **Copyright ownership in writing.** Both founders are the project's owners and repository admins (see [GOVERNANCE.md](../GOVERNANCE.md)), but all 36 commits are by `shekhar-narayan-mishra`. Who holds the copyright: both founders jointly, or a company? Has `vedansha07` contributed code, designs or content outside Git? A short written agreement between the two of you settles it | Both | Choosing any licence |
| L4 | Did anyone else (team-mates, a college, a course) write code in the legacy *Ghummoo* project (`backup/ghummoo-legacy`, commits before `56ad883`) that still exists? | Founders | The licence; possibly removing code |
| L7 | Brand: are the "Ghumo AI" name, logo and the custom landmark and landscape illustrations excluded from the code licence? Is the name protected (a trademark search or filing)? | Both | `TRADEMARKS.md` |
| L8 | Who wrote the Explore India copy (`server/src/content/india.js`)? Under what licence should it be released (CC BY 4.0, or all rights reserved)? | Founders | The content licence |
| L9 | **GSAP and the AGPL.** GSAP's licence is not GPL-compatible, and the built client bundles it. Either replace it (issue `medium/14`; it is used in one module) or add a lawyer-drafted AGPL §7 permission | Both | Clean redistribution of the built app under the AGPL |
| L10 | Unsplash photos are hotlinked in seed data. They must stay outside the licence grant, and photographers should be attributed where required | Founders | — |
| L11 | Should the public fork `vedansha07/Ghummoo` stay? It doesn't matter under licence options 1 and 3. Under option 2 (private app) it must be deleted or made private | `vedansha07` | Option 2 only |
| L12 | Professional legal advice: recommended for L1, L5 and L6 before launch. This review is not legal advice | Founders | — |

**Resolved**

| # | Question | Resolution |
| --- | --- | --- |
| L2 | `vedansha07`'s role | **Resolved 8 November 2026:** `shekhar-narayan-mishra` and `vedansha07` are both project owners and repository admins, so both must approve owner-level decisions. Copyright stays open under L1 |
| L6 | DCO or CLA | **Resolved 9 November 2026: DCO.** Contributors sign off each commit (`git commit -s`); the `DCO sign-off` CI check enforces it. No CLA, so all contributions stay AGPL-3.0 |
| L5 | Licence choice | **Resolved 8 November 2026:** AGPL-3.0-only. Copyright (C) 2026 shekhar-narayan-mishra and vedansha07. Files are prepared locally, waiting for a commit approval |
| L3 | CoNSTruct 2.0 terms | **Resolved 8 November 2026:** the owners confirm it was a competition Ghumo AI took part in, with no ownership restrictions or agreements attached. It is no longer a legal concern |

## 5. CODEOWNERS and the Code of Conduct

- **CODEOWNERS: done.** Every rule lists `@shekhar-narayan-mishra @vedansha07`, so both are requested automatically as reviewers on every PR, Dependabot PRs included. Dependabot's own `reviewers` option is retired in favour of CODEOWNERS, so none is set in `dependabot.yml`. GitHub honours a code owner only once they have accepted their access. Note: **Admin for `vedansha07` needs the repository to move into a GitHub organisation**, because personal-account repositories have no admin role for collaborators (MANUAL_ACTIONS G6).
- **Code of Conduct contact: waiting for you.** `CONDUCT_CONTACT_EMAIL` is still a placeholder. I'll replace it as soon as you send the address. A shared alias that both maintainers read is best. Don't use a personal address you would not want published.

## 6. CI, branch protection and scripts: verified

| Item | How it was verified | Result |
| --- | --- | --- |
| YAML syntax of `ci.yml`, `codeql.yml`, `dependabot.yml` | Parsed with js-yaml | Valid |
| The CI "Lint, test, build" job | Ran its exact commands in a **clean copy** of the tree to be committed (no `node_modules`, no `.env`): `npm ci` ×3, lint, test, build, `npm audit --audit-level=high` ×3 | **All passed** (0 vulnerabilities; tests 56 + 6 at the time. Re-run after the multer change: see `TESTING_AND_CI.md`) |
| The e2e job | `npm run test:e2e` on the working tree | 25/25 (see `TESTING_AND_CI.md` for the latest run) |
| The embedded MongoDB on `ubuntu-latest` (24.04) | Read the downloader's selection logic | It uses the MongoDB 7.0.24 build for Ubuntu 22.04, a supported fallback. **The first GitHub run is the real proof** |
| Secret scan (gitleaks) | Not run locally: the binary isn't installed, and downloading it needs your approval | The pattern scan of history found nothing. If gitleaks flags a test fixture, add a `.gitleaks.toml` allow-list entry |
| CodeQL | Workflow syntax only | Runs on the first push |
| Dependabot | Keys checked against the documented schema | **Fails until `staging` exists** (G2) |
| Required-check names for branch protection | Read from the job names | `Lint, test, build` · `End-to-end (Playwright)` · `Secret scan` · `analyze`. They appear in the ruleset picker only after one run |
| Branch protection recommendations | Checked against two maintainers who both own the code | Workable: either maintainer can approve the other's PR. **Don't** require code-owner review on `staging` while one maintainer is inactive, or PRs will stall |
| `create-labels.sh` | Dry run; flags checked against `gh` 2.103.3 (`label create --force`) | 15 labels, all valid |
| `publish-issues.sh` | Dry run of all 30 files; labels cross-checked against `labels.tsv`; flags checked against `gh issue create --help` | 30 issues parsed; every label exists. Changed during this review to pass each label separately and the body with `--body-file` |
| Current GitHub state | Public API (`gh` is not signed in yet) | All 4 branches unprotected; repository public; no licence |

## 7. Commit and PR plan

### Done (approved by you on 8 November 2026)

The four planned commits are on `feat/ghumo-v0.1` and **pushed** (`78ce55d..02df118`):

| Commit | Contents |
| --- | --- |
| `3f5bceb` fix(security) | The 17 server and e2e files |
| `3ac52b8` chore(deps) | `client/package-lock.json`, `package-lock.json` |
| `8ed42ae` ci | `.github/`, `.nvmrc`, `scripts/github/`, CONTRIBUTING, CODE_OF_CONDUCT, SECURITY, CHANGELOG |
| `02df118` docs | README, 23 docs, 30 issue drafts |

No PR is open yet, so CI hasn't run on GitHub.

### Next: two follow-up commits (need your approval)

They go on the same branch, so they become part of the same PR.

**1a. Governance and ownership updates**
```bash
git add GOVERNANCE.md .github/CODEOWNERS \
  docs/PRE_RELEASE_REVIEW.md docs/MANUAL_ACTIONS.md docs/PROJECT_AUDIT.md docs/OPEN_SOURCE_STRATEGY.md \
  docs/OPEN_SOURCE_READINESS.md docs/EXECUTION_PROGRESS.md docs/BRANCHING_AND_RELEASE_WORKFLOW.md \
  docs/GITHUB_ISSUE_ROADMAP.md docs/github-issues/medium/issue-14.md
git commit -m "docs: add governance with both owners, resolve CoNSTruct question, document admin access"
```

**1b. The licence (owner-level: `vedansha07` should approve it explicitly in the PR)**
```bash
git add LICENSE TRADEMARKS.md package.json server/package.json client/package.json \
  package-lock.json server/package-lock.json client/package-lock.json \
  README.md CONTRIBUTING.md CHANGELOG.md docs/LICENSING_RECOMMENDATION.md
git commit -m "chore: license under AGPL-3.0-only" -m "Copyright (C) 2026 shekhar-narayan-mishra and vedansha07. LICENSE is the verbatim text from gnu.org. TRADEMARKS.md keeps the Ghumo AI name and brand outside the code licence."
```

`README.md` and `CONTRIBUTING.md` also carry the one-line governance links, which ride along in 1b; splitting them by hunk isn't worth it.

**Exclude:**
- `docs/PRE_RELEASE_REVIEW_DIFFS.md`: paste it into the PR instead.
- `.claude/`, `query_guides.js`, `server/query_guides.js`, `reorder.py`: unrelated.

**Check after both commits:** `git status --short` should list only those five excluded paths.

### PR workflow (each step needs your approval)

1. `git push origin feat/ghumo-v0.1`: a normal fast-forward.
2. Open the PR with **base `main`** and **compare `feat/ghumo-v0.1`**, using the prepared description. Do it either through `gh pr create` once `gh` is signed in, or at https://github.com/shekhar-narayan-mishra/Ghummoo/compare/main...feat/ghumo-v0.1.
3. CI runs for the first time. If something fails, I diagnose it and propose a fix commit on the same branch. The likeliest causes are gitleaks matching a test fixture, or the mongod download on Ubuntu 24.04.
4. `vedansha07` reviews and approves. They are a code owner, so GitHub requests their review automatically.
5. Merge with **Create a merge commit**. Don't delete `feat/ghumo-v0.1` until `staging` exists.
6. Then, in this order:
   - G6: decide on the organisation transfer. **Do it before rulesets** if you do it at all.
   - G2: create `staging`.
   - G3 and G4: security features and Actions permissions.
   - G5: rulesets.
   - M4: the AGPL-3.0 licence is chosen. Its files go in as their own commit (step 1b below); `vedansha07` should approve it explicitly in the PR, because the licence is an owner-level decision.

## 8. What must be resolved before inviting external contributors

- [ ] **L1 and L4:** copyright ownership agreed in writing by both owners; legacy *Ghummoo* contributors checked. (L2 and L3 are resolved.)
- [ ] **L5 and L6:** AGPL-3.0 chosen ✅; `LICENSE` committed and merged ⏳; DCO chosen ✅ and CONTRIBUTING updated ✅; make **DCO sign-off** a required check.
- [ ] **L9:** GSAP replaced (`medium/14`) or a §7 permission added.
- [ ] **L7:** brand exclusion decided, and `TRADEMARKS.md` added.
- [ ] **M1 and M2:** any existing deployment's admin password and `JWT_SECRET` rotated; any shared tokens or keys revoked.
- [ ] **G1:** the follow-up commit approved and pushed; the PR opened, reviewed by `vedansha07` and merged into `main`, with **CI green on GitHub** (it has never run there).
- [ ] **G2 to G5:** `staging` created; security features on (Dependabot alerts would have caught S8); Actions permissions set; both rulesets active.
- [ ] **G6:** `vedansha07`'s collaborator invitation accepted (check Settings → Collaborators). For **Admin**, move the repository into an organisation both of you own: a personal-account repository can't have a second admin. Then update the repository URLs and add `GITLEAKS_LICENSE`.
- [ ] **G7:** the Code of Conduct contact email. **Pending: you'll give me the address, and I'll replace the placeholder only then.**
- [ ] **medium/07:** the `operator.js` split done by a maintainer, or the issues that touch it held back.
- [x] **medium/08:** the `/v01` prototype removed (issue #20 ✅).
- [ ] **G8:** issue drafts reviewed by both maintainers; labels created; approved issues published; a "Start here" issue pinned.
- [ ] **Maintainer time** (step L3 in MANUAL_ACTIONS): who triages and reviews, on which days; a 48-hour first-response commitment for the first month.
- [ ] `gh` signed in on this machine, if you want me to run the GitHub steps for you. Each one still needs your approval.
