# Changelog

Dates are UTC. Versions are this repository's own; they are not published anywhere.

## v0.10.0 — 27 Nov 2026 (the home page shows the experiment)

Added
- **The live floor in the hero**: three baskets with piles as tall as each prompt's like rate and, under each treatment, its chance of
  beating control, from the same snapshot as `/race`; an empty state when there are no results. On narrow screens it moves below the input.
- **Your vote lands**: a kernel flies from the stamp to the prompt you tasted. The roast wipes in. A strip of paper waves sits under
  the hero. All of it respects reduced motion and moves by transform and opacity only.

Changed
- The headline is smaller inside the two-column hero so it stays on three lines; the footer is full-bleed; on phones the nav hides
  its first button instead of wrapping onto the logo.
- The README's home-page image and the deck were rebuilt from the new page, in its empty state (what a deployment shows today).

## v0.9.0 — 27 Nov 2026 (an AI judge)

Added
- **The AI-judge bench** (`npm run judge`, `lib/judge.ts`, `bench/readmes/`): an LLM scores each prompt's roast of six sample
  READMEs from 1 to 5 on being specific, useful and civil. `/race` shows the scores, labelled as not Flagsmith data, and, once
  visitors' results exist, whether the judge's favourite matched theirs, with the caveat that three prompts make one
  comparison. A reply the judge gives that can't be scored is counted as unscorable and left out of the averages. `JUDGE_MODEL` judges with a different model.
- Preview mode writes labelled stand-in numbers, so the layout can be seen without a key. 3 more tests (22 in total).
- `docs/judge.md`: what it is, why it is worth having, and what it cannot tell you.

## v0.8.0 — 27 Nov 2026 (results read the way Flagsmith reports them, and a pre-registration)

Fixed
- **"Win probability" meant the wrong thing.** Flagsmith reports each treatment's chance of beating control and gives control
  none; Winnow had treated it as each prompt's chance of being the best. The results adapter, the decision rule, the plain-English
  explanation, `/race`, the reveal panel and the deck now use the real meaning: piles show the observed like rate, treatments
  show their chance of beating control, control is the baseline, and only a treatment can ship.
- The setup script reads variant ids from `feature variant list`, tells "not found" from a real failure, sends a metric
  `description`, and pages metrics at 999, as a live-tested teammate's scripts do.

Added
- **A pre-registration** (`prereg/experiment-1.md`), a hash tool (`npm run prereg -- hash | verify`), and a setup that sends
  the registered hypothesis to Flagsmith verbatim and refuses to start an experiment whose file changed after hashing.
- Flagsmith's own sample-ratio p-value is read from the results and shown next to ours.
- `npm run ship` ends the experiment with `rollout_decision=<winner>`; only `control` has been seen to work, so a rejected key
  stops with Flagsmith's error. Two more tests (19 in total), including a fixture of the live results shape.

## v0.7.0 — 27 Nov 2026 (remote prompts and results that check themselves)

Added
- **Remote config.** The prompt text is now the flag's variant values. `npm run setup:flagsmith` writes them, and the app
  uses a variant's value as the system prompt, so a prompt can be edited or a new arm added in Flagsmith with no deploy.
  The safety rules are appended by the code and are not part of the flag; an unusable value (too short, too long, not a
  string, or just a variant name) falls back to the copy in code.
- **A split check** (`lib/srm.ts`): a sample-ratio-mismatch test on the exposures, shown on `/race`. A broken split quietly
  invalidates an A/B test, so it is flagged before any result is believed.
- **A plain-English explanation** (`lib/explain.ts`) of the results on `/race`: who leads, by how much, the sample, what the
  pre-set rule says, and the caveats. No model; every sentence comes from the numbers.
- 4 more tests (17 in total). A section in `docs/submission.md` listing exactly which Flagsmith parts are used.

Changed
- `pickVariant` returns the variant key and its value. `docs/safety.md` has two new controls and one new known gap: whoever
  can edit the flag controls the prompt's style.

## v0.6.0 — 26 Nov 2026 (demo video and deck)

Added
- **A demo video pipeline** (`video/`): a script, an ElevenLabs voiceover builder with clips cached by content, a frame
  renderer that films the real app in preview mode, and an assembly step that mixes low music under the voice and
  normalises loudness. Two voices alternate, an American English one and an Indian English one.
