import { previewMode, previewRoast } from "./preview.ts";

type Message = { system: string; user: string; model?: string };

const PROVIDERS = {
  groq: {
    url: "https://api.groq.com/openai/v1/chat/completions",
    modelsUrl: "https://api.groq.com/openai/v1/models",
    defaultModel: "llama-3.3-70b-versatile",
  },
} as const;

/** The model a call would use: an explicit override, else LLM_MODEL, else the model found for this key, else the provider's default. */
export function effectiveModel(override?: string): string {
  const provider = (process.env.LLM_PROVIDER ?? "groq") as keyof typeof PROVIDERS;
  return override || process.env.LLM_MODEL || discovered || PROVIDERS[provider]?.defaultModel || "unknown";
}

/** Set once, in this process, when the default model turned out not to exist for the key. */
let discovered: string | undefined;

// Model ids that are not chat models: speech, safety classifiers, embeddings.
const NOT_CHAT = /whisper|guard|tts|playai|orpheus|embed|moderation|safeguard|transcri/i;

/**
 * Choose a chat model from a provider's list. A roast is short, so a small fast model is a good fit and also has the most generous
 * free-tier limits: prefer an "instant" one, then any Llama, then a "versatile" one, then whatever is first.
 */
export function pickChatModel(ids: string[]): string | null {
  const chat = ids.filter((id) => !NOT_CHAT.test(id));
  if (chat.length === 0) return null;
  const rank = (id: string) => (/instant/i.test(id) ? 0 : /llama/i.test(id) ? 1 : /versatile/i.test(id) ? 2 : 3);
  return [...chat].sort((a, b) => rank(a) - rank(b) || a.localeCompare(b))[0];
}

export class LlmError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

const isModelMissing = (status: number, body: string) => status === 404 || (status === 400 && /model/i.test(body));

/**
 * One function over a free-tier provider. Swap the provider here without touching the app.
 *
 * If the model is not available to the key and nobody chose one explicitly (no `model`, no LLM_MODEL), ask the provider which models
 * the key can use, pick one with pickChatModel, remember it for this process and retry. A model chosen explicitly is never replaced.
 */
export async function complete({ system, user, model }: Message): Promise<string> {
  if (previewMode()) return previewRoast(system);
  const provider = (process.env.LLM_PROVIDER ?? "groq") as keyof typeof PROVIDERS;
  const config = PROVIDERS[provider];
  const key = process.env.LLM_API_KEY;
  if (!config) throw new LlmError(`Unsupported LLM_PROVIDER "${provider}".`, 500);
  if (!key) throw new LlmError("LLM_API_KEY is not set.", 500);
  const explicit = Boolean(model || process.env.LLM_MODEL);

  const send = (m: string) =>
    fetch(config.url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: m,
        temperature: 0.8,
        max_tokens: 500,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
      signal: AbortSignal.timeout(20_000),
    });

  let triedDiscovery = false;
  for (let attempt = 0; attempt < 2; attempt++) {
    const current = effectiveModel(model);
    const res = await send(current);
    if (res.status === 429) throw new LlmError("The roaster is busy. Try again in a minute.", 429);
    if (res.ok) {
      const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
      const text = data.choices?.[0]?.message?.content?.trim();
      if (text) return text;
      throw new LlmError("The roaster returned nothing.", 502);
    }
    const detail = (await res.text().catch(() => "")).replace(/\s+/g, " ").slice(0, 300);

    if (!explicit && !triedDiscovery && isModelMissing(res.status, detail)) {
      triedDiscovery = true;
      const list = await fetch(config.modelsUrl, { headers: { Authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(10_000) }).catch(() => null);
      const ids = list?.ok ? (((await list.json().catch(() => ({}))) as { data?: { id: string }[] }).data ?? []).map((m) => m.id) : [];
      const pick = pickChatModel(ids);
      if (pick && pick !== current) {
        console.warn(`LLM model "${current}" is not available to this key. Using "${pick}". Set LLM_MODEL to choose another.`);
        discovered = pick;
        attempt -= 1; // the discovery does not count as one of the two attempts
        continue;
      }
    }
    if (attempt === 1 || res.status < 500) {
      // The provider says why (for example "the model does not exist"). That goes in the server log, not to the visitor.
      console.error(`LLM provider returned ${res.status} for model "${current}": ${detail}`);
      throw new LlmError(`The roaster failed (${res.status}).`, 502);
    }
  }
  throw new LlmError("The roaster failed.", 502);
}
