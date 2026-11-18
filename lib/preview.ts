import { createHash } from "node:crypto";
import { PROMPTS, VARIANTS } from "./prompts.ts";

/**
 * Preview mode (WINNOW_PREVIEW=1) lets the whole app run with no Flagsmith or LLM keys, for local development and
 * for rehearsing the demo. Nothing is sent anywhere, and the UI never claims preview data is real.
 */
export const previewMode = (): boolean => process.env.WINNOW_PREVIEW === "1";

/** Deterministic split so a visitor keeps the same variant, like the real flag. */
export function previewVariant(identity: string): string {
  const n = createHash("sha256").update(identity).digest().readUInt32BE(0);
  return VARIANTS[n % VARIANTS.length];
}

const CANNED: Record<string, string> = {
  control: "Friendly note: your README opens with a lovely title, then goes quiet. A short install section and one screenshot would help newcomers feel welcome. The feature list is nice, but I could not tell who it is for.",
  savage: "Bold move, opening with a logo and then hiding the install steps like a treasure map. 'Blazing fast' appears four times and not one benchmark. This README has the confidence of a keynote and the content of a sticky note.",
  actionable: "Clarity 3/5\nInstall 2/5\nExamples 1/5\nTrust 3/5\n\n1. Add an Install section with the exact command, directly under the title.\n2. Show one runnable example with its output.\n3. Replace 'blazing fast' with a measured number.",
};

export function previewRoast(system: string): string {
  const key = VARIANTS.find((v) => PROMPTS[v] === system) ?? "control";
  return `[preview] ${CANNED[key]}`;
}
