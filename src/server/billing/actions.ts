"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  confirmManualPayment,
  createPayment,
  getBillingOverview,
  getPaymentForUser,
  grantCreditsByEmail,
  rejectManualPayment,
  submitManualTx,
} from "./service";

function revalidateBilling() {
  revalidatePath("/billing");
}

export async function getBillingOverviewAction() {
  return getBillingOverview();
}

const createTopUpSchema = z.object({
  amountUsd: z
    .number()
    .positive("Enter an amount greater than zero.")
    .max(1_000_000, "Amount is unexpectedly large."),
});

export async function createTopUpAction(input: unknown) {
  const parsed = createTopUpSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid top-up amount.");
  }
  const payment = await createPayment(parsed.data.amountUsd);
  revalidateBilling();
  return payment;
}

export async function getPaymentAction(paymentId: string) {
  if (!paymentId) return null;
  return getPaymentForUser(paymentId);
}

const submitManualTxSchema = z.object({
  paymentId: z.string().min(1),
  txHash: z
    .string()
    .trim()
    .min(10, "Enter the full transaction hash.")
    .max(200, "Transaction hash is unexpectedly long."),
});

export async function submitManualTxAction(input: unknown) {
  const parsed = submitManualTxSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid transaction hash.");
  }
  const payment = await submitManualTx(parsed.data.paymentId, parsed.data.txHash);
  revalidateBilling();
  return payment;
}

const manualReviewSchema = z.object({
  paymentId: z.string().min(1),
  txHash: z.string().trim().max(200).optional(),
  note: z.string().trim().max(300).optional(),
});

export async function confirmManualPaymentAction(input: unknown) {
  const parsed = manualReviewSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid request.");
  }
  const payment = await confirmManualPayment(parsed.data.paymentId, parsed.data.txHash);
  revalidateBilling();
  return payment;
}

export async function rejectManualPaymentAction(input: unknown) {
  const parsed = manualReviewSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid request.");
  }
  const payment = await rejectManualPayment(parsed.data.paymentId, parsed.data.note);
  revalidateBilling();
  return payment;
}

const grantCreditsSchema = z.object({
  email: z.string().trim().email("Enter a valid user email."),
  delta: z
    .number()
    .refine((v) => Number.isFinite(v) && v !== 0, "Enter a non-zero amount."),
  note: z.string().trim().max(300).optional(),
});

export async function grantCreditsAction(input: unknown) {
  const parsed = grantCreditsSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid credit adjustment.");
  }
  const entry = await grantCreditsByEmail(
    parsed.data.email,
    parsed.data.delta,
    parsed.data.note,
  );
  revalidateBilling();
  return entry;
}
