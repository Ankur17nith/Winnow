# Launch checklist

Everything the code needs is built. These steps need your accounts, so only you can do them. Do them in order. If a step
fails, stop and copy the exact error.

## 1. Keys (10 minutes)

| Where | What | Name to use |
|---|---|---|
| Flagsmith → winnow project → Development → **SDK Keys** | Create a **server-side** key | `FLAGSMITH_ENVIRONMENT_KEY` |
| console.groq.com → API Keys | Create a free key | `LLM_API_KEY` |
| Anywhere | Any random string, 16+ characters | `COOKIE_SECRET` |

Also note the **client-side environment key**: it is the long ID in the dashboard URL after `/environment/`.

## 2. Create the experiment (5 minutes, on your computer)

```bash
git clone https://github.com/Ankur17nith/Winnow.git
cd Winnow
npm install
curl -fsSL https://get.flagsmith.com | sh
flagsmith login
flagsmith init --project winnow --environment <client environment key>
npm run setup:flagsmith -- --environment <client environment key> --dry-run
npm run setup:flagsmith -- --environment <client environment key>
```

The script checks the warehouse, creates the `roast_prompt` and `roasts_enabled` flags, the three metrics and the
experiment. It does **not** start the experiment. Write down the experiment id it prints.

If it says there is no warehouse connection, stop and connect one:
https://docs.flagsmith.com/experimentation/connect-a-warehouse

## 3. Deploy on Vercel (10 minutes)

1. vercel.com → sign in with GitHub → **Add New Project** → import `Ankur17nith/Winnow`.
2. Environment variables: `FLAGSMITH_ENVIRONMENT_KEY`, `LLM_API_KEY`, `LLM_PROVIDER=groq`, `COOKIE_SECRET`.
   Do **not** set `WINNOW_PREVIEW`.
3. Deploy. Copy the URL.

GitHub Pages does not work: the app needs a server for its API routes.

## 4. Smoke test, then start (5 minutes)

```bash
npm run smoke -- https://<your-app>.vercel.app
```

All checks must pass. Then open the Flagsmith dashboard and confirm one exposure and one `thumbs_up` event arrived.
**If no events arrive, stop and tell me**: that is the one part that could not be tested before deploy.

Then start the experiment:

```bash
npm run setup:flagsmith -- --environment <client environment key> --start <experiment id>
```

## 5. Traffic (through Sunday)

- Share the link: hackathon Discord, X/LinkedIn, friends. Use roast-my-repo links:
  `https://<your-app>.vercel.app/?repo=https://github.com/<owner>/<repo>`
- Simulated traffic is allowed by the track. To add it, label it, and only in a **separate** environment:
  `FLAGSMITH_ENVIRONMENT_KEY=<server key of a test environment> npm run simulate -- --users 300`

## 6. Results and winner (Saturday or Sunday)

```bash
npm run results -- --environment <client environment key> --experiment <id>
npm run ship -- --dry-run
```

If the rule says SHIP: end the experiment in the dashboard, then `npm run ship` and type the winner's name. Commit
`data/results.json` (and `data/decision.json` if you shipped) and push; Vercel redeploys and the race page updates.

If `npm run results` says "Unrecognised results shape", send me the message: the adapter needs one small fix.

## 7. Submit

- Record the demo video with [docs/demo-script.md](demo-script.md).
- Fill in [docs/submission.md](submission.md) with the real numbers.
- Submit to **Track 01: Test Something Real** before the deadline. Star the Flagsmith repo for the bonus draw.
- Revoke any Master API key you created.
