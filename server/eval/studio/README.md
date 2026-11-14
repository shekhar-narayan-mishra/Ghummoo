# AI Package Studio evaluation harness

Measures how well AI Package Studio turns an organiser's post into a trip draft. It runs the real extraction code (`extractRaw` and `normalise` in `server/src/services/ai/index.js`) over a labelled corpus and reports, for each field, how often the draft is right. It also reports how often a price, seat capacity, duration or departure date appears that the post never states.

## Running it

```bash
npm run eval:studio -- --stub      # the local stub (e2e/ai-stub.js), no key needed
npm run eval:studio                # the provider configured in server/.env
npm run eval:studio -- --corpus ../private-corpus --out results/private.json
```

| Option | Default | Meaning |
| --- | --- | --- |
| `--stub` | off | Start `e2e/ai-stub.js` and use it as the provider. `server/.env` is not read. |
| `--corpus <dir>` | `server/eval/studio/cases` | A folder with `corpus.json` and one JSON file per case |
| `--out <file>` | `server/eval/studio/results/latest.json` (gitignored) | Where the JSON results go |
| `--quiet` | off | Skip the table |

The run fails (exit code 1) when the corpus is invalid, when any case fails to run, or when a value that isn't in the post survives the app's grounding.

**The stub's scores say nothing about model quality.** The stub answers every post with the same Chopta trip. CI runs against it only to check that the harness works and that grounding still clears every invented value.

The harness runs one case at a time and never prints or saves captions, API keys or provider error messages. Output holds case ids, field names, extracted values, counts and error codes.

## What it reports

Every case labels 12 fields: `title`, `destination`, `price`, `currency`, `durationDays`, `durationNights`, `departureDates`, `capacity`, `inclusions`, `exclusions`, `pickupInfo` and `cancellationPolicy`. Scores use the **draft**, the output of `normalise()` that the organiser sees.

### Matching values

| Kind | Fields | A value is right when |
| --- | --- | --- |
| Number | price, durations, capacity | It equals the label |
| Code | currency | It equals the label, ignoring case and spaces |
| Text | title, destination, pickup, cancellation | After lower-casing and dropping punctuation, it equals the label, one contains the other as whole words, or at least half of all their words are shared (Jaccard ≥ 0.5) |
| List | inclusions, exclusions | Each item is matched as text, one to one: an expected item can be claimed by only one output item |
| Dates | departureDates | Month and day are equal. Years are ignored, because posts rarely state one and the model is told to assume the next occurrence |

### Per-field metrics

For each field, across all cases that ran:

- **Precision** = right values ÷ values in the drafts. It goes down when the draft has a value the label doesn't (invented or wrong). Shown as `–` when no draft had a value.
- **Recall** = right values ÷ values in the labels. It goes down when the draft misses a value the post states. Shown as `–` when no label has a value.
- **Exact match** = cases where the whole field is right ÷ cases. Both empty counts as right; a list is right only when every item matches and nothing is extra.

Precision and recall add up values across all cases (micro-averaged). A single value such as a price counts as one value.

### Values not found in the source text

The **hallucinated-value rate** = values not found in the post ÷ values checked. It covers price, capacity, `durationDays`, `durationNights` and each departure date, using the same functions the app uses (`numberInText`, `dateInText`). It is reported twice:

- **Model output:** the model's answer before grounding. This is the model's own rate of invented values.
- **Draft after grounding:** after `normalise()`. This must be 0, because the app clears every value it can't find in the post. Anything else is a bug in grounding, and the run fails.

## Corpus format

```
cases/
  corpus.json          { "name": "synthetic-sample", "version": "1", "synthetic": true }
  spiti-winter.json    one file per post
```

```json
{
  "id": "spiti-winter",
  "text": "the post, exactly as written",
  "expected": {
    "title": "Spiti winter expedition", "destination": "Spiti", "price": 21999, "currency": "INR",
    "durationDays": 8, "durationNights": 7, "departureDates": ["12-20", "01-03"], "capacity": 10,
    "inclusions": ["Homestays", "All meals"], "exclusions": ["Flights"],
    "pickupInfo": "6 am at Sector 17 ISBT, Chandigarh", "cancellationPolicy": "50% refund till 15 days before departure"
  },
  "notes": "why this case is here"
}
```

Every field must be present: use `null` or `[]` when the post doesn't state it, so a missing label is never read as "the post has no value". Label only what the post says, the same rule the model gets. Dates are `MM-DD` (or `YYYY-MM-DD`; the year is ignored). Change `version` in `corpus.json` whenever cases or labels change, so results from different corpus versions are never compared.

## The synthetic sample and the private corpus

`cases/` holds a small **synthetic** sample, written for the harness, with no real organiser text, names, phone numbers, UPI IDs or handles. It exists to test the harness, not to judge a model.

A corpus that measures real quality needs real organiser posts. `docs/PROPRIETARY_BOUNDARIES.md` allows that only with each organiser's **written consent**, anonymised, in a **private** repository. Never add real posts here.

> **Decision needed (issue #25):** a maintainer records here the data-consent decision and where the private corpus lives. Until then, only the synthetic sample exists.

## Running against a real provider in GitHub Actions

`.github/workflows/studio-eval.yml` runs only when a maintainer starts it by hand (Actions → Studio evaluation → Run workflow). It never runs on pull requests, so a fork can't reach its secrets. It uses the `studio-eval` environment:

| Name | Kind | Purpose |
| --- | --- | --- |
| `ANTHROPIC_API_KEY` or `OPENAI_API_KEY` | Secret | Provider key |
| `OPENAI_BASE_URL` | Variable | For OpenAI-compatible providers such as Gemini |
| `STUDIO_EVAL_CORPUS_REPO` | Variable | `owner/name` of the private corpus repository. Without it, the synthetic sample is used |
| `STUDIO_EVAL_CORPUS_TOKEN` | Secret | Read-only token for that repository |
| `STUDIO_EVAL_CORPUS_DIR` | Variable | Corpus folder inside that repository (default: its root) |

The job prints only the summary table. It uploads no results, because per-case values come from private posts.
