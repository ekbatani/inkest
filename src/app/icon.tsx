import { ImageResponse } from "next/og";
import { LOGO_MARK_PATH, LOGO_MARK_VIEWBOX, LOGO_TILE_GRADIENT } from "@/components/brand/logo-mark";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
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
          borderRadius: 8,
        }}
      >
        <svg width="24" height="24" viewBox={LOGO_MARK_VIEWBOX} xmlns="http://www.w3.org/2000/svg">
          <path d={LOGO_MARK_PATH} fill="#FFFFFF" fillRule="evenodd" />
        </svg>
      </div>
    ),
    { ...size },
  );
}