- **Scenes built from the app's own output**: a diagram of where the vote goes, lit node by node as it is spoken; the app's
  actual responses to a forged vote, a vote with no cookie and a cross-site request (`video/evidence.sh`); a "proven, and
  not yet" slide; repository counts read from git when the video is rendered.
- **A pitch deck** (`presentation/deck.cjs`), built from the app's own stylesheet and printed to a 16:9 PDF.

Changed
- `docs/demo-script.md` now points at `video/script.md`, the only copy of the words.

## v0.5.0 — 26 Nov 2026 (ready to launch)

Added
- **`npm run setup:flagsmith`.** One command creates everything in Flagsmith: it checks for a warehouse first, then
  creates `roast_prompt` with keyed `savage` and `actionable` variants, the `roasts_enabled` kill switch, three metrics,
  and the experiment, **not started**. `--dry-run` prints every call and body; `--start <id>` starts it after the smoke
  test. Re-running reuses what exists.
- **`npm run smoke -- <url>`.** Nine checks against a running app: home, race and 404 pages, the CSP and frame headers,
  a refused cross-site POST, a real roast, a vote with its reveal, and the share card. It warns if preview mode is on,
  because then nothing reached Flagsmith.
- The rehearsal simulator now sends `roast_requested` and `roast_again` as well as votes.
- Documentation rebuilt around who reads it: an index, a dated status page with evidence, a learnings log, open
  questions, a safety table where every control names its proof, and a runbook with expected output.

Changed
- `package.json` is `"type": "module"`, which stops Node re-parsing every script as ESM. Node 22 or later is declared.

## v0.4.0 — 23 Nov 2026 (a metric that fires early)

Added
- **`roast_again`**: the same visitor asks for a second roast. It fires early in a visit and depends on how good the first
  roast was, which is what the track's tip asks for.
- **`roast_requested`**: fires for every served roast. Kept as a sanity check only. The exposure is recorded at the same
  moment, so it is near 100% in every arm and cannot separate the prompts; the docs say so wherever it appears.

## v0.3.0 — 18 Nov 2026 (hardening)

Added
- A same-origin check and a 40 KB body limit on both POST routes; a per-IP daily cap in front of the per-visitor cap,
  which clearing cookies used to reset.
- A content-security-policy that allows only our own origin, `X-Frame-Options: DENY`, `nosniff`, a referrer policy and a
  permissions policy.
- Themed 404 and error pages, social-card metadata, CI (type check, tests, build) and `SECURITY.md`.

## v0.2.0 — 18 Nov 2026 (the experiment around the app)

Added
- **Reveal after vote**: the variant and the standings are shown only once the vote is cast.
- **`/race`**: a pile of grain per prompt, its win probability, and the decision rule's current verdict.
- **The decision rule** (`lib/decision.ts`): 90% win probability and 30 visitors in every arm, fixed before any result
  existed. Simulated data can never qualify.
- **`npm run ship`**: applies the rule and changes the flag only after a person types the winner's name.
- **`npm run results`**: writes `data/results.json` from Flagsmith; stops with an error naming the keys it saw if the response
  is shaped differently from what `lib/results.ts` expects.
- **`npm run simulate`**: rehearsal visitors named `sim_*`.
- **`winnow-kit`**: the pattern as a library, with its own tests and README.
- A copy button with a `copy` event, a shareable roast card image, and `/?repo=` links that pre-fill a repository.
- **Preview mode** (`WINNOW_PREVIEW=1`): the whole app with no keys and no outbound calls.

Fixed
- Preview mode used to find its canned roast by a `[variant]` tag in the system prompt, which would have been sent to the
  real model too. It matches the prompt's full text now.
- The CLI wrapper treats "empty output plus an error on stderr" as a failure: the CLI can fail and still exit 0.
- Race piles looked equal at 20 kernels; the "Repo link" toggle wrapped on phones.

## v0.1.0 — 18 Nov 2026 (the app)

Added
- The roaster: a signed anonymous identity, `roast_prompt` deciding between three system prompts, a Groq client, the
  roast and feedback routes, `thumbs_up` and `thumbs_down` events, input limits and a GitHub-only URL allow-list.
- The paper threshing-floor design: hand-drawn SVG basket, kernels, chaff, stamps and sieve ring; Archivo, Martian Mono
  and IBM Plex Mono; motion that collapses under reduced motion.
- The first docs: plan, architecture, experiment design, Flagsmith setup, build guide, design system, demo script.

Fixed
- `@flagsmith/nodejs` 9.4 has a named export, not a default one.
