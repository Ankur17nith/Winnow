# Open questions

Decisions waiting on a person. Work proceeds on the stated assumption until the question is answered. Answer inline and
tick the box.

## Answers needed before the experiment starts

- [ ] **The submission deadline and timezone.** Assumption: Sunday 29 Nov 2026, from the "Nov 26–29" event dates and the
  track's "before Sunday". Check the Schedule tab on the hackathon page.
- [x] **Does the Development environment have a warehouse connection?** Yes, `ok: 1 connection(s)` (27 Nov).
- [x] **Does the pre-registration say what you want?** Registered and tagged `prereg-exp1` (27 Nov).
- [x] **Real traffic, simulated, or both?** Both, under [amendment 1](../prereg/experiment-1-amendment-1.md): simulated visitors share the experiment, are labelled everywhere and can never ship a prompt.
- [ ] **Does the submission need an AI-tools disclosure?** The hackathon FAQ has a question "Can I use AI coding tools?".
  Assumption: say what was used if the form asks.

## Assumptions in force

- Flagsmith Cloud, project `winnow`, environment Development, for the real experiment.
- Hosting on Vercel. GitHub Pages cannot run the API routes.
- LLM: Groq free tier. The app uses `llama-3.3-70b-versatile` when the key has it, otherwise picks a model the key can use; `LLM_MODEL` overrides.
- Three arms. If traffic is thin by Saturday, drop one arm and restart, and say so in the write-up
  ([experiment-design.md](experiment-design.md)).

## Answered

- **Which track?** Track 01, Test Something Real (18 Nov).
- **Name?** Winnow (18 Nov).
- **Which demo app?** A README roaster (18 Nov).
- **An early-firing metric?** Yes: `roast_again`, with `roast_requested` as a sanity check (23 Nov).
