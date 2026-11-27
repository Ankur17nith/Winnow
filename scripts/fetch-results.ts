/**
 * Pull experiment results from Flagsmith with the CLI and write data/results.json for the app's reveal panel and /race.
 * Runs on YOUR machine after `flagsmith login`, so the app never needs an admin API key.
 *
 *   npm run results -- --environment <env key> --experiment <id> [--simulated]
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { normalizeResults } from "../lib/results.ts";
import { arg, flag, flagsmith } from "./cli.ts";

const PRIMARY_METRIC = "Roast liked";
const env = arg("environment");
const experiment = arg("experiment");
if (!env || !experiment) {
  console.error("Usage: npm run results -- --environment <env key> --experiment <id> [--simulated]");
  process.exit(2);
}
const base = `api/v1/environments/${env}/experiments/${experiment}`;

function parse(body: string, what: string): unknown {
  try {
    return JSON.parse(body);
  } catch {
    console.error(`${what} was not JSON:\n${body.slice(0, 500)}`);
    process.exit(1);
  }
}

// A refresh is allowed once every 5 minutes and answers 202. A refusal is not fatal: the latest stored results are still read.
for (const what of ["exposures", "results"]) flagsmith(["api", `${base}/${what}/refresh/`, "--method", "POST"], { fatal: false });

// Results are keyed by metric id, so find the id of the primary metric by name.
const metricsRaw = parse(flagsmith(["api", `api/v1/environments/${env}/experiment-metrics/?page_size=999`, "--json"]) as string, "The metric list") as unknown;
const metrics = (Array.isArray(metricsRaw) ? metricsRaw : ((metricsRaw as { results?: unknown[] })?.results ?? [])) as { id: number; name: string }[];
const primary = metrics.find((m) => m.name === PRIMARY_METRIC);
if (!primary) {
  console.error(`No metric named "${PRIMARY_METRIC}" in this environment. Metrics found: ${metrics.map((m) => m.name).join(", ") || "(none)"}. Run npm run setup:flagsmith first.`);
  process.exit(1);
}

const raw = parse(flagsmith(["api", `${base}/results/`, "--json"]) as string, "The results response");
mkdirSync("data", { recursive: true });
writeFileSync("data/results.raw.json", JSON.stringify(raw, null, 2));
const standings = normalizeResults(raw, { simulated: flag("simulated"), metricId: primary.id });
writeFileSync("data/results.json", JSON.stringify(standings, null, 2));

console.log(`Wrote data/results.json (${standings.variants.length} variants, metric "${PRIMARY_METRIC}", simulated=${standings.simulated}).`);
for (const v of standings.variants) {
  const chance = v.winProbability === null ? "baseline" : `${(v.winProbability * 100).toFixed(0)}% to beat control`;
  console.log(`  ${v.key.padEnd(12)} ${String(v.exposures).padStart(5)} exposed  ${String(v.conversions).padStart(4)} liked  ${chance}`);
}
if (standings.srmPValue != null) console.log(`Flagsmith's sample-ratio check: p = ${standings.srmPValue.toFixed(3)}${standings.srmPValue < 0.01 ? "  (MISMATCH: do not trust these results)" : ""}`);
