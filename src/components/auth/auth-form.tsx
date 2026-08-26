"use client";

import * as React from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { AlertCircle, CheckCircle2, Loader2, LogIn, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { explainSignInFailure, signupAction } from "@/server/auth/actions";

type Mode = "signin" | "signup";

type Notice = {
  kind: "error" | "success";
  title: string;
  hint?: React.ReactNode;
};

const NEXTAUTH_ERROR_MESSAGES: Record<string, string> = {
  CredentialsSignin: "Incorrect email or password.",
  SessionExpired: "Your session expired. Please sign in again.",
  AccessDenied: "Sign-in was denied. Please try again.",
  Configuration: "Sign-in is not configured correctly on this server.",
};

function safeCallbackUrl(raw: string | null) {
  if (raw && raw.startsWith("/") && !raw.startsWith("//")) return raw;
  return "/dashboard";
}

export function AuthForm({ mode: initialMode = "signin" }: { mode?: Mode }) {
  const searchParams = useSearchParams();
  const [activeMode, setActiveMode] = React.useState<Mode>(initialMode);
  const [loading, setLoading] = React.useState(false);
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [name, setName] = React.useState("");
  const [notice, setNotice] = React.useState<Notice | null>(() => {
    const code = searchParams.get("error");
    if (!code) return null;
    return {
      kind: "error",
      title:
        NEXTAUTH_ERROR_MESSAGES[code] ??
        "Sign-in failed unexpectedly. Please try again.",
    };
  });

  const callbackUrl = safeCallbackUrl(searchParams.get("callbackUrl"));

  function switchMode(mode: Mode) {
    setActiveMode(mode);
    setNotice(null);
  }

  async function submitSignIn(): Promise<boolean> {
    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
      callbackUrl,
    });

    if (!res?.error) {
      setNotice({ kind: "success", title: "Signed in — opening your workspace…" });
      window.location.assign(callbackUrl);
      return true;
    }

    if (res.error === "CredentialsSignin") {
      // The provider treats an unknown email and a wrong password the same;
      // ask the server which one it was so the message can be specific.
      const { reason } = await explainSignInFailure(email);
      setNotice(
        reason === "no-account"
          ? {
              kind: "error",
              title: "No account exists with this email.",
              hint: (
                <>
                  Double-check the address, or{" "}
                  <Link href="/signup" className="auth-alert-link">
                    create your workspace
                  </Link>{" "}
                  instead.
                </>
              ),
            }
          : {
              kind: "error",
              title: "Incorrect password for this email.",
              hint: "Passwords are at least 8 characters — watch for caps lock and typos.",
            },
      );
      return false;
    }

    setNotice({
      kind: "error",
      title:
        NEXTAUTH_ERROR_MESSAGES[res.error] ??
        "Sign-in failed. Please try again.",
    });
    return false;
  }

  async function submitSignUp(): Promise<boolean> {
    const res = await signupAction(email, password, name);
    if (res.error) {
      setNotice({
        kind: "error",
        title: res.error,
        hint:
          res.code === "email-exists" ? (
            <>
              Use the Sign In tab, or{" "}
              <Link href="/signin" className="auth-alert-link">
                go to the sign-in page
              </Link>{" "}
              to continue.
            </>
          ) : undefined,
      });
      return false;
    }

    const signedIn = await signIn("credentials", {
      email,
      password,
      redirect: false,
      callbackUrl: "/onboarding",
    });

    if (signedIn?.error) {
      setNotice({
        kind: "error",
        title: "Your workspace is ready, but automatic sign-in didn't complete.",
        hint: (
          <Link href="/signin" className="auth-alert-link">
            Sign in to continue setting it up.
          </Link>
        ),
      });
      return false;
    }

    setNotice({ kind: "success", title: "Workspace created — starting setup…" });
    window.location.assign("/onboarding");
    return true;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setNotice(null);

    let navigated = false;
    try {
      navigated =
        activeMode === "signup" ? await submitSignUp() : await submitSignIn();
    } catch (err) {
      console.error(err);
      setNotice({
        kind: "error",
        title: "Something went wrong on our side. Please try again.",
      });
    } finally {
      if (!navigated) setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      {notice && (
        <div
          className={cn(
            "auth-alert",
            notice.kind === "success" && "auth-alert--success",
          )}
          role={notice.kind === "error" ? "alert" : "status"}
        >
          {notice.kind === "error" ? (
            <AlertCircle className="size-4 shrink-0" aria-hidden="true" />
          ) : (
            <CheckCircle2 className="size-4 shrink-0" aria-hidden="true" />
          )}
          <div className="min-w-0">
            <p className="auth-alert-title">{notice.title}</p>
            {notice.hint && <p className="auth-alert-hint">{notice.hint}</p>}
          </div>
        </div>
      )}

      {/* Mode Switcher Tabs */}
      <div className="auth-tabs">
        <button
          type="button"
          onClick={() => switchMode("signin")}
          className={cn("auth-tab", activeMode === "signin" && "auth-tab--active")}
        >
          <LogIn className="size-3.5" aria-hidden="true" />
          Sign In
        </button>
        <button
          type="button"
          onClick={() => switchMode("signup")}
          className={cn("auth-tab", activeMode === "signup" && "auth-tab--active")}
        >
          <UserPlus className="size-3.5" aria-hidden="true" />
          Register
        </button>
      </div>

      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        {activeMode === "signup" && (
          <div className="flex flex-col gap-2">
            <Label htmlFor="name" className="auth-label">Full Name</Label>
            <Input
              id="name"
              className="auth-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Alex Morgan"
              autoComplete="name"
            />
          </div>
        )}

        <div className="flex flex-col gap-2">
          <Label htmlFor="email" className="auth-label">Email address</Label>
          <Input
            id="email"
            type="email"
            required
            className="auth-input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="password" className="auth-label">Password</Label>
          <Input
            id="password"
            type="password"
            required
            minLength={8}
            className="auth-input"
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

        <Button
          type="submit"
          disabled={loading}
          className="auth-submit btn-sheen mt-2 w-full gap-2"
        >
          {loading && <Loader2 className="size-4 animate-spin" />}
          {activeMode === "signup" ? (
            <>
              <UserPlus className="size-4" aria-hidden="true" />
              Create workspace
            </>
          ) : (
            <>
              <LogIn className="size-4" aria-hidden="true" />
              Sign in to workspace
            </>
          )}
        </Button>
      </form>
    </div>
  );
}
