// Builds the pitch deck from the running app's own stylesheet and fonts, then prints it to a 16:9 PDF.
//   NODE_PATH=$(npm root -g) node presentation/deck.cjs   (needs the app on APP_URL, default http://localhost:3117)
// Output: presentation/winnow-deck.pdf and presentation/slides/NN.png
const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");

const APP = process.env.APP_URL ?? "http://localhost:3117";
const ROOT = path.join(__dirname, "..");
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const home = "data:image/png;base64," + fs.readFileSync(path.join(ROOT, "docs/assets/home.png")).toString("base64");
const tests = fs.readFileSync(path.join(ROOT, "test/lib.test.ts"), "utf8").match(/^test\(/gm).length;
let standings = null;
try { standings = JSON.parse(fs.readFileSync(path.join(ROOT, "data/results.json"), "utf8")); } catch { standings = null; }

const ring = `<svg width="120" height="120" viewBox="0 0 64 64"><circle cx="35" cy="35" r="26" fill="#ff5a1f" opacity=".55"/><circle cx="32" cy="32" r="26" fill="#ffc93c" stroke="#0b1533" stroke-width="5"/><circle cx="32" cy="32" r="12" fill="#fff7ea" stroke="#0b1533" stroke-width="4"/><path d="M32 6v14M32 44v14M6 32h14M44 32h14" stroke="#0b1533" stroke-width="3"/></svg>`;
const slide = (n, inner, cls = "") => `<section class="s ${cls}"><div class="n">${String(n).padStart(2, "0")}</div>${inner}</section>`;

const results = standings
  ? `<div class="piles">${standings.variants.map((v) => `<div class="pile"><b>${Math.round(v.winProbability * 100)}%</b><span>${esc(v.key)}</span><em>${v.conversions} liked / ${v.exposures} visitors</em></div>`).join("")}</div>
     <p class="dfoot">From Flagsmith Experimentation, ${esc(new Date(standings.updatedAt).toUTCString())}.${standings.simulated ? " <mark>SIMULATED REHEARSAL DATA</mark>" : " Real visitors."}</p>`
  : `<div class="pending"><p class="big">Not run yet.</p><p>The flag, metrics and experiment are one command away (<code>npm run setup:flagsmith</code>).
     This slide fills itself from <code>data/results.json</code> once Flagsmith has results. No number on it is invented.</p></div>`;

const SLIDES = [
  slide(1, `<div class="title">${ring}<h1 class="word">WINN<b>O</b>W</h1><p class="tag">Let your users pick the winning prompt.</p>
    <p class="meta">WeMakeDevs × Flagsmith hackathon · Track 01: Test Something Real · github.com/Ankur17nith/Winnow</p></div>`, "center"),
  slide(2, `<p class="eye">The problem</p><h2>Teams pick LLM prompts<br><span class="acc">on a gut feeling.</span></h2>
    <ul class="big-list"><li>Changing a prompt means a redeploy.</li><li>Nobody measures which version people actually prefer.</li><li>Feature flags already solve "ship to some users and measure". Prompts never got the same treatment.</li></ul>`),
  slide(3, `<div class="split"><div><p class="eye">The product</p><h2>Paste your README.<br><span class="acc">Get roasted.</span></h2>
    <p class="lede">Every visitor silently gets one of three system prompts from a multivariate Flagsmith flag, then votes <b>grain</b> (keep it) or <b>chaff</b> (toss it). Only after the vote does Winnow reveal which prompt they got.</p></div>
    <img class="shot" src="${home}" alt="Winnow home page"></div>`),
  slide(4, `<p class="eye">How one visit works</p><h2>Two requests, one identity.</h2>
    <div class="flow">${[["Visitor", "pastes a README or a GitHub link"], ["getExperimentFlag", "deals friendly, savage or actionable; exposure recorded"], ["Groq", "writes the roast; the README is untrusted data"], ["Vote", "thumbs_up / thumbs_down for the same anonymous id"], ["Reveal", "variant shown only after the vote"]].map(([a, b], i) => `<div class="dstep"><span>${i + 1}</span><b>${a}</b><p>${b}</p></div>`).join("")}</div>
    <p class="dfoot">Every Flagsmith call is server-side, so the prompts never reach the browser and exposure and conversion always share the cookie's identity.</p>`),
  slide(5, `<p class="eye">The experiment</p><h2>Do developers want AI feedback<br><span class="acc">kind, brutal or actionable?</span></h2>
    <table>${[["Flag", "roast_prompt · multivariate · control, savage, actionable"], ["Split", "34 / 33 / 33 · 100% of visitors"], ["Primary metric", "thumbs_up (Roast liked)"], ["Fires early", "roast_again: the visitor comes back for a second roast"], ["Sanity check", "roast_requested: near 100% in every arm by design"], ["Decision rule", "ship at ≥ 90% win probability with ≥ 30 visitors in every arm, fixed before any data"]].map(([a, b]) => `<tr><th>${a}</th><td>${b}</td></tr>`).join("")}</table>`),
  slide(6, `<p class="eye">Why it needs Flagsmith</p><h2>The flag <span class="acc">is</span> the product.</h2>
    <div class="grid4">${[["Variants", "Prompts live in a multivariate flag, not a code branch."], ["Experimentation", "Exposures and votes go in through the Node SDK; the Bayesian engine gives win probability."], ["Kill switch", "roasts_enabled turns roasting off instantly to protect the free LLM quota."], ["Rollout", "Shipping the winner is flagsmith flag update --weight, not a deploy."]].map(([a, b]) => `<div class="card"><b>${a}</b><p>${b}</p></div>`).join("")}</div>`),
  slide(7, `<p class="eye">Honest by construction</p><h2>A winner ships only on the rule,<br><span class="acc">and only with a person.</span></h2>
    <ul class="big-list two"><li>No admin key in the app; setup, results and rollout run through the CLI on a person's machine.</li><li>Simulated data can never ship a prompt (tested).</li><li>The vote can't be influenced: the variant is revealed after it.</li><li>A vote must carry a signed token for that visitor's own roast.</li><li>Same-origin check, size limits, per-visitor and per-IP caps, strict CSP.</li><li>16 controls, each with its proof: <code>docs/safety.md</code>. ${tests} automated tests.</li></ul>`),
  slide(8, `<p class="eye">Results</p><h2>The race.</h2>${results}`),
  slide(9, `<p class="eye">For anyone's prompts</p><h2>winnow-kit: <span class="acc">ten lines.</span></h2>
    <pre class="code">const winnow = createWinnow({ flagsmith, flag: "support_prompt",
  prompts: { control: "You are a concise support agent.",
             friendly: "You are a warm, patient support agent." } });

const { variant, prompt } = await winnow.pick(userId); // exposure
// ...call your LLM with prompt...
winnow.track(userId, "thumbs_up");                      // conversion
await winnow.flush();</pre>`),
  slide(10, `<div class="title">${ring}<h1 class="word">WINN<b>O</b>W</h1><p class="tag">github.com/Ankur17nith/Winnow</p>
    <p class="meta">Built with Next.js, Flagsmith Experimentation and Groq · Design language adapted from Lifeline (MIT)<br>Music in the demo: Sascha Ende, ende.app (CC BY 4.0) · Voices: ElevenLabs</p></div>`, "center"),
];

const CSS = `
@page { size: 1920px 1080px; margin: 0 }
body > *:not(.deck) { display: none !important }
html, body { background: var(--paper) }
.s { width: 1920px; height: 1080px; position: relative; box-sizing: border-box; padding: 110px 150px; display: flex; flex-direction: column;
  justify-content: center; gap: 30px; page-break-after: always; break-after: page; overflow: hidden;
  background: var(--paper) radial-gradient(rgb(11 21 51 / .07) 1px, transparent 1px) 0 0 / 9px 9px }
.n { position: absolute; top: 56px; right: 70px; font: 500 22px/1 var(--font-martian), monospace; color: var(--muted) }
.eye { font: 500 22px/1 var(--font-plex), monospace; letter-spacing: .16em; text-transform: uppercase; color: var(--ink); margin: 0 }
h2 { margin: 0; font-family: var(--font-archivo); font-weight: 800; font-stretch: 70%; text-transform: uppercase; color: var(--ink); font-size: 104px; line-height: .9 }
.acc { color: var(--rescue); text-shadow: 4px 4px 0 var(--grain) }
.center { align-items: center; text-align: center }
.title { display: flex; flex-direction: column; align-items: center; gap: 18px }
.word { font-family: var(--font-archivo); font-weight: 800; font-stretch: 70%; font-size: 240px; line-height: .85; color: var(--ink); margin: 0 }
.word b { color: var(--rescue) }
.tag { font: 500 48px/1.2 var(--font-archivo); color: var(--ink-2); margin: 0 }
.meta { font: 400 24px/1.6 var(--font-plex), monospace; color: var(--muted); margin: 12px 0 0 }
.big-list { margin: 10px 0 0; padding: 0; list-style: none; display: grid; gap: 22px; max-width: 1450px }
.big-list li { font: 400 38px/1.35 var(--font-archivo); color: var(--ink-2); padding-left: 52px; position: relative }
.big-list li::before { content: ""; position: absolute; left: 0; top: 14px; width: 22px; height: 30px; border-radius: 50%; background: var(--grain); border: 3px solid var(--ink) }
.big-list.two { grid-template-columns: 1fr 1fr; gap: 26px 60px; max-width: none }
.big-list.two li { font-size: 31px }
.split { display: grid; grid-template-columns: 1fr 1.15fr; gap: 70px; align-items: center }
.lede { font: 400 34px/1.45 var(--font-archivo); color: var(--ink-2); margin: 24px 0 0 }
.shot { width: 100%; border: 3px solid var(--ink); border-radius: 16px; box-shadow: 9px 9px 0 var(--ink) }
.flow { display: grid; grid-template-columns: repeat(5, 1fr); gap: 22px }
.dstep { background: var(--card); border: 3px solid var(--ink); border-radius: 14px; padding: 26px 24px; min-height: 270px }
.dstep span { font: 300 54px/1 var(--font-martian), monospace; color: var(--rescue-ink) }
.dstep b { display: block; font: 700 30px/1.1 var(--font-plex), monospace; color: var(--ink); margin: 18px 0 10px }
.dstep p { font: 400 25px/1.4 var(--font-archivo); color: var(--body); margin: 0 }
.dfoot { font: 400 26px/1.5 var(--font-archivo); color: var(--body); margin: 0; max-width: 1500px }
table { border-collapse: collapse; font-family: var(--font-archivo); max-width: 1600px }
th, td { text-align: left; padding: 16px 26px 16px 0; border-bottom: 2px solid var(--line); vertical-align: top }
th { font: 600 26px/1.3 var(--font-plex), monospace; color: var(--ink); width: 300px }
td { font: 400 32px/1.35 var(--font-archivo); color: var(--ink-2) }
.grid4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 26px }
.card { background: var(--card); border: 3px solid var(--ink); border-radius: 14px; padding: 32px 28px; min-height: 300px; box-shadow: 6px 6px 0 var(--ink) }
.card b { font: 800 38px/1 var(--font-archivo); font-stretch: 70%; text-transform: uppercase; color: var(--ink) }
.card p { font: 400 28px/1.45 var(--font-archivo); color: var(--body); margin: 18px 0 0 }
.code { background: var(--card); border: 3px solid var(--ink); border-radius: 16px; padding: 34px 40px; box-shadow: 8px 8px 0 var(--ink);
  font: 400 28px/1.6 var(--font-plex), monospace; color: var(--ink); margin: 0; max-width: 1500px; white-space: pre-wrap }
code { font: 500 .9em var(--font-plex), monospace; background: var(--shade); padding: 2px 8px; border-radius: 6px }
.pending { background: var(--card); border: 3px solid var(--ink); border-radius: 16px; padding: 44px 50px; max-width: 1400px }
.pending .big { font: 800 64px/1 var(--font-archivo); font-stretch: 70%; text-transform: uppercase; color: var(--rescue-ink); margin: 0 0 18px }
.pending p { font: 400 32px/1.45 var(--font-archivo); color: var(--ink-2); margin: 0 }
.piles { display: grid; grid-template-columns: repeat(3, 1fr); gap: 28px }
.pile { background: var(--card); border: 3px solid var(--ink); border-radius: 14px; padding: 30px; display: grid; gap: 6px }
.pile b { font: 300 90px/1 var(--font-martian), monospace; color: var(--ink) } .pile span { font: 800 40px/1 var(--font-archivo); font-stretch: 70%; text-transform: uppercase; color: var(--ink) }
.pile em { font: 400 24px var(--font-plex), monospace; color: var(--muted); font-style: normal }
mark { background: #7b5cff; color: #fff; padding: 2px 10px; border-radius: 6px }
`;

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  await page.goto(APP + "/", { waitUntil: "networkidle" });
  await page.evaluate(({ html, css }) => {
    const st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);
    const d = document.createElement("div"); d.className = "deck"; d.innerHTML = html; document.body.appendChild(d);
  }, { html: SLIDES.join(""), css: CSS });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForFunction(() => [...document.images].every((i) => i.complete));
  const outDir = path.join(__dirname, "slides");
  fs.rmSync(outDir, { recursive: true, force: true }); fs.mkdirSync(outDir, { recursive: true });
  const sections = await page.$$(".s");
  for (let i = 0; i < sections.length; i++) await sections[i].screenshot({ path: path.join(outDir, `${String(i + 1).padStart(2, "0")}.png`) });
  await page.emulateMedia({ media: "print" });
  await page.pdf({ path: path.join(__dirname, "winnow-deck.pdf"), width: "1920px", height: "1080px", printBackground: true, margin: { top: 0, right: 0, bottom: 0, left: 0 } });
  await browser.close();
  console.log(`wrote ${sections.length} slides and presentation/winnow-deck.pdf`);
})().catch((e) => { console.error(e); process.exit(1); });
