"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  Settings,
  LogOut,
  Users,
  Loader2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuGroup,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export interface UserMenuProps {
  user?: {
    id?: string;
    email?: string | null;
    name?: string | null;
    role?: "admin" | "user" | string | null;
  } | null;
  align?: "start" | "end" | "center";
  side?: "top" | "bottom" | "left" | "right";
  sideOffset?: number;
  className?: string;
  triggerClassName?: string;
  showDetails?: boolean;
}

function getInitials(name?: string | null, email?: string | null): string {
  if (name && name.trim()) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }
  if (email && email.trim()) {
    return email.slice(0, 2).toUpperCase();
  }
  return "U";
}

export function UserMenu({
  user,
  align = "end",
  side = "bottom",
  sideOffset = 8,
  className,
  triggerClassName,
  showDetails = false,
}: UserMenuProps) {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = React.useState(false);
  const initials = getInitials(user?.name, user?.email);
  const displayName = user?.name?.trim() || user?.email?.split("@")[0] || "User";
  const displayEmail = user?.email || "";
  const isAdmin = user?.role === "admin";

  const handleLogout = async () => {
    try {
      setLoggingOut(true);
      await signOut({ callbackUrl: "/signin" });
    } catch (err) {
      console.error("Sign out error:", err);
      toast.error("Failed to sign out. Please try again.");
      setLoggingOut(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "flex items-center gap-2 rounded-xl text-xs font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring",
          triggerClassName,
        )}
        aria-label="User account menu"
      >
        <Avatar size="sm" className="size-7 ring-1 ring-border/70 shrink-0">
          <AvatarFallback className="bg-primary/10 text-primary text-[11px] font-semibold">
            {initials}
          </AvatarFallback>
        </Avatar>
        {showDetails && (
          <div className="flex flex-col text-start min-w-0 flex-1">
            <span className="truncate text-xs font-medium text-foreground">
              {displayName}
            </span>
            <span className="truncate text-[10px] text-muted-foreground">
              {displayEmail}
            </span>
          </div>
        )}
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align={align}
        side={side}
        sideOffset={sideOffset}
        className={cn("w-56 p-1.5", className)}
      >
        {/* User Identity Header */}
        <DropdownMenuLabel className="p-2 font-normal">
          <div className="flex items-center gap-2.5">
            <Avatar size="default" className="size-8 ring-1 ring-border/60 shrink-0">
              <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="truncate text-xs font-semibold text-foreground">
                  {displayName}
                </span>
                {isAdmin && (
                  <Badge
                    variant="outline"
                    className="h-4 px-1 text-[9px] font-medium border-primary/30 text-primary"
                  >
                    Admin
                  </Badge>
                )}
              </div>
              <span className="truncate text-[11px] text-muted-foreground">
                {displayEmail}
              </span>
            </div>
          </div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        <DropdownMenuGroup>
          <DropdownMenuItem
            onClick={() => router.push("/settings")}
            className="cursor-pointer"
          >
            <Settings className="size-4" />
            <span>Workspace Settings</span>
          </DropdownMenuItem>

          {isAdmin && (
            <DropdownMenuItem
              onClick={() => router.push("/settings?tab=users")}
              className="cursor-pointer"
            >
              <Users className="size-4" />
              <span>User Management</span>
            </DropdownMenuItem>
          )}
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          variant="destructive"
          disabled={loggingOut}
          onClick={handleLogout}
          className="cursor-pointer text-destructive focus:bg-destructive/10 focus:text-destructive"
        >
          {loggingOut ? (
            <Loader2 className="size-4 animate-spin shrink-0" />
          ) : (
            <LogOut className="size-4 shrink-0" />
          )}
          <span>{loggingOut ? "Signing out…" : "Log out"}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
