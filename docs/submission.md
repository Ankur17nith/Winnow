# Submission write-up (fill in the blanks)

**Project:** Winnow: let your users pick the winning prompt
**Track:** 01, Test Something Real
**Live app:** `<url>`  **Repo:** https://github.com/Ankur17nith/Winnow  **Video:** `<link>`

## The question

Do developers want AI feedback kind, brutal or actionable? Winnow is a README roaster. Every visitor silently gets one of
three system prompts from a multivariate Flagsmith flag, then votes grain (keep it) or chaff (toss it).

## The setup

| | |
|---|---|
| Flag | `roast_prompt`: `control` (friendly), `savage`, `actionable` |
| Split | 34 / 33 / 33, 100% of visitors |
| Primary metric | `thumbs_up` (Roast liked) |
| Early metric | `roast_again` (Roasted again) |
| Sanity check | `roast_requested` (fires for every roast) |
| Identity | signed anonymous cookie, the same for exposure and conversion |
| Decision rule (pre-registered, `prereg/experiment-1.md`) | ship a treatment at a 90% chance of beating control with 30 visitors in every arm |
| Run | `<start date>` to `<end date>` |

## Results

Traffic: `<N real visitors>` real, `<N simulated>` simulated (simulated runs were in a separate environment and are
reported separately).

| Prompt | Visitors | Liked | Chance to beat control |
|---|---|---|---|
| control | | | |
| savage | | | |
| actionable | | | |

**Decision:** `<shipped X through the same flag / no clear winner yet, because ...>`

## What we learned

`<two or three sentences: what the result says about kind vs brutal vs actionable feedback, and how confident we are>`

## Limitations

Short window and small sample; self-selected voters; cookies can be cleared; three arms need more traffic than two.

## Which parts of Flagsmith we used

The submission form asks this. What is true, and where to see it:

| Part | Used? | Where |
|---|---|---|
| Feature flags | Yes | `roast_prompt` (multivariate) and `roasts_enabled` (kill switch), read server-side with the Node SDK |
| Experimentation (A/B tests) | Yes | One experiment on `roast_prompt` with three metrics; exposures from `getExperimentFlag`, conversions from `trackEvent` |
| Remote config | Yes | The prompt text is each variant's value; the app uses it as the system prompt, with the safety rules appended in code |
| Flagsmith CLI | Yes | `npm run setup:flagsmith`, `results` and `ship` all run through it |
| Flagsmith API | Yes | The setup and results scripts call the Admin API with `flagsmith api` (metrics, experiment, results) |
| Flagsmith Cloud | Yes | The `winnow` project on Flagsmith Cloud |
| Segments | No | Not used. Do not tick it |
| Flagsmith MCP server | No | Not used: Flagsmith's own setup prompt says it cannot start experiments. Do not tick it |
| Self-hosted Flagsmith | No | Not used. Do not tick it |

Tick only what the table says "Yes" to, and only after the experiment has actually been created and run.

## How Flagsmith is used

The multivariate flag holds the prompts. The Node SDK's `getExperimentFlag` records exposures and `trackEvent` records
conversions. Experimentation computes each prompt's chance of beating control. Shipping the winner ends the experiment with
`rollout_decision=<winner>` through the CLI, gated by
a human approval step. A second flag, `roasts_enabled`, is the kill switch.
