import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { Check } from "lucide-react";
import { LogoMark } from "@/components/brand/logo-mark";
import { AuthForm } from "@/components/auth/auth-form";

export const metadata: Metadata = {
  title: "Create your workspace",
  description:
    "Create your Inkest workspace — a private, Markdown-native home for notes, daily journaling, projects, and a citing AI assistant.",
};

const POINTS = ["Markdown native", "Open source", "Your data, always"];

export default function SignUpPage() {
  return (
    <div className="auth-scene">
      <div className="hero-copy">
        <p className="marketing-eyebrow">Create your workspace</p>
        <h1 className="marketing-display auth-headline mt-4">
          Make space <em>for thought.</em>
        </h1>
        <p className="auth-lede">
          A private, Markdown-native home for your notes, diary, projects, and
          ideas — with an AI that answers from your knowledge and shows its
          sources.
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
            <LogoMark className="size-7" idPrefix="auth-signup" />
          </span>
          <div>
            <h2 className="text-lg font-semibold tracking-tight">
              Create your workspace
            </h2>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Free, private, and yours — set up in under a minute.
            </p>
          </div>
        </div>

        <Suspense>
          <AuthForm mode="signup" />
        </Suspense>

        <div className="auth-divider" />
        <p className="auth-switch">
          Already have a space?{" "}
          <Link href="/signin" className="auth-link">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
