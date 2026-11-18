import { readFile } from "node:fs/promises";
import path from "node:path";

export type Standing = { key: string; exposures: number; conversions: number; winProbability: number };
export type Standings = { updatedAt: string; simulated: boolean; variants: Standing[] };

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
