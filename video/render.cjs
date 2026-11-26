// Renders the demo video's frames from the real app (preview mode) and the app's own stylesheet.
// Every frame is a function of its time: CSS animations are paused and seeked, typing, scrolling and the cursor are
// computed from t, and the roast request is held until its scripted reply time.
//
//   NODE_PATH=$(npm root -g) node video/render.cjs                 all frames -> video/work/frames
//   NODE_PATH=$(npm root -g) node video/render.cjs --stills 3,21.5  PNG stills at those times -> video/work/stills
//
// Needs the app running in preview mode at APP_URL (default http://localhost:3117) and video/work/vo/manifest.json.
const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");

const APP = process.env.APP_URL ?? "http://localhost:3117";
const W = 1920, H = 1080, FPS = 30;
const BEAT = 60 / 120.19; // the music's tempo; every cut lands on a beat
const LEAD = 0.6, TAIL = 1.3, DIP = 0.3;
const WORK = path.join(__dirname, "work");
const manifest = JSON.parse(fs.readFileSync(path.join(WORK, "vo", "manifest.json"), "utf8"));
const vo = (s) => (manifest[s] ? manifest[s].dur : 0);
const ceilBeat = (s) => Math.ceil(s / BEAT - 1e-9) * BEAT;
const ease = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const clamp01 = (x) => Math.max(0, Math.min(1, x));
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// ---------- shared page helpers (injected into every page) ----------
const PAGE_HELPERS = `
window.__seek = (vt) => {
  for (const a of document.getAnimations()) {
    if (a.__t0 === undefined) a.__t0 = vt;
    a.pause();
    a.currentTime = Math.max(0, (vt - a.__t0) * 1000);
  }
};
window.__setValue = (sel, v) => {
  const el = document.querySelector(sel); if (!el || el.value === v) return;
  const set = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), 'value').set;
  set.call(el, v); el.dispatchEvent(new Event('input', { bubbles: true }));
};
window.__center = (sel) => { const el = document.querySelector(sel); if (!el) return null;
  const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; };
window.__top = (sel) => { const el = document.querySelector(sel); if (!el) return null;
  return el.getBoundingClientRect().top + window.scrollY; };
(() => {
  if (document.getElementById('__overlay')) return;
  const st = document.createElement('style'); st.id = '__vstyle';
  st.textContent = \`html{scroll-behavior:auto!important} ::-webkit-scrollbar{display:none}
  #__dip{position:fixed;inset:0;background:var(--paper,#fff7ea);z-index:2147483646;pointer-events:none}
  #__cursor{position:fixed;left:0;top:0;width:44px;height:44px;z-index:2147483647;pointer-events:none;transform-origin:6px 4px}
  #__chip{position:fixed;left:40px;bottom:32px;z-index:2147483645;font:500 17px/1 var(--font-plex),monospace;color:var(--ink,#0b1533);
    background:var(--card,#fffcf5);border:2px solid var(--ink,#0b1533);border-radius:8px;padding:10px 14px;letter-spacing:.02em}\`;
  document.head.appendChild(st);
  const o = document.createElement('div'); o.id = '__overlay';
  o.innerHTML = '<div id="__dip"></div><div id="__chip" style="display:none"></div>' +
   '<svg id="__cursor" viewBox="0 0 24 24" style="display:none"><path d="M3 2l7.5 19 2.6-7.4L20.5 11z" fill="#0b1533" stroke="#fffcf5" stroke-width="1.6" stroke-linejoin="round"/></svg>';
  document.body.appendChild(o);
})();
window.__overlay = ({ dip, chip, cursor }) => {
  document.getElementById('__dip').style.opacity = dip;
  const c = document.getElementById('__chip');
  if (chip) { c.style.display = 'block'; c.textContent = chip; } else c.style.display = 'none';
  if (cursor === undefined) return;
  const k = document.getElementById('__cursor');
  if (cursor) { k.style.display = 'block'; k.style.transform = 'translate(' + cursor.x + 'px,' + cursor.y + 'px) scale(' + cursor.s + ')'; }
  else k.style.display = 'none';
};
// Declarative motion for the text scenes: data-in="start,dur" data-fx="rise|fade|pop|stamp|grow", data-type="start,cps".
window.__render = (t) => {
  const e = (x) => x <= 0 ? 0 : x >= 1 ? 1 : 1 - Math.pow(1 - x, 3);
  for (const el of document.querySelectorAll('[data-in]')) {
    const [s, d] = el.dataset.in.split(',').map(Number); const p = e((t - s) / (d || 0.6));
    const fx = el.dataset.fx || 'rise';
    let tr = '';
    if (fx === 'rise') tr = 'translateY(' + (1 - p) * 46 + 'px)';
    if (fx === 'pop') tr = 'scale(' + (0.92 + 0.08 * p) + ')';
    if (fx === 'stamp') tr = 'scale(' + (1.7 - 0.7 * p) + ') rotate(' + (el.dataset.rot || -8) + 'deg)';
    if (fx === 'grow') { el.style.transformOrigin = 'left center'; tr = 'scaleX(' + p + ')'; }
    el.style.opacity = fx === 'grow' ? 1 : p; el.style.transform = tr;
  }
  for (const el of document.querySelectorAll('[data-out]')) {
    const [s, d] = el.dataset.out.split(',').map(Number);
    const p = 1 - e((t - s) / (d || 0.4)); el.style.opacity = Math.min(Number(el.style.opacity || 1), p);
  }
  for (const el of document.querySelectorAll('[data-type]')) {
    const [s, cps] = el.dataset.type.split(',').map(Number);
    const full = el.dataset.full ?? (el.dataset.full = el.textContent);
    const n = Math.max(0, Math.floor((t - s) * cps));
    el.textContent = full.slice(0, n); el.style.visibility = n > 0 ? 'visible' : 'hidden';
  }
  for (const box of document.querySelectorAll('[data-follow]')) {
    const inner = box.firstElementChild; const over = inner.scrollHeight - box.clientHeight;
    inner.style.transform = 'translateY(' + (-Math.max(0, over)) + 'px)';
  }
  for (const el of document.querySelectorAll('[data-on]')) {
    const s = Number(el.dataset.on); el.classList.toggle('on', t >= s);
  }
};
`;

