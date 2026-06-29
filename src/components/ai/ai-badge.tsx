"use client";

import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

type AiBadgeProps = {
  label?: React.ReactNode;
  className?: string;
  iconClassName?: string;
  labelClassName?: string;
};

export function AiBadge({
  label = "AI",
  className,
  iconClassName,
  labelClassName,
}: AiBadgeProps) {
  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <Sparkles
        className={cn("size-4 text-violet-400", iconClassName)}
        aria-hidden="true"
      />
      {label ? (
        <span className={cn("text-violet-400", labelClassName)}>{label}</span>
      ) : null}
    </span>
  );
}

export function AiIcon({
  className,
  iconClassName,
}: Omit<AiBadgeProps, "label" | "labelClassName">) {
  return (
    <AiBadge
      label={null}
      className={className}
      iconClassName={iconClassName}
    />
  );
}
