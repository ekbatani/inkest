import { ImageResponse } from "next/og";
import { LOGO_MARK_PATH, LOGO_MARK_VIEWBOX, LOGO_TILE_GRADIENT } from "@/components/brand/logo-mark";

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
          justifyContent: "space-between",
          padding: "80px",
          background: "linear-gradient(135deg, #090718 0%, #150f33 50%, #210d4f 100%)",
          color: "#fafafa",
          fontFamily: "sans-serif",
        }}
      >
        {/* Header / Brand Lockup */}
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div
            style={{
              display: "flex",
              width: 72,
              height: 72,
              borderRadius: 20,
              background: LOGO_TILE_GRADIENT,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg width="52" height="52" viewBox={LOGO_MARK_VIEWBOX} xmlns="http://www.w3.org/2000/svg">
              <path d={LOGO_MARK_PATH} fill="#FFFFFF" fillRule="evenodd" />
            </svg>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 42, fontWeight: 700, letterSpacing: -1 }}>inkest</div>
            <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: 3, color: "#8b5cf6", marginTop: 2 }}>
              CAPTURE · ORGANIZE · THINK
            </div>
          </div>
        </div>

        {/* Hero Title */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div
            style={{
              display: "flex",
              fontSize: 58,
              fontWeight: 700,
              letterSpacing: -2,
              lineHeight: 1.1,
              maxWidth: 960,
            }}
          >
            A calm, Markdown-first workspace with AI built in.
          </div>

          <div
            style={{
              display: "flex",
              fontSize: 24,
              color: "#a1a1aa",
              fontWeight: 400,
            }}
          >
            Notes · Daily Journal · Kanban Projects · Tasks · Self-hosted
          </div>
        </div>

        {/* Footer / Gradient accent bar */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div
            style={{
              display: "flex",
              height: 6,
              width: 320,
              borderRadius: 999,
              background: "linear-gradient(90deg, #4F46E5, #7C3AED, #D8B4FE)",
            }}
          />
          <div style={{ fontSize: 18, color: "#71717a", fontWeight: 500 }}>
            Open Source & Private by Design
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
