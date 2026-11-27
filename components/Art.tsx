/** All artwork is drawn for Winnow. Static SVG: only whole elements move, by transform or opacity. */

export function SieveRing({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" className="sieve-ring">
      <circle cx="35" cy="35" r="26" fill="#ff5a1f" opacity=".55" />
      <circle cx="32" cy="32" r="26" fill="#ffc93c" stroke="#0b1533" strokeWidth="5" />
      <circle cx="32" cy="32" r="12" fill="#fff7ea" stroke="#0b1533" strokeWidth="4" />
      <path d="M32 6v14M32 44v14M6 32h14M44 32h14" stroke="#0b1533" strokeWidth="3" />
    </svg>
  );
}

const KERNELS = [
  [70, 36], [112, 22], [150, 44], [188, 18], [226, 40], [262, 26], [96, 64], [210, 66],
];
const CHAFF = [
  [128, 70], [172, 84], [244, 78], [60, 80], [284, 62],
];

/** The winnowing basket with kernels (gold) and chaff (tan) in the wind. */
export function Basket({ shaking = false }: { shaking?: boolean }) {
  return (
    <div className={`basket${shaking ? " is-shaking" : ""}`} aria-hidden="true">
      <svg viewBox="0 0 340 240" role="img">
        <defs>
          <pattern id="dots" width="6" height="6" patternUnits="userSpaceOnUse">
            <circle cx="1.5" cy="1.5" r="1" fill="#0b1533" opacity=".35" />
          </pattern>
        </defs>
        <ellipse cx="176" cy="214" rx="132" ry="12" fill="#0b1533" opacity=".14" />
        <g className="basket-body">
          <path d="M40 112 H300 L268 206 Q170 226 72 206 Z" fill="#ff5a1f" opacity=".5" transform="translate(5 5)" />
          <path d="M40 112 H300 L268 206 Q170 226 72 206 Z" fill="#ffc93c" stroke="#0b1533" strokeWidth="4" strokeLinejoin="round" />
          <path d="M40 112 H300 L268 206 Q170 226 72 206 Z" fill="url(#dots)" />
          <path d="M58 140 H282 M66 168 H274" stroke="#0b1533" strokeWidth="3" strokeLinecap="round" />
          <ellipse cx="170" cy="112" rx="130" ry="14" fill="#fbeedb" stroke="#0b1533" strokeWidth="4" />
        </g>
        <g className="kernels">
          {KERNELS.map(([x, y], i) => (
            <ellipse key={i} className={`k k${i % 4}`} cx={x} cy={y} rx="7" ry="11" fill="#ffc93c" stroke="#0b1533" strokeWidth="2.5" transform={`rotate(${(i * 37) % 60 - 30} ${x} ${y})`} />
          ))}
        </g>
        <g className="chaff">
          {CHAFF.map(([x, y], i) => (
            <path key={i} className={`c c${i % 3}`} d={`M${x} ${y} l9 -3 l-3 9 z`} fill="#9a8f7a" stroke="#0b1533" strokeWidth="1.5" />
          ))}
        </g>
      </svg>
    </div>
  );
}

/** A strip of cut-paper waves under the hero text. Whole layers drift by transform only; the shapes are drawn once. */
export function WaveStrip() {
  return (
    <div className="strip" aria-hidden="true">
      <svg className="wave-l w1" viewBox="0 0 1200 90" preserveAspectRatio="none">
        <path d="M-60 46 Q60 6 180 40 T420 38 T660 44 T900 34 T1140 46 T1260 38 V90 H-60 Z" fill="#ffc93c" stroke="#0b1533" strokeWidth="3" />
      </svg>
      <svg className="wave-l w2" viewBox="0 0 1200 90" preserveAspectRatio="none">
        <path d="M-60 58 Q80 22 200 54 T440 52 T680 60 T920 50 T1160 60 T1260 54 V90 H-60 Z" fill="#ff5a1f" stroke="#0b1533" strokeWidth="3" />
      </svg>
      <svg className="wave-l w3" viewBox="0 0 1200 90" preserveAspectRatio="none">
        <path d="M-60 70 Q100 44 220 68 T460 66 T700 72 T940 64 T1180 72 T1260 68 V90 H-60 Z" fill="#1d4bff" stroke="#0b1533" strokeWidth="3" />
      </svg>
    </div>
  );
}

export function Stamp({ kind, pressed, faded }: { kind: "grain" | "chaff"; pressed?: boolean; faded?: boolean }) {
  const grain = kind === "grain";
  return (
    <span className={`stamp-art ${grain ? "is-grain" : "is-chaff"}${pressed ? " is-pressed" : ""}${faded ? " is-faded" : ""}`} aria-hidden="true">
      <svg viewBox="0 0 28 28" width="26" height="26">
        {grain ? (
          <ellipse cx="14" cy="14" rx="7" ry="11" fill="#19c79a" stroke="#0b1533" strokeWidth="2.5" />
        ) : (
          <path d="M5 21 L20 6 L23 9 L8 24 Z M12 22 l8 -3 l-3 -8" fill="#9a8f7a" stroke="#0b1533" strokeWidth="2" strokeLinejoin="round" />
        )}
      </svg>
    </span>
  );
}
