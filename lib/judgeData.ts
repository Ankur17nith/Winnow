import { readFile } from "node:fs/promises";
import path from "node:path";
import type { JudgeResult } from "./judge.ts";

/** data/judge.json is written by `npm run judge` on the developer's machine. No file means no judge section: nothing is invented. */
export async function readJudge(): Promise<JudgeResult | null> {
  try {
    const parsed = JSON.parse(await readFile(path.join(process.cwd(), "data", "judge.json"), "utf8")) as JudgeResult;
    return Array.isArray(parsed.variants) && parsed.variants.length > 0 ? parsed : null;
  } catch {
    return null;
  }
}
