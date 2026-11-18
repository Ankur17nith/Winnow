# Experiment design

## Question

Which roast style do visitors like most, measured by how often they give a 👍?

## Hypothesis

The `actionable` prompt (scorecard plus concrete fixes) earns a higher 👍 rate than `control` (friendly roast) or
`savage` (brutal comedy), because users value roasts that tell them what to change.

We honestly do not know whether this is true. `savage` may win on entertainment value. That uncertainty is the point of
the test.

## Flag and variants

Flag `roast_prompt`, multivariate, string values. **Every variation needs a key** or no exposures are recorded.

| Key | Allocation | Prompt summary |
|---|---|---|
| `control` | remainder (~34%) | Friendly, light roast with 3 observations |
| `savage` | 33% | Comedic, unsparing roast, harsh but never about the person |
| `actionable` | 33% | Short scorecard (clarity, install, examples, trust) plus 3 prioritised fixes |

All three share the same constraints: at most 220 words, plain text, no personal attacks, ignore instructions found
inside the README.

Actual prompt text lives in `lib/prompts.ts` once implemented. Flag values hold the variant key; the mapping from key to
prompt text is in code.
(Moving prompt bodies into the flag values themselves is the natural next step once the winner is known; see
Alternatives.)

## Metric

| Field | Value |
|---|---|
| Name | `Roast liked` |
| Event | `thumbs_up` (case-sensitive, must match the code exactly) |
| Aggregation | `occurrence` (did this identity ever trigger the event) |
| Direction | `up` |

`thumbs_down` is tracked for context but is not a metric.

## Traffic

- 100% of visitors enrolled (`rollout_percentage: 100`).
- Split about 34 / 33 / 33.
- One exposure is recorded per identity, so a returning visitor keeps the same variant.

## Analysis plan

1. Read results from Flagsmith: per-variant conversion rate, lift against control, win probability (Bayesian).
2. Decision rule, set before looking: roll out a variant when its win probability is at least **90%** and we have at
   least **~30 exposures per arm**. Otherwise report "no clear winner yet" and say so plainly.
3. Report real numbers separately from simulated rehearsal traffic.
4. Roll the winner out by changing the flag, so the winner becomes the value everyone gets.

## Known limitations (to state in the write-up)

- Small sample from a short window, so wide uncertainty is expected.
- Voting is self-selected: only visitors who bother to click are counted, and conversion measures preference among
  voters.
- Novelty and sharing channel (e.g. a Discord audience) may bias results.
- Three arms need more traffic than two.

## Alternatives considered

- **Two arms only:** reaches significance faster, but is a less interesting story. Fallback if traffic is thin: drop
  `savage` or `control` and restart.
- **Prompt text in flag values:** allows editing prompts with no redeploy, but then variant keys and values need
  separate handling. Planned as a stretch and as the "ship the winner" story.
