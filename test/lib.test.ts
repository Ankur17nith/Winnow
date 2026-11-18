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
