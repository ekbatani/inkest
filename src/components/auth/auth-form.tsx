"use client";

import * as React from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { Loader2, LogIn, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Mode = "signin" | "signup";

export function AuthForm({
  mode: initialMode = "signin",
  signupAction,
}: {
  mode?: Mode;
  signupAction: (
    email: string,
    password: string,
    name: string,
  ) => Promise<{
    error?: string;
  }>;
}) {
  const searchParams = useSearchParams();
  const [activeMode, setActiveMode] = React.useState<Mode>(initialMode);
  const [loading, setLoading] = React.useState(false);
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [name, setName] = React.useState("");

  const callbackUrl = searchParams.get("callbackUrl") ?? "/dashboard";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      if (activeMode === "signup") {
        const res = await signupAction(email, password, name);
        if (res.error) {
          toast.error(res.error);
          return;
        }
        toast.success("Account created successfully! Proceeding to profile setup.");
        // After signup, redirect to onboarding profile setup flow
        await signIn("credentials", {
          email,
          password,
          callbackUrl: "/onboarding",
        });
        return;
      }

      const res = await signIn("credentials", {
        email,
        password,
        callbackUrl,
        redirect: true,
      });

      if (res?.error) {
        toast.error("Invalid email or password.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Authentication failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Mode Switcher Tabs */}
      <div className="grid grid-cols-2 gap-1 rounded-xl bg-muted/60 p-1 text-xs font-semibold">
        <button
          type="button"
          onClick={() => setActiveMode("signin")}
          className={cn(
            "flex items-center justify-center gap-1.5 rounded-lg py-2 transition-all",
            activeMode === "signin"
              ? "bg-background text-foreground shadow-xs"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <LogIn className="size-3.5" />
          Sign In
        </button>
        <button
          type="button"
          onClick={() => setActiveMode("signup")}
          className={cn(
            "flex items-center justify-center gap-1.5 rounded-lg py-2 transition-all",
            activeMode === "signup"
              ? "bg-background text-foreground shadow-xs"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <UserPlus className="size-3.5" />
          Register
        </button>
      </div>

      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        {activeMode === "signup" && (
          <div className="flex flex-col gap-2">
            <Label htmlFor="name">Full Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Alex Morgan"
              autoComplete="name"
            />
          </div>
        )}

        <div className="flex flex-col gap-2">
          <Label htmlFor="email">Email address</Label>
          <Input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={
              activeMode === "signup"
                ? "At least 8 characters"
                : "Enter your password"
            }
            autoComplete={
              activeMode === "signup" ? "new-password" : "current-password"
            }
          />
        </div>

        <Button type="submit" disabled={loading} className="mt-2 w-full gap-2">
          {loading && <Loader2 className="size-4 animate-spin" />}
          {activeMode === "signup" ? (
            <>
              <UserPlus className="size-4" />
              Register & Set up Profile
            </>
          ) : (
            <>
              <LogIn className="size-4" />
              Sign in to Workspace
            </>
          )}
        </Button>
      </form>
    </div>
  );
}
