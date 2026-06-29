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
    <span className={cn("ai-badge", className)}>
      <span className={cn("ai-badge__icon", iconClassName)} aria-hidden="true">
        <Sparkles className="size-3.5" />
      </span>
      {label ? <span className={cn(labelClassName)}>{label}</span> : null}
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
      className={cn("px-0 py-0 ring-0", className)}
      iconClassName={iconClassName}
    />
  );
}
