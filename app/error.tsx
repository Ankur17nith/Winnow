"use client";

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <main>
      <section className="hero">
        <p className="eyebrow">Something broke</p>
        <h1 aria-label="Spilled"><span className="line"><span>Spilled.</span></span></h1>
        <p className="lede">Something went wrong on our side. Nothing you typed was saved. Try again.</p>
        <p><button className="btn primary" onClick={reset}>Try again</button></p>
      </section>
    </main>
  );
}
