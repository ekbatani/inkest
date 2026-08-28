"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import {
  createUserAdmin,
  updateUserRoleAdmin,
  updateUserStatusAdmin,
  resetUserPasswordAdmin,
  deleteUserAdmin,
} from "./admin-service";

const CreateUserSchema = z.object({
  email: z.string().trim().email("Please enter a valid email address."),
  name: z.string().trim().max(100).optional(),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters long.")
    .max(128, "Password is too long."),
  role: z.enum(["admin", "user"]),
});

const UpdateRoleSchema = z.object({
  userId: z.string().min(1, "User ID is required."),
  role: z.enum(["admin", "user"]),
});

const UpdateStatusSchema = z.object({
  userId: z.string().min(1, "User ID is required."),
  status: z.enum(["active", "suspended"]),
});

const ResetPasswordSchema = z.object({
  userId: z.string().min(1, "User ID is required."),
  newPassword: z
    .string()
    .min(8, "Password must be at least 8 characters long.")
    .max(128, "Password is too long."),
});

const DeleteUserSchema = z.object({
  userId: z.string().min(1, "User ID is required."),
});

export async function createUserAction(
  rawInput: unknown,
): Promise<{ success?: boolean; error?: string; userId?: string }> {
  try {
    const parsed = CreateUserSchema.safeParse(rawInput);
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
    }

    const res = await createUserAdmin(parsed.data);
    revalidatePath("/admin/users");
    return { success: true, userId: res.userId };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to create user.";
    return { error: message };
  }
}

export async function updateUserRoleAction(
  rawInput: unknown,
): Promise<{ success?: boolean; error?: string }> {
  try {
    const parsed = UpdateRoleSchema.safeParse(rawInput);
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
    }

    await updateUserRoleAdmin(parsed.data);
    revalidatePath("/admin/users");
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update user role.";
    return { error: message };
  }
}

export async function updateUserStatusAction(
  rawInput: unknown,
): Promise<{ success?: boolean; error?: string }> {
  try {
    const parsed = UpdateStatusSchema.safeParse(rawInput);
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
    }

    await updateUserStatusAdmin(parsed.data);
    revalidatePath("/admin/users");
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update user status.";
    return { error: message };
  }
}

export async function resetUserPasswordAction(
  rawInput: unknown,
): Promise<{ success?: boolean; error?: string }> {
  try {
    const parsed = ResetPasswordSchema.safeParse(rawInput);
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
    }

    await resetUserPasswordAdmin(parsed.data);
    revalidatePath("/admin/users");
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to reset password.";
    return { error: message };
  }
}

export async function deleteUserAction(
  rawInput: unknown,
): Promise<{ success?: boolean; error?: string }> {
  try {
    const parsed = DeleteUserSchema.safeParse(rawInput);
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
    }

    await deleteUserAdmin(parsed.data);
    revalidatePath("/admin/users");
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to delete user.";
    return { error: message };
  }
}
