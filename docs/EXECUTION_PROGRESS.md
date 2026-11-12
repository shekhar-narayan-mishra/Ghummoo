# Execution progress: open-source transformation

*Last updated: 8 November 2026. If work resumes in a new session, read this file first and continue from "Next exact steps".*

## Status summary

| Phase (master prompt part) | Status |
| --- | --- |
| 1–3 Repository discovery and audit | COMPLETED: [PROJECT_AUDIT.md](PROJECT_AUDIT.md) |
| 4 Open-source strategy and IP | COMPLETED (proposal); decisions REQUIRE APPROVAL: [OPEN_SOURCE_STRATEGY.md](OPEN_SOURCE_STRATEGY.md), [PROPRIETARY_BOUNDARIES.md](PROPRIETARY_BOUNDARIES.md), [OPEN_SOURCE_READINESS.md](OPEN_SOURCE_READINESS.md) |
| 5 Open-source architecture | PROPOSED: [OPEN_SOURCE_ARCHITECTURE.md](OPEN_SOURCE_ARCHITECTURE.md). Extraction (hard/01) is BLOCKED on the licence |
| 6 Implementation and refactoring | COMPLETED for the verified bug and security fixes (below). Larger refactors are filed as issues |
| 7 Security and dependency audit | COMPLETED: [SECURITY_AUDIT.md](SECURITY_AUDIT.md) |
| 8 Licensing | **DECIDED: AGPL-3.0-only.** `LICENSE`, `TRADEMARKS.md` and the licence fields are prepared locally; REQUIRES COMMIT APPROVAL. Open: DCO or CLA, and GSAP compatibility (medium/14) |
| 9 Documentation | COMPLETED |
| 10 Testing and CI | COMPLETED locally: [TESTING_AND_CI.md](TESTING_AND_CI.md). CI has not run on GitHub (REQUIRES PUSH APPROVAL) |
| 11 Branching | Documented: [BRANCHING_AND_RELEASE_WORKFLOW.md](BRANCHING_AND_RELEASE_WORKFLOW.md). `staging` and protection REQUIRE MANUAL ACTION |
| 12 Issue roadmap | COMPLETED as drafts (30): [GITHUB_ISSUE_ROADMAP.md](GITHUB_ISSUE_ROADMAP.md). Publication REQUIRES APPROVAL |
| 13–14 Contributor experience and GitHub configuration | COMPLETED as files. Settings REQUIRE MANUAL ACTION |
| 15 Launch plan | PROPOSED: [OPEN_SOURCE_LAUNCH_PLAN.md](OPEN_SOURCE_LAUNCH_PLAN.md) |
| 16 Anthropic application | COMPLETED (assessment: not eligible today): [ANTHROPIC_APPLICATION_ASSESSMENT.md](ANTHROPIC_APPLICATION_ASSESSMENT.md) |
| 17 Manual action guide | COMPLETED: [MANUAL_ACTIONS.md](MANUAL_ACTIONS.md) |
| GitHub launch (8 November 2026) | **COMPLETED:** PR #1 merged (`3184b64`); `staging` created; security features on; rulesets on `main` and `staging`; labels created; 25 issues live (#2 to #26), 6 held. Still open: copyright agreement, DCO or CLA, GSAP, conduct email, organisation transfer, rotations |
| Pre-release review | COMPLETED: [PRE_RELEASE_REVIEW.md](PRE_RELEASE_REVIEW.md), with diffs in [PRE_RELEASE_REVIEW_DIFFS.md](PRE_RELEASE_REVIEW_DIFFS.md) |

## Code changes (all local, uncommitted)

| File | Change |
| --- | --- |
| `server/src/services/ai/index.js` | Whole-number grounding (`numbersInText`, `numberInText`): Indian grouping, k and lakh. `numberInText` exported |
| `server/src/routes/ai.js` | Per-account extraction limit `AI_EXTRACTIONS_PER_HOUR` (default 30) |
| `server/src/utils/http.js` | `queryFilter()`: query-string filters must be strings |
| `server/src/routes/operator.js`, `server/src/routes/admin.js` | List filters use `queryFilter`. `csvCell` moved to `utils/text.js` |
| `server/src/utils/text.js` | `csvCell()`, which also neutralises tab and CR prefixes |
| `server/src/seedData.js` | `demoAdminPassword()`: in production, random unless `DEMO_ADMIN_PASSWORD` or `DEMO_PASSWORD` is set |
| `server/src/setPassword.js`, `server/package.json` | New `npm run set-password` script; it prints the masked target database and reads the password from the environment. Express ^4.22.3 (the `qs` advisories). **multer ^2.5.0** (high-severity DoS advisories that `npm audit` missed; found in the pre-release review) |
| `server/src/routes/discover.js` | Unknown slug returns 404 (previously 500 for an admin) |
| `server/src/routes/bookings.js` | `contact: null` returns 400 (previously 500) |
| `server/src/middleware/errorHandler.js` | Multer errors return 400 (previously 500) |
| `server/test/hardening.test.js` | New: 7 tests, including a successful upload on multer 2 |
| `.github/CODEOWNERS` | Lists `@shekhar-narayan-mishra` and `@vedansha07`, the collaborator confirmed by the owner |
| `e2e/helpers.js` | `uiLogin` waits for the sign-in response (fixes a flaky test) |
| `e2e/start-app.js` | Sets `DEMO_ADMIN_PASSWORD` for the production-mode e2e server |
| `server/.env.example` | Documents every environment variable the code reads |
| `server/package-lock.json` | Express update |

