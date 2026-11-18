# Winnow

[![CI](https://github.com/Ankur17nith/Winnow/actions/workflows/ci.yml/badge.svg)](https://github.com/Ankur17nith/Winnow/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue)](LICENSE)
[![Tests](https://img.shields.io/badge/tests-12%20passing-brightgreen)](#tests-and-checks)
[![Flagsmith](https://img.shields.io/badge/built%20with-Flagsmith%20Experimentation-7b5cff)](https://docs.flagsmith.com/experimentation)
[![Hackathon](https://img.shields.io/badge/WeMakeDevs%20x%20Flagsmith-Track%2001%3A%20Test%20Something%20Real-black)](https://www.wemakedevs.org/hackathons/flagsmith)

**Let your users pick the winning prompt.**

Winnow is a README roaster that runs a real A/B test on LLM prompts. Every visitor silently gets one of three roast
prompts from a multivariate Flagsmith flag. They vote **grain** (keep it) or **chaff** (toss it), and Flagsmith's Bayesian
engine says which prompt wins. The winner ships through the same flag, with no redeploy, and only after a human approves it.

- Source: https://github.com/Ankur17nith/Winnow
- Live demo: *not deployed yet* (see [Status](#status))
- The race page, `/race`: live win probabilities per prompt
- `winnow-kit`: [kit/README.md](kit/README.md), A/B test your own prompts in about ten lines

**What runs where:** the app is a single Next.js service. Flagsmith Cloud holds the flags, events and experiment. A free-tier
LLM (Groq) writes the roasts. Nothing else is involved: no database, no accounts, no admin key in the app.

**Contents:** [Status](#status) · [Verify it yourself](#verify-it-yourself-in-5-minutes) · [What's new](#whats-new-here) ·
[The problem](#the-problem) · [How it works](#how-it-works) · [The experiment](#the-experiment) ·
[Why it needs Flagsmith](#why-it-needs-flagsmith) · [All the commands](#all-the-commands) · [Safety model](#safety-model) ·
[Tests and checks](#tests-and-checks) · [Limitations](#limitations) · [The code](#the-code) · [Built with](#built-with)

| At a glance | Value | Source |
| --- | --- | --- |
| Automated tests, all passing | 12 | `npm test` |
| Prompt variants under test | 3 (`control`, `savage`, `actionable`) | [lib/prompts.ts](lib/prompts.ts) |
| Primary metric | `thumbs_up` (occurrence, direction up) | [docs/experiment-design.md](docs/experiment-design.md) |
| Decision rule, fixed in advance | win probability at least 90% and 30 visitors per arm | [lib/decision.ts](lib/decision.ts) |
| Real experiment results | **none yet**: the experiment has not been started | see [Status](#status) |

## Status

Honest picture of what exists today.

| Part | State |
| --- | --- |
| Backend: identity, flags, prompts, limits, LLM client, roast and feedback routes | Built, unit-tested, run end to end in preview mode |
| Frontend: threshing-floor design, roaster, reveal after vote, copy, share card, race page | Built, checked in a real browser on desktop and phone |
| Scripts: results snapshot, approval-gated ship, rehearsal simulator | Built. `ship` and the decision rule are tested; `results` needs a live experiment |
| `winnow-kit` | Built, unit-tested |
| Security headers, origin check, size and rate limits | Built, checked against a production build |
| Flagsmith flag, metric and experiment | **Not created yet** (needs the Flagsmith account) |
| Run with real Flagsmith and LLM keys | **Not done yet** |
| Deploy, real traffic, winner | **Not done yet** |
| Demo film | **Not recorded yet** |

Two things are unverified until the first real run: the exact JSON shape of Flagsmith's experiment results response
([lib/results.ts](lib/results.ts) fails loudly if it differs), and event delivery from a serverless function.

## Verify it yourself in 5 minutes

No keys needed.

```bash
npm install
npm test                       # 12 tests
npm run lint                   # type check
WINNOW_PREVIEW=1 COOKIE_SECRET=any-long-secret-here npm run dev
```

Open http://localhost:3000, paste any README, click **Roast it**, then vote. Preview mode uses canned roasts marked
`[preview]` and sends nothing anywhere. To see the reveal panel and the race page with standings, put a results snapshot
at `data/results.json` (shape in [lib/standings.ts](lib/standings.ts)).

To see the approval gate: write a snapshot where one variant has at least 90% win probability and at least 30 visitors
per arm, then run `npm run ship -- --dry-run`. It prints the exact `flagsmith flag update` command and never runs it.

## What's new here

- **Reveal after you vote.** You see which prompt you tasted and the live standings only after the vote is cast, so voting
  is a game and the vote is never influenced.
- **The flag ships its own winner.** A script applies a decision rule fixed before looking at results, shows the exact
  change, and ships it only after a human types the winner's name. Simulated data can never trigger a ship.
- **Grain and chaff.** The vote buttons are printed stamps, not emoji. The Flagsmith events stay `thumbs_up` and
  `thumbs_down`.
- **Shareable roast cards** and **roast-my-repo links** (`/?repo=https://github.com/owner/repo`), so only people who ask get
  roasted.
- **`winnow-kit`:** any developer can test their own prompts through Flagsmith without a new dependency.
- **A paper threshing-floor design**, adapted in spirit from [Lifeline](https://github.com/Prashant-thakur77/LifeLine)
  (MIT) and drawn from scratch: custom SVG basket, kernels and chaff, riso-print palette, native scrolling only.

## The problem

Teams shipping LLM features pick prompts by gut feeling. A prompt change needs a redeploy, and nobody can say which
version users actually prefer. Feature flags already solve "ship to some users and measure". Winnow shows that prompts
belong behind a flag too, and runs the proof in public.

## How it works

```
Browser ── POST /api/roast ─────────▶ Next.js route
   ▲                                   1. guard: same-origin, body size, per-IP cap
   │                                   2. signed anonymous identity cookie
   │                                   3. roasts_enabled? (kill switch)
   │                                   4. getExperimentFlag("roast_prompt", identity)   exposure recorded
   │                                   5. variant key -> system prompt
   │   { roast, roastId }              6. LLM call; README is untrusted data in <readme> tags
   └───────────────────────────────    7. flush events; variant stays hidden
Browser ── POST /api/feedback ──────▶ verify signed roast token matches the cookie identity
   ▲                                   trackEvent("thumbs_up" | "thumbs_down" | "copy")   same identity
   └── { variant, standings } ◀─────── reveal after vote; standings read from data/results.json
```

Admin work (creating the experiment, refreshing results, shipping) runs on the developer's machine with the Flagsmith CLI
after `flagsmith login`. The deployed app never holds an admin key. More detail: [docs/architecture.md](docs/architecture.md).

## The experiment

**Question:** do developers want AI feedback kind, brutal or actionable?

| | |
| --- | --- |
| Flag | `roast_prompt`, multivariate, string values, every variation keyed |
| Variants | `control` (friendly), `savage` (comedic and brutal), `actionable` (scorecard plus fixes) |
| Metric | `thumbs_up`, occurrence, direction up. `thumbs_down` is a guardrail and `copy` a secondary signal |
| Split | about 34 / 33 / 33, 100% of visitors enrolled |
| Identity | signed anonymous cookie, the same ID for exposure and conversion |
| Decision rule | ship at 90% win probability with 30 visitors in every arm, otherwise report "no clear winner" |

Statistical caveats (peeking, three arms, self-selected voters) are written down in
[docs/experiment-design.md](docs/experiment-design.md).

## Why it needs Flagsmith

- The multivariate flag **is** the product: prompts live in flag variants, not in a code branch.
- Exposure and conversion events go through the Flagsmith SDK into Experimentation, which computes win probability.
- `roasts_enabled` is a second flag used as a kill switch to protect the free LLM quota.
- Shipping the winner is a flag change (`flag update --weight`), not a deploy.

## All the commands

| Command | What it does |
| --- | --- |
| `npm run dev` / `build` / `start` | Run, build and serve the app |
| `npm test` | Unit tests (identity, prompts, limits, guards, decision rule, results adapter, kit) |
| `npm run lint` | Type check |
| `npm run simulate -- --users 300` | Rehearsal traffic with `sim_` identities (use a separate environment) |
| `npm run results -- --environment <key> --experiment <id> [--simulated]` | Pull results with the Flagsmith CLI into `data/results.json` |
| `npm run ship -- [--dry-run]` | Apply the decision rule; ship only after a human types the winner's name |

Environment variables are listed in [.env.example](.env.example). Flagsmith setup is in
[docs/flagsmith-setup.md](docs/flagsmith-setup.md).

## Safety model

Full list in [SECURITY.md](SECURITY.md). In short:

- **No admin keys in the app**, only the server-side environment key and the LLM key.
- **Untrusted input:** READMEs are capped at 12,000 characters, wrapped in tags the prompts treat as data, and output is
  rendered as plain text. Repo links accept only `https://github.com/<owner>/<repo>` (no SSRF).
- **Identity and votes:** HMAC-signed, HTTP-only cookie; a vote needs a signed, expiring roast token that matches the cookie.
- **Abuse:** same-origin check, request size limit, per-visitor and per-IP daily caps, and the `roasts_enabled` kill switch.
- **Headers:** strict Content-Security-Policy, `X-Frame-Options: DENY`, `nosniff`, referrer and permissions policies.
- **Honesty:** simulated data is always labelled and can never ship a prompt; unknown variants fall back to `control`.

## Tests and checks

- `npm test`: 12 tests covering identity signing and tamper rejection, token expiry, prompt fallback, the URL allow-list,
  length and per-IP caps, request guards, the decision rule, the results adapter and `winnow-kit`.
- `npm run lint` and `npm run build` run in [CI](.github/workflows/ci.yml) on every push.
- Manual, done: the full roast, vote and reveal flow in a real browser (desktop and phone width), the production build's
  headers, and a refused cross-site POST.
- Not covered by automated tests: the route handlers and the UI. They were exercised by hand in preview mode.

## Limitations

- **No real results yet.** The experiment has not been run, so Winnow makes no claim about which prompt wins.
- **Small sample expected.** A short window gives wide uncertainty, and three arms need more traffic than two.
- **Voting is self-selected and gameable.** Only people who click are counted, and clearing cookies gives a new identity.
  Per-IP caps reduce this but do not remove it. Treat results as indicative.
- **Rate limits are in memory,** so on serverless they are best effort. The kill switch is the hard stop.
- **Standings are a snapshot.** The deployed app reads the committed `data/results.json`, so it updates when you refresh
  and redeploy, not live.
- **The free LLM tier** can run out. The app then shows a friendly message instead of a roast.

## The code

```
app/                 pages (landing, race), API routes (roast, feedback, card), error and 404 pages
components/          Roaster (the tool), Art (basket, kernels, stamps, sieve ring)
lib/                 flagsmith client, identity, prompts, limits, guard, llm, decision, results, standings, preview
scripts/             fetch-results, ship-winner, simulate-traffic, Flagsmith CLI helper
kit/                 winnow-kit and its README
test/                unit tests
docs/                plan, architecture, experiment design, Flagsmith setup, implementation guide, design, demo script
.github/workflows/   CI
```

## Built with

Next.js, React, TypeScript, [Flagsmith](https://flagsmith.com) Cloud with the Node SDK (`@flagsmith/nodejs`) and CLI, Groq
for the LLM, and plain CSS with Archivo, Martian Mono and IBM Plex Mono (all OFL). The visual language is adapted from
[Lifeline](https://github.com/Prashant-thakur77/LifeLine) (MIT).

## Team

**[Ankur17nith](https://github.com/Ankur17nith)**: creator and main contributor

## Licence

MIT. See [LICENSE](LICENSE).
