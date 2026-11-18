import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";

export const IDENTITY_COOKIE = "winnow_id";
const TOKEN_TTL_MS = 60 * 60 * 1000;

function secret(): string {
  const s = process.env.COOKIE_SECRET;
  if (!s || s.length < 16) throw new Error("COOKIE_SECRET must be set to at least 16 characters.");
  return s;
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

function safeEqual(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/** Cookie value is "<uuid>.<signature>". Returns the uuid, or null if missing or tampered. */
export function readIdentity(cookieValue: string | undefined): string | null {
  if (!cookieValue) return null;
  const dot = cookieValue.lastIndexOf(".");
  if (dot < 1) return null;
  const id = cookieValue.slice(0, dot);
  return safeEqual(cookieValue.slice(dot + 1), sign(id)) ? id : null;
}

export function newIdentity(): { id: string; cookieValue: string } {
  const id = randomUUID();
  return { id, cookieValue: `${id}.${sign(id)}` };
}

export type RoastToken = { identity: string; variant: string; issuedAt: number };

/** A roast token proves which identity got which roast, so a vote can be verified without a database. */
export function signRoastToken(identity: string, variant: string, now = Date.now()): string {
  const body = Buffer.from(JSON.stringify({ identity, variant, issuedAt: now })).toString("base64url");
  return `${body}.${sign(body)}`;
}

export function verifyRoastToken(token: string, now = Date.now()): RoastToken | null {
  const dot = token.lastIndexOf(".");
  if (dot < 1) return null;
  const body = token.slice(0, dot);
  if (!safeEqual(token.slice(dot + 1), sign(body))) return null;
  try {
    const parsed = JSON.parse(Buffer.from(body, "base64url").toString()) as RoastToken;
    if (typeof parsed.identity !== "string" || typeof parsed.issuedAt !== "number") return null;
    if (now - parsed.issuedAt > TOKEN_TTL_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}
