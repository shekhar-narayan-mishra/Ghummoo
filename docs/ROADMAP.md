# Roadmap

*These are directions, not promises. Each phase starts only when the one before it has evidence from real use. Issue numbers refer to `docs/github-issues/`.*

## Now: make the core reliable (V0.1 to V0.2)

Goal: a traveller can find a real trip, understand it and request it, and the organiser can confirm it and manage the traveller, with nothing lost or oversold.

- Persistent photo storage (medium/04).
- Seat-hold limits for pending requests (medium/03); atomic capacity edits (medium/13); atomic payment records (medium/02).
- A refund trail when a paid booking is declined (medium/12).
- Validation and small hardening fixes (easy/01 to easy/05, easy/14).
- Split the organiser routes, to reduce merge conflicts (medium/07).
- Remove the `/v01` prototype (medium/08) ✅ done.
- Tests for under-covered flows: cancellation (easy/13), reviews (medium/10), accessibility checks (medium/09).

## Next: prove AI Package Studio with real content

Goal: measure whether AI actually reduces an organiser's effort, without inventing anything.

- Ground dates and durations (medium/01).
- An evaluation harness built on a consented corpus of real organiser posts (hard/02).
- Extract the grounded-extraction library (hard/01), once the licence is approved.

## Then: organiser productivity

- Email notifications, password reset and email verification (hard/03).
- More source formats for Studio, such as PDFs and images, only if organisers ask for them.
- Better traveller management and communication.

## Later: trust, then personalisation

These follow product strategy phases 3 and 4.
- Organiser verification grounded in real checks.
- Reviews only from completed trips. That flow already exists and needs real trips.
- Clear cancellation and refund policies, and support and dispute handling.
- Personalised discovery from real behaviour.

## Explicitly not planned

- A payment gateway. It needs a business decision and a compliance review first.
- A site-wide chatbot.
- Any feature that would show invented prices, availability, reviews or credentials.
