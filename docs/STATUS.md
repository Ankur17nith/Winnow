# Status: Thu 26 Nov 2026

The application is finished and tested without keys. Nothing has run against a real Flagsmith experiment or a real LLM
yet, so no result exists. The steps that need accounts are in [human-runbook.md](human-runbook.md).

## What works (verified in the build sandbox)

| Area | Evidence |
|---|---|
| Identity, roast tokens, limits, request guards, decision rule, results adapter, `winnow-kit` | 22 unit tests, `npm test`, all passing on 27 Nov |
| Types and production build | `npm run lint` (tsc) and `npm run build` clean; the same steps run in [CI](../.github/workflows/ci.yml) |
| The whole visitor flow: paste, roast, vote, reveal, copy, share card | Driven in headless Chromium against a production build in preview mode, at 1280 and 390 px wide; no console errors |
| Security headers and the content-security-policy | `curl -I` on a production build shows CSP, `X-Frame-Options: DENY`, `nosniff`, referrer policy; the page renders under them with no CSP violations |
| Cross-site POSTs are refused | `curl` with `Origin: https://evil.com` gets 403 from `/api/roast` |
| `npm run smoke` | 9 of 9 checks pass against a local production build (preview mode) |
| `npm run ship` | `--dry-run` prints the right `flagsmith flag update --weight` command; typing anything but the winner's name cancels; simulated data never ships (unit test) |
| `npm run setup:flagsmith` | `--dry-run` prints every CLI call and JSON body; the bodies match the format in Flagsmith's own coding-agent setup prompt |
| Home page: live floor in the hero, wave strip, roast wipe, vote landing | Rendered in headless Chromium at 1440 and 390 px with a simulated snapshot and with none; no console errors, no horizontal overflow on mobile; the kernel flight was observed in flight in screenshots taken during the animation |
| Remote prompts, split check, plain-English explanation | Unit-tested (`resolvePrompt`, `splitCheck`, `explain`); the race page rendered in Chromium with a simulated snapshot showing the explanation and a passing split check |
| Flagsmith SDK calls | `getExperimentFlag`, `trackEvent`, `flushEvents`, `close` and `Flag.variant` read from `@flagsmith/nodejs` 9.4.0's type definitions |
| Flagsmith CLI commands | Every command the scripts run was checked against the CLI's own `--help` (v2, installed from npm in the sandbox) |

## The Flagsmith account (18 Nov, from the dashboard)

| What | State |
|---|---|
| Organisation `winnow`, project `winnow`, environment Development | created |
| Experiments and Metrics in the environment menu | present: Experimentation is available on this account |
| Warehouse connection | **not checked yet** |
| Flags, metrics, experiment | **not created yet** (one command: runbook §2) |

## What is NOT verified, because it needs an account or a person

These are not known to be broken. They are unproven. In order of risk:

1. **A warehouse connection.** Without one, experiments record nothing. `npm run setup:flagsmith` checks first and stops
   with the docs link if there is none.
2. **Events from a Vercel function.** The SDK buffers events; each route calls `flushEvents()` before it returns, but a
   frozen serverless function could still drop them. Runbook §4 is the test: one smoke run, then look for the exposure
   and the `thumbs_up` in the dashboard before starting the experiment.
3. **The CLI's JSON shapes.** The setup script reads variant ids from `feature variant list --json` and ids from the metric
   and experiment responses, the same calls a teammate's repo uses against a live account. It stops naming the keys it saw
   if they are not there.
4. **The results response, on this account.** `lib/results.ts` reads the shape documented from a live response in a teammate's
   repository (`results.payload.metrics[]` with `variants{n,sum}` and `inference{chance_to_win,lift,ci_low,ci_high}`,
   `chance_to_win` being each treatment's chance of beating control). It is tested against a fixture of that shape, not yet
   against this project's own experiment. It fails loudly, naming the keys it saw, if they differ.
5. **Ending the experiment with a winner.** `npm run ship` calls `.../complete/` with `rollout_decision=<winner key>`.
   Only `rollout_decision=control` has been seen to work (a teammate's smoke test). If a treatment's key is rejected the
   script stops with Flagsmith's error; the fallback is `flag update --weight` after ending the experiment in the dashboard.
6. **Remote prompts through the real SDK.** The app assumes `getExperimentFlag` returns the allocated variant's value in
   `flag.value` and its key in `flag.variant`, and that the control group has no variant key. This is read from the SDK's
   type definitions, not seen against a live experiment. If it is wrong the app falls back to the prompts in code and the
   roasts still work, but the flag's values would not be what is being tested. Check on the first smoke test: change a
   variant's value in Flagsmith and see the roast style change.
7. **The AI judge against a real model.** `npm run judge` has run only in preview mode. Whether a real judge's replies parse as
   a JSON object with three whole numbers, and how many come back unscorable, is unproven until a run with an `LLM_API_KEY`.
8. **The default Groq model** (`llama-3.3-70b-versatile`). If roasts fail, set `LLM_MODEL` to one listed in the Groq
   console.
9. **Traffic.** The track allows simulated traffic. Real visitors make a better story and are not guaranteed.

## Known limitations (by design, documented)

- Rate-limit counters live in memory. On serverless they are per instance, so best effort. The `roasts_enabled` flag is
  the hard stop.
- Anyone who clears cookies gets a new identity. The per-IP cap narrows this; it does not close it. Results are
  indicative, and the write-up says so.
- The reveal panel and `/race` read a committed snapshot, not live data: they change when `data/results.json` is
  refreshed and the app redeployed.
- `roast_requested` fires for every served roast, so it is near 100% in every arm. It is a sanity check, not a metric
  that can separate the prompts.
- There is no public roast wall. It needed storage and moderation; shareable `/?repo=` links replace it.
