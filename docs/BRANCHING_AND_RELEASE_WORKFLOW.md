# Branching and release workflow

*Status: workflow **PROPOSED** and documented. The `staging` branch does **not** exist yet, and no branch protection is configured. Both require owner action; see [MANUAL_ACTIONS.md](MANUAL_ACTIONS.md) items G1 to G4.*

## 1. Current branches (8 November 2026)

| Branch | State | Recommendation |
| --- | --- | --- |
| `main` | Default branch. Holds the pre-V0.1 marketplace (`99ae22c` and earlier) | Keep it as the stable branch |
| `feat/ghumo-v0.1` | All V0.1 work and this audit's changes. Pushed | Merge into `main` through a reviewed PR, then create `staging` from the new `main` |
| `ghumo-ai` | Older marketplace work, tip `56ad883`. **Verified to be fully contained in `main`** | It can be deleted once the owners approve. Nothing would be lost |
| `backup/ghummoo-legacy` | The original *Ghummoo* project | Keep it as an archive. Consider a tag (`legacy-ghummoo`) instead of a branch |

None of these is protected today.

## 2. Branch model

```
feature/*  ─┐
fix/*      ─┼──PR──▶ staging ──release PR──▶ main ──tag vX.Y.Z
            │          ▲
Dependabot ─┘          └── CI on every PR
```

| Branch | Purpose | Created from | Merges into |
| --- | --- | --- | --- |
| `main` | Stable, production-ready, tagged releases | — | — |
| `staging` | Integration and testing of reviewed contributions | `main` | `main`, through a release PR |
| `feature/<short-name>` | One feature or issue | `staging` | `staging` |
| `fix/<short-name>` | One bug fix | `staging` (or `main` for a hotfix) | `staging` (hotfix: `main`, then back-merge to `staging`) |

## 3. Contributor workflow

1. Pick an approved issue and ask to be assigned.
2. `git switch -c feature/<name> origin/staging`
3. Implement the change, with tests.
4. Run `npm run lint && npm test && npm run build`, and `npm run test:e2e` when the UI is affected.
5. Open a PR against **`staging`**.
6. CI runs: lint, tests, build, audit, e2e, secret scan and CodeQL.
7. A maintainer reviews it.
8. The maintainer **squash-merges** it into `staging`.
9. The integrated `staging` build is tested. Deploy it to a staging environment if one exists, and run through the manual QA list in `docs/GHUMO_V0_1_RELEASE_CHECKLIST.md`.
10. A maintainer opens a **release PR** `staging → main` titled `release: vX.Y.Z`. It moves the `[Unreleased]` changelog entries under the new version.
11. Both maintainers approve, or one if only one is active.
12. Merge with a **merge commit**, not a squash, so `main` keeps the history of `staging`. Then tag the release:
    ```bash
    git switch main && git pull
    git tag -a v0.2.0 -m "v0.2.0"
    git push origin v0.2.0
    ```
    Create a GitHub Release from the tag, pasting that version's changelog section.

**Hotfix:** branch `fix/<name>` from `main`, open a PR to `main`, then open a PR merging `main` back into `staging`.

## 4. Branch protection

These settings fit a team of two maintainers. Configure them in GitHub → **Settings → Rules → Rulesets**; the exact clicks are in [MANUAL_ACTIONS.md](MANUAL_ACTIONS.md).

| Setting | `main` | `staging` |
| --- | --- | --- |
| Restrict direct pushes (require a pull request) | Yes | Yes |
| Required approvals | 1 | **0** (since 10 November 2026) |
| Dismiss stale approvals when new commits are pushed | Yes | Yes |
| Require review from Code Owners | Yes, once CODEOWNERS lists both owners | No |
| Require status checks: `Lint, test, build`, `End-to-end (Playwright)`, `Secret scan`, `analyze` (CodeQL) | Yes | Yes (e2e may be optional at first if it is slow) |
| Require branches to be up to date before merging | Yes | No (avoids rebase churn) |
| Block force pushes | Yes | Yes |
| Restrict deletions | Yes | Yes |
| Require linear history | No (release merges are merge commits) | Yes (squash merges only) |
| Bypass list | **None.** Rulesets apply to admins unless they are on this list; keeping it empty means both owners also go through reviewed PRs | Repository admins, for emergencies only |

Both owners, `shekhar-narayan-mishra` and `vedansha07`, are code owners ([GOVERNANCE.md](../GOVERNANCE.md)). On **`main`**, each one's release PR is approved by the other. On **`staging`**, required approvals are **0** (since 10 November 2026), so an owner can merge their own day-to-day PRs once every required check, DCO included, is green. Contributors can't merge, so every outside PR is still merged by an owner. Raise it back to 1 if you want a second pair of eyes on every change.

## 5. Versioning

- Use SemVer. While the product is pre-1.0, a minor version (`0.x.0`) may contain breaking API changes; the changelog must call them out.
- The extracted library (`packages/grounded-extract`, issue hard/01) gets its own version and changelog.

## 6. What this audit did *not* do

- It did not create `staging` on GitHub.
- It did not change the default branch.
- It did not push, merge, protect or delete any branch.

All of these are listed as manual actions for the owners.
