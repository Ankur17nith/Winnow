# Flagsmith setup

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

## 4. Create the experiment (do not start it)

```bash
flagsmith api api/v1/environments/<environment key>/experiments/ --input - <<'EOF'
{"feature": <flag id>, "name": "Winnow roast prompt",
 "hypothesis": "The actionable prompt earns more thumbs-up than control or savage.",
 "metrics": [{"metric": <metric id>, "expected_direction": "increase"}],
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

Update the flag's value to the winning variant and end the experiment, so everyone gets the winner through the same
flag. Record the decision and numbers in the README.

## Environment key for the app

The app needs only the **server-side environment key** (Environment settings, Keys). It is not the admin API key.
Put it in `.env.local` and Vercel project settings.
