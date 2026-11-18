import { ImageResponse } from "next/og";

export const runtime = "nodejs";

/** A shareable roast card. The text comes from the URL, so it is length-capped and rendered as plain text. */
export async function GET(request: Request) {
  const raw = new URL(request.url).searchParams.get("t") ?? "";
  const text = raw.replace(/\s+/g, " ").trim().slice(0, 280) || "Paste your README. Get roasted.";
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: "#fff7ea", padding: 56, border: "10px solid #0b1533" }}>
        <div style={{ display: "flex", fontSize: 40, fontWeight: 800, color: "#0b1533", letterSpacing: 2 }}>WINNOW</div>
        <div style={{ display: "flex", fontSize: 40, lineHeight: 1.3, color: "#0b1533" }}>{text}</div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 26, color: "#c2410c" }}>
          <span>Grain or chaff? Vote on winnow.</span>
          <span style={{ background: "#ffc93c", color: "#0b1533", padding: "6px 16px", border: "4px solid #0b1533" }}>A/B tested with Flagsmith</span>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
