# Changelog

Dates are UTC. Versions are this repository's own; they are not published anywhere.

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
- **`npm run results`**: writes `data/results.json` from Flagsmith; fails loudly, naming the keys it saw, if the response
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
