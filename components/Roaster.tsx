"use client";

import { useRef, useState } from "react";
import { Basket, Stamp } from "./Art";

type Phase = "idle" | "loading" | "done";
const MAX = 12000;

export default function Roaster() {
  const [mode, setMode] = useState<"paste" | "url">("paste");
  const [text, setText] = useState("");
  const [url, setUrl] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [roast, setRoast] = useState("");
  const [roastId, setRoastId] = useState("");
  const [error, setError] = useState("");
  const [vote, setVote] = useState<"up" | "down" | null>(null);
  const ticket = useRef<HTMLDivElement>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (phase === "loading") return;
    setPhase("loading");
    setError("");
    setVote(null);
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
      await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roastId, vote: v }),
      });
    } catch {
      /* the stamp stays pressed; a lost vote is not worth interrupting the visitor */
    }
  }

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
            <pre>{roast}</pre>
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
          </div>
        )}
      </div>
    </section>
  );
}
