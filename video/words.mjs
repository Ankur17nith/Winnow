// Transcribes each voiceover clip with ElevenLabs speech-to-text and saves word timings next to it, so scenes can be timed to
// the spoken words. Clips are keyed by file name, so an unchanged clip is not transcribed again. Prints each transcript so the
// words can be checked against video/script.md.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { basename } from "node:path";

const key = process.env.ELEVENLABS_API_KEY;
if (!key) throw new Error("ELEVENLABS_API_KEY is not set.");
const manifest = JSON.parse(readFileSync(new URL("./work/vo/manifest.json", import.meta.url), "utf8"));
for (const [scene, m] of Object.entries(manifest)) {
  const out = new URL(`./work/vo/words-${basename(m.file, ".mp3")}.json`, import.meta.url);
  if (!existsSync(out)) {
    const form = new FormData();
    form.append("model_id", "scribe_v1");
    form.append("file", new Blob([readFileSync(m.file)]), basename(m.file));
    const res = await fetch("https://api.elevenlabs.io/v1/speech-to-text", { method: "POST", headers: { "xi-api-key": key }, body: form });
    if (!res.ok) throw new Error(`Scene ${scene}: speech-to-text ${res.status} ${(await res.text()).slice(0, 200)}`);
    const d = await res.json();
    writeFileSync(out, JSON.stringify({ text: d.text, words: (d.words ?? []).filter((w) => w.type === "word").map((w) => ({ t: w.text, s: w.start, e: w.end })) }));
  }
  console.log(`${scene}: ${JSON.parse(readFileSync(out, "utf8")).text}`);
}
