"use client";

import * as React from "react";
import { signOut } from "next-auth/react";
import { LogOut, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export interface LogoutButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:
    | "default"
    | "destructive"
    | "outline"
    | "secondary"
    | "ghost"
    | "link";
  size?: "default" | "sm" | "lg" | "icon" | "xs";
  callbackUrl?: string;
  showIcon?: boolean;
  onLogoutStart?: () => void;
  children?: React.ReactNode;
}

export function LogoutButton({
  variant = "ghost",
  size = "default",
  callbackUrl = "/signin",
  showIcon = true,
  onLogoutStart,
  children,
  className,
  disabled,
  onClick,
  ...props
}: LogoutButtonProps) {
  const [loading, setLoading] = React.useState(false);

  const handleLogout = async (e: React.MouseEvent<HTMLButtonElement>) => {
    onClick?.(e);
    if (e.defaultPrevented) return;

    try {
      setLoading(true);
      onLogoutStart?.();
      await signOut({ callbackUrl });
    } catch (err) {
      console.error("Sign out error:", err);
      toast.error("Failed to sign out. Please try again.");
      setLoading(false);
    }
  };

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      disabled={disabled || loading}
      onClick={handleLogout}
      className={cn("gap-2", className)}
      {...props}
    >
      {loading ? (
        <Loader2 className="size-4 animate-spin shrink-0" aria-hidden="true" />
      ) : showIcon ? (
        <LogOut className="size-4 shrink-0" aria-hidden="true" />
      ) : null}
      {children ?? (loading ? "Signing out…" : "Log out")}
    </Button>
  );
}
