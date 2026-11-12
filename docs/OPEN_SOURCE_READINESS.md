# Open-source readiness

*Checked 8 November 2026. Legend:*
- ✅ **COMPLETED**: done in the repository, locally; not pushed.
- 🟡 **PROPOSED**: drafted, needs review.
- 🔒 **REQUIRES APPROVAL**: an owner decision.
- 🧑 **REQUIRES MANUAL ACTION**: in GitHub or another service.
- ⛔ **BLOCKED**: waiting on something else.

| Area | Item | Status |
| --- | --- | --- |
| **Legal** | Copyright ownership confirmed in writing by both owners (`shekhar-narayan-mishra`, `vedansha07`); legacy *Ghummoo* contributors checked | 🔒 |
| | CoNSTruct 2.0 ownership terms | ✅ resolved: no restrictions (owners, 8 November 2026) |
| | Licence chosen and `LICENSE` added | ✅ AGPL-3.0-only chosen; files prepared locally, waiting for a commit approval 🔒 |
| | `TRADEMARKS.md` (brand excluded from the code licence) | ✅ prepared locally |
| | GSAP is not GPL-compatible: replace it or add a §7 permission | 🔒 (issue medium/14) |
| | DCO or CLA decision | ✅ **DCO** (9 November 2026): enforced by `.github/workflows/dco.yml`; add it as a required check 🧑 |
| | Third-party licences reviewed (GSAP, the SSPL binary, Unsplash) | ✅ ([SECURITY_AUDIT.md §5](SECURITY_AUDIT.md)) |
| **Security** | Git history scanned for secrets | ✅ none found |
| | Rotate any key ever shared outside a secret store; revoke any pasted GitHub token | 🧑 |
| | Public demo-admin password closed for new seeds | ✅ |
| | Existing deployments' admin password rotated | 🧑 |
| | `npm audit` clean | ✅ 0 vulnerabilities |
| | `SECURITY.md`, and private vulnerability reporting enabled | ✅ |
| | Secret scanning and push protection, Dependabot alerts | ✅ on (Dependabot security updates and private vulnerability reporting too) |
| **Code health** | Tests: 62 unit and API tests (56 server, 6 client) and 25 e2e tests, all passing | ✅ ([TESTING_AND_CI.md](TESTING_AND_CI.md)) |
| | Lint: 0 errors (50 warnings, tracked as issues) | ✅ |
| | `/v01` prototype removed or flagged | 🔒 (issue medium/08) |
| | Untracked scratch files (`query_guides.js`, `server/query_guides.js`, `reorder.py`) | 🔒 the owner decides whether to delete them |
| | Uncommitted lockfile changes that predate this audit (`client/` and root) | 🔒 review them before committing |
| **Docs** | README, CONTRIBUTING, CODE_OF_CONDUCT, SECURITY, CHANGELOG | ✅ (the conduct contact email is a placeholder 🧑) |
| | Architecture, local setup, API reference, development, testing and deployment guides | ✅ |
| | Roadmap | ✅ |
| **GitHub** | CI, CodeQL and Dependabot configuration | ✅ files / 🧑 the first run happens after push |
| | PR and issue templates, CODEOWNERS | ✅ (both maintainers listed; check `vedansha07` has write access 🧑) |
| | `staging` branch, branch protection, labels | ✅ done 8 November 2026: `staging` created; rulesets on `main` and `staging` with empty bypass lists; 15 labels |
| | Issue drafts ready to publish | ✅ 25 published (#2 to #26); 6 held (operator.js split, GSAP) |
| | Repository description and topics | ✅ set, and Discussions enabled |
| **Library** | Grounded-extraction package extracted | ⛔ (hard/01, after the licence) |
| **Launch** | Announcement drafts | 🟡 |
| | A maintainer has time committed for responses | 🔒 |

**Overall:** the repository is technically ready for contributors once three owner decisions are made:
1. the licence;
2. the IP confirmation;
3. merging V0.1 into `main` and creating `staging`.

All three are in [MANUAL_ACTIONS.md](MANUAL_ACTIONS.md).
