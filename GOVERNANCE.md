# Governance

## Owners and maintainers

| GitHub | Role | Repository permission |
| --- | --- | --- |
| [@shekhar-narayan-mishra](https://github.com/shekhar-narayan-mishra) | Project owner and maintainer | Admin (repository owner) |
| [@vedansha07](https://github.com/vedansha07) | Project owner and maintainer | Admin (**pending**: needs the repository to move into a GitHub organisation; see below) |

Both owners have equal standing. Each can review and merge contributions, triage issues and manage releases. Both are listed in [`.github/CODEOWNERS`](.github/CODEOWNERS), so GitHub requests a review from both on every pull request.

**Why admin access is pending:** the repository is owned by the personal account `shekhar-narayan-mishra`, and GitHub gives collaborators on a personal repository a fixed permission set, with no admin role. Until the owners move the repository into an organisation that both of them own ([docs/MANUAL_ACTIONS.md](docs/MANUAL_ACTIONS.md) G6), `vedansha07` can review, approve and merge but cannot change settings. The governance below applies either way: owner-level decisions need both owners, whoever clicks the button.

## How decisions are made

| Decision | Who | How |
| --- | --- | --- |
| Merging a contribution into `staging` | Either owner | Green CI (all required checks, including DCO). No approval is required on `staging`, so an owner may merge their own PR; contributors cannot merge, so every outside PR is merged by an owner who has read it |
| Release PR from `staging` to `main` | Either owner | One approving review from the other owner, and green CI |
| Changes to `.github/` (CI, CODEOWNERS, templates) | Either owner | A PR approved by the other owner |
| **Owner-level decisions:** licence, relicensing, repository visibility, default branch, branch rules, adding or removing an owner or admin, transferring the repository, publishing proprietary code, financial commitments | **Both owners** | Written agreement from both, recorded in the PR or issue that makes the change |
| Security reports | Either owner | Handled privately (see [SECURITY.md](SECURITY.md)). The other owner is informed |
| Code of Conduct reports | Either owner | Handled confidentially (see [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)). An owner who is involved in a report steps aside |

When the owners disagree, the change waits until they agree. Nothing owner-level happens by default.

## Completing contributions

Owners finish good-but-incomplete contributions **in the contributor's own PR**, so the contributor keeps the merged PR and the authorship (see CONTRIBUTING.md, "Finishing a contributor's PR"). Applying the `dco-maintainer-signoff` label is an owner's personal certification, under DCO clause (b), of the commits that lack a sign-off. Only an owner applies it, and only after reading the code.

## Admin access is not a bypass

Both owners are admins. Branch rulesets apply to admins too, unless an admin is on a ruleset's bypass list. The project keeps the bypass list for `main` **empty**, so even admins change `main` only through a reviewed PR. See [docs/BRANCHING_AND_RELEASE_WORKFLOW.md](docs/BRANCHING_AND_RELEASE_WORKFLOW.md).

## Becoming a maintainer

A regular contributor may be invited to the **Triage** or **Write** role once both owners agree. Typically that follows several merged PRs and helpful reviews. Admin access stays with the owners.

## Copyright

Being a repository admin is a GitHub permission. It does not by itself settle who holds the copyright in the code. The owners will record that in writing before a licence is applied (see [docs/LICENSING_RECOMMENDATION.md](docs/LICENSING_RECOMMENDATION.md)).
