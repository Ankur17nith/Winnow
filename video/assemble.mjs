// Encodes video/work/frames, mixes the voiceover over low music, and writes brag-output/{brag.mp4,brag.jpg,share-copy.txt}.
//   node video/assemble.mjs
import { execFileSync } from "node:child_process";
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = new URL("..", import.meta.url).pathname;
const work = join(root, "video", "work");
const out = join(root, "brag-output");
mkdirSync(out, { recursive: true });
const tl = JSON.parse(readFileSync(join(work, "timeline.json"), "utf8"));
const total = tl.total;
const frames = Math.round(total * tl.fps);
const MUSIC = process.env.MUSIC ?? "/home/user/latent-spaces/brag/skills/brag/assets/music/happy-beats-business-moves-vol-1-by-ende-dot-app.mp3";
const FIRST_BEAT = 3.0186; // from brag's cue file: the music starts on a beat at frame 0
const ff = (args) => execFileSync("ffmpeg", ["-v", "error", "-y", ...args], { stdio: "inherit" });

// Poster: the hook, fully settled (6.6 s in), also baked in as frame 0 so every platform's thumbnail shows it.
const posterIdx = String(Math.round(6.6 * tl.fps)).padStart(6, "0");
copyFileSync(join(work, "frames", `${posterIdx}.jpg`), join(out, "brag.jpg"));
copyFileSync(join(work, "frames", `${posterIdx}.jpg`), join(work, "frames", "000000.jpg"));

// Picture.
ff(["-framerate", String(tl.fps), "-i", join(work, "frames", "%06d.jpg"), "-frames:v", String(frames),
  "-c:v", "libx264", "-preset", "slow", "-crf", "18", "-pix_fmt", "yuv420p", "-movflags", "+faststart", join(work, "picture.mp4")]);

// Sound: every voice clip at its timeline position; music low, ducked further under the voice; loudness -16 LUFS.
const vo = tl.units.flatMap((u) => u.vo);
const inputs = ["-ss", String(FIRST_BEAT), "-t", String(total + 0.5), "-i", MUSIC, ...vo.flatMap((v) => ["-i", v.file])];
const voChains = vo.map((v, i) => `[${i + 1}:a]aresample=44100,aformat=channel_layouts=stereo,adelay=${Math.round(v.at * 1000)}:all=1[v${i}]`);
const filter = [
  ...voChains,
  `${vo.map((_, i) => `[v${i}]`).join("")}amix=inputs=${vo.length}:normalize=0,apad,atrim=0:${total}[vo]`,
  `[vo]asplit=2[voA][voSC]`,
  `[0:a]aresample=44100,aformat=channel_layouts=stereo,atrim=0:${total},volume=0.16,afade=t=in:d=1.2,afade=t=out:st=${(total - 3).toFixed(2)}:d=3[m]`,
  `[m][voSC]sidechaincompress=threshold=0.02:ratio=5:attack=25:release=450[mduck]`,
  `[voA][mduck]amix=inputs=2:normalize=0,loudnorm=I=-16:TP=-1.5:LRA=11,aresample=48000[mix]`,
].join(";");
ff([...inputs, "-filter_complex", filter, "-map", "[mix]", "-c:a", "aac", "-b:a", "192k", join(work, "sound.m4a")]);

ff(["-i", join(work, "picture.mp4"), "-i", join(work, "sound.m4a"), "-map", "0:v", "-map", "1:a", "-c", "copy", "-shortest", "-movflags", "+faststart", join(out, "brag.mp4")]);

writeFileSync(join(out, "share-copy.txt"),
  "Teams pick LLM prompts on a gut feeling. Winnow puts the prompt behind a Flagsmith flag: paste your README, get roasted by one of three prompts, vote grain or chaff, and Flagsmith Experimentation finds the winner. Built for the WeMakeDevs x Flagsmith hackathon. github.com/Ankur17nith/Winnow\n");

const probe = (args) => execFileSync("ffprobe", ["-v", "error", ...args, join(out, "brag.mp4")], { encoding: "utf8" }).trim();
console.log("frames", probe(["-select_streams", "v", "-count_frames", "-show_entries", "stream=nb_read_frames", "-of", "csv=p=0"]), "expected", frames);
console.log("duration", probe(["-show_entries", "format=duration", "-of", "csv=p=0"]), "expected", total.toFixed(3));
