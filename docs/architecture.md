# Architecture

One Next.js service, no database. Flagsmith holds the flags, the events and the experiment; Groq writes the roasts. All
Flagsmith calls are server-side through one SDK (`@flagsmith/nodejs`), so the prompts never reach the browser and the
exposure and the conversion always carry the same identity.

## The system

```
                      ┌──────────────────────── Vercel: one Next.js project ────────────────────────┐
Visitor's browser ──▶ │ /            landing + roaster        /race      standings from snapshot    │
                      │ /api/roast   guard → identity → kill switch → limits → variant → LLM        │──▶ Groq
                      │ /api/feedback  guard → token check → trackEvent → reveal                    │
                      │ /api/card    share image (text only, 280 chars)                             │
                      └───────────────┬─────────────────────────────────────────────┬───────────────┘
                                      │ getExperimentFlag, trackEvent, flushEvents  │ reads data/results.json
                                      ▼                                             │
                               Flagsmith Cloud  ◀── flagsmith CLI on a person's machine ──┘
                               flags, events,        setup:flagsmith · results · ship
                               experiment            (signed in with flagsmith login)
```

## One visit

```
POST /api/roast {text | repoUrl}
  1. guardRequest      Origin must match the host; body ≤ 40 KB            lib/guard.ts
  2. identity          signed cookie winnow_id, created on first visit     lib/identity.ts
  3. roasts_enabled?   kill switch; 503 if off; fails open                 lib/flagsmith.ts
  4. input             paste, or README fetched from api.github.com         lib/limits.ts
  5. caps              30 per IP, 5 per visitor, per day                    lib/limits.ts
  6. pickVariant       getExperimentFlag → exposure recorded HERE           lib/flagsmith.ts
  7. promptFor         variant key → system prompt (unknown → control)      lib/prompts.ts
  8. complete          Groq, README inside <readme> tags, 20 s timeout      lib/llm.ts
  9. events            roast_requested; roast_again if winnow_n ≥ 1         lib/engagement.ts
 10. flushEvents       before returning, because a serverless function can freeze
 ← {roast, roastId}    roastId = signed {identity, variant, issuedAt}; the variant is not sent in the clear

POST /api/feedback {roastId, vote: up | down | copy}
  1. guardRequest
  2. verify            token signature, age < 1 h, token identity = cookie identity
  3. trackEvent        thumbs_up | thumbs_down | copy, same identity as the exposure
  4. flushEvents
 ← {variant, standings}   the reveal; standings are null until data/results.json exists
```

Steps 2–5 can refuse a request. Nothing is recorded in Flagsmith until step 6, so a refused request is never an
exposure.

## Trust boundaries

| Boundary | What crosses it | What protects it |
|---|---|---|
| Browser → app | README text, a repo URL, a vote, two cookies | Same-origin check, size limit, caps, signed cookie and token ([safety.md](safety.md)) |
| App → GitHub | One GET for a README | Only `api.github.com/repos/<owner>/<repo>/readme`, names checked against `[A-Za-z0-9._-]` |
| App → Groq | The system prompt and the README | The README is labelled untrusted; the model has no tools and no secrets in its context |
| App → Flagsmith | Exposures and events, by anonymous UUID | Server-side environment key only; no admin key in the app |
| Person → Flagsmith | Creating the experiment, results, rollout | The CLI on their own machine, signed in as them; `ship` needs the winner typed by hand |

## Why it is shaped like this

- **No database.** Identity is a signed cookie, a vote is proven by a signed token, and the experiment's data lives in
  Flagsmith. There is nothing to back up and nothing to leak.
- **Server-side flags only.** The browser SDK would expose the prompts and make it easy to send a conversion under a
  different identity from the exposure.
- **A snapshot, not a live query, for standings.** Reading results needs an admin credential. Keeping that on a person's
  machine is worth the cost of standings that update on redeploy.
- **Preview mode.** `WINNOW_PREVIEW=1` swaps the flag and the LLM for deterministic stand-ins (`lib/preview.ts`), so the
  whole flow runs with no keys and nothing leaves the machine. It is how every screen in this repo was checked.

## Files

| Path | What it holds |
|---|---|
| `app/page.tsx`, `components/Roaster.tsx` | The landing page and the tool: input, roast ticket, stamps, reveal, copy, share |
| `components/Art.tsx` | The SVG basket, kernels, chaff, stamps and sieve ring |
| `app/race/page.tsx` | Grain piles per variant, the decision rule and its current verdict |
| `app/api/*/route.ts` | `roast`, `feedback`, `card` |
| `lib/` | `flagsmith`, `identity`, `prompts`, `limits`, `guard`, `llm`, `engagement`, `decision`, `results`, `standings`, `preview` |
| `scripts/` | `setup-flagsmith`, `smoke`, `simulate-traffic`, `fetch-results`, `ship-winner`, and `cli.ts`, the CLI wrapper they share |
| `kit/winnow-kit.ts` | The same pattern as a ten-line library for anyone's prompts |
| `next.config.mjs` | Security headers and the content-security-policy |
