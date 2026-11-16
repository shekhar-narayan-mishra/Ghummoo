# Security policy

## Reporting a vulnerability

**Do not open a public issue for a security problem.**

Report it privately through GitHub: go to the repository's **Security** tab and choose **Report a vulnerability**, or open https://github.com/shekhar-narayan-mishra/Ghummoo/security/advisories/new.

Please include:
- what is affected (endpoint, page or file) and the impact;
- steps to reproduce, using the demo accounts or your own local instance;
- any suggested fix.

Never test against someone else's deployment or use real people's data. Run the app locally (`docs/LOCAL_SETUP.md`); it needs no external services.

## What to expect

- Acknowledgement within **5 working days**.
- An assessment and a plan within **14 days**.
- Credit in the release notes, if you want it, once a fix ships.

These are the maintainers' targets as a small team, not a guarantee.

## Supported versions

Ghumo is below 1.0. Security fixes go into the latest release and `main`; older releases are not patched, so upgrade to the latest release.

## Scope

In scope:
- authentication and authorisation;
- booking and seat integrity;
- exposure of private traveller or organiser data;
- injection;
- AI features that could be made to present invented trip facts as real;
- secrets in the repository or the client bundle.

Out of scope:
- denial of service by sheer volume;
- reports that need a compromised device;
- missing best-practice headers with no demonstrated impact;
- the **demo accounts** documented in `README.md`. Their shared password is public by design for local development. In production the demo admin no longer uses it.

## If a secret is exposed

The repository is public and has been forked, so deleting a secret from the code does **not** remove it.
1. **Rotate** the key or password at its provider first.
2. Then remove it from the code.
3. Tell the maintainers.

## Known limitations

The current list of open security risks is in [docs/SECURITY_AUDIT.md](docs/SECURITY_AUDIT.md) §4.
