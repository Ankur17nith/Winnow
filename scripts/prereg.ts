/**
 * Hash and verify the pre-registration, so it cannot be edited after the experiment starts without anyone noticing.
 *
 *   npm run prereg -- hash      write prereg/HASHES.txt with the sha256 of each prereg file
 *   npm run prereg -- verify    fail if a prereg file no longer matches HASHES.txt
 *
 * After `hash`, commit and tag it: git tag -a prereg-exp1 -m "Pre-registration, experiment 1"
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { parseHashes, sha256 } from "../lib/prereg.ts";

const FILES = ["prereg/experiment-1.md"];
const cmd = process.argv[2];

if (cmd === "hash") {
  const lines = FILES.map((f) => `${sha256(readFileSync(f, "utf8"))}  ${f}`);
  writeFileSync("prereg/HASHES.txt", lines.join("\n") + "\n");
  console.log(lines.join("\n"));
  console.log('\nNow commit this, then tag it before starting the experiment:\n  git tag -a prereg-exp1 -m "Pre-registration, experiment 1"');
} else if (cmd === "verify") {
  if (!existsSync("prereg/HASHES.txt")) {
    console.error("prereg/HASHES.txt does not exist. The pre-registration has not been hashed: run `npm run prereg -- hash`.");
    process.exit(1);
  }
  const want = parseHashes(readFileSync("prereg/HASHES.txt", "utf8"));
  let bad = 0;
  for (const f of FILES) {
    const got = sha256(readFileSync(f, "utf8"));
    const ok = want[f] === got;
    console.log(`${ok ? "ok      " : "CHANGED "} ${f}`);
    if (!ok) bad++;
  }
  process.exit(bad ? 1 : 0);
} else {
  console.error("Usage: npm run prereg -- hash | verify");
  process.exit(2);
}
