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
| `This environment has no warehouse connection` | Experiments cannot record results yet | Connect one: https://docs.flagsmith.com/experimentation/connect-a-warehouse, then run again. A teammate's project reports enabling the **managed warehouse** on a free-plan *Production* environment; if Development does not offer it, set up in Production instead |
| `OS keychain unavailable` | The CLI cannot store its login on this machine | Set `FLAGSMITH_API_KEY` to a Master API key for this terminal only, then run again. Revoke the key afterwards |
| `... failed:` followed by a line starting with `✓` | An older version of the script treated the CLI's success message as an error | `git pull`, then run the same command again. It reuses everything it already created |
| `Could not find an id for ...` or `Variant ... was not found in \`feature variant list\`` | The CLI's output is shaped differently from what the script expects | Send the whole message; it names the keys it saw |

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
| `FAIL roast served (The roaster failed (401).)` or `(403)` | The Groq key is wrong or revoked: create a new one, update `LLM_API_KEY` in Vercel, redeploy |
| `FAIL roast served (The roaster failed (404).)` | The app tries to recover from a missing model by asking Groq which models your key can use. If it still fails, run `npm run models`, set `LLM_MODEL` in Vercel to one of the ids it prints, redeploy and run the smoke test again. The provider's own reason is in the deployment's Logs |
| `FAIL roast served (Something went wrong. Try again.)` or `(500)` | Open the deployment's **Logs** in Vercel. `FLAGSMITH_ENVIRONMENT_KEY is not set` or `COOKIE_SECRET must be set` means a variable is missing: add it, redeploy |

## §5 — Register, then start the experiment (5 min)

Read [`prereg/experiment-1.md`](../prereg/experiment-1.md). It is the question, the hypothesis, the metrics, the decision rule
and the stopping rule, written before any data. If you agree with it, hash and tag it, **before** starting:

```bash
npm run prereg -- hash
git add prereg && git commit -m "prereg: register experiment 1"
git tag -a prereg-exp1 -m "Pre-registration, experiment 1"
git push origin main --tags
```

The start step refuses to run if the file has changed since it was hashed. Then:

```bash
npm run setup:flagsmith -- --environment <client environment key> --start <experiment id>
```

Expected: `Experiment status: running`. From now on the flag is locked until the experiment ends.

## §6 — Traffic (until Saturday)

- Post the link: the hackathon Discord, X or LinkedIn, friends. A personal link roasts a specific repo:
  `https://<your-app>.vercel.app/?repo=https://github.com/<owner>/<repo>`. Only roast repos whose owners asked.
- Simulated traffic is allowed by the track. The experiment must be running first. The simulator talks to Flagsmith directly, so it
  never touches the website, the LLM or the site's rate limits. Put the server-side key in the terminal without echoing it, then run it:
  ```bash
  read -rs FLAGSMITH_ENVIRONMENT_KEY && export FLAGSMITH_ENVIRONMENT_KEY
  ```
  ```bash
  npm run simulate -- --users 300
  ```
  Expected: `Simulated 300 visitors (rehearsal only):`, one line per variant, and a reminder that the like rates were assumed.
  By [amendment 1](../prereg/experiment-1-amendment-1.md) these visitors go into the same experiment as the real ones, so the results
  are mixed and everything that shows them must say so. Never ship a prompt from them (`npm run ship` refuses).

## §7 — Results (Saturday or Sunday)

One command pulls the results, writes `data/results.json` and [RESULTS.md](RESULTS.md), commits those two files and pushes. Vercel
redeploys and `/race` shows the numbers. Add `--simulated` if any of the traffic was simulated:

```bash
npm run finalize -- --environment <client environment key> --experiment <id> --simulated
```

Expected: `Standings` with one line per variant (visitors, grain, and for each treatment its chance of beating control; control is the
baseline and shows none), Flagsmith's sample-ratio check, `Committed and pushed`, and a block headed `Results paragraph` that you paste
into the submission form. `--no-push` commits without pushing. If it says `Flagsmith has no results payload yet`, wait a minute and run it
again; if it names other keys it did not expect, send the whole message, because `lib/results.ts` needs a small change.

Then, if you want to ship a winner:

```bash
npm run ship -- --environment <client environment key> --experiment <id> --dry-run
```

Expected: either `Decision: WAIT. Nothing to ship.` with the reason, or `Decision: SHIP <variant>.` with the exact command it would
run. If it says SHIP, run the same command without `--dry-run` and type the winner's name when asked. Anything else cancels. It ends the
experiment with `rollout_decision=<winner>`; if Flagsmith rejects that, it stops with Flagsmith's exact error and changes nothing else.
Check in the dashboard that the flag now serves the winner. Simulated results never ship.

## §8 — Submit (Sunday)

1. Upload `video-output/winnow-demo.mp4` to YouTube (Unlisted) or Loom.
2. Fill in the form from [submission.md](submission.md), pasting the results paragraph from §7. Report simulated numbers as simulated.
3. Submit to **Track 01: Test Something Real** before the deadline in [QUESTIONS.md](QUESTIONS.md).
4. Star https://github.com/Flagsmith/flagsmith for the bonus draw.
5. Revoke any Master API key you created, and rotate any secret that appeared on a screen.
