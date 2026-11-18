/**
 * Pull experiment results from Flagsmith with the CLI and write data/results.json for the app's reveal panel.
 * Runs on YOUR machine after `flagsmith login`, so the app never needs an admin API key.
 *
 *   npm run results -- --environment <env key> --experiment <id> [--simulated]
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { normalizeResults } from "../lib/results.ts";
import { arg, flag, flagsmith } from "./cli.ts";

const env = arg("environment");
const experiment = arg("experiment");
if (!env || !experiment) {
  console.error("Usage: npm run results -- --environment <env key> --experiment <id> [--simulated]");
  process.exit(2);
}
const base = `api/v1/environments/${env}/experiments/${experiment}`;

// A refresh is allowed once every 5 minutes. A refusal is not fatal: the latest stored results are still read.
flagsmith(["api", `${base}/results/refresh/`, "--method", "POST"], { fatal: false });

const body = flagsmith(["api", `${base}/results/`, "--json"]) as string;
let raw: unknown;
try {
  raw = JSON.parse(body);
} catch {
  console.error("Results were not JSON:\n" + body.slice(0, 500));
  process.exit(1);
}

mkdirSync("data", { recursive: true });
writeFileSync("data/results.raw.json", JSON.stringify(raw, null, 2));
const standings = normalizeResults(raw, { simulated: flag("simulated") });
writeFileSync("data/results.json", JSON.stringify(standings, null, 2));
console.log(`Wrote data/results.json (${standings.variants.length} variants, simulated=${standings.simulated}).`);
for (const v of standings.variants) {
  console.log(`  ${v.key.padEnd(12)} ${String(v.exposures).padStart(5)} exposed  ${String(v.conversions).padStart(4)} grain  ${(v.winProbability * 100).toFixed(0)}% to win`);
}
