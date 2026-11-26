# Documentation index

Winnow is an entry for the WeMakeDevs x Flagsmith hackathon, Track 01 (Test Something Real). The code is written and
tested; the experiment has not run yet. Where a document quotes a number, the live one is in the repository: `npm test`
prints the test count, and [STATUS.md](STATUS.md) says what is proven and what is not.

## Start here

| Read this when | File |
|---|---|
| You want the whole picture in five minutes | [`../README.md`](../README.md) |
| You want to know what works today, with evidence, and what is still unproven | [`STATUS.md`](STATUS.md) |
| You are the person deploying it: every step, in order, with what you should see | [`human-runbook.md`](human-runbook.md) |
| You want to know exactly what is being tested, how it is measured and when a winner is declared | [`experiment-design.md`](experiment-design.md) |
| You want to know whether the app can be abused, and which test proves each control | [`safety.md`](safety.md) |
| You want the request flow, the trust boundaries and why there is no database | [`architecture.md`](architecture.md) |
| Something surprised us and you want to know why the code is the way it is | [`LEARNINGS.md`](LEARNINGS.md) |
| A decision is waiting on a person | [`QUESTIONS.md`](QUESTIONS.md) |
| You want the visual rules: palette, type, motion, what is never allowed | [`design.md`](design.md) |
| You are recording the video | [`demo-script.md`](demo-script.md) |
| You are submitting | [`submission.md`](submission.md) (fill in the blanks from the real results) |
| You want to A/B test your own prompts | [`../kit/README.md`](../kit/README.md) |

## The commands

Every script is runnable with `npm run`. The ones that talk to Flagsmith use the Flagsmith CLI and need it signed in
(`flagsmith login`); none of them needs a key inside the app.

| Command | What it does |
|---|---|
| `npm run dev` | The app. With `WINNOW_PREVIEW=1` it runs with no keys and sends nothing anywhere |
| `npm test` · `npm run lint` · `npm run build` | The gate. CI runs the same three on every push |
| `npm run setup:flagsmith -- --environment <key>` | Warehouse check, both flags, three metrics, the experiment (not started). `--dry-run` prints every call; `--start <id>` starts it |
| `npm run smoke -- <url>` | Nine checks against a running app: pages, headers, a refused cross-site POST, a roast, a vote, the share card |
| `npm run simulate -- --users 300` | Rehearsal visitors named `sim_*`, for a separate environment only |
| `npm run results -- --environment <key> --experiment <id>` | Pulls results into `data/results.json`, which the reveal panel and `/race` read |
| `npm run ship -- --dry-run` | Applies the decision rule. Without `--dry-run` it ships only after a person types the winner's name |

## Kept as a record

Written before or during the build. Not maintained; where they disagree with the code, the code is right.

| What it is | File |
|---|---|
| The first plan, including a 24-hour timeline written when the deadline was thought to be 19 Nov | [`plan.md`](plan.md) |
| The step-by-step build guide the code was written from | [`implementation.md`](implementation.md) |
| The Flagsmith setup done by hand, one CLI call at a time. `npm run setup:flagsmith` now does the same | [`flagsmith-setup.md`](flagsmith-setup.md) |
