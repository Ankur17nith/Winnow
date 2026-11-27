import { mkdirSync, writeFileSync } from "node:fs";
import { normalizeResults } from "../lib/results.ts";
import type { Standings } from "../lib/standings.ts";
import { flagsmith } from "./cli.ts";

export const PRIMARY_METRIC = "Roast liked";

function parse(body: string, what: string): unknown {
  try {
    return JSON.parse(body);
  } catch {
    console.error(`${what} was not JSON:\n${body.slice(0, 500)}`);
    process.exit(1);
  }
}

/**
 * Refresh and read the experiment's results through the Flagsmith CLI, and turn them into standings. A refresh is allowed once every
 * five minutes and answers 202; a refusal is not fatal, because the latest stored results are still read. Results are keyed by metric
 * id, so the id of the primary metric is looked up by name. The raw response is saved to data/results.raw.json (git-ignored).
 */
export function pullResults(env: string, experiment: string, simulated: boolean): Standings {
  const base = `api/v1/environments/${env}/experiments/${experiment}`;
  for (const what of ["exposures", "results"]) flagsmith(["api", `${base}/${what}/refresh/`, "--method", "POST"], { fatal: false });

  const raw = parse(flagsmith(["api", `api/v1/environments/${env}/experiment-metrics/?page_size=999`, "--json"]) as string, "The metric list") as unknown;
  const metrics = (Array.isArray(raw) ? raw : ((raw as { results?: unknown[] })?.results ?? [])) as { id: number; name: string }[];
  const primary = metrics.find((m) => m.name === PRIMARY_METRIC);
  if (!primary) {
    console.error(`No metric named "${PRIMARY_METRIC}" in this environment. Metrics found: ${metrics.map((m) => m.name).join(", ") || "(none)"}. Run npm run setup:flagsmith first.`);
    process.exit(1);
  }

  const results = parse(flagsmith(["api", `${base}/results/`, "--json"]) as string, "The results response");
  mkdirSync("data", { recursive: true });
  writeFileSync("data/results.raw.json", JSON.stringify(results, null, 2));
  return normalizeResults(results, { simulated, metricId: primary.id });
}

export function printStandings(s: Standings): void {
  for (const v of s.variants) {
    const chance = v.winProbability === null ? "baseline" : `${(v.winProbability * 100).toFixed(0)}% win probability`;
    console.log(`  ${v.key.padEnd(12)} ${String(v.exposures).padStart(5)} exposed  ${String(v.conversions).padStart(4)} liked  ${chance}`);
  }
  if (s.srmPValue != null) console.log(`Flagsmith's sample-ratio check: p = ${s.srmPValue.toFixed(3)}${s.srmPValue < 0.01 ? "  (MISMATCH: do not trust these results)" : ""}`);
}
