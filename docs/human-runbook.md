# Human runbook

Everything a person has to run, in order, with what you should see. The code is finished; these steps need accounts, so
they cannot be done from the build sandbox. If a step prints something other than what is written here, stop and copy
the exact message into [QUESTIONS.md](QUESTIONS.md) or the chat. Do not work round it.

Budget: about 45 minutes of clicking and typing, then the experiment runs on its own until Sunday.

---

## §0 — Before you start

You need: the Flagsmith Cloud account (organisation and project `winnow` already exist), a GitHub login, Node 22 on your
computer, and a terminal.

## §1 — Keys (10 min)

| Where | What to create | Keep it as |
|---|---|---|
| Flagsmith → project `winnow` → Development → **SDK Keys** | A **server-side** key | `FLAGSMITH_ENVIRONMENT_KEY` |
| console.groq.com → API Keys | A free key | `LLM_API_KEY` |
| Anywhere | A random string of 16 or more characters | `COOKIE_SECRET` |

Also copy the **client-side environment key**: the long ID in the dashboard address bar after `/environment/`. The CLI
uses it; the app does not.

Never paste a key into a chat, an issue, or a commit.

## §2 — Create the experiment (10 min, on your computer)

```bash
git clone https://github.com/Ankur17nith/Winnow.git
cd Winnow
npm install
curl -fsSL https://get.flagsmith.com | sh
flagsmith login
flagsmith init --project winnow --environment <client environment key>
```

Expected: `flagsmith login` opens a browser and comes back signed in; `flagsmith init` writes `flagsmith.json`.

First, see every call it will make without making any:

```bash
npm run setup:flagsmith -- --environment <client environment key> --dry-run
```

Expected: five numbered steps, each `[dry-run] flagsmith ...` line showing the command and any JSON body.

Then for real:

```bash
npm run setup:flagsmith -- --environment <client environment key>
```

Expected, in this order:

```
1/5 Warehouse check
  ok: <n> connection(s)
2/5 Flags
  roast_prompt id <n>, variants {"savage":<n>,"actionable":<n>}
3/5 Metrics
4/5 Experiment (created, not started)
5/5 Done
  Experiment id: <n>
```

Write down the experiment id. The script is safe to run again: it reuses flags, variants and metrics that already exist.

| If you see | It means | Do |
|---|---|---|
| `This environment has no warehouse connection` | Experiments cannot record results yet | Connect one: https://docs.flagsmith.com/experimentation/connect-a-warehouse, then run again |
| `OS keychain unavailable` | The CLI cannot store its login on this machine | Set `FLAGSMITH_API_KEY` to a Master API key for this terminal only, then run again. Revoke the key afterwards |
| `Could not find an id for ...` or `Variant ... has no id or key` | The CLI's output is shaped differently from what the script expects | Send the whole message; it names the keys it saw |

## §3 — Deploy on Vercel (10 min)

1. vercel.com → sign in with GitHub → **Add New → Project** → import `Ankur17nith/Winnow`.
2. **Environment Variables**: `FLAGSMITH_ENVIRONMENT_KEY`, `LLM_API_KEY`, `COOKIE_SECRET`, and `LLM_PROVIDER` = `groq`.
   Do **not** set `WINNOW_PREVIEW`.
3. **Deploy**. Copy the URL, e.g. `https://winnow-xxxx.vercel.app`.

GitHub Pages will not work: the roast, vote and card routes need a server.

## §4 — Smoke test, then look for the events (5 min)

Do this **before** starting the experiment. It sends one roast and one vote, and uses one LLM call.

```bash
npm run smoke -- https://<your-app>.vercel.app
```

Expected: nine `PASS` lines and `All checks passed.` There must be **no** line saying preview mode is on; if there is,
`WINNOW_PREVIEW` is set in Vercel and must be removed.

Then open the Flagsmith dashboard and look for an exposure on `roast_prompt` and a `thumbs_up` event from the last few
minutes. **If nothing arrived, stop here and report it.** Events from a serverless function are the one path that could
not be tested before deploy.

| If you see | Do |
|---|---|
| `FAIL roast served (The roaster failed (4xx))` | The Groq key or model is wrong. Set `LLM_MODEL` in Vercel to a model your Groq console lists, redeploy |
| `FAIL roast served (Something went wrong. Try again.)` or `(500)` | Open the deployment's **Logs** in Vercel. `FLAGSMITH_ENVIRONMENT_KEY is not set` or `COOKIE_SECRET must be set` means a variable is missing: add it, redeploy |

## §5 — Start the experiment (1 min)

```bash
npm run setup:flagsmith -- --environment <client environment key> --start <experiment id>
```

Expected: `Experiment status: running`. From now on the flag is locked until the experiment ends.

## §6 — Traffic (until Saturday)

- Post the link: the hackathon Discord, X or LinkedIn, friends. A personal link roasts a specific repo:
  `https://<your-app>.vercel.app/?repo=https://github.com/<owner>/<repo>`. Only roast repos whose owners asked.
- Simulated traffic is allowed by the track. Run it only against a **separate** environment, never the real one:
  ```bash
  FLAGSMITH_ENVIRONMENT_KEY=<server key of a test environment> npm run simulate -- --users 300
  ```
  Expected: `Simulated 300 visitors (rehearsal only):` and one line per variant.

## §7 — Results and the winner (Saturday or Sunday)

```bash
npm run results -- --environment <client environment key> --experiment <id>
npm run ship -- --dry-run
```

Expected from `results`: `Wrote data/results.json (3 variants, simulated=false).` and one line per variant with
visitors, grain and win probability. Expected from `ship --dry-run`: either `Decision: WAIT. Nothing to ship.` with the
reason, or `Decision: SHIP <variant>.` with the exact command it would run.

If it says SHIP:

1. End the experiment in the Flagsmith dashboard (a running experiment locks the flag).
2. `npm run ship`, then type the winner's name when asked. Anything else cancels.

Either way, commit `data/results.json` (and `data/decision.json` if you shipped) and push. Vercel redeploys and `/race`
shows the numbers.

If `results` says `Unrecognised results shape`, send the whole message: `lib/results.ts` needs a small change.

## §8 — Submit (Sunday)

1. Record the video from [demo-script.md](demo-script.md).
2. Fill in [submission.md](submission.md) with the real numbers. Report simulated numbers separately, or not at all.
3. Submit to **Track 01: Test Something Real** before the deadline in [QUESTIONS.md](QUESTIONS.md).
4. Star https://github.com/Flagsmith/flagsmith for the bonus draw.
5. Revoke any Master API key you created.
