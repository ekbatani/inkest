import { ImageResponse } from "next/og";

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
          background: "#0c0a1f",
          borderRadius: 7,
        }}
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="iconFeatherGrad" x1="4" y1="20" x2="20" y2="4" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#3B82F6" />
              <stop offset="55%" stopColor="#7C3AED" />
              <stop offset="100%" stopColor="#C084FC" />
            </linearGradient>
            <linearGradient id="iconFoldGrad" x1="14" y1="2" x2="19" y2="7" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#60A5FA" />
              <stop offset="100%" stopColor="#2563EB" />
            </linearGradient>
            <linearGradient id="iconPaperGrad" x1="4" y1="2" x2="19" y2="22" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="100%" stopColor="#CBD5E1" />
            </linearGradient>
          </defs>
          <path
            d="M5.5 3C4.67 3 4 3.67 4 4.5v15c0 .83.67 1.5 1.5 1.5h11c.83 0 1.5-.67 1.5-1.5V9.5L13.5 3H5.5Z"
            fill="url(#iconPaperGrad)"
          />
          <path
            d="M13.5 3v5c0 .83.67 1.5 1.5 1.5h3L13.5 3Z"
            fill="url(#iconFoldGrad)"
          />
          <path
            d="M5.2 19.8c.8-3.4 3.2-7.1 7.2-10 2.8-2 4.9-2.7 5.6-2.8-.2.8-.8 2.8-2.6 5.2-2.8 3.8-6.1 5.9-9 6.8-.7.2-1.1.5-1.2.8Z"
            fill="url(#iconFeatherGrad)"
          />
          <path
            d="M6.2 18.5c1.6.8 3.5.7 4.8-.4 1.2-1 2-2.4 2.6-3.8-2.1 1.2-4.5 2.1-6.8 2.1-.3.8-.5 1.5-.6 2.1Z"
            fill="url(#iconFeatherGrad)"
          />
          <path
            d="M5.6 19.4C8 16.5 11.2 12.8 17.5 7.2"
            stroke="#FFFFFF"
            strokeWidth="0.85"
            strokeLinecap="round"
          />
        </svg>
      </div>
    ),
    { ...size },
  );
}