**Changed before the audit:** `client/package-lock.json` and the root `package-lock.json` were already modified by an earlier `npm install`. The pre-release review classified them as **required**: the committed versions have 15 client advisories and 1 critical root advisory, and these versions have none. The untracked `query_guides.js`, `server/query_guides.js`, `reorder.py` and `.claude/` were left alone.

## Files created

- **Repository root:** `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`, `CHANGELOG.md`, `.nvmrc`. `README.md` was rewritten.
- **`.github/`:** `workflows/ci.yml`, `workflows/codeql.yml`, `dependabot.yml`, `PULL_REQUEST_TEMPLATE.md`, `ISSUE_TEMPLATE/{bug_report.yml,feature_request.yml,config.yml}`, `CODEOWNERS`.
- **`scripts/github/`:** `labels.tsv`, `create-labels.sh`, `publish-issues.sh`. Both scripts are dry-run by default.
- **`docs/`:**
  - `PROJECT_AUDIT.md`, `SECURITY_AUDIT.md`;
  - `OPEN_SOURCE_STRATEGY.md`, `PROPRIETARY_BOUNDARIES.md`, `OPEN_SOURCE_READINESS.md`, `OPEN_SOURCE_ARCHITECTURE.md`;
  - `LICENSING_RECOMMENDATION.md`, `ARCHITECTURE.md`, `LOCAL_SETUP.md`, `API_REFERENCE.md`, `DEVELOPMENT_GUIDE.md`, `TESTING_GUIDE.md`, `TESTING_AND_CI.md`, `DEPLOYMENT.md`, `ROADMAP.md`;
  - `BRANCHING_AND_RELEASE_WORKFLOW.md`, `GITHUB_ISSUE_ROADMAP.md`, `GITHUB_ISSUE_PUBLICATION_GUIDE.md`;
  - `OPEN_SOURCE_LAUNCH_PLAN.md`, `ANTHROPIC_APPLICATION_ASSESSMENT.md`, `MANUAL_ACTIONS.md`, this file;
  - `github-issues/{easy,medium,hard}/issue-NN.md` (14 + 13 + 3).

## Commands run (main ones)

```
git log --all -p | grep -E '<credential patterns>'      # secret scan of all history: none found
npm audit (root, server, client)                         # 1 moderate (qs) → fixed → 0
npm install express@^4.22.3 --prefix server
GitHub REST API (read-only, unauthenticated): repo, forks, branches, user, PR search
npm test        → 57/57 server, 6/6 client (after the multer upgrade)
clean-copy CI   → npm ci ×3, lint, test, build, audit: all passed with no .env present
npm run lint    → 0 errors, 50 warnings
npm run build   → ok
npm run test:e2e → 25/25 (after fixing the uiLogin race)
scripts/github/create-labels.sh, publish-issues.sh       # dry runs only
```

No push, merge, branch creation, issue publication, licence, visibility change or settings change was made. `gh` is not authenticated on this machine.

## Known bugs and risks still open

See [SECURITY_AUDIT.md](SECURITY_AUDIT.md) §4 and the issue drafts. The most important:
- seat holds with no cap (medium/03);
- non-atomic capacity edits (medium/13) and payment records (medium/02);
- uploads on local disk (medium/04);
- JWTs that can't be revoked (medium/06);
- **existing deployments still have the public admin password** (manual action M1).

## Decisions awaiting approval

1. The licence and the open-source option (M4).
2. Copyright ownership in writing and the legacy *Ghummoo* contributors (M3). The CoNSTruct 2.0 question is resolved: there are no restrictions.
3. Committing and pushing this work; merging V0.1 into `main` (G1).
4. Publishing the issue drafts (G8).
5. Removing `/v01` and the scratch files (L2).
6. The seat-hold policy (medium/03).

## Next exact steps

1. The owner reads [PRE_RELEASE_REVIEW.md](PRE_RELEASE_REVIEW.md) §7 and approves the four commits. Stage files by name; never stage `.claude/`, the scratch files or `server/.env`.
2. The owner completes M1 to M4 in [MANUAL_ACTIONS.md](MANUAL_ACTIONS.md).
3. Once the licence is decided: add `LICENSE`, `NOTICE` (if Apache-2.0) and `TRADEMARKS.md`; update the `package.json` licence fields, the README and the CONTRIBUTING licence section.
4. Push, open a PR `feat/ghumo-v0.1 → main`, confirm CI is green on GitHub, then do G2 to G8.
5. A maintainer does medium/07 (the operator routes split) before outside contributors start.
