import type { Standing } from "./standings.ts";

export type SplitCheck =
  | { status: "ok" | "mismatch"; chi2: number; p: number; observed: number[]; expected: number[]; keys: string[] }
  | { status: "insufficient" | "unsupported"; reason: string };

export const MIN_VISITORS_FOR_SPLIT_CHECK = 30;
export const MISMATCH_P = 0.01;

/** erfc, Abramowitz and Stegun 7.1.26 (absolute error below 1.5e-7). */
function erfc(x: number): number {
  const z = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * z);
  const y = t * (0.254829592 + t * (-0.284496736 + t * (1.421413741 + t * (-1.453152027 + t * 1.061405429))));
  const r = y * Math.exp(-z * z);
  return x >= 0 ? r : 2 - r;
}

/**
 * Sample ratio mismatch: did the visitors land in the arms in the proportions the experiment asked for? A broken split
 * (a bug, bots, a caching layer) quietly invalidates an A/B test, so it is checked before any result is believed.
 * Chi-square goodness of fit; the p-value is exact for 2 and 3 arms (1 and 2 degrees of freedom).
 *
 * expectedShares are the allocation percentages in the same order as `variants`, e.g. [34, 33, 33].
 */
export function splitCheck(variants: Standing[], expectedShares: number[]): SplitCheck {
  if (variants.length !== expectedShares.length) return { status: "unsupported", reason: "Arms and expected shares differ in number." };
  const df = variants.length - 1;
  if (df < 1 || df > 2) return { status: "unsupported", reason: "Only 2 or 3 arms are supported." };
  const total = variants.reduce((a, v) => a + v.exposures, 0);
  if (total < MIN_VISITORS_FOR_SPLIT_CHECK) return { status: "insufficient", reason: `Fewer than ${MIN_VISITORS_FOR_SPLIT_CHECK} visitors so far.` };
  const sum = expectedShares.reduce((a, b) => a + b, 0);
  const expected = expectedShares.map((s) => (s / sum) * total);
  const chi2 = variants.reduce((a, v, i) => a + (v.exposures - expected[i]) ** 2 / expected[i], 0);
  const p = df === 2 ? Math.exp(-chi2 / 2) : erfc(Math.sqrt(chi2 / 2));
  return { status: p < MISMATCH_P ? "mismatch" : "ok", chi2, p, observed: variants.map((v) => v.exposures), expected, keys: variants.map((v) => v.key) };
}
