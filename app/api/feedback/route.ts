import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { EVENT_COPY, flushEvents, trackEvent, trackVote } from "@/lib/flagsmith";
import { IDENTITY_COOKIE, readIdentity, verifyRoastToken } from "@/lib/identity";
import { readStandings } from "@/lib/standings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// One vote and one copy per roast. Best effort on serverless; the metric counts each identity once anyway.
const done = new Set<string>();
const ACTIONS = ["up", "down", "copy"] as const;

export async function POST(request: Request) {
  const jar = await cookies();
  const identity = readIdentity(jar.get(IDENTITY_COOKIE)?.value);
  const body = (await request.json().catch(() => ({}))) as { roastId?: unknown; vote?: unknown };
  const action = ACTIONS.find((a) => a === body.vote);

  if (!identity || typeof body.roastId !== "string" || !action) {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }
  const token = verifyRoastToken(body.roastId);
  if (!token || token.identity !== identity) {
    return NextResponse.json({ error: "That roast is not yours or has expired." }, { status: 403 });
  }

  const key = `${action === "copy" ? "copy" : "vote"}:${body.roastId}`;
  if (!done.has(key)) {
    done.add(key);
    if (done.size > 10000) done.clear();
    // Same identity as the exposure, so Flagsmith can join the conversion to the variant.
    if (action === "copy") trackEvent(identity, EVENT_COPY);
    else trackVote(identity, action);
    await flushEvents();
  }

  // Reveal after vote: the variant is only disclosed once the vote has been cast.
  if (action === "copy") return new NextResponse(null, { status: 204 });
  return NextResponse.json({ variant: token.variant, standings: await readStandings() });
}
