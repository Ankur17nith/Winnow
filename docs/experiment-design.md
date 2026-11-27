# Experiment design

## Question

**Do developers want AI feedback kind, brutal or actionable?** Measured by how often a visitor marks the roast
as grain (`thumbs_up`). The answer is the finding we report, not just a winner.

## Hypothesis

The `actionable` prompt (scorecard plus concrete fixes) earns a higher 👍 rate than `control` (friendly roast) or
`savage` (brutal comedy), because users value roasts that tell them what to change.

We don't know whether this is true. `savage` may win on entertainment value. That uncertainty is the point of
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

The prompt text is the flag's remote config: `npm run setup:flagsmith` writes each prompt body into its variant's value
(control is the flag's own value), so a prompt can be edited, or a new arm added, in Flagsmith with no deploy. The same
bodies live in `lib/prompts.ts` as the fallback if a value is missing or unusable. The code appends the safety rules to
every prompt, so they are not part of what the flag supplies.
(Moving prompt bodies into the flag values themselves is the natural next step once the winner is known; see
Alternatives.)

## Metric

| Field | Value |
|---|---|
| Name | `Roast liked` |
| Event | `thumbs_up` (case-sensitive, must match the code exactly) |
| Aggregation | `occurrence` (did this identity ever trigger the event) |
| Direction | `up` |

`roast_again` (a second roast by the same visitor) is the early-firing signal, as the track advises picking a metric that fires
early in a visit. `roast_requested` fires for every served roast, so it is near 100% in every arm and is only a sanity
check. `thumbs_down` is a guardrail and `copy` a secondary signal. Neither is the primary metric. If the leading variant also
gets many `thumbs_down`, say so in the write-up.
(Check the Flagsmith docs for how many metrics one experiment supports before relying on a second metric.)

## Traffic

- 100% of visitors enrolled (`rollout_percentage: 100`).
- Split about 34 / 33 / 33.
- One exposure is recorded per identity, so a returning visitor keeps the same variant.

## Analysis plan

1. Read results from Flagsmith: per-variant like rate, and for each treatment its lift over control with a 95% interval and
   the chance that it beats control (Bayesian). Flagsmith gives control no chance of its own: it is the baseline.
2. Decision rule, set before looking (registered in `prereg/experiment-1.md`): roll out a treatment when its chance of
   beating control is at least **90%** and we have at
   least **~30 exposures per arm**. Otherwise report "no clear winner yet".
3. Report real numbers separately from simulated rehearsal traffic.
4. Roll the winner out by changing the flag, so the winner becomes the value everyone gets.

## Statistical caveats

- **Peeking:** checking results often and stopping when a number looks good inflates false wins. The decision rule above is
  fixed in advance and stated on the results page.
- **Three arms need more traffic than two.** If votes are thin by the midpoint, drop one arm, restart, and say so.
- **Reveal after vote** shows the variant only after the vote is cast, so the vote is never influenced by it.

## Known limitations (to state in the write-up)

- Small sample from a short window, so wide uncertainty is expected.
- Voting is self-selected: only visitors who bother to click are counted, and conversion measures preference among
  voters.
- Novelty and sharing channel (e.g. a Discord audience) may bias results.
- Three arms need more traffic than two.

## Alternatives considered

- **Two arms only:** reaches significance faster, but is a less interesting story. Fallback if traffic is thin: drop
  `savage` or `control` and restart.
- **Prompt text in code, key in the flag:** simpler, but then a prompt change is a deploy. Replaced by remote config: the
  prompt text is the flag's value, with the copy in code kept as the fallback.