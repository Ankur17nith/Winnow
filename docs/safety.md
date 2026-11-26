# Safety and control

Winnow is a public page that spends a free LLM quota, writes events into an experiment, and can change a production
flag. This document is the complete list of what stops it doing the wrong thing, where each control lives, and what
proves it. Where nothing automated proves a control, the table says so.

## Threat model

A public A/B test can fail in five ways: someone **abuses the endpoint** (spam, cost, a hostile README), someone
**forges or stuffs votes**, the experiment **measures the wrong thing** (mismatched identities, an influenced vote), the
app **leaks a secret**, or a winner **ships on bad evidence**. Each control below closes one of those.

## Controls

| # | Control | Where | Proven by |
|---|---|---|---|
| 1 | **No admin key in the app.** The app holds the server-side environment key and the LLM key, from environment variables, and nothing else. Creating the experiment, reading results and shipping happen on a person's machine through the Flagsmith CLI. | `lib/flagsmith.ts`, `scripts/` | By construction: no code path in `app/` or `lib/` reads an admin key. `.env*` is git-ignored |
| 2 | **The README is data, not instructions.** Capped at 12,000 characters, wrapped in `<readme>` tags, and every prompt tells the model to ignore instructions inside them and never to discuss its rules. Output is rendered as plain text. | `lib/limits.ts`, `lib/prompts.ts`, `components/Roaster.tsx` | `length cap`. The prompt rule and plain-text rendering: by inspection; no test can prove a model obeys |
| 3 | **No SSRF.** Repo-link input accepts only `https://github.com/<owner>/<repo>`; the README is fetched from the GitHub API with an 8 s timeout. Lookalike hosts (`github.com.evil.com`), `http:` and other hosts are refused. | `lib/limits.ts` `parseRepoUrl` | `repo URL allow-list` |
| 4 | **A signed identity.** A random UUID in an HTTP-only, SameSite=Lax, Secure (in production) cookie, signed with HMAC-SHA256. A tampered cookie is treated as no cookie. Signatures are compared in constant time. | `lib/identity.ts` | `identity cookie round-trips and rejects tampering` |
| 5 | **A vote must belong to the voter.** `/api/feedback` needs a signed roast token, issued with the roast, that names the same identity as the cookie and is under an hour old. Anyone else's token, an old one or an edited one is refused. | `lib/identity.ts`, `app/api/feedback/route.ts` | `roast token verifies, expires and rejects tampering`; in the preview run a vote sent without the voter's cookie was refused (400). The mismatched-token path (403) is by reading the route |
| 6 | **One vote and one copy per roast.** Repeats are acknowledged and not sent again. In memory, so best effort; the `occurrence` metric counts an identity once anyway. | `app/api/feedback/route.ts` | Manual (preview run) |
| 7 | **The vote is never influenced.** The variant is signed into the roast token and returned only after the vote is cast. | `app/api/roast/route.ts`, `app/api/feedback/route.ts` | Manual: the roast response carries no variant field |
| 8 | **Exposure only when a roast is served.** `getExperimentFlag` records the exposure, so it runs after every check has passed and immediately before the LLM call. A refused request records nothing. | `app/api/roast/route.ts` | Manual, by reading the route; order is commented in the code |
| 9 | **Same identity for exposure and conversion.** Both use the cookie's identity, so Flagsmith can join them. | `lib/flagsmith.ts`, `kit/winnow-kit.ts` | `kit picks the flag's variant, tracks with the same identity and flushes` |
| 10 | **Cross-site and oversized requests are refused.** If the browser sends an `Origin`, it must match the host; bodies over 40 KB are refused before parsing. | `lib/guard.ts` | `guard: same-origin and body size`; `npm run smoke` (cross-site POST gets 403) |
| 11 | **Caps on cost.** Five roasts per visitor per day and thirty per IP per day, both configurable. In memory, so per serverless instance. | `lib/limits.ts` | `per-IP quota caps a day` |
| 12 | **Kill switch.** `roasts_enabled` off in Flagsmith stops every roast with a 503 and no LLM call. It fails open if Flagsmith is unreachable, so the demo does not go dark by accident. | `lib/flagsmith.ts` `roastsEnabled` | Manual: by reading the route |
| 13 | **A bad flag cannot break the app.** Unknown or missing variant keys fall back to `control`. | `lib/prompts.ts`, `kit/winnow-kit.ts` | `unknown prompt keys fall back to control`; `kit falls back on unknown variants and on errors` |
| 14 | **Headers.** A content-security-policy that allows only our own origin (`frame-ancestors 'none'`, `object-src 'none'`), `X-Frame-Options: DENY`, `nosniff`, a referrer policy and a permissions policy that turns off camera, microphone and location. | `next.config.mjs` | `npm run smoke`; a production build rendered with no CSP violations |
| 15 | **A winner ships only on the rule, and only with a person.** Win probability of at least 90% and at least 30 visitors in every arm, fixed before results existed. Simulated data can never qualify. The script then needs the winner's name typed by hand. | `lib/decision.ts`, `scripts/ship-winner.ts` | `decision: ships only with enough exposures and a clear winner`; `decision: simulated data never ships`; typing anything else cancelled in a manual run |
| 16 | **Nothing is invented.** No results file means no standings. A results response in an unknown shape stops the script and names the keys it saw. Preview roasts are prefixed `[preview]`. | `lib/standings.ts`, `lib/results.ts`, `lib/preview.ts` | `results adapter normalises percentages and fails loudly on unknown shapes` |

## What Winnow deliberately cannot do

- Fetch any URL a visitor gives it, other than a public GitHub repository's README.
- Tell a visitor which prompt they got before they vote.
- Record a vote for a roast that visitor did not receive.
- Ship a prompt on simulated data, on a thin sample, or without a person typing the winner's name.
- Show standings it did not read from Flagsmith.

## Known gaps

- **Cookie clearing.** A visitor who clears cookies is a new identity and can vote again. The per-IP cap limits the
  damage; it does not remove it. Results are reported as indicative.
- **In-memory counters.** On serverless every instance has its own counters. The kill switch is the hard stop.
- **Prompt injection is mitigated, not solved.** The model is told to ignore instructions in the README, and its output
  can only ever be plain text on our own page. It has no tools and no secrets in its context.
- **No automated tests for the route handlers or the UI.** They were exercised end to end in preview mode and by
  `npm run smoke`. Adding route tests is the first thing to do if the project continues.

Reporting a vulnerability: [SECURITY.md](../SECURITY.md).
