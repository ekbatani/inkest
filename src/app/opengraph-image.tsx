import { ImageResponse } from "next/og";

export const alt = "Inkest — a calm, Markdown-first workspace";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background: "#0a0a0a",
          color: "#fafafa",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div
            style={{
              display: "flex",
              width: 64,
              height: 64,
              borderRadius: 16,
              background: "#fafafa",
              color: "#0a0a0a",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 34,
              fontWeight: 700,
            }}
          >
            i
          </div>
          <div style={{ fontSize: 44, fontWeight: 600, letterSpacing: -1 }}>Inkest</div>
        </div>

        <div
          style={{
            display: "flex",
            marginTop: 44,
            fontSize: 54,
            fontWeight: 600,
            letterSpacing: -1.5,
            lineHeight: 1.15,
            maxWidth: 920,
          }}
        >
          A calm, Markdown-first workspace with AI built in.
        </div>

        <div
          style={{
            display: "flex",
            marginTop: 32,
            fontSize: 26,
            color: "#a3a3a3",
          }}
        >
          Notes · Projects · Tasks · Self-hosted or cloud
        </div>

        <div
          style={{
            display: "flex",
            marginTop: 56,
            height: 8,
            width: 260,
            borderRadius: 999,
            background: "linear-gradient(90deg, #5eead4, #d9f99d)",
          }}
        />
      </div>
    ),
    { ...size },
  );
}
