# Submission answers

Text for each field of the hackathon form, in the form's order. Nothing in this file needs editing: where a field needs something
that doesn't exist until you have it (a video link, the results), the entry says exactly where it comes from. The form can be
edited until the deadline.

## Part 1: project details

**Project title**

Winnow

**Which tracks are you entering?**

Track 1, Test Something Real. Only that one. Track 2 (an agent that works with Flagsmith) would be a stretch for a set of
setup scripts, Track 3 needs self-hosted Flagsmith, and Track 4 needs an agent skill with a token count. We have none of those.

**Demo video** (under 3 minutes, YouTube or Loom, public or unlisted)

Upload `video-output/winnow-demo.mp4` (built by `node video/assemble.mjs`, 2:46) to YouTube as Unlisted or to Loom, and paste that
link into the form. The link goes in the form only, not in this repository.

**GitHub repository**

https://github.com/Ankur17nith/Winnow

**Live demo or deployment**

https://winnow-drab.vercel.app, provided `npm run smoke -- https://winnow-drab.vercel.app` ends with `All checks passed.` The app
now picks a model your LLM key can use when the default isn't available, so a redeploy normally clears the 404 the first run showed.
If the roast check still fails, leave this field blank rather than submit a site that errors.

**What did you build, and what problem does it solve?**

Winnow is a README roaster that doubles as a live A/B test of LLM prompts. A visitor pastes a README, or a public GitHub link,
and gets a roast written by one of three system prompts: friendly, savage, or actionable. A Flagsmith multivariate flag picks the
prompt, and the visitor never sees which one. They vote grain (worth keeping) or chaff (toss it), and only then are they told which
prompt they got.

The problem is how teams choose prompts. Most pick them by feel, changing one means a redeploy, and nobody measures which version
people prefer. Winnow puts the prompt behind a feature flag, so the prompts are the variants and the vote is the metric.

**Who would use it, and how does it work?**

Anyone shipping an LLM feature who wants to compare prompts on real users, especially small teams that already use feature flags.
The roaster is the live example. The same pattern is packaged as `winnow-kit`, a small library: pick a prompt from a flag, track an
outcome, flush.

It is a Next.js app. On the server, Flagsmith's Node SDK `getExperimentFlag` records the exposure and returns the prompt, which is
the variant's value (remote config). The vote comes back carrying a signed token and goes to Flagsmith as `thumbs_up` or
`thumbs_down` under the same anonymous identity. Flagsmith Experimentation then gives each prompt's chance of beating control.

The rule for shipping a winner was written down and hashed before any data existed (`prereg/experiment-1.md`, tag `prereg-exp1`):
a treatment needs at least a 90% chance of beating control and every arm needs 30 visitors. A winner is shipped by ending the
experiment with a rollout decision, and only after a person types its name. Setting up, reading results and shipping run through the
Flagsmith CLI on a developer's machine, so the deployed app holds no admin key.

**Which parts of Flagsmith did you use?**

Tick these six:

| Part | How it is used |
|---|---|
| Feature flags | `roast_prompt` (multivariate) and `roasts_enabled` (a kill switch), read on the server with the Node SDK |
| Experimentation (A/B tests) | one experiment on `roast_prompt`, id 1048, with three metrics; exposures from `getExperimentFlag`, conversions from `trackEvent` |
| Remote config | each variant's value is the prompt text, and the app uses it as the system prompt (the safety rules are added by the app) |
| Flagsmith CLI | `npm run setup:flagsmith`, `results` and `ship` all run through it |
| Flagsmith API | the scripts call the Admin API with `flagsmith api` for metrics, the experiment, results and ending the experiment |
| Flagsmith Cloud | the `winnow` project on Flagsmith Cloud, with its managed warehouse |

Do not tick Segments, Flagsmith MCP server or Self-hosted Flagsmith. Winnow does not use them. Tick Remote config only after you have
confirmed it end to end: edit a variant's value in Flagsmith, roast again, and check the style changes. Until then the prompts are
stored as flag values, but the live read of them is unverified.

## Part 2: Track 1, Test Something Real

**Walk us through your experiment**

Hypothesis, registered and hashed before any data (`prereg/experiment-1.md`): the actionable prompt, a scorecard plus three
prioritised fixes, is liked more often than the friendly control prompt. The savage prompt is tested against the same control with no
prediction.

Variants: one multivariate flag, `roast_prompt`, with three arms. The value of each variant is the prompt text, and control is the
flag's own value: `control` (friendly), `savage`, `actionable`.

Split: about 34 / 33 / 33, with 100% of visitors enrolled, done by Flagsmith's experiment bucketing.

Metrics and events: the primary metric, "Roast liked", is the event `thumbs_up`. "Roasted again" is `roast_again`, a second roast by
the same visitor, which fires early in a visit. "Roast requested" is `roast_requested`, a sanity check that fires for every roast.
Every event uses the same anonymous identity as the exposure.

Results: paste the "Results paragraph" that `npm run finalize` prints (the same text is committed in
[RESULTS.md](RESULTS.md)). It gives the visitors per arm, the like rate for each arm, each treatment's chance of beating control with
its interval as Flagsmith reports them, what the pre-set rule decided, and how much of the traffic was simulated. If there is no clear
winner, it says so.

**Experiment results** (up to three images, 5 MB each, no keys visible)

1. Flagsmith's results page for experiment 1048.
2. The experiment's setup: the flag with its variants, and the three metrics.
3. The live `/race` page, showing the like rate and the chance to beat control for each prompt.

Take them after `npm run finalize` has run, so the pictures and the pasted text agree.

## Part 3: feedback

**What did you like about Flagsmith, and what would you improve?**

What worked: the CLI is scriptable. `flagsmith api <path> -X POST --input -` with `--json` let us create the flag, keyed variants,
metrics and experiment from one script and run it again safely. `getExperimentFlag` records the exposure by itself, which kept the
experiment code small. The free plan included Experimentation and a warehouse. The results API returns the Bayesian numbers
(chance to win, lift, a 95% interval, and a sample-ratio p-value), so we could show them instead of recomputing them.

What got in the way: first, the CLI prints some success messages to stderr with an empty stdout, and at least one real error (no OS
keychain) to stderr with exit code 0, so a script can't tell success from failure by the exit code. Our first live run stopped on a
success message. Second, we couldn't find the shape of the results response documented, or what `chance_to_win` means (each treatment
against control, with nothing for control). We worked it out from another team's repository, after first assuming it meant the chance
of being best of all arms. Third, we'd like docs showing the experiment's `complete` call with a rollout decision for a variant other
than control.

What we'd want next: a documented results schema, consistent CLI exit codes, and an `experiment` command group in the CLI (create,
start, results, complete) so scripts don't need raw API calls.

## The team

Ankur17nith.
