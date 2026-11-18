# Winnow

**Let your users pick the winning prompt.**

Winnow is a small public AI app, a *README roaster*, built to run a real A/B test on LLM prompts with
[Flagsmith Experimentation](https://docs.flagsmith.com/experimentation). It is a submission to the WeMakeDevs x Flagsmith
hackathon, **Track 01: Test Something Real**.

## The problem

Teams shipping LLM features choose prompts by gut feeling. Changing a prompt means a redeploy, and nobody can say which
version users actually prefer.

## What Winnow does

1. A visitor pastes a README (or a public GitHub repo URL) and gets it "roasted" by an LLM.
2. Behind the scenes, a **multivariate Flagsmith flag** decides which of three system prompts that visitor gets.
3. The visitor clicks 👍 or 👎 on the roast. The 👍 is the **success event**.
4. Flagsmith's Bayesian engine reports each prompt's **win probability**.
5. The winning prompt is rolled out to everyone **through the same flag**, with no redeploy.

## What makes it different

- **Reveal after you vote:** you see which prompt you tasted and the live standings, so voting is a game.
- **Shareable roast cards:** post your roast as an image.
- **The flag ships its own winner:** a script checks the decision rule and proposes the rollout. A human approves it.
- **`winnow-kit`:** A/B test your own prompts through Flagsmith in about 10 lines.
- **Roast-my-repo links:** share `/?repo=https://github.com/owner/repo` so only people who ask get roasted.

## The experiment

| | |
|---|---|
| Question | Which roast style do users like most? |
| Flag | `roast_prompt` (multivariate, string values) |
| Variants | `control` (friendly roast), `savage` (comedic and brutal), `actionable` (scorecard plus fixes) |
| Metric | `thumbs_up`, an occurrence metric, direction up |
| Split | about 34 / 33 / 33, 100% of visitors enrolled |
| Identity | signed anonymous cookie, the same ID for exposure and conversion |

Full details: [docs/experiment-design.md](docs/experiment-design.md).

## Why Flagsmith is core, not a bolt-on

- The flag **is** the product: prompts live in flag variants, not in code.
- Exposure and conversion events flow through the Flagsmith SDK into Experimentation.
- A second flag (`roasts_enabled`) is a kill switch that protects the free LLM quota.
- Shipping the winner is a flag change, and prompts can change without redeploying.

## Stack

Next.js (TypeScript) on Vercel, Flagsmith Cloud with the Node SDK (`@flagsmith/nodejs` 9.1.0+), and a free-tier LLM
(Groq or Gemini). Everything runs on free tiers. Rationale: [docs/architecture.md](docs/architecture.md).

## Documentation

| Doc | Contents |
|---|---|
| [docs/plan.md](docs/plan.md) | Goals, scope, timeline to the 19 Nov deadline, risks |
| [docs/architecture.md](docs/architecture.md) | Components, request flow, identity, data model |
| [docs/experiment-design.md](docs/experiment-design.md) | Hypothesis, variants, prompts, metric, analysis plan |
| [docs/flagsmith-setup.md](docs/flagsmith-setup.md) | Flag, metric and experiment setup with the CLI |
| [docs/implementation.md](docs/implementation.md) | Step-by-step build guide with acceptance checks |
| [docs/design.md](docs/design.md) | Visual design system: paper threshing floor, tokens, motion, graphics |
| [kit/README.md](kit/README.md) | winnow-kit: A/B test any prompt through Flagsmith |
| [docs/demo-script.md](docs/demo-script.md) | Video script and submission checklist |

## Quick start

```bash
npm install
WINNOW_PREVIEW=1 COOKIE_SECRET=any-long-secret-here npm run dev   # no keys needed
```

For the real experiment, copy `.env.example` to `.env.local`, fill it in, and drop `WINNOW_PREVIEW`.
Other commands: `npm test`, `npm run lint`, `npm run results`, `npm run ship`, `npm run simulate`.

Setup of the Flagsmith side is in [docs/flagsmith-setup.md](docs/flagsmith-setup.md). Status: see the checklist in
[docs/plan.md](docs/plan.md).

## Contributors

**[Ankur17nith](https://github.com/Ankur17nith)**: creator and main contributor

## License

MIT
