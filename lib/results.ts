import type { Standing, Standings } from "./standings.ts";

type Raw = Record<string, unknown>;
const obj = (v: unknown): Raw | null => (v && typeof v === "object" && !Array.isArray(v) ? (v as Raw) : null);
const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);
const keys = (v: unknown) => Object.keys(obj(v) ?? {}).join(", ") || "(none)";

export const CONTROL_KEY = "control";

/**
 * Adapter from Flagsmith's experiment results response to our Standings. The shape was read from a live Flagsmith
 * response in a teammate's repository (Prashant-thakur77/fork-in-the-bill, selfhost/README.md), not from this project's own
 * account yet:
 *
 *   { results: { as_of, is_final, payload: { srm_p_value,
 *       metrics: [{ metric_id, variants: { <key>: { n, sum, sum_squares } },
 *                   inference: { <treatment key>: { lift, ci_low, ci_high, chance_to_win } | null } }] } } }
 *
 * `n` is the exposed identities and, for an occurrence metric, `sum` is the conversions. `chance_to_win` exists only for
 * treatments (the chance each beats control); control has no inference. Anything else stops with the keys it saw.
 */
export function normalizeResults(raw: unknown, opts: { simulated: boolean; metricId: number; now?: Date }): Standings {
  const root = obj(raw);
  const results = obj(root?.results);
  const payload = obj(results?.payload);
  if (!results || !payload) {
    throw new Error(
      `Flagsmith has no results payload yet. Refresh and wait a minute, then run this again. Top-level keys: ${keys(raw)}; results keys: ${keys(results)}.`,
    );
  }
  const metrics = Array.isArray(payload.metrics) ? (payload.metrics as unknown[]) : [];
  const metric = metrics.map(obj).find((m) => m && m.metric_id === opts.metricId);
  if (!metric) {
    const seen = metrics.map((m) => obj(m)?.metric_id).join(", ") || "(none)";
    throw new Error(`Metric ${opts.metricId} is not in the results. Metric ids present: ${seen}. Payload keys: ${keys(payload)}.`);
  }
  const variants = obj(metric.variants);
  if (!variants || Object.keys(variants).length === 0) throw new Error(`Metric ${opts.metricId} has no variants. Metric keys: ${keys(metric)}.`);
  const inference = obj(metric.inference) ?? {};

  const rows: Standing[] = Object.entries(variants).map(([key, v]) => {
    const a = obj(v);
    const n = num(a?.n);
    const sum = num(a?.sum);
    if (n === null || sum === null) throw new Error(`Variant ${key} is missing n or sum. Its keys: ${keys(v)}.`);
    const inf = obj(inference[key]);
    return {
      key,
      exposures: n,
      conversions: sum,
      winProbability: num(inf?.chance_to_win),
      lift: num(inf?.lift),
      ciLow: num(inf?.ci_low),
      ciHigh: num(inf?.ci_high),
    };
  });
  rows.sort((a, b) => (a.key === CONTROL_KEY ? -1 : b.key === CONTROL_KEY ? 1 : 0));
  const asOf = typeof results.as_of === "string" ? results.as_of : (opts.now ?? new Date()).toISOString();
  return { updatedAt: asOf, simulated: opts.simulated, srmPValue: num(payload.srm_p_value), variants: rows };
}
