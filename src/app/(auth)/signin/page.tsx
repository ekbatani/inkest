import { Suspense } from "react";
import Link from "next/link";
import { LogoMark } from "@/components/brand/logo-mark";
import { AuthForm } from "@/components/auth/auth-form";
import { signupAction } from "@/server/auth/actions";

export default function SignInPage() {
  return (
    <div className="surface-card p-6 shadow-sm border border-border/80 rounded-2xl">
      <div className="mb-6 flex flex-col items-center gap-2 text-center">
        <span className="flex size-12 items-center justify-center rounded-2xl bg-card border border-border/80 p-1.5 shadow-sm">
          <LogoMark className="size-full" />
        </span>
        <h1 className="text-xl font-semibold tracking-tight">inkest workspace</h1>
        <p className="text-xs text-muted-foreground max-w-xs">
          Sign in to your account or register a new workspace to start writing.
        </p>
      </div>
      <Suspense>
        <AuthForm mode="signin" signupAction={signupAction} />
      </Suspense>
      <div className="mt-5 border-t border-border/60 pt-4 text-center text-xs text-muted-foreground">
        Need a new account?{" "}
        <Link href="/signup" className="font-semibold text-foreground underline underline-offset-4 hover:text-primary">
          Register new user profile
        </Link>
      </div>
    </div>
  );
}
