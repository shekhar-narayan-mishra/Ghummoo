# Manual action guide

*These are the things only the owners can do. Each one says what to do, why, where, how, what input is needed, how to check it worked, and what comes next. Work top to bottom. GitHub menu names are as of November 2026; if GitHub has renamed something, the setting itself is the same.*

---

> **Status, 8 November 2026:**
> - Done: PR #1 merged into `main` with all checks green; `staging` created; Dependabot alerts and security updates, private vulnerability reporting and secret scanning are on; rulesets are active on `main` and `staging` with empty bypass lists; labels created; 25 issues published (#2 to #26).
> - Still open: M1 and M2 (rotations and revoking the pasted tokens), M3 (copyright in writing), G6 (organisation transfer, if wanted), G7 (conduct email), DCO or CLA, and GSAP.

## Critical: before anything else is made public or shared

### [ ] M1. Secure any deployment that already exists
- **WHAT:** Change the `admin@ghumo.demo` password on every deployment that was seeded before this change (on Render, Replit or anywhere else).
- **WHY:** Until now, the seeded admin used the password printed in `README.md`. Anyone could sign in as admin and read every booking. The code fix only protects **new** seeds.
- **WHERE:** Your own terminal, in this repository.
- **HOW:**
  1. Get the deployment's `MONGODB_URI` from the host dashboard: Render → service → **Environment**, or Replit → **Secrets**.
  2. In MongoDB Atlas → **Network Access**, check that your current IP is allowed (or `0.0.0.0/0`).
  3. From the repository root, run these lines one at a time. `read -rs` asks for each value without showing it and without saving it in your shell history:
     ```bash
     read -rs MONGODB_URI && export MONGODB_URI
     read -rs NEW_PASSWORD && export NEW_PASSWORD
     npm run set-password --prefix server -- admin@ghumo.demo
     unset MONGODB_URI NEW_PASSWORD
     ```
     The script prints the database host (with credentials masked) before changing anything. If it says "the embedded local database", stop: `MONGODB_URI` was not set. The new password must be at least 12 characters.
  4. **Sign out anyone already signed in as admin:** on the host, change `JWT_SECRET` to a new long random value and redeploy. On Render, open the service → **Environment** → `JWT_SECRET` → **Generate**. Changing the password alone does not end existing sessions, which stay valid for up to 7 days. This signs out every user once.
  5. Store the new password in your password manager.
  6. Add `DEMO_ADMIN_PASSWORD` (a different long secret) to the host's environment, so a future reseed doesn't fall back to a random password you can't use.
- **INPUT:** The deployment URI, and a new password.
- **SUCCESS CHECK:** Signing in to the deployment as `admin@ghumo.demo` with the README password now fails and the new one works; a browser that was already signed in as admin is signed out after the redeploy.
- **NEXT STEP:** M2. If you have never deployed, skip M1.

### [ ] M2. Rotate any secret that was ever shared
- **WHAT:** Revoke any GitHub personal access token that has ever been pasted into a chat or document. Rotate the Gemini or OpenAI key and the Atlas database password if they have ever been shared outside a secret store.
- **WHY:** Git history is clean, but secrets shared elsewhere can't be recalled.
- **WHERE:**
  - GitHub → your avatar → **Settings → Developer settings → Personal access tokens** (both "Fine-grained tokens" and "Tokens (classic)");
  - Google AI Studio → **API keys**;
  - MongoDB Atlas → **Database Access**.
- **HOW:** Delete or revoke the old credential, create a new one, and update it only in the host's secret store and your local `server/.env`.
- **INPUT:** None.
- **SUCCESS CHECK:** The old token or key returns 401 when used; the deployment still works with the new one.
- **NEXT STEP:** M3.

### [ ] M3. Confirm intellectual-property ownership (both owners)
- **WHAT:** Agree in writing who holds the copyright, and check that nobody else contributed to the earlier *Ghummoo* code.
- **WHY:** Only the copyright holders can license the code. Both of you are owners and admins ([GOVERNANCE.md](../GOVERNANCE.md)), but every commit is by `shekhar-narayan-mishra`, so the shared ownership should be written down. (CoNSTruct 2.0 is resolved: no ownership restrictions.)
- **WHERE:** An email or a shared document between `shekhar-narayan-mishra` and `vedansha07`.
- **HOW:**
  1. List everyone who wrote code, designs or content in *Ghummoo* (`backup/ghummoo-legacy`, commits before `56ad883`). If anyone besides the two owners did (team-mates, course work, a college), get their written permission or remove their work.
  2. Write one paragraph that both owners reply "agreed" to: "Copyright in the Ghumo AI code is held jointly by <full name of shekhar-narayan-mishra> and <full name of vedansha07> (or: by <company name>). Both must agree before it is licensed, relicensed or transferred."
