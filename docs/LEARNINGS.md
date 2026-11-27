# Learnings log

Dated, specific, in the order they happened. Times are UTC, from the commit history. Add an entry whenever something
broke, surprised you, or changed a decision, and say what the code does about it now.

## Wed 18 Nov

- **Morning: the sandbox could not read the hackathon page.** `wemakedevs.org` was outside the session's network
  allowlist, so the first idea was scored against criteria pasted by hand. The real page, pasted later, moved the entry
  from an "AI agent that sets up experiments" (Flagsmith already ships a setup prompt that does that) to Track 01.
- **11:58: commit trailers fused into the subject line.** The trailer block was appended with one newline, not two, so
  `git log --oneline` showed the co-author line as part of every subject. Rewritten with `filter-branch` before anything
  else was built on top; every commit since uses `-m` twice.
- **12:17: `@flagsmith/nodejs` 9.4 has no default export.** `import Flagsmith from` compiled in the editor's head and
  failed `tsc` with TS2613. It is `import { Flagsmith } from "@flagsmith/nodejs"`. The type definitions, not memory, are
  now the reference: `getExperimentFlag` records the exposure itself, and `Flag.variant` holds the variant key.
- **12:17: Node's type stripping rejects parameter properties.** `constructor(message: string, public status: number)`
  is TypeScript-only syntax, so `node --experimental-strip-types` refused to load `lib/limits.ts` and the tests never ran.
  The error classes declare the field and assign it.
- **13:33: a preview-mode shortcut would have leaked into production prompts.** Tagging each system prompt with
  `[control]`, `[savage]` and `[actionable]` let preview mode pick a canned roast, and would also have sent the tag to the
  real model. Preview mode now matches the prompt by its full text and the prompts carry no markers.
- **13:34: the Flagsmith CLI cannot set a flag's value with `feature update`.** Its help says it only changes the
  description and archive state. Shipping a winner is `flagsmith flag update roast_prompt --weight savage=0,actionable=100`;
  `control` is the flag's own value and never appears in the weights.
- **13:34: the CLI can fail and exit 0.** Without a keychain (`dbus-launch` missing) it printed
  `Error: OS keychain unavailable` to stderr and returned success with empty stdout, so the first results script reported
  "not JSON" instead of the real problem. `scripts/cli.ts` now treats empty stdout plus stderr as a failure, prints the
  CLI's own message, and passes `--no-input` so nothing waits on a prompt. `FLAGSMITH_API_KEY` is the CLI's documented way
  round a missing keychain.
- **13:34: refreshing results is rate-limited to once every five minutes.** The first draft exited on any CLI failure,
  so a refused refresh would have stopped the script before it read the results that were already there. A refresh
  failure is a warning now; every other failure still stops.
- **13:35: `next dev` writes `AGENTS.md` into the repository** and re-adds it if removed. The file says to commit it, so
  it is committed.
- **13:36: twenty kernels made the race piles look like a flat row.** At 67% the leader had thirteen kernels in one line
  and the piles read as equal. Fifty-six kernels, centred and wrapping upwards, make the difference visible at a glance.
- **13:36: the "Repo link" toggle wrapped onto two lines at 390 px.** `white-space: nowrap` on the toggle and a wrapping
  card header fixed it. Checked by screenshot, not by eye on desktop.
- **14:05: a per-visitor cap kept in a cookie can be reset by clearing cookies.** A per-IP daily cap (30 by default)
  sits in front of it now. It is in memory, so it is best effort on serverless; the kill-switch flag is the hard stop.
- **14:05: the content-security-policy needed nothing for fonts.** `next/font` self-hosts the Google fonts at build time,
  so `font-src 'self'` is enough and no third-party origin is allowed anywhere. Verified on a production build with no
  console errors.
- **Later that day: Experimentation is available on the Flagsmith Cloud account.** The Development environment shows Experiments
  and Metrics in its menu. Whether a warehouse is connected is still unknown.

## Mon 23 Nov

- **The track's own advice: pick a metric that fires early in a visit.** `thumbs_up` needs a paste, an LLM call and a
  vote. The obvious early event, "roast requested", turned out to be useless as a comparison: the exposure is recorded at
  the moment of the request, so it is near 100% in every arm whatever the prompt. It is kept as a sanity check, and
  `roast_again` (the same visitor asks for a second roast) was added as the early signal that depends on the first roast.
- **The track allows simulated traffic.** Earlier docs treated real visitors as essential. They are better, not required;
  simulated runs go in a separate environment and are labelled everywhere they appear.

## Thu 26 Nov

- **Top-level `await` needs a module.** `scripts/smoke.ts` has no imports, so `tsc` treated it as a script and failed
  with TS1375. One `export {};` line. Node also warned that every `.ts` script was being re-parsed as ESM;
  `"type": "module"` in `package.json` removed the warning and changed nothing else (the build and tests still pass).
- **GitHub Pages cannot host Winnow.** It serves static files, and the roast, vote and card routes need a server that
  holds the keys. Vercel runs the pages and the API routes as one project.

## Fri 27 Nov

- **A teammate's repository showed what Flagsmith's results actually look like.** Flagsmith's `chance_to_win` is each
  treatment's chance of beating control; control gets no number, because it is the baseline. Winnow's first adapter, written
  from guesses, treated it as each prompt's chance of being the best of all three, and the race page, the decision rule and
  the explanation were all built on that. Fixed in all of them: piles now show the observed like rate (which every arm has),
  treatments show their chance of beating control, control shows "baseline", and only a treatment can ship. The adapter is
  tested against a fixture of the documented shape.
- **The same repository used `feature variant list --json` to read variant ids**, and detected "does this feature exist?" from
  the CLI's `not found` message. The setup script had read variants out of `feature get` and treated any failure as "does not
  exist", which would have hidden an auth error behind a confusing "already exists" later. It now does what the live-tested
  scripts do. It also learned that Flagsmith rejects a rollout that omits any variant of the flag, which the setup already
  satisfied by listing every keyed variant.
- **Pre-registration is cheap and worth stealing.** The same repository writes the question, hypothesis, metrics and decision
  rule down before any data, hashes the file, tags it, and sends Flagsmith the hypothesis word for word. Winnow now does the
  same (`prereg/experiment-1.md`, `npm run prereg`), and the setup refuses to start an experiment whose file has changed.
- **A fallback in a one-liner swallowed uncommitted work.** `git checkout <file> || git stash` was meant to undo a test edit;
  the file was untracked, the checkout failed, and the stash took every uncommitted change with it. `git stash pop` restored
  all of it. Do not write a destructive fallback after `||`.
- **Decoration behind text is a mistake, even when it looks fine in the abstract.** The first attempt at depth put two large translucent
  paper sheets behind the hero headline. In the screenshot they were a blunt block with hard edges that lowered the text's contrast.
  Replaced by a strip *under* the text. Review the actual pixels, not the idea.
- **A teammate's hero beat ours on the first screen.** His board shows the whole experiment above the fold; ours showed a headline and
  empty space, with the experiment far down the page. The fix was not more decoration but moving the live data (the floor) into
  the hero, and moving it *below* the input on phones, where the action matters more than the display.
- **A stale server fooled the first screenshots.** `pkill -f "next start"` does not match the running `next-server` process, so an old
  server on the same port kept serving HTML that pointed at deleted build files (the console showed a CSS MIME-type error). Kill
  `next-server`, use a fresh port per run, and treat any console error as a reason to distrust the picture.

