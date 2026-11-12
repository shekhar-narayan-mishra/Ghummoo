# Ghumo AI: licensing recommendation

*Status: **DECIDED, 8 November 2026: AGPL-3.0-only for the repository**, chosen by the owners. `LICENSE` (the verbatim gnu.org text), `TRADEMARKS.md` and the `package.json` licence fields are prepared locally, waiting for approval to commit. Copyright line: "Copyright (C) 2026 shekhar-narayan-mishra and vedansha07". **Contributor terms: DCO (9 November 2026)**, with no CLA. Still open: the written copyright agreement (L1), legacy contributors (L4) and GSAP (§3). This is not legal advice.*

## 1. Why this is urgent

The repository is public, and the collaborator `vedansha07` has a public fork of it, but it has no licence. Today that means:
- people can read it;
- by default, they may not legally copy, modify or redistribute it;
- outside contributors have no clear terms for their contributions, so a careful contributor won't send a PR.

A licence must exist **before** contributors are invited.

## 2. Check first: can the code be licensed at all?

| Question | Why it matters | Who answers |
| --- | --- | --- |
| Who holds the copyright? `shekhar-narayan-mishra` and `vedansha07` are both project owners, but all 36 commits are by `shekhar-narayan-mishra`. Is there a written founders' agreement assigning IP to a company, or are the founders joint owners? | Only the copyright holders can license the code. Joint owners should both agree in writing | Both founders |
| Did anyone else write code in the legacy *Ghummoo* project (team members, course work, a college) that is still present? | Their contributions need their permission, or must be removed | Founders |
| Is any code copied from tutorials, Stack Overflow or other projects? | Stack Overflow snippets are CC BY-SA, and other projects carry their own licences | A quick founder review. This audit found no vendored third-party code beyond npm dependencies |
| Who wrote the Explore India content and the landmark illustrations? | Content and art can be licensed separately from code | Founders |

*Resolved: CoNSTruct 2.0 was a competition the project took part in, with no ownership restrictions or agreements (confirmed by the owners on 8 November 2026).*

## 3. What third-party dependencies allow

Details are in [SECURITY_AUDIT.md](SECURITY_AUDIT.md) §5.

- **Server dependencies:** all permissive (MIT, Apache-2.0, ISC, BSD). They are compatible with MIT, Apache-2.0 or AGPL-3.0 for the project.
- **GSAP:** its own "no-charge" licence, not OSI-approved. It doesn't stop the project being licensed, but redistributors must follow GSAP's terms. It is used only for lazy scroll scenes and could be replaced.
- **MongoDB binary (SSPL):** downloaded at runtime by `mongodb-memory-server` and never stored in the repository. It matters only if someone builds and distributes an image that contains it.
- **Unsplash photos:** hotlinked, under the Unsplash Licence. They are outside any grant the project makes.

### GSAP and the AGPL (open item)

The built client bundles GSAP, whose "standard no-charge" licence is not GPL-compatible. The owners can license their own code however they like, but someone who redistributes the combined app under the AGPL could be in conflict with GSAP's terms. GSAP is used in exactly one module, `client/src/motion/useSceneMotion.js`, for decorative scroll motion. There are two ways to resolve this:
1. **Replace GSAP** with CSS scroll-driven animations and `IntersectionObserver`, keeping the reduced-motion behaviour. This is issue `medium/14`, and it is the cleanest option: the whole stack becomes open source.
2. **Add an AGPL section 7 "additional permission"** allowing the code to be combined with GSAP. Only the copyright holders can grant it, and the wording should come from a lawyer.

## 4. Licences compared

| | **MIT** | **Apache-2.0** | **AGPL-3.0** |
| --- | --- | --- | --- |
| Commercial use by others | Yes | Yes | Yes |
| Modification and redistribution | Yes; keep the copyright notice | Yes; keep notices; mark changed files | Yes; the source of modified versions must be released, **including when it is only offered as a network service** |
| Attribution | The licence text and copyright notice | The licence, the NOTICE file and the change notes | The licence and notices |
| Patent grant | No explicit grant | **Explicit patent grant** from contributors, terminated if the user sues over patents | Explicit patent grant |
| Closed SaaS clone allowed? | Yes | Yes | **No.** It must share its source with its users |
| Contributor rights | Inbound = outbound by convention | Section 5: contributions are licensed under Apache-2.0 unless stated otherwise | Inbound = outbound |
| Friction for company contributors | Lowest | Low | Some companies forbid AGPL |
| Typical fit | Small libraries | Libraries and SDKs that companies will adopt | Self-hostable applications whose authors want to deter closed hosted forks |

## 5. Recommendation

| Code | Licence | Reason |
| --- | --- | --- |
| **Extracted library** (`packages/…`, the grounded extraction core, issue hard/01) | **Apache-2.0** | Its purpose is adoption by other developers and companies. The explicit patent grant is valuable for anything AI-related. It is permissive enough for commercial users |
| **Marketplace application** (`server/`, `client/`) | **AGPL-3.0** (option 1 in [OPEN_SOURCE_STRATEGY.md](OPEN_SOURCE_STRATEGY.md)), or keep it unlicensed and make it private (option 2) | AGPL lets contributors work on the real product while stopping a competitor from running a closed copy. If the owners would rather nobody runs a copy at all, choose option 2 |
| **Documentation** | CC BY 4.0, or the same licence as the code | Docs are easier to reuse under CC BY |
| **Brand**: the name, logo and illustrations | **Not licensed**; a `TRADEMARKS.md` notice | Forks must rename. This protects the brand without restricting the code |

**Contributor terms:**
- Use the **Developer Certificate of Origin (DCO)**: contributors add `Signed-off-by` with `git commit -s`. It is lightweight and widely understood.
- If the owners want to keep the right to sell a closed licence of the AGPL app later (dual licensing), they need a **CLA**, a licence or assignment from each contributor, instead of or alongside the DCO. Decide this **before** the first outside PR merges. Adding a CLA afterwards means going back to every past contributor.

## 6. How to apply the licence, once approved

These are not done yet.

1. Add a `LICENSE` file with the unmodified official text of the chosen licence. GitHub can generate it: **Add file → Create new file → name it `LICENSE` → Choose a licence template**.
2. For Apache-2.0, add a `NOTICE` file naming the copyright holder (for example "Copyright 2026 <owner or company name>").
3. Set `"license"` in `package.json`, `server/package.json` and `client/package.json` to the SPDX identifier (`AGPL-3.0-only`, `Apache-2.0` or `MIT`).
4. Add `TRADEMARKS.md`.
5. Update the "Licence" section of `README.md` and the DCO or CLA section of `CONTRIBUTING.md`.
6. Commit with a message that records the owners' decision, for example "chore: license under AGPL-3.0 (approved by both owners on <date>)".

Licensing is not retroactive in a way that can be undone for copies already taken. Choose deliberately.
