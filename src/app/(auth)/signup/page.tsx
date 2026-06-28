import { Suspense } from "react";
import Link from "next/link";
import { Feather } from "lucide-react";
import { AuthForm } from "@/components/auth/auth-form";
import { signupAction } from "@/server/auth/actions";

export default function SignUpPage() {
  return (
    <div className="rounded-xl border bg-card p-6 shadow-sm">
      <div className="mb-6 flex flex-col items-center gap-2 text-center">
        <span className="flex size-9 items-center justify-center rounded-md bg-foreground text-background">
          <Feather className="size-5" />
        </span>
        <h1 className="text-lg font-semibold">Create your workspace</h1>
        <p className="text-sm text-muted-foreground">
          A calm, Markdown-first space for your notes.
        </p>
      </div>
      <Suspense>
        <AuthForm mode="signup" signupAction={signupAction} />
      </Suspense>
      <p className="mt-4 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/signin" className="font-medium text-foreground underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
