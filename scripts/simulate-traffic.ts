/**
 * Simulated visitors. Identities are prefixed "sim_" so they are identifiable, and results built from them must be
 * reported as simulated, with the number of simulated visitors. Per prereg/experiment-1-amendment-1.md, they may be
 * added to the same experiment as real traffic when real traffic is too thin by the stopping rule; Flagsmith cannot
 * tell them apart, and the decision rule never ships a prompt from a result marked simulated. Otherwise, use a
 * separate Flagsmith environment.
 *
 *   FLAGSMITH_ENVIRONMENT_KEY=... npm run simulate -- [--users 300]
 */
import { EVENT_AGAIN, EVENT_REQUESTED, flushEvents, getFlagsmith, pickVariant, trackEvent, trackVote } from "../lib/flagsmith.ts";
import { arg } from "./cli.ts";

const users = Number(arg("users") ?? 300);
// Made-up "true" grain rates per variant, so the rehearsal has something to find.
const TRUE_RATE: Record<string, number> = { control: 0.32, savage: 0.38, actionable: 0.5 };
// Made-up chance that a visitor comes back for a second roast.
const AGAIN_RATE: Record<string, number> = { control: 0.15, savage: 0.25, actionable: 0.22 };

let seed = 42;
const rand = () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296);

const counts: Record<string, { n: number; up: number; again: number }> = {};
for (let i = 0; i < users; i++) {
  const id = `sim_${i}`;
  const variant = (await pickVariant(id)).key;
  const c = (counts[variant] ??= { n: 0, up: 0, again: 0 });
  c.n++;
  trackEvent(id, EVENT_REQUESTED);
  if (rand() < (AGAIN_RATE[variant] ?? 0.15)) {
    c.again++;
    trackEvent(id, EVENT_AGAIN);
  }
  if (rand() < (TRUE_RATE[variant] ?? 0.3)) {
    c.up++;
    trackVote(id, "up");
  }
}
await flushEvents();
await getFlagsmith().close();
console.log(`Simulated ${users} visitors (rehearsal only):`);
for (const [k, v] of Object.entries(counts)) console.log(`  ${k.padEnd(12)} ${v.n} exposed, ${v.up} grain, ${v.again} came back`);
const assumed = (r: Record<string, number>) => Object.entries(r).map(([k, p]) => `${k} ${Math.round(p * 100)}%`).join(", ");
console.log(
  `\nThese visitors are not real people. Whether each one liked the roast was drawn from rates we ASSUMED, not measured (liked: ${assumed(TRUE_RATE)}; ` +
    `came back: ${assumed(AGAIN_RATE)}). Any result built on them shows that the pipeline works, not which prompt people prefer. ` +
    `Say so wherever you show it.`,
);
