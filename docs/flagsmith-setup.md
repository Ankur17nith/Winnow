# Flagsmith setup

> **Kept as a record.** Written on 18 Nov, before `npm run setup:flagsmith` existed. Not maintained; where it disagrees with the code, the code is right. The current path: [human-runbook.md](human-runbook.md) §2.

Follow the official guides while doing this and note any difference in `docs/implementation.md`:
- https://docs.flagsmith.com/experimentation/run-an-experiment
- https://docs.flagsmith.com/experimentation/set-up-with-a-coding-agent

Stop at any error and record the exact message. Do not work around it.

## 0. Prerequisites

1. Flagsmith Cloud account (free). Create a project named `winnow` and an environment (for example `production`).
2. **Verify the free tier includes Experimentation and a data warehouse.** If the environment has no warehouse
   connection, stop: see https://docs.flagsmith.com/experimentation/connect-a-warehouse.
3. Install the CLI (v2 or later): `curl -fsSL https://get.flagsmith.com | sh` (or `brew install Flagsmith/tap/flagsmith`).
4. `flagsmith login` runs on **your machine** (browser sign-in). No admin API key goes into this repo.
5. Bind the repo: `flagsmith project list`, then
   `flagsmith init --project <project> --environment <environment key>`.

## 1. Check the warehouse

```bash
flagsmith api api/v1/environments/<environment key>/warehouse-connections/
```

An empty list means no warehouse. Stop.

## 2. Create the flags

```bash
flagsmith feature create roast_prompt --value control --enabled
flagsmith feature variant add roast_prompt --value savage     --key savage     --weight 0
flagsmith feature variant add roast_prompt --value actionable --key actionable --weight 0
flagsmith feature get roast_prompt --json    # verify: variants have keys

flagsmith feature create roasts_enabled --enabled
```

Every variation needs a key; without one, no exposures are recorded. `control` is reserved for the flag's own value.

## 3. Create the metric

```bash
flagsmith api api/v1/environments/<environment key>/experiment-metrics/ --input - <<'EOF'
{"name": "Roast liked", "aggregation": "occurrence", "direction": "up",
 "definition": {"version": 1, "event": "thumbs_up"}}
EOF
```

The event name is case-sensitive and must equal the string the code sends.

Create two more metrics the same way (same body, change `name` and `event`), so there are three in total:

| Metric name | Event | Role |
|---|---|---|
| `Roast liked` | `thumbs_up` | Primary. Fires after a vote. |
| `Roasted again` | `roast_again` | Early signal: the visitor came back for a second roast. Separates prompts. |
| `Roast requested` | `roast_requested` | Sanity check only. It fires for every served roast, so it is near 100% in every arm. |

Note the id of each metric: the experiment in the next step lists them in its `metrics` array.

## 4. Create the experiment (do not start it)

```bash
flagsmith api api/v1/environments/<environment key>/experiments/ --input - <<'EOF'
{"feature": <flag id>, "name": "Winnow roast prompt",
 "hypothesis": "The actionable prompt earns more thumbs-up than control or savage.",
 "metrics": [{"metric": <Roast liked id>, "expected_direction": "increase"},
              {"metric": <Roasted again id>, "expected_direction": "increase"},
              {"metric": <Roast requested id>, "expected_direction": "increase"}],
 "experiment_rollout": {"enabled": true, "rollout_percentage": 100,
   "feature_state_value": {"type": "string", "value": "control"},
   "multivariate_feature_state_values": [
     {"multivariate_feature_option": <savage variation id>,     "percentage_allocation": 33},
     {"multivariate_feature_option": <actionable variation id>, "percentage_allocation": 33}]}}
EOF
```

Control receives the remainder (34%). Starting the experiment locks the flag and turns on the rollout, so start it only
after the app is deployed and verified.

## 5. Start the experiment (after deploy)

```bash
flagsmith api api/v1/environments/<environment key>/experiments/<id>/start/ --method POST
flagsmith api api/v1/environments/<environment key>/experiments/<id>/    # status must be "running"
```

## 6. Read results

```bash
# allowed once every 5 minutes
flagsmith api api/v1/environments/<environment key>/experiments/<id>/results/refresh/ --method POST
flagsmith api api/v1/environments/<environment key>/experiments/<id>/results/
```

Dashboard: `https://app.flagsmith.com/project/<project id>/environment/<environment key>/experiments/<id>`

## 7. Ship the winner

1. End the experiment in the Flagsmith dashboard first (a running experiment locks the flag).
2. Run `npm run results -- --environment <env key> --experiment <id>` to refresh `data/results.json`.
3. Run `npm run ship -- --dry-run` to see the decision. If a variant qualifies, run `npm run ship`; you must type the
   winner's name to approve. It runs `flagsmith flag update roast_prompt --weight <winner>=100,<others>=0`.
4. Commit `data/results.json` and `data/decision.json`, and record the numbers in the README.

The deployed app reads the standings from the committed `data/results.json`, so redeploy after updating it.

## CLI facts (checked against the CLI's own `--help`)

- `flagsmith api <path> --method POST` and `--input -` (JSON body from stdin) exist; `-F key=value` builds a body.
- `flagsmith feature update` only changes description and archive state; re-weighting a multivariate flag is
  `flagsmith flag update <feature> --weight key=N,key=N`.
- The CLI can print an error to stderr and still exit 0, so the scripts treat empty output plus stderr as a failure.
- Not verified against a live account: the exact JSON shape of the experiment results response (see `lib/results.ts`).

## Environment key for the app

The app needs only the **server-side environment key** (Environment settings, Keys). It is not the admin API key.
Put it in `.env.local` and Vercel project settings.
