import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { Check } from "lucide-react";
import { LogoMark } from "@/components/brand/logo-mark";
import { AuthForm } from "@/components/auth/auth-form";

export const metadata: Metadata = {
  title: "Sign in",
  description:
    "Sign in to your Inkest workspace — your private, Markdown-native home for notes, journaling, projects, and ideas.",
};

const POINTS = ["Markdown native", "Private by default", "Your data, always"];

export default function SignInPage() {
  return (
    <div className="auth-scene">
      <div className="hero-copy">
        <p className="marketing-eyebrow">Welcome back</p>
        <h1 className="marketing-display auth-headline mt-4">
          Return to your <em>space for thought.</em>
        </h1>
        <p className="auth-lede">
          Your notes, journal, and projects are exactly as you left them — private,
          in Markdown, and ready for the next idea.
        </p>
        <ul className="auth-points" aria-label="Product promises">
          {POINTS.map((point) => (
            <li key={point}>
              <Check className="size-3.5" aria-hidden="true" />
              {point}
            </li>
          ))}
        </ul>
      </div>

      <div className="auth-card marketing-fade-in">
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="auth-logo-tile">
            <LogoMark className="size-7" idPrefix="auth-signin" />
          </span>
          <div>
            <h2 className="text-lg font-semibold tracking-tight">
              Sign in to your workspace
            </h2>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Pick up your thinking where it left off.
            </p>
          </div>
        </div>

        <Suspense>
          <AuthForm mode="signin" />
        </Suspense>

        <div className="auth-divider" />
        <p className="auth-switch">
          New to Inkest?{" "}
          <Link href="/signup" className="auth-link">
            Start your workspace
          </Link>
        </p>
      </div>
    </div>
  );
}
