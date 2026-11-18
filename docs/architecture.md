# Architecture

## Overview

A single Next.js app. All Flagsmith interaction happens **server-side** through one SDK (`@flagsmith/nodejs` 9.1.0+), so
system prompts never reach the browser and exposure/conversion use one consistent identity.

```
Browser ──POST /api/roast──▶ Next.js route handler
   ▲                          │ 1. read/create signed identity cookie
   │                          │ 2. roasts_enabled? (kill switch) + rate limit
   │                          │ 3. getExperimentFlag("roast_prompt", identity)  ← exposure recorded
   │                          │ 4. variant key → system prompt
   │                          │ 5. call LLM with prompt + untrusted README text
   │  { roastId, text }       │ 6. flush events, return roast
   └──────────────────────────┘
Browser ──POST /api/feedback { roastId, vote }──▶ route handler
                              │ verify identity owns roastId
                              │ track("thumbs_up" | "thumbs_down", identity)  ← conversion
                              │ flush events
```

## Components

| Component | Responsibility |
|---|---|
| `app/page.tsx` | Input form (paste README or repo URL), roast display, 👍/👎 buttons |
| `app/api/roast/route.ts` | Enforce limits, pick prompt via flag, call LLM, return roast |
| `app/api/feedback/route.ts` | Record the conversion event for the same identity |
| `lib/flagsmith.ts` | Singleton Node SDK client, with events enabled |
| `lib/identity.ts` | Create and verify the signed anonymous ID cookie |
| `lib/prompts.ts` | Map variant keys to system prompts, with a safe fallback to `control` |
| `lib/llm.ts` | Provider abstraction (Groq or Gemini) behind one `complete()` function |
| `lib/limits.ts` | Input length cap, per-identity and global daily caps |
| `scripts/simulate-traffic.ts` | Simulated users for rehearsal (never counted as real results) |
| `scripts/fetch-results.sh` | Refresh and save results via the Flagsmith CLI (stretch) |

## Identity

- First visit: generate a random UUID and set it in an HTTP-only cookie signed with `COOKIE_SECRET` (HMAC).
- The **same identifier** is passed to `getExperimentFlag` (exposure) and `track` (conversion). Flagsmith joins events
  per identity, so a mismatch silently breaks results.
- The identity is also stored with each `roastId` in a signed token, so `/api/feedback` can verify the vote belongs to
  that visitor and that roast. No database is needed.

## Roast ID token

`roastId` is a signed, short-lived token containing `{identity, variant, issuedAt}`. The feedback route verifies the
signature and the identity match. Each roast accepts one vote; repeat votes are ignored (enforced best-effort with a
per-token `thumbs` cookie).

## Flags

| Flag | Type | Purpose |
|---|---|---|
| `roast_prompt` | multivariate | The experiment. Variants: `control`, `savage`, `actionable` |
| `roasts_enabled` | boolean | Kill switch to protect the free LLM quota |

## Untrusted input

The README text is **data**, not instructions:
- Capped at 12,000 characters.
- Wrapped in delimiters, and the system prompt tells the model to ignore instructions inside the delimiters.
- Output is rendered as plain text (no HTML injection).
- GitHub URL input only fetches public README content from `raw.githubusercontent.com` or the GitHub API. Other hosts
  are rejected (prevents SSRF).

## Serverless and event flushing

SDK events are batched. On Vercel the function can freeze right after the response, so each route flushes events before
returning (`close()` or equivalent flush from the SDK docs). The smoke test must confirm events arrive.

## Secrets

- Only the **server-side environment key** and the LLM key are in env vars (Vercel project settings locally in
  `.env.local`).
- No admin API key is ever used by the app. The Flagsmith CLI runs on the developer's machine with `flagsmith login`.
- `flagsmith.env` and `.env*` are git-ignored.

## Why this stack

- Next.js on Vercel: free, scales to zero, one deploy for UI and API.
- One SDK, server-side: simplest correct identity handling, hides prompts.
- Provider abstraction for the LLM: the free-tier provider can change without touching the app.
- No database: the app is stateless, and Flagsmith holds all experiment data.
