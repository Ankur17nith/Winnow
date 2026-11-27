# Pre-registration: experiment 1

Status: **draft until hashed.** Once `npm run prereg -- hash` has written `prereg/HASHES.txt` and the commit is tagged
`prereg-exp1`, this file is never edited. A change goes in `prereg/experiment-1-amendment-<n>.md`, with the reason. The
experiment is created in Flagsmith from this file: its `hypothesis` field is the block below, word for word.

The habit of registering the decision rule before looking at any result, and hashing it, is borrowed from a teammate's
repository, [Fork in the Bill](https://github.com/Prashant-thakur77/fork-in-the-bill).

## Question

Do developers want AI feedback on their README to be kind, brutal or actionable?

## Hypothesis

<!-- hypothesis:start -->
The actionable roast prompt (a scorecard plus three prioritised fixes) is liked more often than the friendly control prompt: the share of visitors who vote "grain" (event thumbs_up) is higher for actionable than for control. The savage prompt is tested against the same control with no prediction.
<!-- hypothesis:end -->

## Arms

Served by the Flagsmith flag `roast_prompt`, multivariate, 100% of visitors enrolled, about 34 / 33 / 33.

| Variation key | Prompt | Flag value |
|---|---|---|
| `control` | friendly: three light-hearted observations | the flag's own value |
| `savage` | comedic and unsparing, never about the person | keyed variant |
| `actionable` | scorecard out of 5 on four dimensions, then three prioritised fixes | keyed variant |

The three prompts differ only in their bodies (`lib/prompts.ts`, written to the flag by `npm run setup:flagsmith`). The code
appends the same safety rules to every one, and the same model, temperature and length limit apply to all arms.

## Units

A visitor, identified by a signed anonymous cookie. The same identifier is used for the exposure and every event.
Exposure is recorded only when a roast is actually served.

## Metrics

| Metric | Event | Role |
|---|---|---|
| Roast liked | `thumbs_up` | **primary**: occurrence, up |
| Roasted again | `roast_again` | early signal: a second roast by the same visitor |
| Roast requested | `roast_requested` | sanity check only: near 100% in every arm by construction, so it cannot separate prompts |

`thumbs_down` and `copy` are recorded but are not metrics.

## Decision rule

Fixed now, applied by `lib/decision.ts`:

- A treatment ships only if Flagsmith's chance that it beats control is **at least 90%** and **every arm** has at least 30 visitors.
- Control is the baseline. If no treatment qualifies, control stays and the write-up says "no clear winner".
- Simulated data never ships, and is reported separately and labelled.
- A shipped winner is rolled out through the same flag, after a person types its name.

## Stopping

Data collection stops at the earlier of: 100 visitors in every arm, or 12 hours before the submission deadline. Looking at
results earlier does not change the rule, and a result seen early is not a reason to stop early.

## When the results are not to be trusted

- Flagsmith's sample-ratio check, or ours (`lib/srm.ts`), reports p < 0.01: the arms were not filled as designed.
- Events are found to be missing (exposures without the events that should follow).
- A prompt value is edited in Flagsmith after the experiment starts. That needs an amendment and, usually, a restart.

## Known limitations

Only visitors who choose to vote are counted. Anyone can clear their cookies and become a new identity. The sample will
be small, so the interval around any effect will be wide. Three arms need more traffic than two.
