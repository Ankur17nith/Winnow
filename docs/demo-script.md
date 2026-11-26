# Demo video

The script, the voiceover, the renderer and the rebuild steps live in [`../video/`](../video/README.md); the words are in
[`../video/script.md`](../video/script.md), which is the only copy. This page keeps what is specific to submitting it.

The judges' scorecard asks whether the video shows the problem, what was built and how Flagsmith fits in. The cut follows
that arc: a human moment (a prompt changes and nobody can tell if it helped), the product running, where the vote goes on
a diagram, the system refusing a forged vote on camera, then a plain "proven, and not yet" slide.

## Before recording the final cut

- The experiment has run, and `npm run results` has written `data/results.json`.
- `node video/vo.mjs --results "After N visitors, X is at Y percent to win."` adds the results line.
- Re-film the app scenes against the deployed app, with preview mode off, so the roast on screen is a real one.
- If any number on screen is simulated, the purple **SIMULATED REHEARSAL DATA** tag must stay in frame.
- Move "Not yet: a single real result" out of the status slide once it is no longer true.

## If the result is inconclusive

Say so. Replace the results line with: after N visitors, no prompt has reached 90%; `npm run ship -- --dry-run` prints
`Decision: WAIT.` and the reason. A clear explanation of an inconclusive result beats an overclaimed one.

## Do not

- Show an API key, the Vercel environment page, or the CLI's login output.
- Call simulated numbers real, or crop the simulated tag out of the frame.
- Promise that the winning prompt is better for everyone. The sample is small and the voters chose to vote.
