export {};
/**
 * Smoke test a running Winnow: pages, security headers, a real roast, a vote with reveal, the share card.
 * Run it BEFORE starting the experiment (it sends one roast and one vote, and uses one LLM call).
 *
 *   npm run smoke -- https://your-app.vercel.app
 */
const base = (process.argv[2] ?? "").replace(/\/$/, "");
if (!/^https?:\/\//.test(base)) {
  console.error("Usage: npm run smoke -- <base url>");
  process.exit(2);
}
const origin = new URL(base).origin;
let cookies = "";
let failed = 0;
const check = (ok: boolean, label: string, detail = "") => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? `  (${detail})` : ""}`);
  if (!ok) failed++;
};
const keep = (res: Response) => {
  const set = res.headers.getSetCookie?.() ?? [];
  const jar = new Map(cookies.split("; ").filter(Boolean).map((c) => [c.split("=")[0], c] as [string, string]));
  for (const c of set) {
    const pair = c.split(";")[0];
    jar.set(pair.split("=")[0], pair);
  }
  cookies = [...jar.values()].join("; ");
};
const post = (path: string, body: unknown) =>
  fetch(base + path, { method: "POST", headers: { "content-type": "application/json", origin, cookie: cookies }, body: JSON.stringify(body) });

const home = await fetch(base + "/");
check(home.status === 200, "home page", String(home.status));
check(!!home.headers.get("content-security-policy"), "content-security-policy header");
check(home.headers.get("x-frame-options") === "DENY", "x-frame-options DENY");
check((await fetch(base + "/race")).status === 200, "race page");
check((await fetch(base + "/nope-" + Date.now())).status === 404, "404 page");

const evil = await fetch(base + "/api/roast", { method: "POST", headers: { "content-type": "application/json", origin: "https://evil.example" }, body: "{}" });
check(evil.status === 403, "cross-site POST refused", String(evil.status));

const roastRes = await post("/api/roast", { text: "# Demo\nA tiny CLI that does one thing. Install: npm i demo. Usage: demo run." });
keep(roastRes);
const roast = (await roastRes.json().catch(() => ({}))) as { roast?: string; roastId?: string; error?: string };
check(roastRes.status === 200 && !!roast.roast, "roast served", roast.error ?? String(roastRes.status));
if (roast.roast?.startsWith("[preview]")) console.log("NOTE  preview mode is on: no real LLM call and no Flagsmith events were sent.");

if (roast.roastId) {
  const voteRes = await post("/api/feedback", { roastId: roast.roastId, vote: "up" });
  const vote = (await voteRes.json().catch(() => ({}))) as { variant?: string };
  check(voteRes.status === 200 && typeof vote.variant === "string", "vote recorded and variant revealed", vote.variant ?? String(voteRes.status));
}
const card = await fetch(base + "/api/card?t=smoke");
check(card.status === 200 && (card.headers.get("content-type") ?? "").includes("image/png"), "share card image");

console.log(failed ? `\n${failed} check(s) failed.` : "\nAll checks passed. Now confirm in Flagsmith that an exposure and a thumbs_up event arrived.");
process.exit(failed ? 1 : 0);
