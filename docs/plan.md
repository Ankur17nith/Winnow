# Plan

> **Kept as a record.** Written on 18 Nov, when the deadline was thought to be 19 Nov. Not maintained; where it disagrees with the code, the code is right. Current state: [STATUS.md](STATUS.md).

## Goal

Win Track 01 (Test Something Real) by running a **real** A/B test of LLM prompts, with real visitors and real events, and
explaining the result clearly in a short video.

Judging criteria: Use of Flagsmith, Impact, Creativity, Demo video. Track 01 looks for: a clear question, versions behind
a flag, a metric from real events, and results you can explain.

## Constraints

- **Deadline: 19 Nov 2026.** Today is 18 Nov, so the schedule below is about 24 hours.
- **Zero spend.** Flagsmith Cloud free tier, Vercel free tier, free-tier LLM.
- Single branch (`main`), small commits.
- No admin API keys in the repo or in app code.

## Scope

**In scope (must ship)**
1. README roaster web app (paste a README or a GitHub repo URL, get a roast).
2. Multivariate flag `roast_prompt` with three keyed variants.
3. Metric `thumbs_up` and an experiment started in Flagsmith.
4. Server-side exposure and conversion events via the Node SDK.
5. 👍/👎 buttons, with a stable anonymous identity.
6. `roasts_enabled` kill-switch flag plus basic rate limiting.
7. Real traffic (shared publicly) plus a simulated-traffic script as a fallback.
8. Demo video (about 2 minutes), written results explanation, public repo.

**Added scope (the "10/10" upgrade)**
9. **Reveal after vote:** after voting, show which prompt the visitor got and the live standings. This makes voting a
   game, drives sharing, and brings in real votes. The variant stays hidden until the vote is cast.
10. **Shareable roast card:** an image of the roast with the Winnow wordmark, ready to post.
11. **Secondary signals:** `copy` event tracked alongside `thumbs_up`. `thumbs_down` is a guardrail, not a metric.
12. **Live race page `/race`:** three piles of grain with win probabilities from a results snapshot.
13. **Approval-gated auto-ship:** `scripts/ship-winner.sh` checks the decision rule and proposes the rollout. A human
    approves; nothing ships on its own.
14. **`winnow-kit`:** a tiny reusable module so any developer can A/B test their own prompts through Flagsmith.
15. **Hackathon roast wall (opt-in only):** participants can submit their own repo to be roasted. Nobody is roasted
    without asking.

**Stretch (only if time allows)**
- Plain-English "why did this win" summary.
- Secondary metric (`copy`).

**Out of scope**
Accounts, a database, payments, multi-language SDK support, a prompt-management UI.

## Timeline (24 hours)

| Block | Work | Done when |
|---|---|---|
| H0–2 | Verify free tier, create the Flagsmith project, run `docs/flagsmith-setup.md` steps 1–5 | Flag, metric and experiment exist (not started) |
| H2–6 | Build app: UI, `/api/roast`, `/api/feedback`, identity cookie | Local roast works with the flag value |
| H6–8 | Wire exposure and conversion events, run the simulated script, check results appear | Results page in Flagsmith shows data |
| H8–10 | Deploy to Vercel, smoke test, start the experiment | Public URL live, status `running` |
| H10–20 | Collect real traffic (Discord, social, friends), monitor | Enough 👍/👎 events to compare |
| H20–23 | Record the video, write the results section, final README polish | Video uploaded, submission filed |
| H23–24 | Buffer | Submit before deadline |

If real traffic is thin, the simulated script is used for the rehearsal only. The submission must state clearly which
numbers are real and which are simulated.

## Risks and mitigations

| Risk | Mitigation |
|---|---|
| Free tier lacks Experimentation or a warehouse | Check in the first hour. If blocked, stop and consider self-hosting with Docker (Track 03 style) as a fallback. |
| Too little traffic for a clear winner | Start early, use a high-base-rate event, report the chance to beat control as it is. |
| Free LLM quota exhausted | `roasts_enabled` kill switch, daily global cap, per-identity limit, input length cap. |
| Events lost on serverless exit | Flush events before the response ends (`close()` or equivalent). Verify during the smoke test. |
| Exposure and conversion identities differ | Single signed cookie ID, tested explicitly. |
| Abuse or prompt injection from README content | Treat the README as untrusted data, cap length, never echo secrets. See architecture. |
| Docs unverified (API names or versions) | Confirm against docs.flagsmith.com when implementing; mark deviations in implementation.md. |

## Build status

- [x] Backend: identity, flags, prompts, limits, LLM client, roast and feedback routes, tests
- [x] Frontend: threshing-floor theme, roaster, reveal after vote, copy, share card, race page
- [x] Scripts: results snapshot, approval-gated ship, rehearsal simulator
- [x] `winnow-kit` with tests
- [x] Keyless preview mode
- [ ] Flagsmith project, flag, metric and experiment created (needs the account)
- [ ] LLM key, `.env.local`, end-to-end test with real keys
- [ ] Deploy to Vercel and check that events arrive from a serverless function
- [ ] Real traffic, results, winner decision
- [ ] Demo video and submission
- Cut from scope: the public opt-in roast wall (needs storage and moderation). Replaced by shareable
  `/?repo=<github url>` links.

## Definition of done

- [ ] Public URL works end to end
- [ ] Experiment is `running` and receiving exposures and conversions
- [ ] Results (win probability) screenshot or link captured
- [ ] Winner rolled out through the same flag, or the decision documented
- [ ] Demo video recorded
- [ ] README and docs updated with the real result
- [ ] Repo public, Flagsmith repo starred (bonus prize)
