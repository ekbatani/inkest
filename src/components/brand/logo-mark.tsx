import * as React from "react";
import { cn } from "@/lib/utils";

export interface LogoMarkProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
  variant?: "gradient" | "monochrome";
  idPrefix?: string;
}

export function LogoMark({
  className,
  variant = "gradient",
  idPrefix = "inkest",
  ...props
}: LogoMarkProps) {
  const gradientId = `${idPrefix}-feather-grad`;
  const foldGradId = `${idPrefix}-fold-grad`;
  const paperGradId = `${idPrefix}-paper-grad`;

  if (variant === "monochrome") {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={cn("shrink-0", className)}
        aria-hidden="true"
        {...props}
      >
        {/* Document outline */}
        <path
          d="M5.5 3C4.67 3 4 3.67 4 4.5v15c0 .83.67 1.5 1.5 1.5h11c.83 0 1.5-.67 1.5-1.5V9.5L13.5 3H5.5Z"
          fill="currentColor"
          fillOpacity="0.18"
        />
        {/* Document fold */}
        <path
          d="M13.5 3v5c0 .83.67 1.5 1.5 1.5h3L13.5 3Z"
          fill="currentColor"
          fillOpacity="0.65"
        />
        {/* Feather Quill */}
        <path
          d="M5.2 19.8c.8-3.4 3.2-7.1 7.2-10 2.8-2 4.9-2.7 5.6-2.8-.2.8-.8 2.8-2.6 5.2-2.8 3.8-6.1 5.9-9 6.8-.7.2-1.1.5-1.2.8Z"
          fill="currentColor"
        />
        {/* Feather Quill Lower Lobe */}
        <path
          d="M6.2 18.5c1.6.8 3.5.7 4.8-.4 1.2-1 2-2.4 2.6-3.8-2.1 1.2-4.5 2.1-6.8 2.1-.3.8-.5 1.5-.6 2.1Z"
          fill="currentColor"
          fillOpacity="0.85"
        />
        {/* Spine highlight */}
        <path
          d="M5.6 19.4C8 16.5 11.2 12.8 17.5 7.2"
          stroke="var(--background, #fff)"
          strokeWidth="0.85"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0", className)}
      aria-hidden="true"
      {...props}
    >
      <defs>
        {/* Feather Gradient: Vibrant Blue to Violet/Magenta */}
        <linearGradient id={gradientId} x1="6" y1="28" x2="26" y2="8" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#2563EB" />
          <stop offset="45%" stopColor="#4F46E5" />
          <stop offset="80%" stopColor="#8B5CF6" />
          <stop offset="100%" stopColor="#C084FC" />
        </linearGradient>

        {/* Paper Fold Gradient */}
        <linearGradient id={foldGradId} x1="18" y1="4" x2="25" y2="11" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#60A5FA" />
          <stop offset="100%" stopColor="#2563EB" />
        </linearGradient>

        {/* Paper Body Gradient */}
        <linearGradient id={paperGradId} x1="7" y1="4" x2="24" y2="28" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.96" />
          <stop offset="100%" stopColor="#E2E8F0" stopOpacity="0.82" />
        </linearGradient>

        {/* Subtle Drop Filter */}
        <filter id={`${idPrefix}-shadow`} x="0" y="0" width="32" height="32" filterUnits="userSpaceOnUse">
          <feDropShadow dx="0" dy="1.5" stdDeviation="1.5" floodColor="#0F172A" floodOpacity="0.15" />
        </filter>
      </defs>

      {/* Document Sheet */}
      <g filter={`url(#${idPrefix}-shadow)`}>
        <path
          d="M8 5.5C8 4.67 8.67 4 9.5 4H18.5L25 10.5V25.5C25 26.33 24.33 27 23.5 27H9.5C8.67 27 8 26.33 8 25.5V5.5Z"
          fill={`url(#${paperGradId})`}
        />
      </g>

      {/* Folded Corner */}
      <path
        d="M18.5 4V9.5C18.5 10.05 18.95 10.5 19.5 10.5H25L18.5 4Z"
        fill={`url(#${foldGradId})`}
      />

      {/* Feather Main Body */}
      <path
        d="M8.8 26.2C10.2 21.8 13.8 16.5 19.2 12.4C23.2 9.4 25.8 8.6 26.8 8.4C26.4 9.6 25.4 12.3 22.8 15.6C18.8 20.8 14.2 23.8 10.1 25.2C9.2 25.5 8.7 25.9 8.8 26.2Z"
        fill={`url(#${gradientId})`}
      />

      {/* Feather Lower Lobe / Accent */}
      <path
        d="M10.2 24.5C12.4 25.4 14.9 25.2 16.8 23.6C18.4 22.2 19.5 20.2 20.4 18.2C17.5 19.8 14.2 21.1 11 21.1C10.6 22.2 10.3 23.4 10.2 24.5Z"
        fill={`url(#${gradientId})`}
        fillOpacity="0.9"
      />

      {/* Central Spine Highlight */}
      <path
        d="M9.5 25.5C13 21.5 17.5 16.8 26.2 8.8"
        stroke="#FFFFFF"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeOpacity="0.9"
      />
    </svg>
  );
}
