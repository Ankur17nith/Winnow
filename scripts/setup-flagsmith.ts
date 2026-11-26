/**
 * One-command Flagsmith setup for Winnow. Run on a machine where the Flagsmith CLI is signed in
 * (`flagsmith login`, or FLAGSMITH_API_KEY set to a Master API key) and the repo is bound with `flagsmith init`.
 *
 *   npm run setup:flagsmith -- --environment <client environment key> [--dry-run]
 *   npm run setup:flagsmith -- --environment <client environment key> --start <experiment id>
 *
 * Steps: warehouse check, flags and keyed variants, three metrics, experiment (NOT started).
 * Safe to re-run: existing flags, variants and metrics are reused. Any unexpected error stops with the CLI's own message.
 */
import { VARIANTS } from "../lib/prompts.ts";
import { arg, flag, flagsmith } from "./cli.ts";

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
if (startId) {
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
const existing = dry ? null : flagsmith(["feature", "get", "roast_prompt", "--json"], { fatal: false });
if (!existing) run(["feature", "create", "roast_prompt", "--value", "control", "--enabled"]);
else console.log("  roast_prompt exists, reusing it");
let feature = existing ? json(existing, "feature get") : {};
const keyed = (f: unknown) => new Set(collect(f, "key").map((o) => o.key));
for (const v of VARIANTS.filter((x) => x !== "control")) {
  if (keyed(feature).has(v)) {
    console.log(`  variant ${v} exists`);
    continue;
  }
  run(["feature", "variant", "add", "roast_prompt", "--value", v, "--key", v, "--weight", "0"]);
}
if (!dry && !flagsmith(["feature", "get", "roasts_enabled", "--json"], { fatal: false })) {
  run(["feature", "create", "roasts_enabled", "--enabled"]);
} else if (dry) run(["feature", "create", "roasts_enabled", "--enabled"]);

feature = dry ? { id: 0 } : json(run(["feature", "get", "roast_prompt", "--json"]), "feature get");
const featureId = dry ? 0 : idOf(feature, "roast_prompt");
const variantIds: Record<string, number> = {};
for (const v of VARIANTS.filter((x) => x !== "control")) {
  const row = collect(feature, "key").find((o) => o.key === v);
  if (!dry && (!row || typeof row.id !== "number")) {
    console.error(`Variant ${v} has no id or key in 'feature get' output. Every variation needs a key. Output keys: ${Object.keys(feature as Json).join(", ")}`);
    process.exit(1);
  }
  variantIds[v] = dry ? 0 : (row!.id as number);
}
console.log(`  roast_prompt id ${featureId}, variants ${JSON.stringify(variantIds)}`);

console.log("3/5 Metrics");
const METRICS = [
  { name: "Roast liked", event: "thumbs_up" },
  { name: "Roasted again", event: "roast_again" },
  { name: "Roast requested", event: "roast_requested" },
];
const known = dry ? [] : list(json(run(["api", `${base}/experiment-metrics/`, "--json"]), "metric list"));
const metricIds: number[] = [];
for (const m of METRICS) {
  const found = known.find((k) => k.name === m.name);
  if (found) {
    console.log(`  ${m.name} exists`);
    metricIds.push(idOf(found, m.name));
    continue;
  }
  const body = JSON.stringify({ name: m.name, aggregation: "occurrence", direction: "up", definition: { version: 1, event: m.event } });
  const created = run(["api", `${base}/experiment-metrics/`, "--method", "POST", "--input", "-", "--json"], body);
  metricIds.push(dry ? 0 : idOf(json(created, "metric create"), m.name));
}

console.log("4/5 Experiment (created, not started)");
const others = VARIANTS.filter((v) => v !== "control");
const share = Math.floor(100 / VARIANTS.length); // 33 each; control gets the remainder (34)
const experiment = {
  feature: featureId,
  name: "Winnow roast prompt",
  hypothesis: "The actionable prompt earns more thumbs-up than the friendly control or the savage prompt.",
  metrics: metricIds.map((metric) => ({ metric, expected_direction: "increase" })),
  experiment_rollout: {
    enabled: true,
    rollout_percentage: 100,
    feature_state_value: { type: "string", value: "control" },
    multivariate_feature_state_values: others.map((v) => ({ multivariate_feature_option: variantIds[v], percentage_allocation: share })),
  },
};
const createdExp = run(["api", `${base}/experiments/`, "--method", "POST", "--input", "-", "--json"], JSON.stringify(experiment));
const expId = dry ? 0 : idOf(json(createdExp, "experiment create"), "experiment");

console.log("5/5 Done");
console.log(`  Experiment id: ${expId}`);
console.log("  Next: deploy, run `npm run smoke -- <url>`, then start it with:");
console.log(`  npm run setup:flagsmith -- --environment ${env} --start ${expId}`);
