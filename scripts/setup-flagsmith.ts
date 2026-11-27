/**
 * One-command Flagsmith setup for Winnow. Run on a machine where the Flagsmith CLI is signed in
 * (`flagsmith login`, or FLAGSMITH_API_KEY set to a Master API key) and the repo is bound with `flagsmith init`.
 *
 *   npm run setup:flagsmith -- --environment <client environment key> [--dry-run]
 *   npm run setup:flagsmith -- --environment <client environment key> --start <experiment id>
 *
 * Steps: warehouse check, flags and keyed variants whose values are the prompt bodies (remote config), three metrics,
 * experiment (NOT started).
 * Safe to re-run: existing flags, variants and metrics are reused. Any unexpected error stops with the CLI's own message.
 */
import { existsSync, readFileSync } from "node:fs";
import { BODIES, VARIANTS } from "../lib/prompts.ts";
import { extractHypothesis, parseHashes, sha256 } from "../lib/prereg.ts";
import { arg, flag, flagsmith, flagsmithStatus } from "./cli.ts";

const env = arg("environment");
if (!env) {
  console.error("Usage: npm run setup:flagsmith -- --environment <client environment key> [--dry-run] [--start <id>]");
  process.exit(2);
}
const dry = flag("dry-run");
const base = `api/v1/environments/${env}`;
type Json = Record<string, unknown>;

function run(args: string[], input?: string): string {
  if (dry) {
    console.log(`  [dry-run] flagsmith ${args.join(" ")}${input ? `  <<< ${input}` : ""}`);
    return "{}";
  }
  return flagsmith(args, { input }) as string;
}

function json(text: string, what: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    console.error(`Expected JSON from ${what}, got:\n${text.slice(0, 400)}`);
    process.exit(1);
  }
}

/** API lists are either arrays or { results: [...] }. */
const list = (v: unknown): Json[] => (Array.isArray(v) ? v : Array.isArray((v as Json)?.results) ? ((v as Json).results as Json[]) : []);

function idOf(v: unknown, what: string): number {
  const id = (v as Json)?.id;
  if (typeof id !== "number") {
    console.error(`Could not find an id for ${what}. Keys seen: ${Object.keys((v as Json) ?? {}).join(", ")}`);
    process.exit(1);
  }
  return id;
}

/** Walk any JSON value and collect objects that have the given key. Tolerates unknown nesting in CLI output. */
function collect(v: unknown, key: string, out: Json[] = []): Json[] {
  if (Array.isArray(v)) v.forEach((x) => collect(x, key, out));
  else if (v && typeof v === "object") {
    if (key in (v as Json)) out.push(v as Json);
    Object.values(v as Json).forEach((x) => collect(x, key, out));
  }
  return out;
}

// --start: begin a created experiment once the deployed app passes its smoke test.
const startId = arg("start");
const PREREG = "prereg/experiment-1.md";
function preregCheck(): void {
  if (!existsSync("prereg/HASHES.txt")) {
    console.error("The pre-registration has not been hashed. Run `npm run prereg -- hash`, commit it, tag it (git tag -a prereg-exp1), then start.");
    process.exit(1);
  }
  const want = parseHashes(readFileSync("prereg/HASHES.txt", "utf8"))[PREREG];
  if (want !== sha256(readFileSync(PREREG, "utf8"))) {
    console.error(`${PREREG} has changed since it was hashed. A registered file is never edited: write an amendment, or hash again before the experiment starts.`);
    process.exit(1);
  }
}

if (startId) {
  if (!dry) preregCheck();
  console.log(`Starting experiment ${startId}...`);
  run(["api", `${base}/experiments/${startId}/start/`, "--method", "POST"]);
  const status = dry ? "running" : (json(run(["api", `${base}/experiments/${startId}/`, "--json"]), "experiment") as Json).status;
  console.log(`Experiment status: ${String(status)}${status === "running" ? "" : "  (expected running; check the dashboard)"}`);
  process.exit(status === "running" ? 0 : 1);
}

console.log("1/5 Warehouse check");
if (!dry) {
  const conns = list(json(run(["api", `${base}/warehouse-connections/`, "--json"]), "warehouse connections"));
  if (conns.length === 0) {
    console.error("This environment has no warehouse connection, so experiments cannot record results.\nConnect one first: https://docs.flagsmith.com/experimentation/connect-a-warehouse");
    process.exit(1);
  }
  console.log(`  ok: ${conns.length} connection(s)`);
} else run(["api", `${base}/warehouse-connections/`, "--json"]);

