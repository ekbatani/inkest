import { ImageResponse } from "next/og";

export const alt = "Inkest — a calm, Markdown-first workspace";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const markSvg =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#0a0a0a">' +
  '<path d="M12 2.1c1.9 2.9 3.6 4.6 3.6 6.7a3.6 3.6 0 1 1-7.2 0c0-2.1 1.7-3.8 3.6-6.7Z"/>' +
  '<path d="M9 14.35c0-1.02 1.29-1.75 3-1.75s3 .73 3 1.75L12.86 21c-.16.62-1.06.66-1.28.06l-.02-.06L9 14.35Z"/>' +
  "</svg>";
const markDataUri = `data:image/svg+xml;base64,${Buffer.from(markSvg).toString("base64")}`;

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
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <img width={34} height={34} src={markDataUri} alt="" />
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
