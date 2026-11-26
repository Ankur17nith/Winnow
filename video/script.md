# Demo video script

About 2 minutes, 1920×1080, 30 fps. Two voices alternate by scene: **IN** is an Indian English voice, **US** an American
English one. Music sits low under the voice the whole way through.

Nothing in this script states a result. The experiment has not run yet, so scene 6 shows the rule and the empty race page.
When real numbers exist, add the line marked **RESULTS** to scene 6 and rebuild; nothing else changes.

| # | Time | Voice | What is on screen | Voiceover |
|---|---|---|---|---|
| 1 | 0:00 | US | Black, then "Which prompt is better?" sets in the Winnow headline type | Every AI feature ships with a prompt. And most teams pick that prompt on a gut feeling. |
| 2 | 0:09 | IN | Three prompt cards (friendly, savage, actionable) side by side, a "?" over each | Changing it means a redeploy, and nobody measures which version people actually prefer. So we put the prompt behind a feature flag. |
| 3 | 0:20 | IN | The real home page; a README is pasted; **Roast it**; the basket shakes; the roast appears | This is Winnow. Paste your README, and get roasted. Behind the scenes, a Flagsmith flag silently deals you one of three prompts: friendly, savage, or actionable. |
| 4 | 0:38 | US | The cursor presses **GRAIN**; the stamp presses down; the reveal panel opens | Then you vote. Grain, keep it. Chaff, toss it. Only after you vote does Winnow reveal which prompt you got, so the vote is never influenced. |
| 5 | 0:54 | IN | `npm run setup:flagsmith -- --dry-run` output scrolling: the flag, three keyed variants, three metrics, the experiment | One command creates the flag, the three metrics and the experiment in Flagsmith. The exposure and the vote carry the same anonymous identity, so Flagsmith Experimentation can compare the arms. |
| 6 | 1:12 | US | The race page and its decision-rule band | Before any data came in, we fixed the rule. Ship only at ninety percent win probability, with thirty visitors in every arm. Simulated data can never ship. |
| 6R | | US | (when results exist) the race page with real numbers | **RESULTS:** After N visitors, X is at Y percent to win. |
| 7 | 1:27 | IN | The real approval line from `scripts/ship-winner.ts`, then `npm test` passing "decision: simulated data never ships" (a real ship can only be filmed once results exist) | When a prompt qualifies, a person approves it by typing its name. One flag update, no redeploy, and every visitor gets the winner. |
| 8 | 1:40 | US | `kit/README.md`'s ten lines, then the Winnow wordmark and the repo link | And the whole pattern fits in ten lines, in a small library called Winnow Kit. Winnow. Let your users pick the winning prompt. |

End card credits: music by Sascha Ende, ende.app (CC BY 4.0); voices by ElevenLabs; recorded in preview mode where
roasts are marked `[preview]`.

## Rules for this video

- Every screen is the real app or real command output. No invented numbers, testimonials or dashboards.
- Preview-mode roasts keep their `[preview]` label on screen. Re-record scene 3 against the deployed app once it exists.
- No keys, cookies, account URLs or personal data on screen.
