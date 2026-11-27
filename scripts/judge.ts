/**
 * The AI-judge bench: before any real visitor arrives, generate each prompt's roast of a fixed set of sample READMEs and have
 * an LLM judge score them. This is a cheap pre-flight (does a prompt produce something specific, useful and civil at all?) and
 * a calibration for later (did the judge's favourite match what visitors preferred?). It is NOT Flagsmith data and it does not
 * touch the pre-registered decision rule.
 *
 *   LLM_API_KEY=... npm run judge                 real run: 3 prompts x 6 READMEs, generation plus judging
 *   WINNOW_PREVIEW=1 npm run judge                stand-in numbers, marked preview, to see the layout
 *   JUDGE_MODEL=<model> npm run judge             judge with a different model from the one that writes the roasts
 *
 * Writes data/judge.json, which /race reads.
 */
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { complete, effectiveModel } from "../lib/llm.ts";
import { JUDGE_RUBRIC, aggregate, buildJudgeInput, parseJudgeScore, type JudgeResult, type Sample } from "../lib/judge.ts";
import { PROMPTS, VARIANTS } from "../lib/prompts.ts";
import { previewMode } from "../lib/preview.ts";
import { arg } from "./cli.ts";

const preview = previewMode();
const dir = "bench/readmes";
const readmes = readdirSync(dir).filter((f) => f.endsWith(".md")).sort().map((f) => ({ name: f, text: readFileSync(`${dir}/${f}`, "utf8") }));
const limit = Number(arg("limit") ?? readmes.length);
const generatorModel = preview ? "preview (no model)" : effectiveModel();
const judgeModel = preview ? "preview (no model)" : effectiveModel(process.env.JUDGE_MODEL);
const pause = () => new Promise((r) => setTimeout(r, preview ? 0 : Number(process.env.JUDGE_PAUSE_MS ?? 2500)));

/** Preview mode has no model to ask, so these are deterministic stand-ins that show the layout and prove nothing. */
function stand(variant: string, readme: string): Sample["scores"] {
  const base = { control: 3, savage: 3, actionable: 4 }[variant] ?? 3;
  const bump = readme.length % 2;
  return { specific: Math.min(5, base + bump), useful: Math.min(5, base + (variant === "actionable" ? 1 : 0)), tone: variant === "savage" ? 4 : 5 };
}

const samples: Sample[] = [];
for (const v of VARIANTS) {
  for (const r of readmes.slice(0, limit)) {
    let scores: Sample["scores"];
    if (preview) scores = stand(v, r.text);
    else {
      const roast = await complete({ system: PROMPTS[v], user: `<readme>\n${r.text}\n</readme>` });
      await pause();
      const reply = await complete({ system: JUDGE_RUBRIC, user: buildJudgeInput(r.text, roast), model: process.env.JUDGE_MODEL });
      await pause();
      scores = parseJudgeScore(reply);
    }
    samples.push({ variant: v, readme: r.name, scores });
    console.log(`${v.padEnd(11)} ${r.name.padEnd(22)} ${scores ? `${scores.specific}/${scores.useful}/${scores.tone}` : "unscorable"}`);
  }
}

const result: JudgeResult = { generatedAt: new Date().toISOString(), generatorModel, judgeModel, preview, readmes: Math.min(limit, readmes.length), variants: aggregate(samples, VARIANTS) };
mkdirSync("data", { recursive: true });
writeFileSync("data/judge.json", JSON.stringify(result, null, 2));
console.log(`\nWrote data/judge.json${preview ? " (PREVIEW: stand-in numbers)" : ""}.`);
for (const v of result.variants) console.log(`  ${v.variant.padEnd(11)} overall ${v.overall === null ? "n/a" : v.overall.toFixed(2)}  (${v.n} scored, ${v.failed} unscorable)`);
