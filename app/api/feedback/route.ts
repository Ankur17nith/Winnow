import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { flushEvents, trackVote } from "@/lib/flagsmith";
import { IDENTITY_COOKIE, readIdentity, verifyRoastToken } from "@/lib/identity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// One vote per roast. Best effort on serverless; the Bayesian metric counts each identity once anyway.
const voted = new Set<string>();

export async function POST(request: Request) {
  const jar = await cookies();
  const identity = readIdentity(jar.get(IDENTITY_COOKIE)?.value);
  const body = (await request.json().catch(() => ({}))) as { roastId?: unknown; vote?: unknown };

  if (!identity || typeof body.roastId !== "string" || (body.vote !== "up" && body.vote !== "down")) {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }
  const token = verifyRoastToken(body.roastId);
  if (!token || token.identity !== identity) {
    return NextResponse.json({ error: "That roast is not yours or has expired." }, { status: 403 });
  }
  if (voted.has(body.roastId)) return new NextResponse(null, { status: 204 });
  voted.add(body.roastId);
  if (voted.size > 5000) voted.clear();

  // Same identity as the exposure, so Flagsmith can join the conversion to the variant.
  trackVote(identity, body.vote);
  await flushEvents();
  return new NextResponse(null, { status: 204 });
}