- **INPUT:** Your full legal names, or the company name.
- **SUCCESS CHECK:** A written agreement exists, and no third-party claims remain.
- **NEXT STEP:** M4.

### [x] M4. Choose the open-source scope and the licence: **decided, AGPL-3.0-only (8 November 2026)**
- **WHAT:** Pick option 1, 2 or 3 in [OPEN_SOURCE_STRATEGY.md](OPEN_SOURCE_STRATEGY.md) §4, and the matching licences in [LICENSING_RECOMMENDATION.md](LICENSING_RECOMMENDATION.md) §5. Decide between DCO and CLA.
- **WHY:** The repository is public and forked but has no licence, so contributors can't safely contribute.
- **WHERE:** A discussion between the owners. A lawyer is advisable for the AGPL and CLA question.
- **HOW:** Reply with the decision, for example: "Option 1. App AGPL-3.0-only, library Apache-2.0, DCO, brand excluded." I can then add `LICENSE`, `NOTICE` and `TRADEMARKS.md`, update the `package.json` files, the README and CONTRIBUTING, and prepare the commit for your review.
- **INPUT:** The decision.
- **SUCCESS CHECK:** GitHub shows the licence in the repository sidebar after it is pushed.
- **NEXT STEP:** G1.

---

## Required before onboarding contributors

### [x] G1. Review and commit this audit's changes, then merge V0.1 into `main`
- **WHAT:** Commit the local changes on `feat/ghumo-v0.1`, push the branch, open a PR into `main` and merge it.
- **WHY:** `main` is 8 commits behind and lacks everything from V0.1 and this audit. `staging` must branch from an up-to-date `main`.
- **WHERE:** Here: say "commit" and I'll commit with your Git identity, staging only the files listed in [EXECUTION_PROGRESS.md](EXECUTION_PROGRESS.md). Then on GitHub: **Pull requests → New pull request**, with base `main` and compare `feat/ghumo-v0.1`.
- **HOW:** Review the diff (especially the files under `server/src`) and merge with **Create a merge commit**.
- **INPUT:** Your approval to commit, then to push.
- **SUCCESS CHECK:** The `main` branch on GitHub shows the new docs, and the **Actions** tab shows a CI run.
- **NEXT STEP:** G2.

### [x] G2. Create the `staging` branch
- **WHAT:** Create `staging` from the updated `main`.
- **WHY:** Contributor PRs target `staging` ([BRANCHING_AND_RELEASE_WORKFLOW.md](BRANCHING_AND_RELEASE_WORKFLOW.md)). Dependabot is configured to target it and fails until it exists.
- **WHERE:** A terminal.
- **HOW:**
  ```bash
  git switch main && git pull
  git switch -c staging
  git push -u origin staging
  ```
- **INPUT:** None.
- **SUCCESS CHECK:** `staging` appears under **Code → Branches**.
- **NEXT STEP:** G3.

### [x] G3. Turn on the security features (free for public repositories)
- **WHERE:** The repository → **Settings → Security** section → **Advanced Security** (called **Code security** on some accounts).
- **HOW:** Click **Enable** for each of:
  1. **Private vulnerability reporting.**
  2. **Dependency graph.**
  3. **Dependabot alerts**, and **Dependabot security updates**.
  4. **Secret Protection** (secret scanning), and **Push protection** under it.
  5. Leave **CodeQL** "Default setup" **off**: the repository has its own `.github/workflows/codeql.yml`, and the two conflict.
- **WHY:** These make `SECURITY.md` work, catch leaked keys before they are pushed, and flag vulnerable dependencies.
- **SUCCESS CHECK:** The **Security** tab shows "Report a vulnerability". Pushing a test commit containing a fake `ghp_…` token is blocked (then delete the test commit locally).
- **NEXT STEP:** G4.

### [x] G4. Allow the workflows to run
- **WHERE:** **Settings → Actions → General**.
- **HOW:**
  - Under **Actions permissions**, choose **Allow all actions and reusable workflows**. Or choose "Allow … and select non-…", and allow `actions/*`, `github/codeql-action/*` and `gitleaks/gitleaks-action@*`.
  - Under **Workflow permissions**, choose **Read repository contents and packages permissions**.
  - Under **Fork pull request workflows**, choose **Require approval for first-time contributors**.
- **WHY:** CI must run on PRs, but with minimal permissions.
- **SUCCESS CHECK:** The **Actions** tab shows green runs of "CI" and "CodeQL" on `main`.
- **NEXT STEP:** G5. Note: if the repository is ever moved into a GitHub **organisation**, gitleaks-action needs a free licence key as a secret named `GITLEAKS_LICENSE`. Personal repositories don't.

