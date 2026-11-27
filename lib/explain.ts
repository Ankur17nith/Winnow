import { DEFAULT_RULE, decide, type Rule } from "./decision.ts";
import type { Standings } from "./standings.ts";

const pct = (x: number) => `${Math.round(x * 100)}%`;
const signed = (x: number) => `${x >= 0 ? "+" : "−"}${Math.abs(Math.round(x * 100))}%`;
const rate = (conv: number, n: number) => (n > 0 ? conv / n : 0);

/**
 * The results in plain English, from the numbers alone: no model, no embellishment. Says who leads against control, by how
 * much, how uncertain that is, the sample, and what the pre-set rule says. Every sentence is a fact about the snapshot or a
 * limit on it.
 */
export function explain(standings: Standings | null, rule: Rule = DEFAULT_RULE): string[] {
  if (!standings || standings.variants.length < 2) return ["There are no results yet, so there is nothing to explain."];
  const out: string[] = [];
  if (standings.simulated) out.push("These numbers are from a simulated rehearsal, not real visitors, so they show the machinery works and nothing else.");

  const control = standings.variants.find((v) => v.key === "control");
  const treatments = standings.variants.filter((v) => v.winProbability !== null).sort((a, b) => (b.winProbability as number) - (a.winProbability as number));
  const lead = treatments[0];

  if (lead) {
    out.push(`${lead.key} has a ${pct(lead.winProbability as number)} chance of beating control, the best of the prompts tested against it.`);
    for (const t of treatments.slice(1)) out.push(`${t.key} has a ${pct(t.winProbability as number)} chance of beating control.`);
  } else {
    out.push("Flagsmith has no estimate against control yet, so there is no leader.");
  }

  out.push(
    standings.variants
      .map((v) => `${v.key}: ${v.conversions} of ${v.exposures} visitors liked it (${pct(rate(v.conversions, v.exposures))})`)
      .join("; ") + ".",
  );

  if (lead && control) {
    const gap = Math.round((rate(lead.conversions, lead.exposures) - rate(control.conversions, control.exposures)) * 100);
    out.push(`${lead.key} was liked ${Math.abs(gap)} percentage points ${gap >= 0 ? "more" : "less"} often than control in this sample.`);
  }
  if (lead && lead.lift != null && lead.ciLow != null && lead.ciHigh != null) {
    const crosses = lead.ciLow < 0 && lead.ciHigh > 0;
    out.push(
      `Flagsmith's estimate of ${lead.key}'s lift over control is ${signed(lead.lift)}, with a 95% interval from ${signed(lead.ciLow)} to ${signed(lead.ciHigh)}${
        crosses ? ". The interval includes zero, so the true effect could be no effect at all" : ""
      }.`,
    );
  }

  const smallest = Math.min(...standings.variants.map((v) => v.exposures));
  if (smallest < rule.minExposuresPerArm) {
    out.push(`The smallest arm has ${smallest} visitors and the rule needs ${rule.minExposuresPerArm}, so the gap could still be noise.`);
  }
  const d = decide(standings, rule);
  out.push(d.action === "ship" ? `The rule is met: ${d.winner} qualifies to ship, with a person's approval.` : `The rule is not met yet, so control stays. ${d.reasons.join(" ")}`);
  out.push("Only visitors who chose to vote are counted, so this measures preference among voters, not among everyone who visited.");
  return out.map((line) => line.charAt(0).toUpperCase() + line.slice(1));
}
