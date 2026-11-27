import { DEFAULT_RULE, decide, type Rule } from "./decision.ts";
import type { Standings } from "./standings.ts";

const pct = (x: number) => `${Math.round(x * 100)}%`;
const rate = (conv: number, n: number) => (n > 0 ? conv / n : 0);

/**
 * The results in plain English, from the numbers alone: no model, no embellishment. Says who leads, by how much, what the
 * sample is, and what the pre-set rule says. Every sentence is a fact about the snapshot or a limit on it.
 */
export function explain(standings: Standings | null, rule: Rule = DEFAULT_RULE): string[] {
  if (!standings || standings.variants.length < 2) return ["There are no results yet, so there is nothing to explain."];
  const byProb = [...standings.variants].sort((a, b) => b.winProbability - a.winProbability);
  const [lead, second] = byProb;
  const out: string[] = [];

  if (standings.simulated) out.push("These numbers are from a simulated rehearsal, not real visitors, so they show the machinery works and nothing else.");

  out.push(`${lead.key} leads with a ${pct(lead.winProbability)} chance of being the best prompt; ${second.key} is next at ${pct(second.winProbability)}.`);
  out.push(
    standings.variants
      .map((v) => `${v.key}: ${v.conversions} of ${v.exposures} visitors liked it (${pct(rate(v.conversions, v.exposures))})`)
      .join("; ") + ".",
  );

  const ctrl = standings.variants.find((v) => v.key === "control");
  if (ctrl && lead.key !== "control") {
    const gap = Math.round((rate(lead.conversions, lead.exposures) - rate(ctrl.conversions, ctrl.exposures)) * 100);
    out.push(`${lead.key} was liked ${Math.abs(gap)} percentage points ${gap >= 0 ? "more" : "less"} often than control in this sample.`);
  }

  const smallest = Math.min(...standings.variants.map((v) => v.exposures));
  if (smallest < rule.minExposuresPerArm) {
    out.push(`The smallest arm has ${smallest} visitors and the rule needs ${rule.minExposuresPerArm}, so the gap could still be noise.`);
  }

  const d = decide(standings, rule);
  out.push(d.action === "ship" ? `The rule is met: ${d.winner} qualifies to ship, with a person's approval.` : `The rule is not met yet, so nothing ships. ${d.reasons.join(" ")}`);
  out.push("Only visitors who chose to vote are counted, so this measures preference among voters, not among everyone who visited.");
  return out.map((line) => line.charAt(0).toUpperCase() + line.slice(1));
}
