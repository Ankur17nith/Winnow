import { readFile } from "node:fs/promises";
import path from "node:path";

/**
 * One arm of the experiment. `winProbability` is Flagsmith's `chance_to_win`: for a treatment, the chance that it beats
 * control. Control is the baseline and has none (null), so no single number says "chance of being the best of all".
 * `lift` is the relative lift over control with its 95% interval, when Flagsmith has one.
 */
export type Standing = {
  key: string;
  exposures: number;
  conversions: number;
  winProbability: number | null;
  lift?: number | null;
  ciLow?: number | null;
  ciHigh?: number | null;
};
export type Standings = { updatedAt: string; simulated: boolean; srmPValue?: number | null; variants: Standing[] };

/**
 * Standings come from data/results.json, a snapshot written by scripts/fetch-results.sh from Flagsmith's results API
 * (run on your machine with the CLI, so the app never needs an admin API key). No file means no standings:
 * nothing is invented.
 */
export async function readStandings(): Promise<Standings | null> {
  try {
    const raw = await readFile(path.join(process.cwd(), "data", "results.json"), "utf8");
    const parsed = JSON.parse(raw) as Standings;
    return Array.isArray(parsed.variants) && parsed.variants.length > 0 ? parsed : null;
  } catch {
    return null;
  }
}
