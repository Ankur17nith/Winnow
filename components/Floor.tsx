import type { Standings } from "@/lib/standings";

/** One basket per prompt, in a fixed order so the page does not rearrange itself as votes come in. */
const ORDER = [
  { key: "control", label: "control", c: "var(--sea)" },
  { key: "savage", label: "savage", c: "var(--rescue)" },
  { key: "actionable", label: "actionable", c: "var(--mint)" },
] as const;
const KERNELS = 32;

function MiniBasket({ c }: { c: string }) {
  return (
    <svg className="mini-basket" viewBox="0 0 220 110" aria-hidden="true" style={{ ["--c" as string]: c }}>
      <ellipse cx="112" cy="100" rx="82" ry="7" fill="#0b1533" opacity=".14" />
      <path d="M32 46 H190 L170 92 Q111 104 52 92 Z" fill="#ff5a1f" opacity=".45" transform="translate(4 4)" />
      <path d="M32 46 H190 L170 92 Q111 104 52 92 Z" fill={c} stroke="#0b1533" strokeWidth="3.5" strokeLinejoin="round" />
      <path d="M44 62 H178 M50 76 H172" stroke="#0b1533" strokeWidth="2.5" strokeLinecap="round" />
      <ellipse cx="111" cy="46" rx="79" ry="9" fill="#fbeedb" stroke="#0b1533" strokeWidth="3.5" />
      {[48, 80, 112, 144, 176].map((x, i) => (
        <ellipse key={x} className={`mk mk${i % 3}`} cx={x} cy={22 + (i % 2) * 8} rx="5" ry="8" fill={c} stroke="#0b1533" strokeWidth="2" />
      ))}
    </svg>
  );
}

/**
 * The experiment on the home page: three baskets and a pile under each as tall as the share of visitors who liked that prompt,
 * from the same snapshot as /race. With no snapshot the piles are empty and the section says so; nothing is invented.
 */
export default function Floor({ standings, compact = false, className = "" }: { standings: Standings | null; compact?: boolean; className?: string }) {
  const titleId = compact ? "floor-title-compact" : "floor-title";
  const rows = ORDER.map((o) => {
    const v = standings?.variants.find((x) => x.key === o.key);
    const liked = v && v.exposures > 0 ? v.conversions / v.exposures : 0;
    return { ...o, v, liked, n: v ? Math.round(liked * KERNELS) : 0 };
  });
  return (
    <section className={`floor${compact ? " compact" : ""} ${className}`.trim()} aria-labelledby={titleId}>
      <div className="floor-head">
        <div>
          <p className="eyebrow">The floor, live</p>
          <h2 id={titleId} className={compact ? "floor-title" : "section-title small"}>Three baskets. One control.</h2>
        </div>
        <a className="btn small" href="/race">The full race</a>
      </div>
      <div className="baskets">
        {rows.map((r) => (
          <figure key={r.key} className="bskt" style={{ ["--c" as string]: r.c }}>
            <MiniBasket c={r.c} />
            <div className="pile-mini" aria-hidden="true">
              {Array.from({ length: r.n }, (_, i) => <i key={i} />)}
            </div>
            <figcaption>
              <b className="vname">{r.label}</b>
              <span className="pct">
                {r.v ? `${Math.round(r.liked * 100)}% liked` : "no votes yet"}
              </span>
              <span className="meta">
                {r.v
                  ? r.v.winProbability === null
                    ? `baseline · ${r.v.conversions} of ${r.v.exposures} visitors`
                    : `${Math.round(r.v.winProbability * 100)}% to beat control · ${r.v.conversions} of ${r.v.exposures}`
                  : r.key === "control" ? "the prompt the others are compared with" : "waiting for the first votes"}
              </span>
            </figcaption>
          </figure>
        ))}
      </div>
      <p className="note">
        {standings
          ? `Read from Flagsmith Experimentation, ${new Date(standings.updatedAt).toLocaleString("en")}.${standings.simulated ? " SIMULATED REHEARSAL DATA." : ""}`
          : "No results yet. The piles fill as visitors vote, once the experiment is running."}
      </p>
    </section>
  );
}
