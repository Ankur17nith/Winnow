/**
 * Approval-gated rollout. Applies the pre-set decision rule to data/results.json. If a variant qualifies, it shows the
 * exact change and ships it ONLY after a human types the winner's name. Nothing ever ships on its own.
 *
 *   npm run ship -- [--dry-run]
 */
import { readFileSync, writeFileSync } from "node:fs";
import { createInterface } from "node:readline/promises";
import { decide } from "../lib/decision.ts";
import { VARIANTS } from "../lib/prompts.ts";
import type { Standings } from "../lib/standings.ts";
import { flag, flagsmith } from "./cli.ts";

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

// control is the flag's own value, so it is never a weighted variant. Winner 100, every other keyed variant 0.
const others = VARIANTS.filter((v) => v !== "control");
const weights = others.map((v) => `${v}=${v === d.winner ? 100 : 0}`).join(",");
const args = ["flag", "update", "roast_prompt", "--weight", weights];
console.log(`\nDecision: SHIP ${d.winner}.\nCommand: flagsmith ${args.join(" ")}`);
console.log("Reminder: a running experiment locks the flag. End the experiment in the Flagsmith dashboard first.");
if (flag("dry-run")) process.exit(0);

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
