/**
 * Pull experiment results from Flagsmith with the CLI and write data/results.json for the app's reveal panel, live floor and /race.
 * Runs on YOUR machine after `flagsmith login`, so the app never needs an admin API key. Most of the time you want `npm run finalize`,
 * which does this and then publishes the results; this command only writes the file.
 *
 *   npm run results -- --environment <env key> --experiment <id> [--simulated]
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { arg, flag } from "./cli.ts";
import { PRIMARY_METRIC, printStandings, pullResults } from "./results-core.ts";

const env = arg("environment");
const experiment = arg("experiment");
if (!env || !experiment) {
  console.error("Usage: npm run results -- --environment <env key> --experiment <id> [--simulated]");
  process.exit(2);
}
const standings = pullResults(env, experiment, flag("simulated"));
mkdirSync("data", { recursive: true });
writeFileSync("data/results.json", JSON.stringify(standings, null, 2));
console.log(`Wrote data/results.json (${standings.variants.length} variants, metric "${PRIMARY_METRIC}", simulated=${standings.simulated}).`);
printStandings(standings);
