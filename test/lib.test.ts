import assert from "node:assert/strict";
import test from "node:test";

process.env.COOKIE_SECRET = "test-secret-1234567890";
const { newIdentity, readIdentity, signRoastToken, verifyRoastToken } = await import("../lib/identity.ts");
const { promptFor } = await import("../lib/prompts.ts");
const { parseRepoUrl, checkLength, InputError } = await import("../lib/limits.ts");

test("identity cookie round-trips and rejects tampering", () => {
  const { id, cookieValue } = newIdentity();
  assert.equal(readIdentity(cookieValue), id);
  assert.equal(readIdentity(cookieValue.replace(id[0], id[0] === "a" ? "b" : "a")), null);
  assert.equal(readIdentity(undefined), null);
});

test("roast token verifies, expires and rejects tampering", () => {
  const t = signRoastToken("user-1", "savage", 1000);
  assert.equal(verifyRoastToken(t, 2000)?.variant, "savage");
  assert.equal(verifyRoastToken(t, 1000 + 2 * 60 * 60 * 1000), null);
  assert.equal(verifyRoastToken(t.slice(0, -2) + "xx", 2000), null);
});

test("unknown prompt keys fall back to control", () => {
  assert.equal(promptFor("nope").variant, "control");
  assert.equal(promptFor(undefined).variant, "control");
  assert.equal(promptFor("actionable").variant, "actionable");
});

test("repo URL allow-list", () => {
  assert.deepEqual(parseRepoUrl("https://github.com/a/b"), { owner: "a", repo: "b" });
  assert.deepEqual(parseRepoUrl("https://github.com/a/b.git"), { owner: "a", repo: "b" });
  assert.equal(parseRepoUrl("https://evil.com/a/b"), null);
  assert.equal(parseRepoUrl("http://github.com/a/b"), null);
  assert.equal(parseRepoUrl("https://github.com.evil.com/a/b"), null);
  assert.equal(parseRepoUrl("not a url"), null);
});

test("length cap", () => {
  assert.throws(() => checkLength("short"), InputError);
  assert.throws(() => checkLength("x".repeat(12_001)), InputError);
  assert.equal(checkLength("x".repeat(50)).length, 50);
});

const { decide } = await import("../lib/decision.ts");
const { normalizeResults } = await import("../lib/results.ts");
const mk = (simulated: boolean, rows: [string, number, number, number][]) => ({
  updatedAt: "2026-11-19T00:00:00Z",
  simulated,
  variants: rows.map(([key, exposures, conversions, winProbability]) => ({ key, exposures, conversions, winProbability })),
});

test("decision: ships only with enough exposures and a clear winner", () => {
  assert.equal(decide(null).action, "wait");
  assert.equal(decide(mk(false, [["control", 40, 10, 0.1], ["savage", 40, 12, 0.2], ["actionable", 40, 20, 0.95]])).action, "ship");
  assert.equal(decide(mk(false, [["control", 10, 2, 0.1], ["actionable", 10, 8, 0.95]])).action, "wait");
  assert.equal(decide(mk(false, [["control", 40, 10, 0.4], ["actionable", 40, 14, 0.6]])).action, "wait");
});

test("decision: simulated data never ships", () => {
  const d = decide(mk(true, [["control", 400, 10, 0.01], ["actionable", 400, 200, 0.99]]));
  assert.equal(d.action, "wait");
});

test("results adapter normalises percentages and fails loudly on unknown shapes", () => {
  const s = normalizeResults({ variations: [{ key: "a", exposures: 5, conversions: 2, win_probability: 80 }] }, { simulated: false });
  assert.equal(s.variants[0].winProbability, 0.8);
  assert.throws(() => normalizeResults({ nope: 1 }, { simulated: false }), /Unrecognised results shape/);
});

const { createWinnow } = await import("../kit/winnow-kit.ts");
const fakeFlagsmith = (variant?: string, boom = false) => {
  const calls: string[] = [];
  return {
    calls,
    getExperimentFlag: async () => {
      if (boom) throw new Error("network");
      return { variant, value: "control" };
    },
    trackEvent: (event: string, o?: { identifier?: string }) => calls.push(`${event}:${o?.identifier}`),
    flushEvents: async () => void calls.push("flush"),
  };
};

test("kit picks the flag's variant, tracks with the same identity and flushes", async () => {
  const fs = fakeFlagsmith("friendly");
  const w = createWinnow({ flagsmith: fs, flag: "p", prompts: { control: "A", friendly: "B" } });
  const { variant, prompt } = await w.pick("u1");
  assert.deepEqual([variant, prompt], ["friendly", "B"]);
  w.track("u1", "thumbs_up");
  await w.flush();
  assert.deepEqual(fs.calls, ["thumbs_up:u1", "flush"]);
});

test("kit falls back on unknown variants and on errors", async () => {
  const unknown = createWinnow({ flagsmith: fakeFlagsmith("nope"), flag: "p", prompts: { control: "A", friendly: "B" } });
  assert.equal((await unknown.pick("u")).variant, "control");
  const broken = createWinnow({ flagsmith: fakeFlagsmith(undefined, true), flag: "p", prompts: { control: "A", friendly: "B" }, fallback: "friendly" });
  assert.equal((await broken.pick("u")).prompt, "B");
});

const { guardRequest, clientIp } = await import("../lib/guard.ts");
const { takeIpQuota } = await import("../lib/limits.ts");
const req = (headers: Record<string, string>) => new Request("http://localhost/api/roast", { method: "POST", headers });

test("guard: same-origin and body size", () => {
  assert.doesNotThrow(() => guardRequest(req({ host: "winnow.app" })));
  assert.doesNotThrow(() => guardRequest(req({ host: "winnow.app", origin: "https://winnow.app" })));
  assert.throws(() => guardRequest(req({ host: "winnow.app", origin: "https://evil.com" })), InputError);
  assert.throws(() => guardRequest(req({ host: "winnow.app", "content-length": "999999" })), InputError);
  assert.equal(clientIp(req({ "x-forwarded-for": "1.2.3.4, 5.6.7.8" })), "1.2.3.4");
  assert.equal(clientIp(req({})), "unknown");
});

test("per-IP quota caps a day", () => {
  const now = new Date("2026-11-19T00:00:00Z");
  let ok = 0;
  for (let i = 0; i < 40; i++) if (takeIpQuota("9.9.9.9", now)) ok++;
  assert.equal(ok, 30);
});

const { parseRoastCount } = await import("../lib/engagement.ts");
test("roast counter cookie parsing is safe", () => {
  assert.equal(parseRoastCount(undefined), 0);
  assert.equal(parseRoastCount("3"), 3);
  assert.equal(parseRoastCount("abc"), 0);
  assert.equal(parseRoastCount("-5"), 0);
  assert.equal(parseRoastCount("99999"), 0);
});
