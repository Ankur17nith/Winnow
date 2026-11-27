# Status: Thu 26 Nov 2026

The application is finished and tested without keys. Nothing has run against a real Flagsmith experiment or a real LLM
yet, so no result exists. The steps that need accounts are in [human-runbook.md](human-runbook.md).

## What works (verified in the build sandbox)

| Area | Evidence |
|---|---|
| Identity, roast tokens, limits, request guards, decision rule, results adapter, `winnow-kit` | 17 unit tests, `npm test`, all passing on 27 Nov |
| Types and production build | `npm run lint` (tsc) and `npm run build` clean; the same steps run in [CI](../.github/workflows/ci.yml) |
| The whole visitor flow: paste, roast, vote, reveal, copy, share card | Driven in headless Chromium against a production build in preview mode, at 1280 and 390 px wide; no console errors |
| Security headers and the content-security-policy | `curl -I` on a production build shows CSP, `X-Frame-Options: DENY`, `nosniff`, referrer policy; the page renders under them with no CSP violations |
| Cross-site POSTs are refused | `curl` with `Origin: https://evil.com` gets 403 from `/api/roast` |
| `npm run smoke` | 9 of 9 checks pass against a local production build (preview mode) |
| `npm run ship` | `--dry-run` prints the right `flagsmith flag update --weight` command; typing anything but the winner's name cancels; simulated data never ships (unit test) |
| `npm run setup:flagsmith` | `--dry-run` prints every CLI call and JSON body; the bodies match the format in Flagsmith's own coding-agent setup prompt |
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
3. **The CLI's JSON shapes.** The setup script reads ids out of `feature get --json` and the metric and experiment
   responses. It looks for them defensively and stops naming the keys it saw if they are not there.
4. **The results response.** `lib/results.ts` accepts a few likely field names and fails loudly with the keys it saw
   otherwise. Expect one small fix on the first real `npm run results`.
5. **The default Groq model** (`llama-3.3-70b-versatile`). If roasts fail, set `LLM_MODEL` to one listed in the Groq
   console.
6. **Traffic.** The track allows simulated traffic. Real visitors make a better story and are not guaranteed.

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
