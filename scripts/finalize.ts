/**
 * Publish the experiment's results in one command, so nothing has to be edited or committed by hand afterwards:
 *
 *   1. pull the results from Flagsmith through the CLI (as `npm run results` does);
 *   2. write data/results.json, which the site reads, and docs/RESULTS.md, a readable report written from the same numbers;
 *   3. commit exactly those two files and push, which redeploys the site;
 *   4. print the text for the submission form's results box.
 *
 *   npm run finalize -- --environment <env key> --experiment <id> --simulated
 *
 * Pass --simulated whenever any of the traffic was simulated (it is also the safe choice when real and simulated visitors are mixed):
 * the snapshot is then marked simulated, the pages show a SIMULATED tag, and `npm run ship` refuses to ship from it.
 * Pass --no-push to write the files and print the text without committing.
 */
import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { formText, renderResults } from "../lib/report.ts";
import { arg, flag } from "./cli.ts";
import { printStandings, pullResults } from "./results-core.ts";

const env = arg("environment");
const experiment = arg("experiment");
if (!env || !experiment) {
  console.error("Usage: npm run finalize -- --environment <env key> --experiment <id> [--simulated] [--no-push]");
  process.exit(2);
}

const standings = pullResults(env, experiment, flag("simulated"));
mkdirSync("data", { recursive: true });
writeFileSync("data/results.json", JSON.stringify(standings, null, 2));
writeFileSync("docs/RESULTS.md", renderResults(standings));
console.log(`Wrote data/results.json and docs/RESULTS.md (simulated=${standings.simulated}).`);
printStandings(standings);

const FILES = ["data/results.json", "docs/RESULTS.md"];
const git = (args: string[]) => spawnSync("git", args, { encoding: "utf8" });

if (flag("no-push")) {
  console.log("\n--no-push: files written, nothing committed.");
} else {
  git(["add", ...FILES]);
  if (git(["diff", "--cached", "--quiet", "--", ...FILES]).status === 0) {
    console.log("\nThe results have not changed since the last snapshot, so there is nothing to commit.");
  } else {
    const label = standings.simulated ? "simulated" : "real";
    const total = standings.variants.reduce((a, v) => a + v.exposures, 0);
    const commit = git(["commit", "-m", `results: ${label} snapshot, ${total} visitors`, "--", ...FILES]);
    if (commit.status !== 0) {
      console.error(`\ngit commit failed:\n${(commit.stderr || commit.stdout).trim()}`);
      process.exit(1);
    }
    const push = git(["push", "origin", "HEAD"]);
    if (push.status !== 0) {
      console.error(`\nThe snapshot is committed locally but git push failed:\n${(push.stderr || push.stdout).trim()}\nFix the push (for example, sign in to GitHub) and run: git push origin HEAD`);
      process.exit(1);
    }
    console.log("\nCommitted and pushed. The site will redeploy with these numbers in a minute or two.");
  }
}

console.log(`\n--- For the submission form, "what did the results show" ---\n\n${formText(standings)}\n`);
