/**
 * Approval-gated rollout. Applies the pre-set decision rule to data/results.json. If a variant qualifies, it shows the
 * exact change and ships it ONLY after a human types the winner's name. Nothing ever ships on its own.
 *
 *   npm run ship -- --environment <env key> --experiment <id> [--dry-run]
 */
import { readFileSync, writeFileSync } from "node:fs";
import { createInterface } from "node:readline/promises";
import { decide } from "../lib/decision.ts";
import type { Standings } from "../lib/standings.ts";
import { arg, flag, flagsmith } from "./cli.ts";

let standings: Standings;
try {
  standings = JSON.parse(readFileSync("data/results.json", "utf8")) as Standings;
} catch {
  console.error("No data/results.json. Run `npm run results` first.");
  process.exit(1);
}

const d = decide(standings);
console.log(`Results from ${standings.updatedAt}${standings.simulated ? " (SIMULATED)" : ""}`);
for (const r of d.reasons) console.log(" -", r);
if (d.action === "wait") {
  console.log("\nDecision: WAIT. Nothing to ship.");
  process.exit(0);
}

// Ending the experiment with a rollout decision is how Flagsmith rolls a winner out through the same flag. Only
// `rollout_decision=control` has been seen to work (a teammate's smoke test); a treatment's key is the documented form but
// not yet seen here. If Flagsmith rejects it, this stops with its exact error and changes nothing else.
const env = arg("environment") ?? "<env key>";
const experiment = arg("experiment") ?? "<experiment id>";
const args = ["api", `api/v1/environments/${env}/experiments/${experiment}/complete/`, "--method", "POST", "-F", `rollout_decision=${d.winner}`];
console.log(`\nDecision: SHIP ${d.winner}.\nCommand: flagsmith ${args.join(" ")}`);
console.log("This ends the experiment and rolls the winner out through the same flag. It cannot be undone from here.");
console.log(`If Flagsmith rejects it, the fallback is: flagsmith flag update roast_prompt --weight <winner>=100,<others>=0 (after ending the experiment in the dashboard).`);
if (flag("dry-run")) process.exit(0);
if (!arg("environment") || !arg("experiment")) {
  console.error("Pass --environment <env key> and --experiment <id> to ship.");
  process.exit(2);
}

const rl = createInterface({ input: process.stdin, output: process.stdout });
const answer = (await rl.question(`\nType "${d.winner}" to approve and ship, anything else to cancel: `)).trim();
rl.close();
if (answer !== d.winner) {
  console.log("Cancelled. Nothing changed.");
  process.exit(0);
}
flagsmith(args);
writeFileSync("data/decision.json", JSON.stringify({ winner: d.winner, decidedAt: new Date().toISOString(), basedOn: standings }, null, 2));
console.log(`Shipped ${d.winner}. Recorded in data/decision.json.`);
