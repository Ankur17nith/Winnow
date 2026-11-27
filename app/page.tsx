import { SieveRing, WaveStrip } from "@/components/Art";
import Floor from "@/components/Floor";
import Roaster from "@/components/Roaster";
import { readStandings } from "@/lib/standings";

const STEPS = [
  ["01", "A flag deals a basket", "Each visitor silently gets one of three prompts from a multivariate Flagsmith flag. You never see which."],
  ["02", "You decide: grain or chaff", "One tap says whether the roast was worth keeping. That single event is the experiment's success metric."],
  ["03", "Flagsmith names the winner", "A Bayesian engine turns votes into each prompt's chance of beating control. The winner ships through the same flag."],
];

export default async function Home({ searchParams }: { searchParams: Promise<{ repo?: string }> }) {
  const { repo } = await searchParams;
  const standings = await readStandings();
  const initialRepo = typeof repo === "string" && /^https:\/\/github\.com\/[\w.-]+\/[\w.-]+\/?$/.test(repo) ? repo : undefined;
  return (
    <main className="home">
      <header className="top">
        <a className="brand" href="/" aria-label="Winnow home"><SieveRing /> <span>WINN<b>O</b>W</span></a>
        <nav className="nav"><a className="btn small" href="#how">How it works</a> <a className="btn small" href="/race">The race</a></nav>
      </header>

      <section className="hero hero-grid">
        <div className="hero-copy">
        <p className="eyebrow">A/B test of LLM prompts</p>
        <h1 aria-label="Paste your README. Get roasted.">
          <span className="line"><span>Paste your</span></span>
          <span className="line"><span>README.</span></span>
          <span className="line accent"><span>Get roasted.</span></span>
        </h1>
        <p className="lede">
          Every visitor silently tests a different roast prompt. Your vote separates the grain from the chaff, and
          Flagsmith Experimentation tells us which prompt wins.
        </p>
        </div>
        <Floor standings={standings} compact className="only-wide" />
      </section>

      <WaveStrip />

      <Roaster initialRepo={initialRepo} />

      <Floor standings={standings} className="only-narrow" />

      <section className="band" aria-label="Disclosure">
        <p>This page runs a live A/B test of prompts. Votes are anonymous and tied only to a random cookie.</p>
      </section>

      <section id="how" className="how" aria-labelledby="how-title">
        <h2 id="how-title" className="section-title">Winnowing, in three moves</h2>
        <ol>
          {STEPS.map(([n, title, body]) => (
            <li key={n} className="card step">
              <span className="num">{n}</span>
              <h3>{title}</h3>
              <p>{body}</p>
            </li>
          ))}
        </ol>
      </section>

      <footer className="foot">
        <div className="wave" aria-hidden="true" />
        <div className="foot-body">
          <p className="word">WINNOW</p>
          <p>
            Built for the WeMakeDevs x Flagsmith hackathon. <a href="https://github.com/Ankur17nith/Winnow">Source</a>
          </p>
        </div>
      </footer>
    </main>
  );
}
