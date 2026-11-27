import type { Standings } from "./standings.ts";

/** `minWinProbability` is the chance a treatment must have of beating control. */
export type Rule = { minWinProbability: number; minExposuresPerArm: number };
export const DEFAULT_RULE: Rule = { minWinProbability: 0.9, minExposuresPerArm: 30 };

export type Decision =
  | { action: "ship"; winner: string; reasons: string[] }
  | { action: "wait"; reasons: string[] };

const pct = (x: number) => `${(x * 100).toFixed(0)}%`;

/**
 * The decision rule is fixed before looking at results (prereg/experiment-1.md). Only a treatment can ship: control is the
 * baseline, and "keep control" is what waiting means. Simulated data can never ship.
 */
export function decide(standings: Standings | null, rule: Rule = DEFAULT_RULE): Decision {
  if (!standings || standings.variants.length < 2) return { action: "wait", reasons: ["No results yet."] };
  if (standings.simulated) return { action: "wait", reasons: ["Results are simulated. Simulated data never ships a prompt."] };

  const reasons: string[] = [];
  const thin = standings.variants.filter((v) => v.exposures < rule.minExposuresPerArm);
  if (thin.length > 0) {
    reasons.push(`Not enough exposures: ${thin.map((v) => `${v.key} has ${v.exposures}`).join(", ")} (need ${rule.minExposuresPerArm} per arm).`);
  }
  const treatments = standings.variants.filter((v) => v.winProbability !== null);
  if (treatments.length === 0) return { action: "wait", reasons: [...reasons, "Flagsmith has no estimate against control yet."] };
  const best = [...treatments].sort((a, b) => (b.winProbability as number) - (a.winProbability as number))[0];
  const p = best.winProbability as number;
  if (p < rule.minWinProbability) {
    reasons.push(`No clear winner: ${best.key} has a ${pct(p)} chance of beating control (need ${pct(rule.minWinProbability)}).`);
  }
  if (reasons.length > 0) return { action: "wait", reasons };
  return { action: "ship", winner: best.key, reasons: [`${best.key} has a ${pct(p)} chance of beating control, with enough exposures in every arm.`] };
}
