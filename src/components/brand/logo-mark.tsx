import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * The Inkest mark: a quill whose spine is a pen-nib slit ending in a breather
 * hole — writing (feather) and ink (nib) in one silhouette. Drawn on a 32×32
 * grid as a single even-odd path so the slit and hole stay transparent on any
 * background. Shared with the generated favicon, Apple icon and OG image.
 */
export const LOGO_MARK_VIEWBOX = "0 0 32 32";
export const LOGO_MARK_PATH =
  "M5 27C4.6 15.4 13 5.2 27 5C27.1 9.4 26 13.2 24 16.2L25.8 16.6C24.6 18.8 22.9 20.6 20.9 22L23 22.4C18.4 26 11.9 27.5 5 27Z" +
  "M7 25L17.6 14.4L18.4 15.2Z" +
  "M18.2 11.8a2 2 0 1 0 4 0a2 2 0 1 0 -4 0Z";
export const LOGO_GRADIENT_STOPS = [
  { offset: "0", color: "#4F46E5" },
  { offset: "0.5", color: "#7C3AED" },
  { offset: "1", color: "#D8B4FE" },
] as const;
/** App-icon tile behind a white mark. */
export const LOGO_TILE_GRADIENT = "linear-gradient(45deg, #4338CA 0%, #7C3AED 55%, #A855F7 100%)";

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
  const gradientId = `${idPrefix}-mark-grad`;

  return (
    <svg
      viewBox={LOGO_MARK_VIEWBOX}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0", className)}
      aria-hidden="true"
      {...props}
    >
      {variant === "gradient" && (
        <defs>
          <linearGradient id={gradientId} x1="6" y1="27" x2="27" y2="5" gradientUnits="userSpaceOnUse">
            {LOGO_GRADIENT_STOPS.map((stop) => (
              <stop key={stop.offset} offset={stop.offset} stopColor={stop.color} />
            ))}
          </linearGradient>
        </defs>
      )}
      <path
        d={LOGO_MARK_PATH}
        fillRule="evenodd"
        clipRule="evenodd"
        fill={variant === "gradient" ? `url(#${gradientId})` : "currentColor"}
      />
    </svg>
  );
}
