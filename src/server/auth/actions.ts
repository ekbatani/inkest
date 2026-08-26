"use server";

import { z } from "zod";
import { createUserWithWorkspace, hasAccountWithEmail } from "./users";

const SignupSchema = z.object({
  email: z.string().email("Enter a valid email."),
  password: z.string().min(8, "Password must be at least 8 characters."),
  name: z.string().trim().optional(),
});

export async function signupAction(
  email: string,
  password: string,
  name: string,
): Promise<{ error?: string; code?: string }> {
  const parsed = SignupSchema.safeParse({ email, password, name });
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Invalid input.",
      code: "invalid-input",
    };
  }

  const result = await createUserWithWorkspace(
    parsed.data.email,
    parsed.data.password,
    parsed.data.name,
  );

  if ("error" in result) {
    return { error: result.error, code: result.code };
  }

  return {};
}

/**
 * Explains why a credentials sign-in failed, so the form can say whether
 * the email is unknown or the password was wrong. Only reached after a
 * failed NextAuth attempt; reveals no more than signup's duplicate-email
 * message already does.
 */
export async function explainSignInFailure(
  email: string,
): Promise<{ reason: "no-account" | "wrong-password" }> {
  if (!email.trim()) return { reason: "no-account" };
  const exists = await hasAccountWithEmail(email);
  return { reason: exists ? "wrong-password" : "no-account" };
}
