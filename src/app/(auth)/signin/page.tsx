import { Suspense } from "react";
import Link from "next/link";
import { Feather } from "lucide-react";
import { AuthForm } from "@/components/auth/auth-form";
import { signupAction } from "@/server/auth/actions";

export default function SignInPage() {
  return (
    <div className="surface-card p-6 shadow-sm">
      <div className="mb-6 flex flex-col items-center gap-2 text-center">
        <span className="flex size-9 items-center justify-center rounded-md bg-foreground text-background">
          <Feather className="size-5" />
        </span>
        <h1 className="text-lg font-semibold">Welcome back</h1>
        <p className="text-sm text-muted-foreground">
          Sign in to your inkest workspace.
        </p>
      </div>
      <Suspense>
        <AuthForm mode="signin" signupAction={signupAction} />
      </Suspense>
      <p className="mt-4 text-center text-sm text-muted-foreground">
        No account?{" "}
        <Link href="/signup" className="font-medium text-foreground underline">
          Create one
        </Link>
      </p>
    </div>
  );
}
