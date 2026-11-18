import type { Standings } from "./standings.ts";

export type Rule = { minWinProbability: number; minExposuresPerArm: number };
export const DEFAULT_RULE: Rule = { minWinProbability: 0.9, minExposuresPerArm: 30 };

export type Decision =
  | { action: "ship"; winner: string; reasons: string[] }
  | { action: "wait"; reasons: string[] };

/**
 * The decision rule is fixed before looking at results (see docs/experiment-design.md).
 * Simulated data can never trigger a ship.
 */
export function decide(standings: Standings | null, rule: Rule = DEFAULT_RULE): Decision {
  if (!standings || standings.variants.length < 2) return { action: "wait", reasons: ["No results yet."] };
  if (standings.simulated) return { action: "wait", reasons: ["Results are simulated. Simulated data never ships a prompt."] };

  const reasons: string[] = [];
  const thin = standings.variants.filter((v) => v.exposures < rule.minExposuresPerArm);
  if (thin.length > 0) {
    reasons.push(`Not enough exposures: ${thin.map((v) => `${v.key} has ${v.exposures}`).join(", ")} (need ${rule.minExposuresPerArm} per arm).`);
  }
  const best = [...standings.variants].sort((a, b) => b.winProbability - a.winProbability)[0];
  if (best.winProbability < rule.minWinProbability) {
    reasons.push(`No clear winner: ${best.key} leads at ${(best.winProbability * 100).toFixed(0)}% (need ${(rule.minWinProbability * 100).toFixed(0)}%).`);
  }
  if (reasons.length > 0) return { action: "wait", reasons };
  return {
    action: "ship",
    winner: best.key,
    reasons: [`${best.key} wins at ${(best.winProbability * 100).toFixed(0)}% with enough exposures in every arm.`],
  };
}
