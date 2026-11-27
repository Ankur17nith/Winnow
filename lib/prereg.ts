import { createHash } from "node:crypto";

const START = "<!-- hypothesis:start -->";
const END = "<!-- hypothesis:end -->";

/** The text between the hypothesis markers, so the experiment in Flagsmith carries the registered words verbatim. */
export function extractHypothesis(markdown: string): string {
  const a = markdown.indexOf(START);
  const b = markdown.indexOf(END);
  if (a < 0 || b < a) throw new Error(`The pre-registration needs a hypothesis between ${START} and ${END}.`);
  const text = markdown.slice(a + START.length, b).trim();
  if (text.length < 20) throw new Error("The pre-registered hypothesis is empty or too short.");
  return text;
}

export const sha256 = (text: string): string => createHash("sha256").update(text).digest("hex");

/** HASHES.txt holds lines of `<sha256>  <path>`. */
export function parseHashes(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of text.split("\n")) {
    const m = line.match(/^([0-9a-f]{64})\s+(\S+)\s*$/);
    if (m) out[m[2]] = m[1];
  }
  return out;
}
