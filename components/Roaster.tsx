"use client";

import { useEffect, useRef, useState } from "react";
import { Basket, Stamp } from "./Art";

type Standing = { key: string; exposures: number; conversions: number; winProbability: number | null };
type Reveal = { variant: string; standings: { updatedAt: string; simulated: boolean; variants: Standing[] } | null };

type Phase = "idle" | "loading" | "done";
const MAX = 12000;

export default function Roaster({ initialRepo }: { initialRepo?: string }) {
  const [mode, setMode] = useState<"paste" | "url">(initialRepo ? "url" : "paste");
  const [text, setText] = useState("");
  const [url, setUrl] = useState(initialRepo ?? "");
  const [phase, setPhase] = useState<Phase>("idle");
  const [roast, setRoast] = useState("");
  const [roastId, setRoastId] = useState("");
  const [error, setError] = useState("");
  const [vote, setVote] = useState<"up" | "down" | null>(null);
  const [reveal, setReveal] = useState<Reveal | null>(null);
  const [copied, setCopied] = useState(false);
  const ticket = useRef<HTMLDivElement>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (phase === "loading") return;
    setPhase("loading");
    setError("");
    setVote(null);
    setReveal(null);
    setCopied(false);
    setRoast("");
    try {
      const res = await fetch("/api/roast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mode === "paste" ? { text } : { repoUrl: url }),
      });
      const data = (await res.json()) as { roast?: string; roastId?: string; error?: string };
      if (!res.ok || !data.roast || !data.roastId) throw new Error(data.error ?? "Something went wrong. Try again.");
      setRoast(data.roast);
      setRoastId(data.roastId);
      setPhase("done");
      requestAnimationFrame(() => ticket.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Try again.");
      setPhase("idle");
    }
  }

  async function cast(v: "up" | "down") {
    if (vote) return;
    setVote(v);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roastId, vote: v }),
      });
      if (res.ok) setReveal((await res.json()) as Reveal);
    } catch {
      /* the stamp stays pressed; a lost vote is not worth interrupting the visitor */
    }
  }

  async function copyRoast() {
    try {
      await navigator.clipboard.writeText(roast);
      setCopied(true);
      fetch("/api/feedback", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ roastId, vote: "copy" }) }).catch(() => {});
    } catch {
      /* clipboard blocked: nothing to do */
    }
  }

  // Your vote lands: a kernel (or a bit of chaff) flies from the stamp you pressed to the prompt you tasted. It waits for the
  // reveal's entrance to settle so it lands on the final position, and it is skipped under reduced motion.
  useEffect(() => {
    if (!reveal || !vote || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let el: HTMLDivElement | null = null;
    let anim: Animation | null = null;
    const timer = window.setTimeout(() => {
      const from = document.querySelector<HTMLElement>(vote === "up" ? ".stamp.grain" : ".stamp.chaff");
      const to = document.querySelector<HTMLElement>(".reveal .variant");
      if (!from || !to) return;
      const a = from.getBoundingClientRect();
      const b = to.getBoundingClientRect();
      const x0 = a.left + a.width / 2 - 9, y0 = a.top + a.height / 2 - 13;
      const x1 = b.left + 14, y1 = b.top + b.height / 2 - 13;
      el = document.createElement("div");
      el.className = `flyer ${vote === "up" ? "grain" : "chaff"}`;
      el.setAttribute("aria-hidden", "true");
      document.body.appendChild(el);
      anim = el.animate(
        [
          { transform: `translate(${x0}px, ${y0}px) scale(1.5) rotate(0deg)` },
          { transform: `translate(${(x0 + x1) / 2}px, ${Math.min(y0, y1) - 70}px) scale(1.15) rotate(170deg)`, offset: 0.5 },
          { transform: `translate(${x1}px, ${y1}px) scale(.85) rotate(330deg)` },
        ],
        { duration: 900, easing: "cubic-bezier(.45, 0, .3, 1)", fill: "forwards" },
      );
      anim.onfinish = () => {
        el?.remove();
        to.classList.add("landed");
        window.setTimeout(() => to.classList.remove("landed"), 700);
      };
    }, 820);
    return () => {
      window.clearTimeout(timer);
      anim?.cancel();
      el?.remove();
    };
  }, [reveal, vote]);

  const loading = phase === "loading";
  const canSubmit = !loading && (mode === "paste" ? text.trim().length >= 20 : url.trim().length > 10);

  return (
    <section id="tool" className="tool" aria-labelledby="tool-title">
      <form className="card input-card" onSubmit={submit}>
        <div className="card-head">
          <h2 id="tool-title" className="eyebrow">The threshing floor</h2>
          <div className="toggle" role="group" aria-label="Input type">
            <button type="button" aria-pressed={mode === "paste"} onClick={() => setMode("paste")}>Paste</button>
            <button type="button" aria-pressed={mode === "url"} onClick={() => setMode("url")}>Repo link</button>
          </div>
        </div>
        {mode === "paste" ? (
          <>
            <label htmlFor="readme" className="sr-only">Your README</label>
            <textarea id="readme" value={text} maxLength={MAX + 500} onChange={(e) => setText(e.target.value)}
              placeholder="Paste your README here. It stays between you and the roaster." rows={9} />
            <p className={`count${text.length > MAX ? " over" : ""}`}>{text.length.toLocaleString("en")} / {MAX.toLocaleString("en")}</p>
          </>
        ) : (
          <>
            <label htmlFor="repo" className="sr-only">Public GitHub repo link</label>
            <input id="repo" type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://github.com/owner/repo" />
            <p className="count">Public repos only. We read the README and nothing else.</p>
          </>
        )}
        <div className="actions">
          <button className="btn primary" disabled={!canSubmit}>{loading ? "Sifting…" : "Roast it"}</button>
          <p className="note" role="status" aria-live="polite">{error}</p>
        </div>
      </form>

      <div className="stage" ref={ticket}>
        <Basket shaking={loading} />
        {phase === "done" && (
          <div className="ticket rise">
            <p className="eyebrow">Your roast</p>
            <pre className="wipe">{roast}</pre>
            <div className="vote" role="group" aria-label="Was this roast good?">
              <button className={`stamp grain${vote === "up" ? " on" : ""}`} disabled={!!vote && vote !== "up"} onClick={() => cast("up")} aria-pressed={vote === "up"}>
                <Stamp kind="grain" pressed={vote === "up"} faded={vote === "down"} /> Grain
              </button>
              <button className={`stamp chaff${vote === "down" ? " on" : ""}`} disabled={!!vote && vote !== "down"} onClick={() => cast("down")} aria-pressed={vote === "down"}>
                <Stamp kind="chaff" pressed={vote === "down"} faded={vote === "up"} /> Chaff
              </button>
            </div>
            <p className="note" role="status" aria-live="polite">
              {vote ? "Thanks. Your vote helps pick the winning prompt." : "Keep it, or toss it? One tap decides."}
            </p>
            {reveal && (
              <div className="reveal rise">
                <p className="eyebrow">You tasted</p>
                <p className="variant">{reveal.variant}</p>
                {reveal.standings ? (
                  <ul>
                    {reveal.standings.variants.map((v) => {
                      const liked = v.exposures > 0 ? Math.round((v.conversions / v.exposures) * 100) : 0;
                      return (
                        <li key={v.key} className={v.key === reveal.variant ? "you" : ""}>
                          <span>{v.key}</span>
                          <span className="bar"><i style={{ width: `${liked}%` }} /></span>
                          <b>{liked}%</b>
                          <em>{v.winProbability === null ? "baseline" : `${Math.round(v.winProbability * 100)}% to beat control`}</em>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="note">Standings appear once the experiment has results.</p>
                )}
                {reveal.standings && (
                  <p className="note">Share of visitors who liked each prompt, and Flagsmith's chance that it beats control. Updated {new Date(reveal.standings.updatedAt).toLocaleString("en")}{reveal.standings.simulated ? " (simulated)" : ""}.</p>
                )}
              </div>
            )}
            <div className="share">
              <button type="button" className="btn small" onClick={copyRoast}>{copied ? "Copied" : "Copy roast"}</button>
              <a className="btn small" href={`/api/card?t=${encodeURIComponent(roast.slice(0, 280))}`} target="_blank" rel="noopener noreferrer">Share card</a>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