// ---------- text-scene styles (built on the app's own tokens and fonts) ----------
const SCENE_CSS = `
body > *:not(#__overlay):not(.v){display:none!important}
.v{position:fixed;inset:0;padding:110px 150px;display:flex;flex-direction:column;justify-content:center;gap:26px}
.v-eyebrow{font:500 20px/1 var(--font-plex),monospace;letter-spacing:.16em;text-transform:uppercase;color:var(--ink);margin:0}
.v-h{margin:0;font-family:var(--font-archivo);font-weight:800;font-stretch:70%;text-transform:uppercase;color:var(--ink);
  font-size:150px;line-height:.86;letter-spacing:-.01em}
.v-h .l{display:block}
.v-h.sm{font-size:96px}
.v-accent{color:var(--rescue);text-shadow:5px 5px 0 var(--grain)}
.v-cards{display:grid;grid-template-columns:repeat(3,1fr);gap:34px;margin-top:20px}
.v-card{position:relative;background:var(--card);border:3px solid var(--ink);border-radius:16px;padding:34px 34px 40px;min-height:290px}
.v-card .k{display:inline-block;font:800 30px/1 var(--font-archivo);font-stretch:70%;letter-spacing:.08em;text-transform:uppercase;
  padding:9px 14px;border:3px solid var(--ink);border-radius:8px;background:var(--c);color:var(--ink)}
.v-card p{font:400 27px/1.45 var(--font-plex),monospace;color:var(--ink);margin:24px 0 0}
.v-q{position:absolute;right:26px;top:-34px;width:96px;height:96px;border-radius:50%;background:var(--paper);border:3px solid var(--ink);
  display:grid;place-items:center;font:800 64px/1 var(--font-archivo);color:var(--rescue);box-shadow:4px 4px 0 var(--ink)}
.v-pill{align-self:flex-start;font:600 30px/1 var(--font-plex),monospace;color:var(--ink);background:var(--grain);border:3px solid var(--ink);
  border-radius:10px;padding:16px 22px;box-shadow:5px 5px 0 var(--ink)}
.v-term{background:var(--ink);border-radius:16px;box-shadow:9px 9px 0 var(--rescue);overflow:hidden;border:3px solid var(--ink)}
.v-term .bar{display:flex;gap:10px;align-items:center;padding:16px 22px;background:#16224a;font:500 20px/1 var(--font-plex),monospace;color:#c9d3f5}
.v-term .bar i{width:14px;height:14px;border-radius:50%;background:#ff5a1f;display:inline-block}
.v-term .bar i+i{background:#ffc93c} .v-term .bar i+i+i{background:#19c79a}
.v-term .body{height:560px;overflow:hidden;padding:20px 28px}
.v-term pre{margin:0;font:400 21px/1.62 var(--font-plex),monospace;color:#fff7ea;white-space:pre-wrap;word-break:break-all}
.v-term .step{color:#ffc93c;font-weight:500} .v-term .cmd{color:#c9d3f5} .v-term .json{color:#8fe3c6}
.v-row{display:flex;gap:20px;flex-wrap:wrap}
.v-chip{font:600 24px/1 var(--font-plex),monospace;color:var(--ink);background:var(--card);border:3px solid var(--ink);border-radius:10px;padding:14px 18px}
.v-chip.on{background:var(--mint)}
.v-two{display:grid;grid-template-columns:1.25fr 1fr;gap:40px;align-items:start}
.v-code{background:var(--card);border:3px solid var(--ink);border-radius:16px;padding:26px 30px;box-shadow:7px 7px 0 var(--ink)}
.v-code pre{margin:0;font:400 22px/1.6 var(--font-plex),monospace;color:var(--ink);white-space:pre-wrap}
.v-code .s{color:#08805f} .v-code .c{color:var(--muted)} .v-code .hl{background:rgba(255,201,60,.55);border-radius:4px}
.v-code .cap{font:500 18px/1 var(--font-plex),monospace;letter-spacing:.12em;text-transform:uppercase;color:var(--muted);margin-bottom:16px}
.v-tests{background:var(--ink);border-radius:16px;padding:26px 30px;border:3px solid var(--ink)}
.v-tests div{font:400 22px/1.75 var(--font-plex),monospace;color:#c9d3f5}
.v-tests .ok{color:#19c79a} .v-tests .hot{color:#fff7ea;font-weight:500}
.v-end{align-items:center;text-align:center;gap:22px}
.v-word{font-family:var(--font-archivo);font-weight:800;font-stretch:70%;font-size:250px;line-height:.85;color:var(--ink);margin:0}
.v-word b{color:var(--rescue)}
.v-tag{font:500 46px/1.2 var(--font-archivo);color:var(--ink-2);margin:0}
.v-url{font:500 30px/1 var(--font-plex),monospace;color:var(--sea-deep);margin:8px 0 0}
.v-cred{position:absolute;bottom:46px;left:0;right:0;text-align:center;font:400 19px/1.5 var(--font-plex),monospace;color:var(--muted)}
`;

