# Contributing to Ghumo AI

Thanks for helping. Ghumo AI is a marketplace for fixed-departure group trips in India, run by independent organisers. This guide explains how to go from "I found an issue" to "my change is merged".

> **Licence and sign-off.** Ghumo AI is licensed under the [GNU AGPL-3.0](LICENSE). Every commit must be signed off under the [Developer Certificate of Origin](https://developercertificate.org): use `git commit -s`. A CI check blocks PRs with unsigned commits. See "Licensing of contributions" below.

## The ten steps

1. **Find an issue.** Look for issues labelled `good first issue` or `help wanted`. `docs/GITHUB_ISSUE_ROADMAP.md` shows which issues can be worked on in parallel and which depend on others.
2. **Understand it.** Read the issue's acceptance criteria and its relevant files. Ask questions in the issue. Comment "I'd like to work on this" and wait for a maintainer to assign you, so two people don't do the same work.
3. **Set up.** Follow [docs/LOCAL_SETUP.md](docs/LOCAL_SETUP.md). It takes about five minutes and needs no database or API key.
4. **Branch from `staging`.**
   ```bash
   git fetch origin
   git switch -c feature/short-description origin/staging   # or fix/short-description
   ```
5. **Implement the change.** Keep it focused on the issue. Follow the rules below.
6. **Add tests.** Business logic needs tests in `server/test/` (run with `node --test`). Client logic goes in `client/test/`. See [docs/TESTING_GUIDE.md](docs/TESTING_GUIDE.md).
7. **Run the checks.**
   ```bash
   npm run lint && npm test && npm run build
   npm run test:e2e     # if your change can affect a browser journey
   ```
8. **Open a PR against `staging`**, not `main`. Fill in the template and link the issue: "Closes #12", or "Refs #12" when the PR does only part of it and the issue should stay open.
9. **Respond to review.** CI must be green. A maintainer reviews within a few days. Push follow-up commits to the same branch; don't force-push after review has started unless asked.
10. **Merge.** A maintainer squash-merges into `staging`. Changes reach `main` in the next release PR ([docs/BRANCHING_AND_RELEASE_WORKFLOW.md](docs/BRANCHING_AND_RELEASE_WORKFLOW.md)).

## Branches

| Branch | Purpose | Who merges |
| --- | --- | --- |
| `main` | Stable, released code | Maintainers, through a release PR from `staging` |
| `staging` | Integration branch; every contribution lands here first | Maintainers, after review and green CI |
| `feature/<name>` | New functionality, branched from `staging` | — |
| `fix/<name>` | Bug fixes, branched from `staging` | — |

Neither `main` nor `staging` accepts direct pushes.

## Product rules every change must respect

These come from `AGENTS.md` and are not negotiable.

- **Never invent data.** Prices, seats, reviews, organisers, availability, inclusions and booking status come from the database or from the organiser's own text. If the data doesn't answer a question, the UI says so.
- **AI must be grounded.** A number in an AI draft must appear in the source text. Missing-field lists are computed in code, never by the model.
- **No payment gateway exists.** Bookings are requests, and organisers record payments offline. Don't add copy that suggests online payment.
- **Protect private data.** Phones, emails and manifests are visible only to the roles allowed to see them. Never log request bodies.
- **Accessibility.** Every feature must work on mobile, with a keyboard and with reduced motion.
- **Design tokens.** Colours come from `client/src/index.css`. Never put hex values in components. Don't use blue or purple UI accents.

## Engineering rules

- Reuse the existing auth, role guards, models and booking logic. Don't add a second API, a second data model or a parallel UI kit.
- **Avoid new dependencies.** If you need one, explain in the PR why existing code can't do it, and give its size and maintenance status.
- Validate every input on both the server and the client.
- Every data view needs loading, error and empty states.
- Never commit `.env` files, keys, database dumps or real personal data. If you commit a secret by mistake, tell a maintainer privately at once: the secret must be rotated, not just deleted.
- Keep PRs small. One issue per PR.

## Commit messages

Use the conventional style already in the history: `feat: …`, `fix: …`, `test: …`, `docs: …`, `style: …`, `chore: …`. Write in the imperative ("add", not "added").

## Licensing of contributions

Contributions are accepted under the project's licence, the [GNU AGPL-3.0](LICENSE): you license your contribution to everyone under the same terms as the rest of the code. There is no contributor licence agreement.

**Every commit must be signed off** under the [Developer Certificate of Origin 1.1](https://developercertificate.org) (DCO). By adding a sign-off you certify that you wrote the change, or otherwise have the right to submit it, under the project's licence. The sign-off is one line at the end of the commit message, using your real name and an email you can be reached at:

```
Signed-off-by: Priya Sharma <priya@example.com>
```

Git adds it for you:

```bash
git commit -s -m "fix: describe the change"         # new commits
git commit --amend -s --no-edit                      # sign off the last commit
git rebase --signoff origin/staging                  # sign off every commit on your branch
git push --force-with-lease                          # update your PR after amending or rebasing
```

The **DCO sign-off** check (`.github/workflows/dco.yml`) runs on every pull request and fails if any commit lacks a sign-off. Only submit work you wrote yourself or have the right to contribute.

## Code review checklist (for reviewers)

- [ ] The change matches the issue's acceptance criteria and does nothing unrelated.
- [ ] Tests cover the new behaviour and fail without the change.
- [ ] No invented data, no new online-payment claims, no private data exposed to the wrong role.
- [ ] Inputs are validated on the server. Errors return 4xx with a readable message, not 500.
- [ ] No secrets or personal data in code, fixtures, screenshots or logs.
- [ ] No unnecessary dependency. Any API contract change is documented.
- [ ] UI: keyboard, mobile width, reduced motion and colour tokens checked.
- [ ] CI is green.

## The automated PR check

When you open a PR, a bot comment summarises it within a minute and updates on every push. It checks:
- the PR targets `staging` and links an issue (`Closes #12`, or `Refs #12` / `Part of #12` for part of an issue);
- the template is filled in;
- tests changed when application code changed;
- which sensitive files changed (workflows, dependencies, auth, the user model);
- whether the PR is large.

Problems in the first point fail the **PR checklist** check; the rest are advice for you and the reviewer. The check is advisory, not a merge requirement: it tells you what to fix, and maintainers decide. The bot reads only the PR description and file list and never runs your code.

## Who reviews

Both project owners, `@shekhar-narayan-mishra` and `@vedansha07`, are code owners and are requested automatically on every PR. Either can approve and merge. How owner-level decisions are made is described in [GOVERNANCE.md](GOVERNANCE.md).

## Finishing a contributor's PR (for maintainers)

When a contribution is good but needs small fixes, a missing sign-off or a better description, **finish it in place and merge the contributor's own PR**. Don't open a replacement PR. That way their PR shows as merged, and the squash commit names them as its author.

1. **Ask first.** Comment with exactly what's needed. Give the author a reasonable chance to respond.
2. **Fix on their branch.** Most contributors leave "Allow edits by maintainers" on. Push new, signed commits; never force-push over their history.
   ```bash
   gh pr checkout <number>
   # …fix…
   git commit -s -m "fix: …"
   git push                     # goes to the contributor's branch
   ```
3. **Title and description:** edit them directly on GitHub.
4. **Missing sign-off.** An owner may apply the **`dco-maintainer-signoff`** label. By doing so the owner certifies the unsigned commits under DCO clause (b), and the DCO check then passes and records who applied the label. Only use it after reading the code and finding nothing that looks copied from elsewhere. Contributors can't apply labels.
5. **Merge** with "Squash and merge". Keep the contributor as the author, and add your own `Signed-off-by: Name <email>` to the commit message.
6. **Close the linked issue** by hand. Merges into `staging` don't auto-close issues; only merges into `main` do.

## Getting help

Ask in the issue you are working on. For anything security-related, see [SECURITY.md](SECURITY.md). Everyone taking part must follow the [Code of Conduct](CODE_OF_CONDUCT.md).
