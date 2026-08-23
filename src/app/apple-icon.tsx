import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

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
          background: "linear-gradient(145deg, #0f0c29 0%, #1e1346 50%, #2e1065 100%)",
        }}
      >
        <svg
          width="128"
          height="128"
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="appleFeatherGrad" x1="6" y1="28" x2="26" y2="8" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#2563EB" />
              <stop offset="45%" stopColor="#4F46E5" />
              <stop offset="80%" stopColor="#8B5CF6" />
              <stop offset="100%" stopColor="#C084FC" />
            </linearGradient>
            <linearGradient id="appleFoldGrad" x1="18" y1="4" x2="25" y2="11" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#60A5FA" />
              <stop offset="100%" stopColor="#2563EB" />
            </linearGradient>
            <linearGradient id="applePaperGrad" x1="7" y1="4" x2="24" y2="28" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="100%" stopColor="#E2E8F0" />
            </linearGradient>
          </defs>

          {/* Document Sheet */}
          <path
            d="M8 5.5C8 4.67 8.67 4 9.5 4H18.5L25 10.5V25.5C25 26.33 24.33 27 23.5 27H9.5C8.67 27 8 26.33 8 25.5V5.5Z"
            fill="url(#applePaperGrad)"
          />

          {/* Folded Corner */}
          <path
            d="M18.5 4V9.5C18.5 10.05 18.95 10.5 19.5 10.5H25L18.5 4Z"
            fill="url(#appleFoldGrad)"
          />

          {/* Feather Main Body */}
          <path
            d="M8.8 26.2C10.2 21.8 13.8 16.5 19.2 12.4C23.2 9.4 25.8 8.6 26.8 8.4C26.4 9.6 25.4 12.3 22.8 15.6C18.8 20.8 14.2 23.8 10.1 25.2C9.2 25.5 8.7 25.9 8.8 26.2Z"
            fill="url(#appleFeatherGrad)"
          />

          {/* Feather Lower Lobe */}
          <path
            d="M10.2 24.5C12.4 25.4 14.9 25.2 16.8 23.6C18.4 22.2 19.5 20.2 20.4 18.2C17.5 19.8 14.2 21.1 11 21.1C10.6 22.2 10.3 23.4 10.2 24.5Z"
            fill="url(#appleFeatherGrad)"
            fillOpacity="0.9"
          />

          {/* Central Spine Highlight */}
          <path
            d="M9.5 25.5C13 21.5 17.5 16.8 26.2 8.8"
            stroke="#FFFFFF"
            strokeWidth="1.2"
            strokeLinecap="round"
          />
        </svg>
      </div>
    ),
    { ...size },
  );
}
