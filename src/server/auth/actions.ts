"use server";

import { z } from "zod";
import { createUserWithWorkspace } from "./users";

const SignupSchema = z.object({
  email: z.string().email("Enter a valid email."),
  password: z.string().min(8, "Password must be at least 8 characters."),
  name: z.string().trim().optional(),
});

export async function signupAction(
  email: string,
  password: string,
  name: string,
): Promise<{ error?: string }> {
  const parsed = SignupSchema.safeParse({ email, password, name });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const result = await createUserWithWorkspace(
    parsed.data.email,
    parsed.data.password,
    parsed.data.name,
  );

  if ("error" in result) {
    return { error: result.error };
  }

  return {};
}
