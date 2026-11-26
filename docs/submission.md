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
| Decision rule (set before looking) | ship at 90% win probability with 30 visitors in every arm |
| Run | `<start date>` to `<end date>` |

## Results

Traffic: `<N real visitors>` real, `<N simulated>` simulated (simulated runs were in a separate environment and are
reported separately).

| Prompt | Visitors | Liked | Win probability |
|---|---|---|---|
| control | | | |
| savage | | | |
| actionable | | | |

**Decision:** `<shipped X through the same flag / no clear winner yet, because ...>`

## What we learned

`<two or three sentences: what the result says about kind vs brutal vs actionable feedback, and how confident we are>`

## Limitations

Short window and small sample; self-selected voters; cookies can be cleared; three arms need more traffic than two.

## How Flagsmith is used

The multivariate flag holds the prompts. The Node SDK's `getExperimentFlag` records exposures and `trackEvent` records
conversions. Experimentation computes win probability. Shipping the winner is `flagsmith flag update --weight`, gated by
a human approval step. A second flag, `roasts_enabled`, is the kill switch.