console.log("2/5 Flags");
/** Exists, missing, or a real failure: the CLI says "not found" when a feature does not exist, and anything else must stop. */
function exists(name: string): boolean {
  if (dry) return false;
  const r = flagsmithStatus(["feature", "get", name, "--json"]);
  if (r.status === 0) return true;
  if (/not found/i.test(r.stderr)) return false;
  console.error(`\nflagsmith feature get ${name} failed:\n${(r.stderr || r.stdout).trim()}`);
  process.exit(1);
}
// The prompt bodies are the flag's values (remote config): control is the flag's own value, the others are keyed variants.
// The safety rules are appended by the app, never stored here.
if (!exists("roast_prompt")) run(["feature", "create", "roast_prompt", "--value", BODIES.control, "--enabled"]);
else console.log("  roast_prompt exists, reusing it (values untouched)");
const haveVariants = (): Json[] => (dry ? [] : list(json(run(["feature", "variant", "list", "roast_prompt", "--json"]), "variant list")));
const haveKeys = new Set(haveVariants().map((o) => o.key));
for (const v of VARIANTS.filter((x) => x !== "control")) {
  if (haveKeys.has(v)) {
    console.log(`  variant ${v} exists`);
    continue;
  }
  run(["feature", "variant", "add", "roast_prompt", "--value", BODIES[v as keyof typeof BODIES], "--key", v, "--weight", "0"]);
}
if (!exists("roasts_enabled")) run(["feature", "create", "roasts_enabled", "--enabled"]);

const featureId = dry ? 0 : idOf(json(run(["feature", "get", "roast_prompt", "--json"]), "feature get"), "roast_prompt");
const variantIds: Record<string, number> = {};
const rows = haveVariants();
for (const v of VARIANTS.filter((x) => x !== "control")) {
  const row = rows.find((o) => o.key === v);
  if (!dry && (!row || typeof row.id !== "number")) {
    console.error(`Variant ${v} was not found in \`feature variant list\`. Every variation needs a key. Rows seen: ${JSON.stringify(rows).slice(0, 300)}`);
    process.exit(1);
  }
  variantIds[v] = dry ? 0 : (row!.id as number);
}
console.log(`  roast_prompt id ${featureId}, variants ${JSON.stringify(variantIds)}`);

console.log("3/5 Metrics");
const METRICS = [
  { name: "Roast liked", event: "thumbs_up", note: "Primary: the visitor voted grain on the roast" },
  { name: "Roasted again", event: "roast_again", note: "Early signal: the visitor asked for a second roast" },
  { name: "Roast requested", event: "roast_requested", note: "Sanity check: fires for every served roast, so it cannot separate prompts" },
];
const known = dry ? [] : list(json(run(["api", `${base}/experiment-metrics/?page_size=999`, "--json"]), "metric list"));
const metricIds: number[] = [];
for (const m of METRICS) {
  const found = known.find((k) => k.name === m.name);
  if (found) {
    console.log(`  ${m.name} exists`);
    metricIds.push(idOf(found, m.name));
    continue;
  }
  const body = JSON.stringify({ name: m.name, description: m.note, aggregation: "occurrence", direction: "up", definition: { version: 1, event: m.event } });
  const created = run(["api", `${base}/experiment-metrics/`, "--method", "POST", "--input", "-", "--json"], body);
  metricIds.push(dry ? 0 : idOf(json(created, "metric create"), m.name));
}

console.log("4/5 Experiment (created, not started)");
if (!existsSync("prereg/HASHES.txt")) console.log("  note: the pre-registration is not hashed yet. Hash, commit and tag it before starting (npm run prereg -- hash).");
const others = VARIANTS.filter((v) => v !== "control");
const share = Math.floor(100 / VARIANTS.length); // 33 each; control gets the remainder (34)
const experiment = {
  feature: featureId,
  name: "Winnow roast prompt",
  hypothesis: extractHypothesis(readFileSync(PREREG, "utf8")), // the registered words, verbatim
  metrics: metricIds.map((metric) => ({ metric, expected_direction: "increase" })),
  experiment_rollout: {
    enabled: true,
    rollout_percentage: 100,
    feature_state_value: { type: "string", value: BODIES.control },
    multivariate_feature_state_values: others.map((v) => ({ multivariate_feature_option: variantIds[v], percentage_allocation: share })),
  },
};
const createdExp = run(["api", `${base}/experiments/`, "--method", "POST", "--input", "-", "--json"], JSON.stringify(experiment));
const expId = dry ? 0 : idOf(json(createdExp, "experiment create"), "experiment");

console.log("5/5 Done");
console.log(`  Experiment id: ${expId}`);
console.log("  Next: deploy, run `npm run smoke -- <url>`, then start it with:");
console.log(`  npm run setup:flagsmith -- --environment ${env} --start ${expId}`);
