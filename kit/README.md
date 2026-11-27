# winnow-kit

Test your own LLM prompts like features. About ten lines, no new dependencies.

```ts
import { Flagsmith } from "@flagsmith/nodejs";
import { createWinnow } from "./winnow-kit";

const flagsmith = new Flagsmith({ environmentKey: process.env.FLAGSMITH_ENVIRONMENT_KEY!, enableEvents: true });
const winnow = createWinnow({
  flagsmith,
  flag: "support_prompt",
  prompts: { control: "You are a concise support agent.", friendly: "You are a warm, patient support agent." },
});

const { variant, prompt } = await winnow.pick(userId); // exposure recorded
// ...call your LLM with `prompt`...
winnow.track(userId, "thumbs_up");                      // conversion, same userId
await winnow.flush();                                   // before a serverless function returns
```

## Setup in Flagsmith

1. Create a multivariate flag. Give **every** variation a key (without a key no exposures are recorded).
2. Create a metric whose event name matches what you track (case-sensitive).
3. Create and start an experiment on the flag. `scripts/setup-flagsmith.ts` in this repo does it with the Flagsmith CLI, and is a working example.

## Rules for a valid test

- Use the **same identifier** for `pick` and `track`. Flagsmith joins events per identity.
- Call `pick` only when the prompt is actually used.
- Unknown or missing variants fall back to your fallback prompt, so a bad flag never breaks the app.
- Pick the decision rule before you look at results.

The Winnow app in this repo is a full working example.
