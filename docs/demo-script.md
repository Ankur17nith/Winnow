# Demo video

Target: about two minutes. The judges' scorecard asks whether the video shows the problem, what was built and how
Flagsmith fits in, so every beat below answers one of those.

Record after `npm run results` has written real numbers. If the experiment ends with no clear winner, record that: a
clear explanation of an inconclusive result is better than an overclaimed one.

## Before recording

- The deployed app, with preview mode off, in a clean browser profile (so you are a new visitor).
- A short README ready to paste, ideally a real one you own.
- The Flagsmith dashboard open on the experiment, and the `roast_prompt` flag.
- `/race` showing the committed snapshot. If any number on screen is simulated, the purple **SIMULATED REHEARSAL DATA**
  tag must be visible in the shot.
- A terminal in the repo for the last beat.

## Script

| Time | Screen | Say |
|---|---|---|
| 0:00 | Title card, then a plain text slide: "Which prompt is better?" | "Teams ship LLM features and choose prompts by feel. Changing one needs a redeploy, and nobody measures which one people actually prefer." |
| 0:12 | The landing page. Paste the README, press **Roast it**. The basket shakes while it works. | "Winnow is a README roaster. Every visitor silently gets one of three prompts: friendly, savage, or actionable." |
| 0:30 | The roast appears. Press **GRAIN**. The reveal panel opens. | "You vote grain or chaff. Only after you vote does it tell you which prompt you tasted, so the vote can't be influenced." |
| 0:45 | Flagsmith: the `roast_prompt` flag with three keyed variants, then the three metrics | "The prompts live behind a multivariate flag. A thumbs-up is the success metric. 'Roasted again' fires early in a visit." |
| 1:00 | Flagsmith: the experiment's results, win probability per variant | "Exposure and vote carry the same anonymous identity, so Flagsmith can compare the arms. After N visitors, actionable is at X% to win." Say the real numbers. |
| 1:20 | `/race` | "The same numbers on the page, and the rule we set before we looked: ship only at 90% with thirty visitors in every arm." |
| 1:35 | Terminal: `npm run ship -- --dry-run`, then `npm run ship`, type the winner's name | "Shipping is a flag change, and it never happens on its own. A person types the winner's name." |
| 1:50 | Back in the app, a new roast in the winning style | "No redeploy. Every visitor now gets the winner, through the same flag." |
| 2:00 | The repo, `kit/README.md` | "And the pattern is ten lines in `winnow-kit`, for anyone's prompts." |

## If the result is inconclusive

Replace 1:00–1:50 with: the results page; "after N visitors, no prompt has reached 90%"; `npm run ship -- --dry-run`
printing `Decision: WAIT.` and the reason; one sentence on what more traffic would settle.

## Do not

- Show an API key, the Vercel environment page, or the CLI's login output.
- Call simulated numbers real, or crop the simulated tag out of the frame.
- Promise that the winning prompt is better for everyone. The sample is small and the voters chose to vote.
