# Demo video and submission

The video must clearly show **the problem, what you built, and how Flagsmith fits in**. Target length: about 2 minutes.

## Script

| Time | Show | Say |
|---|---|---|
| 0:00–0:15 | Title, then a "which prompt is better?" slide | "Teams ship LLM features and pick prompts by gut feeling. A prompt change needs a redeploy and nobody knows which version users like." |
| 0:15–0:35 | Winnow app: paste a README, get a roast | "Winnow is a README roaster. Every visitor silently gets one of three prompts." |
| 0:35–1:00 | Flagsmith: the `roast_prompt` flag with three keyed variants, the metric, the experiment | "The prompts live behind a multivariate flag. Success is a thumbs-up, tracked as a Flagsmith event." |
| 1:00–1:20 | Vote 👍 in the app, then the Flagsmith experiment page | "Exposure and conversion both use the same anonymous identity, so Flagsmith can compare variants." |
| 1:20–1:50 | Results: win probability per variant | "Here are real results from N visitors. Variant X wins with Y% probability, and here is why." |
| 1:50–2:10 | Flip the flag to the winner | "Shipping the winner is a flag change with no redeploy. Every visitor now gets the winning prompt." |

## Rules for honesty

- Show **real** numbers; label any simulated rehearsal data clearly.
- If there is no clear winner, say so and explain the decision rule. A clear explanation of an inconclusive result
  beats an overclaimed one.

## Submission checklist

- [ ] Public GitHub repo with README and docs
- [ ] Live URL
- [ ] Demo video (problem, build, Flagsmith fit)
- [ ] Track: **01 Test Something Real**
- [ ] Experiment link or screenshots of results
- [ ] Write-up: question, variants, metric, split, result, decision, limitations
- [ ] Starred https://github.com/Flagsmith/flagsmith (bonus prize entry)
- [ ] Submitted before the 19 Nov deadline (confirm exact time and timezone on the hackathon page)
