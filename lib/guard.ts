import { InputError } from "./limits.ts";

const MAX_BODY_BYTES = 40_000;

/**
 * Cheap request guards for the POST routes.
 * - Same-origin: browsers send Origin on cross-site POSTs. If it is present and not our host, refuse (CSRF).
 * - Body size: refuse oversized bodies before parsing them.
 */
export function guardRequest(request: Request): void {
  const origin = request.headers.get("origin");
  if (origin) {
    const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
    let originHost: string | null = null;
    try {
      originHost = new URL(origin).host;
    } catch {
      originHost = null;
    }
    if (!host || originHost !== host) throw new InputError("Cross-site requests are not allowed.", 403);
  }
  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > MAX_BODY_BYTES) throw new InputError("That request is too large.", 413);
}

/** First hop of x-forwarded-for, which Vercel sets. Falls back to "unknown" so the cap still applies. */
export function clientIp(request: Request): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}
