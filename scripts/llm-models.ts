/**
 * List the models your LLM key can use, and check that the one Winnow would call is among them. A 404 from the provider
 * (the smoke test shows "The roaster failed (404)") usually means the model name is not available to your account.
 *
 *   read -rs LLM_API_KEY && export LLM_API_KEY     (reads the key without echoing it or putting it in your history)
 *   npm run models
 *
 * Then set LLM_MODEL to one of the ids it prints, in Vercel, and redeploy.
 */
import { effectiveModel } from "../lib/llm.ts";

const key = process.env.LLM_API_KEY;
if (!key) {
  console.error("LLM_API_KEY is not set in this terminal. See the comment at the top of scripts/llm-models.ts.");
  process.exit(2);
}
const res = await fetch("https://api.groq.com/openai/v1/models", { headers: { Authorization: `Bearer ${key}` } });
if (!res.ok) {
  console.error(`The provider answered ${res.status}: ${(await res.text()).slice(0, 300)}`);
  process.exit(1);
}
const ids = ((await res.json()) as { data?: { id: string }[] }).data?.map((m) => m.id).sort() ?? [];
console.log(`${ids.length} models available to this key:\n${ids.map((i) => `  ${i}`).join("\n")}`);
const want = effectiveModel();
console.log(`\nWinnow would call "${want}": ${ids.includes(want) ? "available" : "NOT available. Set LLM_MODEL to one of the ids above."}`);
process.exit(ids.includes(want) ? 0 : 1);
