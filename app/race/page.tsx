import type { Metadata } from "next";
import { SieveRing } from "@/components/Art";
import { DEFAULT_RULE, decide } from "@/lib/decision";
import { explain } from "@/lib/explain";
import { agreement } from "@/lib/judge";
import { readJudge } from "@/lib/judgeData";
import { splitCheck } from "@/lib/srm";
import { readStandings } from "@/lib/standings";

export const metadata: Metadata = { title: "The race · Winnow", description: "Three prompts, one control. Flagsmith Experimentation's chance that each beats it." };
export const dynamic = "force-dynamic";

const COLOR: Record<string, string> = { control: "var(--sea)", savage: "var(--rescue)", actionable: "var(--mint)" };
const KERNELS_MAX = 56;
// The allocation the experiment asks for: control takes the remainder of an even three-way split.
const SHARE: Record<string, number> = { control: 34, savage: 33, actionable: 33 };

export default async function Race() {
  const standings = await readStandings();
  const judge = await readJudge();
  const verdict = agreement(judge, standings);
  const decision = decide(standings);
  const split = standings ? splitCheck(standings.variants, standings.variants.map((v) => SHARE[v.key] ?? 100 / standings.variants.length)) : null;
  const leader = standings
    ? [...standings.variants].filter((v) => v.winProbability !== null).sort((a, b) => (b.winProbability as number) - (a.winProbability as number))[0] ?? null
    : null;

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
          Do developers want AI feedback kind, brutal or actionable? Each pile is a prompt, as tall as the share of visitors who liked
          it. Under each one is Flagsmith&apos;s chance that it beats the friendly control, from its Bayesian engine.
        </p>
      </section>

      {standings ? (
        <>
          <section className="piles" aria-label="Like rate and chance to beat control, per prompt">
            {standings.variants.map((v) => {
              const liked = v.exposures > 0 ? v.conversions / v.exposures : 0;
              const n = Math.max(1, Math.round(liked * KERNELS_MAX));
              const lead = leader?.key === v.key;
              return (
                <figure key={v.key} className={`pile${lead ? " lead" : ""}`} style={{ ["--c" as string]: COLOR[v.key] ?? "var(--ink)" }}>
                  <div className="kernels-stack" aria-hidden="true">
                    {Array.from({ length: n }, (_, i) => <i key={i} />)}
                  </div>
                  <figcaption>
                    <b className="pct">{v.winProbability === null ? "baseline" : `${Math.round(v.winProbability * 100)}%`}</b>
                    <span className="vname">{v.key}</span>
                    <span className="meta">{v.winProbability === null ? "the prompt the others are compared with" : "chance to beat control"}</span>
                    <span className="meta">{v.conversions} grain / {v.exposures} tasted · {Math.round(liked * 100)}% liked</span>
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

      {judge && (
        <section className="card judge" aria-label="The AI judge's read">
          <h2 className="eyebrow">
            Before any visitor: an AI judge&apos;s read {judge.preview && <mark className="sim-tag">PREVIEW: STAND-IN NUMBERS</mark>}
          </h2>
          <p className="note">
            {judge.preview ? "A stand-in judge" : judge.judgeModel} scored each prompt&apos;s roast of {judge.readmes} sample READMEs from 1 to 5 on being specific, useful and
            civil. This is not Flagsmith data and does not affect the decision rule. It is a cheap pre-flight, and a check of whether
            an AI judge can predict what people like. LLM judges are known to favour longer, more confident text, which is why
            people still vote.
          </p>
          <ul className="judge-bars">
            {judge.variants.map((v) => (
              <li key={v.variant}>
                <span>{v.variant}</span>
                <span className="bar"><i style={{ width: `${v.overall === null ? 0 : (v.overall / 5) * 100}%` }} /></span>
                <b>{v.overall === null ? "n/a" : v.overall.toFixed(1)}</b>
                <em>{v.n} scored{v.failed > 0 ? `, ${v.failed} the judge could not score` : ""}</em>
              </li>
            ))}
          </ul>
          <p className={`split ${verdict.status === "match" ? "ok" : verdict.status === "differ" ? "mismatch" : "insufficient"}`}>
            <b>Judge vs visitors</b> {verdict.text}
          </p>
        </section>
      )}

      <section className="band" aria-label="Decision rule">
        <p>
          <b>Decision rule, fixed in advance:</b> ship a prompt only when its chance of beating control is at least{" "}
          {Math.round(DEFAULT_RULE.minWinProbability * 100)}% and every arm has at least {DEFAULT_RULE.minExposuresPerArm} visitors.{" "}
          Right now: <b>{decision.action === "ship" ? `${decision.winner} qualifies` : "keep waiting"}</b>. A human approves any rollout.
        </p>
      </section>
    </main>
  );
}
