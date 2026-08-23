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
              background: "linear-gradient(145deg, #1e1548, #2a1663)",
              border: "1px solid rgba(139, 92, 246, 0.3)",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg
              width="50"
              height="50"
              viewBox="0 0 32 32"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <linearGradient id="ogFeatherGrad" x1="6" y1="28" x2="26" y2="8" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#2563EB" />
                  <stop offset="45%" stopColor="#4F46E5" />
                  <stop offset="80%" stopColor="#8B5CF6" />
                  <stop offset="100%" stopColor="#C084FC" />
                </linearGradient>
                <linearGradient id="ogFoldGrad" x1="18" y1="4" x2="25" y2="11" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#60A5FA" />
                  <stop offset="100%" stopColor="#2563EB" />
                </linearGradient>
                <linearGradient id="ogPaperGrad" x1="7" y1="4" x2="24" y2="28" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#FFFFFF" />
                  <stop offset="100%" stopColor="#E2E8F0" />
                </linearGradient>
              </defs>

              <path
                d="M8 5.5C8 4.67 8.67 4 9.5 4H18.5L25 10.5V25.5C25 26.33 24.33 27 23.5 27H9.5C8.67 27 8 26.33 8 25.5V5.5Z"
                fill="url(#ogPaperGrad)"
              />
              <path
                d="M18.5 4V9.5C18.5 10.05 18.95 10.5 19.5 10.5H25L18.5 4Z"
                fill="url(#ogFoldGrad)"
              />
              <path
                d="M8.8 26.2C10.2 21.8 13.8 16.5 19.2 12.4C23.2 9.4 25.8 8.6 26.8 8.4C26.4 9.6 25.4 12.3 22.8 15.6C18.8 20.8 14.2 23.8 10.1 25.2C9.2 25.5 8.7 25.9 8.8 26.2Z"
                fill="url(#ogFeatherGrad)"
              />
              <path
                d="M10.2 24.5C12.4 25.4 14.9 25.2 16.8 23.6C18.4 22.2 19.5 20.2 20.4 18.2C17.5 19.8 14.2 21.1 11 21.1C10.6 22.2 10.3 23.4 10.2 24.5Z"
                fill="url(#ogFeatherGrad)"
                fillOpacity="0.9"
              />
              <path
                d="M9.5 25.5C13 21.5 17.5 16.8 26.2 8.8"
                stroke="#FFFFFF"
                strokeWidth="1.2"
                strokeLinecap="round"
              />
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
              background: "linear-gradient(90deg, #3b82f6, #8b5cf6, #d946ef)",
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
