# Winnow

[![CI](https://github.com/Ankur17nith/Winnow/actions/workflows/ci.yml/badge.svg)](https://github.com/Ankur17nith/Winnow/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue)](LICENSE)
[![Tests](https://img.shields.io/badge/tests-22%20passing-brightgreen)](#tests-and-checks)
[![Flagsmith](https://img.shields.io/badge/built%20with-Flagsmith%20Experimentation-7b5cff)](https://docs.flagsmith.com/experimentation)
[![Hackathon](https://img.shields.io/badge/WeMakeDevs%20x%20Flagsmith-Track%2001%3A%20Test%20Something%20Real-black)](https://www.wemakedevs.org/hackathons/flagsmith)

**Let your users pick the winning prompt.**

![Winnow home page: "Paste your README. Get roasted." with the README input and the winnowing basket](docs/assets/home.png)

Winnow is a README roaster that runs a real A/B test on LLM prompts. Every visitor silently gets one of three roast
prompts from a multivariate Flagsmith flag. They vote **grain** (keep it) or **chaff** (toss it), and Flagsmith's Bayesian
engine says which prompt wins. The winner ships through the same flag, with no redeploy, and only after a human approves it.

- Source: https://github.com/Ankur17nith/Winnow
- Live demo: *not deployed yet* (see [Status](#status))
- The race page, `/race`: each prompt's like rate and Flagsmith's chance that it beats control, from the latest results snapshot
- `winnow-kit`: [kit/README.md](kit/README.md), A/B test your own prompts in about ten lines

**What runs where:** the app is a single Next.js service. Flagsmith Cloud holds the flags, events and experiment. A free-tier
LLM (Groq) writes the roasts. Nothing else is involved: no database, no accounts, no admin key in the app.

**Contents:** [Status](#status) · [Verify it yourself](#verify-it-yourself-in-5-minutes) · [What's new](#whats-new-here) ·
[The problem](#the-problem) · [How it works](#how-it-works) · [The experiment](#the-experiment) ·
[Why it needs Flagsmith](#why-it-needs-flagsmith) · [All the commands](#all-the-commands) · [Safety model](#safety-model) ·
[Tests and checks](#tests-and-checks) · [Limitations](#limitations) · [Documentation](#documentation) · [The code](#the-code) · [Built with](#built-with)

| At a glance | Value | Source |
| --- | --- | --- |
| Automated tests, all passing | 22 | `npm test` |
| Prompt variants under test | 3 (`control`, `savage`, `actionable`) | [lib/prompts.ts](lib/prompts.ts) |
| Metrics | `thumbs_up` (primary), `roast_again` (fires early in a visit), `roast_requested` (sanity check) | [docs/experiment-design.md](docs/experiment-design.md) |
| Decision rule, fixed in advance | a treatment needs at least a 90% chance of beating control and every arm needs 30 visitors | [lib/decision.ts](lib/decision.ts) |
| Real experiment results | **none yet**: the experiment has not been started | see [Status](#status) |

## Status

As of Thu 26 Nov. The evidence for each line is in [docs/STATUS.md](docs/STATUS.md); the steps that need accounts are in
[docs/human-runbook.md](docs/human-runbook.md).

| Part | State |
| --- | --- |
| Backend: identity, flags, prompts, limits, LLM client, roast and feedback routes | Built, unit-tested, run end to end in preview mode |
| Frontend: threshing-floor design, roaster, reveal after vote, copy, share card, race page | Built, checked in a real browser on desktop and phone |
| Scripts: one-command Flagsmith setup, smoke test, results snapshot, approval-gated ship, simulator | Built. `setup:flagsmith` checked in dry-run; `smoke` 9/9 against a production build; the decision rule is unit-tested; `results` needs a live experiment |
| `winnow-kit` | Built, unit-tested |
| Security headers, origin check, size and rate limits | Built, checked against a production build |
| Flagsmith flag, metrics and experiment | **Not created yet**: one command, `npm run setup:flagsmith` (needs the account) |
| Run with real Flagsmith and LLM keys | **Not done yet** |
| Deploy, real traffic, winner | **Not done yet** |
| Demo film | **Not recorded yet** |

Unproven until the first real run, in order of risk: a warehouse connection, events arriving from a Vercel function, the
exact JSON the CLI and the results API return, and the default Groq model. Each one stops loudly rather than guessing;
the full list is in [docs/STATUS.md](docs/STATUS.md).

## Verify it yourself in 5 minutes

No keys needed.

```bash
npm install
npm test                       # 22 tests
npm run lint                   # type check
WINNOW_PREVIEW=1 COOKIE_SECRET=any-long-secret-here npm run dev
```

Open http://localhost:3000, paste any README, click **Roast it**, then vote. Preview mode uses canned roasts marked
`[preview]` and sends nothing anywhere. To see the reveal panel and the race page with standings, put a results snapshot
at `data/results.json` (shape in [lib/standings.ts](lib/standings.ts)).

To see every Flagsmith call the setup would make, without an account:
`npm run setup:flagsmith -- --environment demo --dry-run`.

To see the approval gate: write a snapshot where one variant has at least a 90% chance of beating control and at least 30 visitors
per arm, then run `npm run ship -- --dry-run`. It prints the exact `flagsmith flag update` command and never runs it.

## What's new here

- **The decision rule is pre-registered and hashed.** `prereg/experiment-1.md` is written before any data, hashed, and tagged;
  the experiment's hypothesis in Flagsmith is its text word for word, and the setup refuses to start an experiment whose
  file has changed since it was hashed. The habit comes from a teammate's repo, [Fork in the Bill](https://github.com/Prashant-thakur77/fork-in-the-bill).
- **An AI judge, kept honest.** Before any visitor, an LLM scores what each prompt produces on six sample READMEs; afterwards `/race`
  shows whether the judge's favourite matched the visitors'. It is labelled as not Flagsmith data, cannot ship anything, and
  says that three prompts make one comparison, not a measure ([docs/judge.md](docs/judge.md)).
- **Prompts are Flagsmith remote config.** The prompt text lives in the flag's variant values, so a prompt can be edited, or
  a fourth one added, in Flagsmith with no deploy. The safety rules are appended by the code and are not part of the flag,
  so a bad value can change the style of a roast but never remove them.
- **The results check themselves.** `/race` runs a sample-ratio-mismatch test on the exposures (did the arms fill in the
  proportions asked for?) and explains the numbers in plain English, caveats included.
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
   ▲                                   1. guard: same-origin, body size
   │                                   2. signed anonymous identity cookie
   │                                   3. roasts_enabled? (kill switch)
   │                                   4. per-IP and per-visitor daily caps
   │                                   5. getExperimentFlag("roast_prompt", identity)   exposure recorded
   │                                   6. LLM call; README is untrusted data in <readme> tags
   │   { roast, roastId }              7. roast_requested, roast_again; flush events
   └───────────────────────────────       the variant stays hidden
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
| Metrics | `thumbs_up` (primary), `roast_again` (early signal), `roast_requested` (sanity check). `thumbs_down` is a guardrail, `copy` secondary |
| Split | about 34 / 33 / 33, 100% of visitors enrolled |
| Identity | signed anonymous cookie, the same ID for exposure and conversion |
| Decision rule | ship a treatment at a 90% chance of beating control with 30 visitors in every arm, otherwise keep control and report "no clear winner". Registered in [prereg/experiment-1.md](prereg/experiment-1.md) |

Statistical caveats (peeking, three arms, self-selected voters) are written down in
[docs/experiment-design.md](docs/experiment-design.md).

## Why it needs Flagsmith

- The multivariate flag **is** the product: the prompts themselves are the variants' values (remote config), not a code branch.
- Exposure and conversion events go through the Flagsmith SDK into Experimentation, which computes each prompt's chance of beating control.
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
| `npm run ship -- --environment <key> --experiment <id> [--dry-run]` | Apply the decision rule; end the experiment and roll the winner out only after a human types its name |
| `npm run judge` | The AI-judge bench: an LLM scores each prompt's roast of six sample READMEs, shown on `/race` ([docs/judge.md](docs/judge.md)) |
| `npm run prereg -- hash` / `verify` | Hash the pre-registration, and check it has not been edited since |
| `npm run setup:flagsmith -- --environment <key> [--dry-run] [--start <id>]` | Create flags, metrics and the experiment in one go; `--start` starts it |
| `npm run smoke -- <url>` | Nine checks against a running app: pages, headers, a refused cross-site POST, a roast, a vote, the share card |

Environment variables are listed in [.env.example](.env.example). The order to run these in, with expected output, is
[docs/human-runbook.md](docs/human-runbook.md).

## Safety model

Full list, with the test behind each control, in [docs/safety.md](docs/safety.md). In short:

- **No admin keys in the app**, only the server-side environment key and the LLM key.
- **Untrusted input:** READMEs are capped at 12,000 characters, wrapped in tags the prompts treat as data, and output is
  rendered as plain text. Repo links accept only `https://github.com/<owner>/<repo>` (no SSRF).
- **Identity and votes:** HMAC-signed, HTTP-only cookie; a vote needs a signed, expiring roast token that matches the cookie.
- **Abuse:** same-origin check, request size limit, per-visitor and per-IP daily caps, and the `roasts_enabled` kill switch.
- **Headers:** strict Content-Security-Policy, `X-Frame-Options: DENY`, `nosniff`, referrer and permissions policies.
- **Honesty:** simulated data is always labelled and can never ship a prompt; unknown variants fall back to `control`.

## Tests and checks

- `npm test`: 22 tests covering identity signing and tamper rejection, token expiry, prompt fallback and remote prompts, the
  URL allow-list, length and per-IP caps, request guards, the decision rule, the results adapter, the split check, the
  plain-English explanation and `winnow-kit`.
- `npm run lint` and `npm run build` run in [CI](.github/workflows/ci.yml) on every push.
- `npm run smoke` against a production build: 9 of 9.
- Manual, done: the full roast, vote and reveal flow in a real browser (desktop and phone width), the production build's
  headers, and a refused cross-site POST.
- Not covered by automated tests: the route handlers and the UI. They were exercised in preview mode and by the smoke test.

## Limitations

- **No real results yet.** The experiment has not been run, so Winnow makes no claim about which prompt wins.
- **Small sample expected.** A short window gives wide uncertainty, and three arms need more traffic than two.
- **Voting is self-selected and gameable.** Only people who click are counted, and clearing cookies gives a new identity.
  Per-IP caps reduce this but do not remove it. Treat results as indicative.
- **Rate limits are in memory,** so on serverless they are best effort. The kill switch is the hard stop.
- **Standings are a snapshot.** The deployed app reads the committed `data/results.json`, so it updates when you refresh
  and redeploy, not live.
- **The free LLM tier** can run out. The app then shows a friendly message instead of a roast.

## Documentation

| Read this when | File |
| --- | --- |
| You want to know what is proven and what is not | [docs/STATUS.md](docs/STATUS.md) |
| You are deploying it | [docs/human-runbook.md](docs/human-runbook.md) |
| You want the experiment's exact design and caveats | [docs/experiment-design.md](docs/experiment-design.md) |
| You want every safety control and its proof | [docs/safety.md](docs/safety.md) |
| You want to know why the code is the way it is | [docs/LEARNINGS.md](docs/LEARNINGS.md) |
| Everything else | [docs/README.md](docs/README.md) |

## The code

```
app/                 pages (landing, race), API routes (roast, feedback, card), error and 404 pages
components/          Roaster (the tool), Art (basket, kernels, stamps, sieve ring)
lib/                 flagsmith client, identity, prompts, limits, guard, llm, engagement, decision, results, standings, preview
scripts/             setup-flagsmith, smoke, fetch-results, ship-winner, simulate-traffic, the Flagsmith CLI wrapper
kit/                 winnow-kit and its README
test/                unit tests
docs/                index, status, runbook, experiment design, safety, architecture, learnings, questions, design, demo, submission
.github/             CI, pull request and issue templates
```

## Built with

Next.js, React, TypeScript, [Flagsmith](https://flagsmith.com) Cloud with the Node SDK (`@flagsmith/nodejs`) and CLI, Groq
for the LLM, and plain CSS with Archivo, Martian Mono and IBM Plex Mono (all OFL). The visual language is adapted from
[Lifeline](https://github.com/Prashant-thakur77/LifeLine) (MIT).

## Team

**[Ankur17nith](https://github.com/Ankur17nith)**: creator and main contributor

## Licence

MIT. See [LICENSE](LICENSE).
