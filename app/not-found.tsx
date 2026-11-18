import { SieveRing } from "@/components/Art";

export default function NotFound() {
  return (
    <main>
      <header className="top">
        <a className="brand" href="/" aria-label="Winnow home"><SieveRing /> <span>WINN<b>O</b>W</span></a>
      </header>
      <section className="hero">
        <p className="eyebrow">404</p>
        <h1 aria-label="Blown away"><span className="line"><span>Blown away.</span></span></h1>
        <p className="lede">That page was chaff. The grain is on the home page.</p>
        <p><a className="btn primary" href="/">Back to the floor</a></p>
      </section>
    </main>
  );
}
