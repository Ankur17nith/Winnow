# The AI-judge bench

An optional pre-flight for the experiment, and a calibration for afterwards. It is **not Flagsmith data** and it **does not
touch the pre-registered decision rule**: nothing it produces can ship a prompt.

## What it does

`npm run judge` takes the six sample READMEs in `bench/readmes/` (invented projects of very different quality), asks each of
the three prompts to roast each one with the same code and the same model the app uses, then asks an LLM judge to score every
roast from 1 to 5 on three criteria:

| Criterion | Asks |
|---|---|
| specific | does it refer to what this README actually says or lacks, or is it generic advice? |
| useful | does it tell the author what to change? |
| tone | is it witty or warm as the style allows, and never insulting about the person? |

The result is `data/judge.json`, which `/race` shows as a section called "Before any visitor: an AI judge's read".

## Why it is worth having

- **Before traffic:** if a prompt produces something unspecific, useless or rude on every sample, that is cheap to learn
  before spending visitors' votes on it.
- **After the experiment:** `/race` compares the judge's favourite with the prompt visitors preferred most (the treatment with
  the best chance of beating control). Whether an AI judge predicts what people like is an open question for anyone testing
  prompts, and this answers it, for this one case.

## What it cannot tell you

- **With three prompts, agreement is one comparison**, not a measure of how well a judge predicts people. The page says so.
- **LLM judges have known biases**: they tend to favour longer, more confident, more structured text. The `actionable` prompt
  (a scorecard and fixes) is exactly the shape a judge may like for reasons visitors do not share. That is why people vote.
- **The judge can be the same model as the writer.** Set `JUDGE_MODEL` to a different model to reduce self-preference; the
  file records both model names.
- **Six READMEs is small.** The means move with the sample.

## Running it

```bash
LLM_API_KEY=... npm run judge            # real: 3 prompts x 6 READMEs = 18 roasts and 18 judgements, about 3 minutes
JUDGE_MODEL=<other model> npm run judge  # judge with a different model from the writer
WINNOW_PREVIEW=1 npm run judge           # stand-in numbers, marked PREVIEW, to see the layout. They say nothing about the prompts
```

The script waits 2.5 seconds between calls to stay inside a free tier (`JUDGE_PAUSE_MS` changes it). A reply the judge gives that
is not valid JSON with three whole numbers from 1 to 5 is counted as **unscorable and shown as such**, never as a zero.

Do not commit a preview `data/judge.json`. Commit a real one only if you want the deployed `/race` to show it.

## Status

The scoring, aggregation and agreement logic is unit-tested. The script has run only in preview mode: it has not been run
against a real model, so whether the judge's replies parse as expected is unproven until the first real run.