### [x] G5. Branch protection (rulesets)
- **WHERE:** **Settings → Rules → Rulesets → New ruleset → New branch ruleset**.
- **HOW (ruleset 1, "main"):**
  1. Ruleset name: `main`. Enforcement status: **Active**.
  2. Target branches: **Add target → Include by pattern** → `main`.
  3. Tick **Restrict deletions**.
  4. Tick **Require a pull request before merging**:
     - Required approvals: **1**;
     - tick **Dismiss stale pull request approvals when new commits are pushed**;
     - tick **Require review from Code Owners**.
  5. Tick **Require status checks to pass**:
     - tick **Require branches to be up to date before merging**;
     - **Add checks**: `Lint, test, build`, `End-to-end (Playwright)`, `Secret scan`, `analyze`. They appear in the list only after the workflows have run once (G4).
  6. Tick **Block force pushes**.
  7. **Create**.
- **HOW (ruleset 2, "staging"):** the same, with target `staging`, except:
  - Required approvals: **1**, or **0** while only one maintainer is active (you can't approve your own PR);
  - do **not** require branches to be up to date;
  - **tick Require linear history**.
- **WHY:** No direct pushes, no unreviewed or failing code, no history rewrites.
- **SUCCESS CHECK:** `git push origin main` from a local commit is rejected with "protected branch".
- **NEXT STEP:** G6.

### [ ] G6. Give `vedansha07` admin access (owner-level: both owners agree)
- **WHAT:** Make both owners genuine admins of the repository.
- **WHY:** [GOVERNANCE.md](../GOVERNANCE.md) treats both owners as admins. **A repository owned by a personal account cannot have a second admin**: it has one owner, and every collaborator gets the same fixed permissions (push, review, merge, manage issues), with no access to settings, rulesets or visibility. Admin roles exist only in organisation-owned repositories.
- **STEP 1, check the current state:** Go to https://github.com/shekhar-narayan-mishra/Ghummoo/settings/access (Settings → **Collaborators**). `vedansha07` should be listed as **Collaborator**. If it says "Pending invite", they must accept it at https://github.com/notifications or from the invitation email. Under a personal account, this is the most access possible.
- **STEP 2, create an organisation** (only `shekhar-narayan-mishra` can start this):
  1. Avatar (top right) → **Your organizations** → **New organization** → **Free**.
  2. Organisation name, e.g. `ghumo-ai` (check availability); contact email; "This organization belongs to: **My personal account**". Then **Next**, and skip adding members on this screen.
  3. Org → **People** → **Invite member** → `vedansha07` → role **Owner** → **Send invitation**. `vedansha07` accepts it from their notifications.
- **STEP 3, transfer the repository:**
  1. https://github.com/shekhar-narayan-mishra/Ghummoo → **Settings → General** → scroll to **Danger Zone** → **Transfer ownership**.
  2. Choose "Select one of my organizations" → the new organisation → type `shekhar-narayan-mishra/Ghummoo` to confirm → **I understand, transfer this repository**.
  3. Both of you are organisation owners, so both automatically have **Admin** on the repository. You can check this under the repository's **Settings → Collaborators and teams**.
- **WHAT THE TRANSFER CHANGES** (tell me after it's done and I'll prepare the follow-up edits for your approval):
  - The URL becomes `github.com/<org>/Ghummoo`. GitHub redirects the old URL, issue links and `git` remotes, but update your remote anyway: `git remote set-url origin git@github.com:<org>/Ghummoo.git`.
  - Repository references in `SECURITY.md`, `.github/ISSUE_TEMPLATE/config.yml`, `README.md`, `docs/LOCAL_SETUP.md` and `scripts/github/*.sh` (`REPO=`) must be updated.
  - **gitleaks-action needs a free licence key for organisation repositories.** Request one at gitleaks.io, then add it under **Settings → Secrets and variables → Actions → New repository secret**, named `GITLEAKS_LICENSE`, and pass it in `ci.yml`. Otherwise the Secret scan job fails.
  - Open PRs, issues, stars and the fork move with the repository. Re-check the Actions settings (G4) and rulesets (G5) afterwards.
- **IF YOU DON'T TRANSFER:** `vedansha07` stays a collaborator. They can review, approve and merge, and CODEOWNERS works for them, but only `shekhar-narayan-mishra` can change settings. In that case [GOVERNANCE.md](../GOVERNANCE.md) needs to say so; tell me and I'll update it.
- **INPUT:** Agreement from both owners, and the organisation name.
- **SUCCESS CHECK:** `vedansha07` opens the repository's **Settings** tab and sees **Rules** and **Collaborators and teams**. Opening `.github/CODEOWNERS` on GitHub shows no "unknown owner" warning.
- **NEXT STEP:** G7. Do G6 **before** G5 if you transfer, because the rulesets are easier to set up once, in the final location.

### [ ] G7. Set the code-of-conduct contact
- **WHERE:** `CODE_OF_CONDUCT.md`, the line containing `CONDUCT_CONTACT_EMAIL`.
- **HOW:** Replace the placeholder with an address both owners can read (a shared alias is best). Commit through a PR.
- **INPUT:** The email address.
- **SUCCESS CHECK:** `grep CONDUCT_CONTACT_EMAIL CODE_OF_CONDUCT.md` returns nothing.
- **NEXT STEP:** G8.

### [x] G8. Labels, then issues
- **WHAT:** Create the labels, review the issue drafts, then publish the ones you approve.
- **WHERE:** A terminal with the GitHub CLI.
- **HOW:**
  ```bash
  gh auth login                                  # once; choose GitHub.com, HTTPS, browser login
  scripts/github/create-labels.sh                # dry run
  scripts/github/create-labels.sh --apply
  scripts/github/publish-issues.sh               # dry run: check titles and labels
  scripts/github/publish-issues.sh --apply       # or list only the approved files
  ```
  The full guide is [GITHUB_ISSUE_PUBLICATION_GUIDE.md](GITHUB_ISSUE_PUBLICATION_GUIDE.md).
- **INPUT:** Which drafts to publish. Withhold any you disagree with.
- **SUCCESS CHECK:** The **Issues** tab shows them with labels. The "good first issue" filter shows the beginner issues.
- **NEXT STEP:** L1.

---

## Required before the public launch

### [ ] L1. Repository profile
- **WHERE:** The repository home page → the ⚙️ gear next to **About**.
- **HOW:**
  - Paste the description and topics from [OPEN_SOURCE_LAUNCH_PLAN.md](OPEN_SOURCE_LAUNCH_PLAN.md) §7.1 and §7.2.
  - Untick **Releases** and **Packages** until they are used.
  - Under **Settings → General → Features**, tick **Discussions**.
- **SUCCESS CHECK:** The About box shows the description and topics.

### [ ] L2. Decide on the `/v01` prototype and the scratch files
- **WHAT:** Approve removing `client/src/v01/` (issue medium/08). Delete the untracked `query_guides.js`, `server/query_guides.js` and `reorder.py` if they aren't needed.
- **HOW:** Tell me "remove v01" and "delete the scratch files". I'll do it and you review it. Nothing is deleted without your say.

### [ ] L3. Plan maintainer time
- **WHAT:** Agree who triages issues and on which day, and who reviews PRs. A suggested split: owner A handles backend, AI and security reviews; owner B handles frontend, design, docs and community replies. Each covers for the other.
- **WHY:** Contributors leave when they get no reply.
- **SUCCESS CHECK:** The names and days are written in the pinned "Start here" issue.

### [ ] L4. First release
- **HOW:** After the first contributions land in `staging`, open a PR `staging → main` titled `release: v0.2.0`. Move the `[Unreleased]` changelog entries under `## [0.2.0] - <date>`. Merge it, then:
  ```bash
  git switch main && git pull && git tag -a v0.2.0 -m "v0.2.0" && git push origin v0.2.0
  ```
  On GitHub: **Releases → Draft a new release** → choose the tag → paste that version's changelog → **Publish release**.

### [ ] L5. Announce
- **HOW:** Post the drafts in [OPEN_SOURCE_LAUNCH_PLAN.md](OPEN_SOURCE_LAUNCH_PLAN.md) §7, yourself, one community at a time, following each community's rules.

---

## Optional improvements

### [ ] A1. Claude for Open Source application
- **WHAT:** **Don't apply yet.** [ANTHROPIC_APPLICATION_ASSESSMENT.md](ANTHROPIC_APPLICATION_ASSESSMENT.md) shows no criterion is met today.
- **WHEN:** Re-assess once a criterion is honestly met, for example 20 external contributors in 12 months, or real package adoption.
- **WHERE:** https://claude.com/open-source-max. The terms are at https://www.anthropic.com/claude-for-oss-terms. You submit it yourself.

### [ ] A2. Publish the grounded-extraction package to npm
- After hard/01 lands and the owners approve Apache-2.0 for it:
  1. Create an npm account with 2FA.
  2. Optionally create an npm organisation (`@ghumo`).
  3. Run `npm publish --access public` from `packages/grounded-extract`.

### [ ] A3. Clean up old branches
- `ghumo-ai` is fully contained in `main`. Delete it on GitHub under **Code → Branches** (trash icon), or keep it. Turn `backup/ghummoo-legacy` into a tag if you prefer. **Both are your call**; nothing has been deleted.

### [ ] A4. A hosted staging environment
- A second Render or Replit service that deploys from `staging`, with its own Atlas database and `SEED_ON_EMPTY=true`, used for release testing.
