import type { Standing, Standings } from "./standings.ts";

type Raw = Record<string, unknown>;
const pick = (o: Raw, keys: string[]): unknown => keys.map((k) => o[k]).find((v) => v !== undefined && v !== null);

/**
 * Adapter from Flagsmith's experiment results response to our Standings.
 * The exact response shape has not been verified against a live experiment yet, so this accepts a few likely field
 * names and FAILS LOUDLY, listing the keys it saw, instead of guessing. Confirm on the first real run and adjust.
 */
export function normalizeResults(raw: unknown, opts: { simulated: boolean; now?: Date }): Standings {
  const root = (raw ?? {}) as Raw;
  const list = (pick(root, ["variations", "variants", "results", "arms"]) ?? (Array.isArray(raw) ? raw : undefined)) as unknown;
  if (!Array.isArray(list) || list.length === 0) {
    throw new Error(`Unrecognised results shape. Top-level keys: ${Object.keys(root).join(", ") || "(none)"}. Update lib/results.ts.`);
  }
  const variants: Standing[] = list.map((item, i) => {
    const o = item as Raw;
    const key = pick(o, ["key", "variant", "variation", "name"]);
    const exposures = pick(o, ["exposures", "users", "sample_size", "count"]);
    const conversions = pick(o, ["conversions", "successes", "converted"]);
    const prob = pick(o, ["win_probability", "winProbability", "probability_best", "chance_to_win"]);
    if (typeof key !== "string" || typeof exposures !== "number" || typeof conversions !== "number" || typeof prob !== "number") {
      throw new Error(`Result row ${i} is missing a field. Keys seen: ${Object.keys(o).join(", ")}. Update lib/results.ts.`);
    }
    return { key, exposures, conversions, winProbability: prob > 1 ? prob / 100 : prob };
  });
  return { updatedAt: (opts.now ?? new Date()).toISOString(), simulated: opts.simulated, variants };
}
