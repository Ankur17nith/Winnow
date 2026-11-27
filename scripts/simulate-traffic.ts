/**
 * Simulated visitors. They are named `sim_<n>`, they talk to Flagsmith directly through the SDK (never to the website, the LLM or
 * the site's rate limits), and each one gets a variant and may "like" the roast or come back for a second one.
 *
 * Whether a simulated visitor likes a roast is drawn from rates assumed in this file, not measured. A result built on them shows
 * that the pipeline works, from exposure to event to Flagsmith's analysis. It says nothing about which prompt people prefer, and
 * anything that shows it must say the traffic was simulated. `prereg/experiment-1-amendment-1.md` records that these visitors are
 * added to the same experiment as the real ones, so the results are mixed.
 *
 * The experiment must be running, or the exposures are not counted. The identities are fixed (`sim_0` to `sim_<users-1>`), so a
 * second run adds no new visitors. Put the server-side key in the terminal without echoing it:
 *
 *   read -rs FLAGSMITH_ENVIRONMENT_KEY && export FLAGSMITH_ENVIRONMENT_KEY
 *   npm run simulate -- --users 300
 *
 * Then `npm run finalize -- --environment <key> --experiment <id> --simulated` pulls the results and publishes them.
 */
import { EVENT_AGAIN, EVENT_REQUESTED, flushEvents, getFlagsmith, pickVariant, trackEvent, trackVote } from "../lib/flagsmith.ts";
import { arg } from "./cli.ts";

const users = Number(arg("users") ?? 300);
// Assumed chance that a visitor likes the roast, per variant. These are inputs to the simulation, not findings.
const TRUE_RATE: Record<string, number> = { control: 0.32, savage: 0.38, actionable: 0.5 };
// Assumed chance that a visitor comes back for a second roast.
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
