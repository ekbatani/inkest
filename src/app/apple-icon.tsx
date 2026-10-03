import { ImageResponse } from "next/og";
import { LOGO_MARK_PATH, LOGO_MARK_VIEWBOX, LOGO_TILE_GRADIENT } from "@/components/brand/logo-mark";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// iOS applies its own corner mask, so the tile is a full-bleed square.
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: LOGO_TILE_GRADIENT,
        }}
      >
        <svg width="120" height="120" viewBox={LOGO_MARK_VIEWBOX} xmlns="http://www.w3.org/2000/svg">
          <path d={LOGO_MARK_PATH} fill="#FFFFFF" fillRule="evenodd" />
        </svg>
      </div>
    ),
    { ...size },
  );
}
