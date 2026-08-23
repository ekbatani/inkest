import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { LogoMark } from "./logo-mark";

export interface LogoProps {
  className?: string;
  href?: string;
  showTagline?: boolean;
  variant?: "vector" | "raster";
  iconSize?: number;
  alt?: string;
}

/**
 * Full Inkest brand logo component.
 * Supports both scalable vector mark + typography or official raster assets.
 */
export function Logo({
  className,
  href = "/",
  showTagline = false,
  variant = "vector",
  iconSize = 32,
  alt = "Inkest",
}: LogoProps) {
  const content = (
    <div className={cn("inline-flex items-center gap-2.5 font-bold tracking-tight select-none", className)}>
      {variant === "raster" ? (
        <Image
          src="/app-icon.png"
          alt={alt}
          width={iconSize}
          height={iconSize}
          className="rounded-lg shrink-0"
        />
      ) : (
        <LogoMark className={cn("size-8 shrink-0")} />
      )}
      <div className="flex flex-col justify-center leading-none">
        <span className="text-base font-bold tracking-tight text-foreground">
          inkest
        </span>
        {showTagline && (
          <span className="text-[10px] uppercase font-semibold tracking-widest text-muted-foreground mt-0.5">
            Capture · Organize · Think
          </span>
        )}
      </div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="inline-flex focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg">
        {content}
      </Link>
    );
  }

  return content;
}

/**
 * App Icon component supporting both light & dark versions from public/.
 */
export function AppIconImage({
  size = 36,
  theme = "auto",
  className,
  alt = "Inkest App Icon",
}: {
  size?: number;
  theme?: "light" | "dark" | "auto";
  className?: string;
  alt?: string;
}) {
  if (theme === "auto") {
    return (
      <span className={cn("relative inline-flex shrink-0 overflow-hidden rounded-xl", className)} style={{ width: size, height: size }}>
        <Image
          src="/app-icon.png"
          alt={alt}
          width={size}
          height={size}
          className="block dark:hidden object-contain"
        />
        <Image
          src="/app-icon-black.png"
          alt={alt}
          width={size}
          height={size}
          className="hidden dark:block object-contain"
        />
      </span>
    );
  }

  const src = theme === "dark" ? "/app-icon-black.png" : "/app-icon.png";
  return (
    <Image
      src={src}
      alt={alt}
      width={size}
      height={size}
      className={cn("rounded-xl object-contain shrink-0", className)}
    />
  );
}