function hl(code, hot = []) {
  return code.split("\n").map((line, i) => {
    const at = line.indexOf("//");
    const src = at > -1 ? line.slice(0, at) : line, note = at > -1 ? line.slice(at) : "";
    const h = esc(src).replace(/(`[^`]*`|"[^"]*")/g, '<span class="s">$1</span>') + (note ? `<span class="c">${esc(note)}</span>` : "");
    return hot.includes(i) ? `<span class="hl">${h}</span>` : h;
  }).join("\n");
}

// ---------- scenes ----------
const ring = `<svg width="150" height="150" viewBox="0 0 64 64"><circle cx="35" cy="35" r="26" fill="#ff5a1f" opacity=".55"/><circle cx="32" cy="32" r="26" fill="#ffc93c" stroke="#0b1533" stroke-width="5"/><circle cx="32" cy="32" r="12" fill="#fff7ea" stroke="#0b1533" stroke-width="4"/><path d="M32 6v14M32 44v14M6 32h14M44 32h14" stroke="#0b1533" stroke-width="3"/></svg>`;

function textUnit(id, scenes, build, extra = {}) {
  return { id, scenes, kind: "text", build, ...extra };
}

const dry = fs.readFileSync(path.join(WORK, "dryrun.txt"), "utf8").trim().replace(/ENVIRONMENT_KEY/g, "<env>");
const shipCode = `const rl = createInterface({ input: process.stdin, output: process.stdout });
const answer = (await rl.question(\`Type "\${d.winner}" to approve and ship\`)).trim();
if (answer !== d.winner) {
  console.log("Cancelled. Nothing changed.");
  process.exit(0);
}
flagsmith(["flag", "update", "roast_prompt", "--weight", weights]);`;
const tests = fs.readFileSync(path.join(WORK, "tests.txt"), "utf8").trim().split("\n");
const kitCode = `const winnow = createWinnow({
  flagsmith,
  flag: "support_prompt",
  prompts: { control: "You are a concise support agent.",
             friendly: "You are a warm, patient support agent." },
});

const { variant, prompt } = await winnow.pick(userId); // exposure
// ...call your LLM with \`prompt\`...
winnow.track(userId, "thumbs_up");                      // conversion
await winnow.flush();`;

const L = (s) => LEAD; // voice starts LEAD seconds into its scene
const UNITS = [
  textUnit("u1", ["1"], (o) => `<div class="v">
    <p class="v-eyebrow" data-in="0.2,0.6" data-fx="fade">Winnow · WeMakeDevs × Flagsmith · Track 01</p>
    <h1 class="v-h"><span class="l" data-in="0.35,0.7">Every AI feature</span><span class="l" data-in="0.6,0.7">ships with a prompt.</span>
    <span class="l v-accent" data-in="${o.v + 2.9},0.7">Picked on a gut feeling.</span></h1></div>`, { min: 7 }),
  textUnit("u2", ["2"], (o) => {
    const P = [["control", "friendly", "var(--sea)", "You are a friendly code reviewer who gently roasts a project's README."],
      ["savage", "savage", "var(--rescue)", "You are a merciless but witty comedian roasting a project's README."],
      ["actionable", "actionable", "var(--mint)", "You are a sharp documentation reviewer. Start with a scorecard."]];
    return `<div class="v">
    <p class="v-eyebrow" data-in="0.2,0.5" data-fx="fade">Three real system prompts · lib/prompts.ts</p>
    <h1 class="v-h sm" data-in="0.3,0.7">Which one do people prefer?</h1>
    <div class="v-cards">${P.map((p, i) => `<div class="v-card" style="--c:${p[2]}" data-in="${0.6 + i * 0.25},0.7">
      <span class="k">${p[1]}</span><p>${esc(p[3])}</p>
      <div class="v-q" data-in="${o.v + 2.4 + i * 0.25},0.45" data-fx="stamp" data-rot="${[-8, 6, -4][i]}">?</div></div>`).join("")}</div>
    <div class="v-pill" data-in="${o.v + 5.0},0.6" data-fx="pop">⚑ roast_prompt · one multivariate Flagsmith flag</div></div>`;
  }, { min: 9 }),
  { id: "u3", scenes: ["3", "4"], kind: "app", url: "/", chip: "The real app · preview mode, so roasts are canned and marked [preview]" },
  textUnit("u5", ["5"], (o) => `<div class="v" style="gap:22px">
    <p class="v-eyebrow" data-in="0.1,0.5" data-fx="fade">Real output · npm run setup:flagsmith -- --dry-run</p>
    <h1 class="v-h sm" data-in="0.2,0.6">One command sets up the test.</h1>
    <div class="v-term" data-in="0.5,0.6" data-fx="pop"><div class="bar"><i></i><i></i><i></i>&nbsp;&nbsp;winnow % npm run setup:flagsmith -- --environment &lt;env&gt; --dry-run</div>
      <div class="body" data-follow><pre data-type="${o.v + 0.2},155">${esc(dry)}</pre></div></div>
    <div class="v-row"><span class="v-chip" data-in="${o.v + 6.8},0.5" data-on="${o.v + 7.4}">exposure → anonymous id</span>
      <span class="v-chip" data-in="${o.v + 7.2},0.5" data-on="${o.v + 7.8}">vote → the same id</span>
      <span class="v-chip" data-in="${o.v + 8.6},0.5" data-on="${o.v + 9.2}">Flagsmith compares the arms</span></div></div>`, { min: 12 }),
  { id: "u6", scenes: ["6", "6R"], kind: "app", url: "/race", chip: "The real race page · no results yet: the experiment has not run" },
  textUnit("u7", ["7"], (o) => `<div class="v">
    <p class="v-eyebrow" data-in="0.1,0.5" data-fx="fade">Real code · scripts/ship-winner.ts</p>
    <h1 class="v-h sm" data-in="0.2,0.6">A person types the winner's name.</h1>
    <div class="v-two"><div class="v-code" data-in="0.5,0.6"><div class="cap">The only way a prompt ships</div><pre>${hl(shipCode, [1, 2])}</pre></div>
      <div class="v-tests" data-in="${o.v + 3.4},0.6">${tests.filter((tl) => /identity cookie|decision|guard|^# /.test(tl)).map((tl) => `<div class="${/decision/.test(tl) ? "hot" : tl.startsWith("ok") ? "ok" : ""}">${esc(tl.replace(/^ok \d+ - /, "✓ "))}</div>`).join("")}</div></div></div>`, { min: 10 }),
  textUnit("u8", ["8"], (o) => `<div class="v" data-out="${o.v + 4.6},0.35">
    <p class="v-eyebrow" data-in="0.1,0.5" data-fx="fade">kit/winnow-kit.ts · for anyone's prompts</p>
    <h1 class="v-h sm" data-in="0.2,0.6">Ten lines. Any prompt.</h1>
    <div class="v-code" data-in="0.5,0.6" style="max-width:1320px"><pre>${hl(kitCode, [8, 10])}</pre></div></div>
    <div class="v v-end"><div data-in="${o.v + 5.0},0.6" data-fx="pop">${ring}</div>
      <p class="v-word" data-in="${o.v + 5.15},0.7">WINN<b>O</b>W</p>
      <p class="v-tag" data-in="${o.v + 5.5},0.6">Let your users pick the winning prompt.</p>
      <p class="v-url" data-in="${o.v + 6.0},0.6">github.com/Ankur17nith/Winnow</p>
      <p class="v-cred" data-in="${o.v + 6.4},0.6">Built with Flagsmith Experimentation · Music: Sascha Ende, ende.app (CC BY 4.0) · Voices: ElevenLabs<br>App shown in preview mode: no real results yet</p></div>`, { tail: 4.2 }),
];

// ---------- timeline ----------
function buildTimeline() {
  let start = 0;
  const units = [];
  for (const u of UNITS) {
    const subs = [];
    let off = 0;
    for (const s of u.scenes) {
      if (!manifest[s]) continue;
      const minLen = { 3: 14, 4: 12 }[s] ?? 0;
      const len = Math.max(minLen, LEAD + vo(s) + (s === u.scenes.at(-1) && u.tail ? u.tail : TAIL));
      subs.push({ scene: s, off, voAt: off + LEAD, len });
      off += len;
    }
    const dur = ceilBeat(Math.max(u.min ?? 0, off));
    units.push({ ...u, start, dur, subs, v: subs[0]?.voAt ?? LEAD });
    start += dur;
  }
  return { units, total: start };
}

// ---------- app scene choreography ----------
const README = `# lazy-cli
A blazing fast CLI. It does many things.

## Install
Clone it and figure it out.

## Usage
Run it. It is fast.`;

function u3Plan(u) {
  const s4 = u.subs[1].off;
  const v3 = u.subs[0].voAt, v4 = u.subs[1].voAt;
  return {
    typeFrom: v3 + 1.4, typeTo: v3 + 4.4,
    click: v3 + 5.2, reply: v3 + 7.6,
    scroll: [ // [t, target]  target: number | () => selector-based
      [0, 0], [v3 + 0.6, 0], [v3 + 1.7, "tool"], [v3 + 7.7, "tool"], [v3 + 9.0, "ticket"], [s4 + 0.2, "ticket"],
      [v4 + 2.9, "ticket"], [v4 + 4.2, "reveal"]],
    cursor: [[v3 + 4.0, { x: 1000, y: 560 }], [v3 + 4.9, ".actions .btn.primary"], [v3 + 6.0, ".actions .btn.primary"], [v3 + 6.6, null],
      [v4 + 0.2, null], [v4 + 0.3, { x: 1000, y: 650 }], [v4 + 1.3, ".stamp.grain"], [v4 + 2.4, ".stamp.grain"], [v4 + 2.9, ".stamp.chaff"], [v4 + 3.8, ".stamp.chaff"], [v4 + 4.3, null]],
    presses: [v3 + 5.2, v4 + 1.6],
    grain: v4 + 1.6,
  };
}

async function main() {
  const { units, total } = buildTimeline();
  const stillsArg = (() => { const i = process.argv.indexOf("--stills"); return i > -1 ? process.argv[i + 1].split(",").map(Number) : null; })();
  fs.writeFileSync(path.join(WORK, "timeline.json"), JSON.stringify({ fps: FPS, beat: BEAT, total, units: units.map((u) => ({ id: u.id, start: u.start, dur: u.dur, vo: u.subs.map((s) => ({ scene: s.scene, at: u.start + s.voAt, file: manifest[s.scene].file })) })) }, null, 2));
  console.log(`total ${total.toFixed(2)}s, ${Math.round(total * FPS)} frames`);
  for (const u of units) console.log(`  ${u.id} ${u.start.toFixed(2)}–${(u.start + u.dur).toFixed(2)} (${u.dur.toFixed(2)}s)`);

  const outDir = path.join(WORK, stillsArg ? "stills" : "frames");
  fs.rmSync(outDir, { recursive: true, force: true });
  fs.mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch();
  let frameNo = 0;

  for (const u of units) {
    const want = stillsArg ? stillsArg.filter((g) => g >= u.start && g < u.start + u.dur).map((g) => g - u.start) : null;
    if (want && want.length === 0) { continue; }
    const page = await browser.newPage(u.kind === "app"
      ? { viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1.5 }
      : { viewport: { width: W, height: H }, deviceScaleFactor: 1 });
    let release = null; let held = null;
    if (u.kind === "app") {
      await page.route("**/api/roast", async (route) => { held = new Promise((r) => (release = r)); await held; await route.continue(); });
    }
    await page.goto(APP + (u.url ?? "/"), { waitUntil: "networkidle" });
    if (u.kind === "text") {
      await page.evaluate(({ html, css }) => {
        const st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);
        const w = document.createElement("div"); w.innerHTML = html;
        for (const c of [...w.children]) document.body.appendChild(c);
      }, { html: u.build(u), css: SCENE_CSS });
    }
    await page.addScriptTag({ content: PAGE_HELPERS });
    await page.evaluate(() => document.fonts.ready);
    await page.evaluate(() => window.__seek(0));

    const plan = u.id === "u3" ? u3Plan(u) : null;
    const done = new Set();
    const cache = {};
    const resolveY = async (target) => {
      if (typeof target === "number") return target;
      if (cache[target] !== undefined) return cache[target];
      const sel = { tool: "#tool", ticket: ".ticket", reveal: ".reveal" }[target];
      const top = await page.evaluate((s) => window.__top(s), sel);
      if (top === null) return null;
      const y = Math.max(0, top - (target === "tool" ? 95 : target === "ticket" ? 90 : 300));
      return (cache[target] = y);
    };
    const pos = async (target) => (typeof target === "string" ? page.evaluate((s) => window.__center(s), target) : target);

    const all = Array.from({ length: Math.round(u.dur * FPS) }, (_, i) => i / FPS);
    const keep = want ? new Set(want.map((w) => Math.min(all.length - 1, Math.round(w * FPS)))) : null;
    const lastKeep = keep ? Math.max(...keep) : all.length - 1;
    for (let fi = 0; fi <= lastKeep; fi++) {
      const t = all[fi];
      if (plan) {
        // events, in order, once each
        const typed = Math.round(README.length * clamp01((t - plan.typeFrom) / (plan.typeTo - plan.typeFrom)));
        await page.evaluate(([v]) => window.__setValue("#readme", v), [README.slice(0, typed)]);
        if (t >= plan.click && !done.has("click")) { done.add("click"); await page.evaluate(() => document.querySelector(".actions .btn.primary").click()); await page.waitForSelector(".basket.is-shaking"); }
        if (t >= plan.reply && !done.has("reply")) { done.add("reply"); while (!release) await new Promise((r) => setTimeout(r, 20)); release(); await page.waitForSelector(".ticket"); }
        if (t >= plan.grain && !done.has("grain")) { done.add("grain"); await page.evaluate(() => document.querySelector(".stamp.grain").click()); await page.waitForSelector(".reveal"); }
        // scroll
        let y = 0;
        for (let i = 0; i < plan.scroll.length - 1; i++) {
          const [ta, a] = plan.scroll[i], [tb, b] = plan.scroll[i + 1];
          if (t >= ta) { const ya = await resolveY(a), yb = await resolveY(b);
            y = yb === null ? (ya ?? 0) : (ya ?? 0) + (yb - (ya ?? 0)) * ease((t - ta) / (tb - ta)); }
        }
        if (t >= plan.scroll.at(-1)[0]) y = (await resolveY(plan.scroll.at(-1)[1])) ?? y;
        await page.evaluate((yy) => window.scrollTo(0, yy), y);
        // cursor
        let cur = null;
        for (let i = 0; i < plan.cursor.length - 1; i++) {
          const [ta, a] = plan.cursor[i], [tb, b] = plan.cursor[i + 1];
          if (t >= ta && t < tb && a && b) { const pa = await pos(a), pb = await pos(b);
            if (pa && pb) { const k = ease((tb - ta) > 0 ? (t - ta) / (tb - ta) : 1); cur = { x: pa.x + (pb.x - pa.x) * k, y: pa.y + (pb.y - pa.y) * k }; } }
        }
        if (cur) { const press = plan.presses.some((p) => t >= p && t < p + 0.18); cur = { x: cur.x - 6, y: cur.y - 4, s: press ? 0.82 : 1 }; }
        await page.evaluate((c) => window.__overlay({ dip: 0, chip: null, cursor: c }), cur);
      }
      if (u.id === "u6") {
        const band = clamp01((t - (u.subs[0].voAt + 1.6)) / 0.6);
        await page.evaluate((b) => { const el = document.querySelector(".band");
          if (el) { el.style.transform = `translate(${-4 * b}px,${-4 * b}px)`; el.style.boxShadow = `${8 * b}px ${8 * b}px 0 var(--ink)`; } }, band);
      }
      await page.evaluate((tt) => { window.__render(tt); window.__seek(tt); }, t);
      const dip = Math.max(clamp01(1 - t / DIP), clamp01((t - (u.dur - DIP)) / DIP));
      await page.evaluate(([d, chip]) => window.__overlay({ dip: d, chip }), [dip, u.chip ?? null]);
      if (keep && !keep.has(fi)) continue;
      const file = stillsArg ? path.join(outDir, `t${(u.start + t).toFixed(2)}.png`) : path.join(outDir, `${String(frameNo).padStart(6, "0")}.jpg`);
      await page.screenshot(stillsArg ? { path: file } : { path: file, type: "jpeg", quality: 92 });
      frameNo++;
      if (!stillsArg && frameNo % 300 === 0) console.log(`  frame ${frameNo}`);
    }
    await page.close();
  }
  await browser.close();
  console.log(`wrote ${frameNo} ${stillsArg ? "stills" : "frames"} to ${outDir}`);
}
main().catch((e) => { console.error(e); process.exit(1); });
