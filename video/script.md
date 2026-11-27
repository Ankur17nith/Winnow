# Demo video script (v3)

About three minutes, 1920×1080, 30 fps. Structured after a reference launch video: it opens in the dark on a human moment
and turns light, shows where the data goes on a diagram, runs the real thing with a visible cursor, makes the system
refuse something on camera, then says plainly what is proven and what is not. Two voices alternate by scene: **IN** an
Indian English voice, **US** an American English one. Music sits low under the voice throughout.

Nothing here states a result: the experiment has not run. Scene 8 shows the rule and the empty race page. When real
numbers exist, add the line marked **RESULTS** and rebuild.

| # | Voice | On screen | Voiceover |
|---|---|---|---|
| 1 | US | Dark. A real prompt line from `lib/prompts.ts` swapped for another | You change one line in a system prompt. It ships on Friday. Did it make the product better? Nobody can tell you. |
| 2 | IN | Dark turning light. The three real prompts, a question mark over each | Prompts change behaviour more than most code, and they ship with no experiment, no metric, and no way to compare. So we put the prompt behind a feature flag, and let the users vote. |
| 3 | IN | The real app: paste, roast, the basket shaking | This is Winnow, a README roaster built as a live test. Every visitor silently gets one of three prompts, from a multivariate Flagsmith flag. |
| 4 | US | The real vote and the reveal | You vote: grain, keep it, or chaff, toss it. Only after you vote does Winnow tell you which prompt you got. |
| 5 | IN | Diagram: browser, route, Flagsmith, model, second route, Experimentation | Here is where the vote goes. The browser calls one route. It checks the cookie, asks Flagsmith which prompt this visitor gets, and Flagsmith records the exposure. The vote comes back to a second route with a signed token, and goes to Flagsmith as an event, under the same identity. |
| 6 | US | Real responses from the running app: two refusals and one success | Voting is public, so we assumed someone would cheat. A vote on someone else's roast is refused. So is a vote with no cookie, and a request from another website. These are real responses from the running app. |
| 7 | IN | The real setup run on the winnow project, as it printed | Here is the real setup run on our Flagsmith project. The warehouse is connected, the flag and its prompts exist, the metrics are in, and the experiment is created, number 1048, but not started. |
| 8 | US | The race page and its rule | Before any data came in, we fixed the rule. A prompt ships only with a ninety percent chance of beating control, and thirty visitors in every arm. Simulated data can never ship. |
| 8R | US | (when results exist) the race page with real numbers | **RESULTS:** After N visitors, X is at Y percent to win. |
| 9 | IN | The approval code and the passing tests | When a prompt qualifies, a person approves it by typing its name. Flagsmith then ends the experiment and rolls the winner out through the same flag, with no redeploy. |
| 10 | US | Two columns: proven, and not yet | Here is what is proven, and what is not. Twenty-three tests pass, the whole flow ran in a browser, and setup ran on our real Flagsmith project. Not yet: events from the live site, a real result, and shipping a winner for real. We would rather say that than invent a number. |
| 11 | IN | Three numbers counted up from the repository | More than a hundred commits, twenty-three tests, and eighteen safety controls, each with its proof beside it. |
| 12 | US | The wordmark, the repo link, the credits | And the whole pattern fits in ten lines, in a small library called Winnow Kit. Winnow. Let your users pick the winning prompt. |

End card credits: music by Sascha Ende, ende.app (CC BY 4.0); voices by ElevenLabs; the app was filmed in preview mode,
where roasts are marked `[preview]`.

## Rules for this video

- Every screen is the real app, real command output or real code. No invented numbers, testimonials or dashboards.
- The counts in scene 11 are read from the repository when the video is rendered. The words say "more than a hundred commits, twenty-three tests, eighteen controls", so re-voice scene 11 if those change.
- Scene 7 shows the output of the real setup run on 27 Nov, retyped from the terminal (`video/evidence-setup.txt`), with the client environment key replaced by a placeholder.
- Preview-mode roasts keep their `[preview]` label. Re-record scenes 3–4 against the deployed app once it exists.
- No keys, cookies, account URLs or personal data on screen. The signed roast ID is shortened in the evidence scene.
