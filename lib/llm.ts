import { previewMode, previewRoast } from "./preview.ts";

type Message = { system: string; user: string; model?: string };

const PROVIDERS = {
  groq: { url: "https://api.groq.com/openai/v1/chat/completions", defaultModel: "llama-3.3-70b-versatile" },
} as const;

/** The model a call would use: an explicit override, else LLM_MODEL, else the provider's default. */
export function effectiveModel(override?: string): string {
  const provider = (process.env.LLM_PROVIDER ?? "groq") as keyof typeof PROVIDERS;
  return override || process.env.LLM_MODEL || PROVIDERS[provider]?.defaultModel || "unknown";
}

export class LlmError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

/** One function over a free-tier provider. Swap the provider here without touching the app. */
export async function complete({ system, user, model }: Message): Promise<string> {
  if (previewMode()) return previewRoast(system);
  const provider = (process.env.LLM_PROVIDER ?? "groq") as keyof typeof PROVIDERS;
  const config = PROVIDERS[provider];
  const key = process.env.LLM_API_KEY;
  if (!config) throw new LlmError(`Unsupported LLM_PROVIDER "${provider}".`, 500);
  if (!key) throw new LlmError("LLM_API_KEY is not set.", 500);

  const body = JSON.stringify({
    model: model || process.env.LLM_MODEL || config.defaultModel,
    temperature: 0.8,
    max_tokens: 500,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
  });

  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await fetch(config.url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body,
      signal: AbortSignal.timeout(20_000),
    });
    if (res.status === 429) throw new LlmError("The roaster is busy. Try again in a minute.", 429);
    if (res.ok) {
      const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
      const text = data.choices?.[0]?.message?.content?.trim();
      if (text) return text;
      throw new LlmError("The roaster returned nothing.", 502);
    }
    if (attempt === 1 || res.status < 500) throw new LlmError(`The roaster failed (${res.status}).`, 502);
  }
  throw new LlmError("The roaster failed.", 502);
}
