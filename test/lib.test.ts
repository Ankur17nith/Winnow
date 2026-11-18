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
