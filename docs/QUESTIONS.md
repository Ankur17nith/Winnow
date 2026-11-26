# Open questions

Decisions waiting on a person. Work proceeds on the stated assumption until the question is answered. Answer inline and
tick the box.

## Answers needed before the experiment starts

- [ ] **The submission deadline and timezone.** Assumption: Sunday 29 Nov 2026, from the "Nov 26–29" event dates and the
  track's "before Sunday". Check the Schedule tab on the hackathon page.
- [ ] **Does the Development environment have a warehouse connection?** `npm run setup:flagsmith` checks this first and
  stops if not.
- [ ] **Real traffic, simulated, or both?** Assumption: both. Real visitors on the production environment; simulated
  rehearsal runs only in a separate environment, labelled everywhere.
- [ ] **Does the submission need an AI-tools disclosure?** The hackathon FAQ has a question "Can I use AI coding tools?".
  Assumption: say what was used if the form asks.

## Assumptions in force

- Flagsmith Cloud, project `winnow`, environment Development, for the real experiment.
- Hosting on Vercel. GitHub Pages cannot run the API routes.
- LLM: Groq free tier, `llama-3.3-70b-versatile` unless `LLM_MODEL` says otherwise.
- Three arms. If traffic is thin by Saturday, drop one arm and restart, and say so in the write-up
  ([experiment-design.md](experiment-design.md)).

## Answered

- **Which track?** Track 01, Test Something Real (18 Nov).
- **Name?** Winnow (18 Nov).
- **Which demo app?** A README roaster (18 Nov).
- **An early-firing metric?** Yes: `roast_again`, with `roast_requested` as a sanity check (23 Nov).
