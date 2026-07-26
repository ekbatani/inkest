import { Suspense } from "react";
import Link from "next/link";
import { LogoMark } from "@/components/brand/logo-mark";
import { AuthForm } from "@/components/auth/auth-form";
import { signupAction } from "@/server/auth/actions";

export default function SignUpPage() {
  return (
    <div className="surface-card p-6 shadow-sm border border-border/80 rounded-2xl">
      <div className="mb-6 flex flex-col items-center gap-2 text-center">
        <span className="flex size-10 items-center justify-center rounded-xl bg-foreground text-background shadow-sm">
          <LogoMark className="size-5" />
        </span>
        <h1 className="text-xl font-semibold tracking-tight">Create workspace</h1>
        <p className="text-xs text-muted-foreground max-w-xs">
          Register a new account to set up your profile and personal workspace.
        </p>
      </div>
      <Suspense>
        <AuthForm mode="signup" signupAction={signupAction} />
      </Suspense>
      <div className="mt-5 border-t border-border/60 pt-4 text-center text-xs text-muted-foreground">
        Already registered?{" "}
        <Link href="/signin" className="font-semibold text-foreground underline underline-offset-4 hover:text-primary">
          Sign in to existing account
        </Link>
      </div>
    </div>
  );
}
