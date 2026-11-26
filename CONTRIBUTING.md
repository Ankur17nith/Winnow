# Contributing

## Setup

```bash
npm install
WINNOW_PREVIEW=1 COOKIE_SECRET=any-long-local-secret npm run dev
```

Preview mode runs the whole app with no keys and sends nothing anywhere; roasts are prefixed `[preview]`. For a real
run, copy `.env.example` to `.env.local` and fill it in.

## The gate

Before every commit:

```bash
npm run lint && npm test && npm run build
```

CI runs the same three on every push to `main`. Do not commit on red.

## Rules that keep the experiment honest

- **One identity per visitor, everywhere.** The identifier passed to `getExperimentFlag` and to every `trackEvent` comes
  from the signed cookie. A new event that uses anything else breaks the join in Flagsmith.
- **Exposure only when the variant is used.** `pickVariant` records an exposure. Call it after every check that can
  refuse the request, and immediately before the prompt is used.
- **The variant stays hidden until the vote.** Do not add it to the roast response, the page, or a log line the browser
  can see.
- **Event names are case-sensitive and live in `lib/flagsmith.ts`.** A new metric needs the constant, the call, and a
  row in `docs/experiment-design.md` and `scripts/setup-flagsmith.ts`.
- **Simulated data is always labelled** and must never be able to ship a prompt. `lib/decision.ts` has a test for that;
  keep it.
- **No admin credentials in the app.** Anything that needs one belongs in `scripts/` and runs through the CLI.
- **A new control gets a row in `docs/safety.md`** that says where it lives and what proves it.
- **`docs/LEARNINGS.md` gets a dated entry** for anything that surprised you.

## Looking at the UI without a browser window

Chromium and Playwright are enough. Start the app in preview mode, then screenshot at 1280 and 390 px wide; every
screen in this repository was checked that way. Check phone width every time: two layout bugs were only visible there.
