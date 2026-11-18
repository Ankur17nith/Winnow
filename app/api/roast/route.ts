import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { flushEvents, pickVariant, roastsEnabled } from "@/lib/flagsmith";
import { IDENTITY_COOKIE, newIdentity, readIdentity, signRoastToken } from "@/lib/identity";
import { InputError, checkLength, fetchReadme, parseRepoUrl, takeQuota } from "@/lib/limits";
import { LlmError, complete } from "@/lib/llm";
import { promptFor } from "@/lib/prompts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const jar = await cookies();
  let identity = readIdentity(jar.get(IDENTITY_COOKIE)?.value);
  if (!identity) {
    const fresh = newIdentity();
    identity = fresh.id;
    jar.set(IDENTITY_COOKIE, fresh.cookieValue, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 180,
    });
  }

  try {
    const body = (await request.json().catch(() => ({}))) as { text?: unknown; repoUrl?: unknown };

    if (!(await roastsEnabled(identity))) {
      return NextResponse.json({ error: "The roaster is resting. Come back soon." }, { status: 503 });
    }

    let readme: string;
    if (typeof body.repoUrl === "string" && body.repoUrl.trim()) {
      const repo = parseRepoUrl(body.repoUrl);
      if (!repo) throw new InputError("Use a public https://github.com/owner/repo link.", 400);
      readme = checkLength(await fetchReadme(repo.owner, repo.repo));
    } else if (typeof body.text === "string") {
      readme = checkLength(body.text);
    } else {
      throw new InputError("Paste a README or a GitHub repo link.", 400);
    }

    if (!takeQuota(identity)) {
      return NextResponse.json({ error: "That is today's limit of roasts. Come back tomorrow." }, { status: 429 });
    }

    // The exposure is recorded here, and only here: a roast is actually being served.
    const { variant, system } = promptFor(await pickVariant(identity));
    const roast = await complete({ system, user: `<readme>\n${readme}\n</readme>` });
    await flushEvents();

    // The variant is signed into the token but never returned in the clear.
    return NextResponse.json({ roast, roastId: signRoastToken(identity, variant) });
  } catch (err) {
    await flushEvents();
    if (err instanceof InputError || err instanceof LlmError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("roast failed:", err);
    return NextResponse.json({ error: "Something went wrong. Try again." }, { status: 500 });
  }
}
