// Builds the voiceover from video/script.md with ElevenLabs. Every clip is cached by its text and voice, so re-running
// costs nothing unless a line changed. The key is read from ELEVENLABS_API_KEY and never printed.
//
//   node video/vo.mjs              all lines
//   node video/vo.mjs --only US    one voice
//   node video/vo.mjs --results "After 120 visitors, actionable is at 93 percent to win."
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";

const key = process.env.ELEVENLABS_API_KEY;
if (!key) throw new Error("ELEVENLABS_API_KEY is not set.");

const VOICES = {
  // American English: a premade voice, so it works on the free plan.
  US: { id: process.env.VOICE_US ?? "EXAVITQu4vr4xnSDxMaL", model: "eleven_multilingual_v2", tag: "" },
  // Indian English: premade voices have no Indian accent and the free plan blocks library and designed voices through
  // the API, so this asks eleven_v3 for the accent with an audio tag.
  IN: { id: process.env.VOICE_IN ?? "iP95p4xoKVk53GoZ742B", model: "eleven_v3", tag: process.env.IN_TAG ?? "[strong Indian accent] " },
};

const arg = (n) => { const i = process.argv.indexOf(`--${n}`); return i > -1 ? process.argv[i + 1] : undefined; };
const only = arg("only");
const results = arg("results");

const rows = readFileSync(new URL("./script.md", import.meta.url), "utf8").split("\n")
  .filter((r) => /^\| \d+R? \|/.test(r))
  .map((r) => r.split("|").map((c) => c.trim()))
  .map((c) => ({ scene: c[1], voice: c[3], text: c[5] }));

const lines = rows.filter((r) => !r.scene.endsWith("R"));
if (results) lines.splice(lines.findIndex((l) => l.scene === "6") + 1, 0, { scene: "6R", voice: "US", text: results });

const dir = new URL("./work/vo/", import.meta.url);
mkdirSync(dir, { recursive: true });
const manifestUrl = new URL("manifest.json", dir);
const manifest = existsSync(manifestUrl) ? JSON.parse(readFileSync(manifestUrl, "utf8")) : {};

for (const line of lines) {
  const v = VOICES[line.voice];
  if (!v) throw new Error(`Unknown voice ${line.voice} in scene ${line.scene}`);
  if (only && line.voice !== only) continue;
  const text = v.tag + line.text;
  const hash = createHash("sha256").update(`${v.id}|${v.model}|${text}`).digest("hex").slice(0, 12);
  const file = new URL(`${line.scene}-${hash}.mp3`, dir);
  if (!existsSync(file)) {
    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${v.id}?output_format=mp3_44100_128`, {
      method: "POST",
      headers: { "xi-api-key": key, "content-type": "application/json" },
      body: JSON.stringify({ text, model_id: v.model }),
    });
    if (!res.ok) throw new Error(`Scene ${line.scene}: ElevenLabs ${res.status} ${(await res.text()).slice(0, 300)}`);
    writeFileSync(file, Buffer.from(await res.arrayBuffer()));
    console.log(`made  ${line.scene} (${line.voice}, ${text.length} chars)`);
  } else console.log(`cached ${line.scene}`);
  const dur = Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file.pathname], { encoding: "utf8" }));
  manifest[line.scene] = { file: file.pathname, voice: line.voice, dur: Math.round(dur * 1000) / 1000 };
}
if (!results) delete manifest["6R"];
writeFileSync(manifestUrl, JSON.stringify(manifest, null, 2));
console.log(Object.entries(manifest).map(([k, m]) => `${k}:${m.voice} ${m.dur}s`).join("  "));
