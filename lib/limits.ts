export const MAX_README_CHARS = 12_000;

export class InputError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export function checkLength(text: string): string {
  const trimmed = text.trim();
  if (trimmed.length < 20) throw new InputError("Paste a bit more of the README first.", 400);
  if (trimmed.length > MAX_README_CHARS) {
    throw new InputError(`That is too long. The limit is ${MAX_README_CHARS.toLocaleString("en")} characters.`, 413);
  }
  return trimmed;
}

/** Only public github.com/<owner>/<repo> URLs are allowed. Anything else is rejected, which blocks SSRF. */
export function parseRepoUrl(input: string): { owner: string; repo: string } | null {
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    return null;
  }
  if (url.protocol !== "https:" || url.hostname !== "github.com") return null;
  const parts = url.pathname.split("/").filter(Boolean);
  if (parts.length < 2) return null;
  const [owner, rawRepo] = parts;
  const repo = rawRepo.replace(/\.git$/, "");
  const ok = /^[A-Za-z0-9._-]{1,100}$/;
  return ok.test(owner) && ok.test(repo) ? { owner, repo } : null;
}

export async function fetchReadme(owner: string, repo: string): Promise<string> {
  const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/readme`, {
    headers: { Accept: "application/vnd.github.raw+json", "User-Agent": "winnow" },
    signal: AbortSignal.timeout(8000),
  });
  if (res.status === 404) throw new InputError("No public README found for that repo.", 404);
  if (!res.ok) throw new InputError("Could not fetch that README right now.", 502);
  return (await res.text()).slice(0, MAX_README_CHARS + 1);
}

/** Per-identity daily cap kept in memory. Best effort on serverless; roasts_enabled is the hard stop. */
const DAILY_LIMIT = Number(process.env.ROASTS_PER_DAY ?? 5);
const seen = new Map<string, { day: string; count: number }>();

export function takeQuota(identity: string, now = new Date()): boolean {
  const day = now.toISOString().slice(0, 10);
  const entry = seen.get(identity);
  if (!entry || entry.day !== day) {
    seen.set(identity, { day, count: 1 });
    return true;
  }
  if (entry.count >= DAILY_LIMIT) return false;
  entry.count += 1;
  return true;
}
