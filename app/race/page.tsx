import type { Metadata } from "next";
import { SieveRing } from "@/components/Art";
import { DEFAULT_RULE, decide } from "@/lib/decision";
import { explain } from "@/lib/explain";
import { splitCheck } from "@/lib/srm";
import { readStandings } from "@/lib/standings";

export const metadata: Metadata = { title: "The race · Winnow", description: "Three prompts, one winner. Live win probabilities from Flagsmith Experimentation." };
export const dynamic = "force-dynamic";

const COLOR: Record<string, string> = { control: "var(--sea)", savage: "var(--rescue)", actionable: "var(--mint)" };
const KERNELS_MAX = 56;
// The allocation the experiment asks for: control takes the remainder of an even three-way split.
const SHARE: Record<string, number> = { control: 34, savage: 33, actionable: 33 };

export default async function Race() {
  const standings = await readStandings();
  const decision = decide(standings);
  const split = standings ? splitCheck(standings.variants, standings.variants.map((v) => SHARE[v.key] ?? 100 / standings.variants.length)) : null;
  const leader = standings ? [...standings.variants].sort((a, b) => b.winProbability - a.winProbability)[0] : null;

  return (
    <main>
      <header className="top">
        <a className="brand" href="/" aria-label="Winnow home"><SieveRing /> <span>WINN<b>O</b>W</span></a>
        <a className="btn small" href="/#tool">Cast a vote</a>
      </header>

      <section className="hero race-hero">
        <p className="eyebrow">Live standings</p>
        <h1 aria-label="The race"><span className="line"><span>The race</span></span></h1>
        <p className="lede">
          Do developers want AI feedback kind, brutal or actionable? Each pile is a prompt. The taller the pile, the more likely
          that prompt is the best one, according to Flagsmith&apos;s Bayesian engine.
        </p>
      </section>

      {standings ? (
        <>
          <section className="piles" aria-label="Win probability per prompt">
            {standings.variants.map((v) => {
              const n = Math.max(1, Math.round(v.winProbability * KERNELS_MAX));
              const lead = leader?.key === v.key;
              return (
                <figure key={v.key} className={`pile${lead ? " lead" : ""}`} style={{ ["--c" as string]: COLOR[v.key] ?? "var(--ink)" }}>
                  <div className="kernels-stack" aria-hidden="true">
                    {Array.from({ length: n }, (_, i) => <i key={i} />)}
                  </div>
                  <figcaption>
                    <b className="pct">{Math.round(v.winProbability * 100)}%</b>
                    <span className="vname">{v.key}</span>
                    <span className="meta">{v.conversions} grain / {v.exposures} tasted</span>
                  </figcaption>
                </figure>
              );
            })}
          </section>
          <p className="note stamp-note">
            Source: Flagsmith Experimentation, updated {new Date(standings.updatedAt).toLocaleString("en")}.{" "}
            {standings.simulated ? <span className="sim-tag">SIMULATED REHEARSAL DATA</span> : "Real visitors."}
          </p>
          <section className="card explain" aria-label="What this means">
            <h2 className="eyebrow">What this means</h2>
            <ul>{explain(standings).map((line) => <li key={line}>{line}</li>)}</ul>
          </section>
          {split && (
            <p className={`split ${split.status}`}>
              <b>Split check</b>{" "}
              {"reason" in split
                ? split.reason
                : `Expected ${split.expected.map((e) => Math.round(e)).join(" / ")} visitors, saw ${split.observed.join(" / ")} (${split.keys.join(", ")}). ${
                    split.status === "ok" ? "The arms were filled in the proportions asked for." : "The arms are not balanced as designed: do not trust these results until the cause is found."
                  }`}
            </p>
          )}
        </>
      ) : (
        <p className="card empty">No results yet. The race starts once the experiment is running and the first votes are in.</p>
      )}

      <section className="band" aria-label="Decision rule">
        <p>
          <b>Decision rule, fixed in advance:</b> ship a prompt only when its win probability is at least{" "}
          {Math.round(DEFAULT_RULE.minWinProbability * 100)}% and every arm has at least {DEFAULT_RULE.minExposuresPerArm} visitors.{" "}
          Right now: <b>{decision.action === "ship" ? `${decision.winner} qualifies` : "keep waiting"}</b>. A human approves any rollout.
        </p>
      </section>
    </main>
  );
}
