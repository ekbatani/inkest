import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { db, schema } from "@/server/db/client";
import { getCurrentUser } from "@/server/auth";
import { getWorkspaceForUser } from "@/server/auth/users";
import { randomId } from "@/lib/slug";
import type { CreditLedgerEntry, Payment } from "@/server/db/schema";
import {
  billingWebhookUrl,
  appBaseUrl,
  getBillingConfig,
  getBillingStatus,
  type BillingStatus,
} from "./config";
import { createInvoice, type WebhookOutcome } from "./provider";

// All reads and mutations are scoped to the current user; admin billing
// actions additionally require a DB-level admin role (deliberately not gated
// on cloud deployment, so self-hosted operators can confirm manual payments —
// see docs/billing.md).

async function getContext() {
  const user = await getCurrentUser();
  if (!user) throw new Error("UNAUTHORIZED");

  const workspace = await getWorkspaceForUser(user.id);
  if (!workspace) throw new Error("NO_WORKSPACE");

  return { user, workspace };
}

export async function isBillingAdmin(): Promise<boolean> {
  const user = await getCurrentUser();
  if (!user || user.status === "suspended") return false;
  const rows = await db
    .select({ role: schema.users.role, status: schema.users.status })
    .from(schema.users)
    .where(eq(schema.users.id, user.id))
    .limit(1);
  return rows[0]?.status !== "suspended" && rows[0]?.role === "admin";
}

async function requireBillingAdmin() {
  if (!(await isBillingAdmin())) throw new Error("FORBIDDEN");
}

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

function isUniqueConstraintError(err: unknown) {
  // Drizzle wraps driver errors (DrizzleQueryError.cause → LibsqlError), so
  // walk the cause chain looking for the SQLite uniqueness violation.
  let current = err;
  while (current instanceof Error) {
    if (
      current.message.includes("UNIQUE constraint failed") ||
      (current as { code?: string }).code === "SQLITE_CONSTRAINT_UNIQUE"
    ) {
      return true;
    }
    current = (current as { cause?: unknown }).cause as Error | undefined;
  }
  return false;
}

export async function getBalance(userId: string): Promise<number> {
  const rows = await db
    .select({
      balance: sql<number>`coalesce(sum(${schema.creditLedger.delta}), 0)`,
    })
    .from(schema.creditLedger)
    .where(eq(schema.creditLedger.userId, userId));
  return round2(Number(rows[0]?.balance ?? 0));
}

export async function listPayments(userId: string, limit = 25): Promise<Payment[]> {
  return db
    .select()
    .from(schema.payments)
    .where(eq(schema.payments.userId, userId))
    .orderBy(desc(schema.payments.createdAt))
    .limit(limit);
}

export async function listLedger(
  userId: string,
  limit = 25,
): Promise<CreditLedgerEntry[]> {
  return db
    .select()
    .from(schema.creditLedger)
    .where(eq(schema.creditLedger.userId, userId))
    .orderBy(desc(schema.creditLedger.createdAt))
    .limit(limit);
}

export async function getPaymentForUser(
  paymentId: string,
): Promise<Payment | null> {
  const { user } = await getContext();
  const rows = await db
    .select()
    .from(schema.payments)
    .where(
      and(eq(schema.payments.id, paymentId), eq(schema.payments.userId, user.id)),
    )
    .limit(1);
  return rows[0] ?? null;
}

export type BillingOverview = {
  status: BillingStatus;
  balance: number;
  payments: Payment[];
  ledger: CreditLedgerEntry[];
  isAdmin: boolean;
  pendingAdminPayments: PendingManualPayment[];
};

export async function getBillingOverview(): Promise<BillingOverview> {
  const { user } = await getContext();
  const admin = await isBillingAdmin();
  const [balance, payments, ledger] = await Promise.all([
    getBalance(user.id),
    listPayments(user.id),
    listLedger(user.id),
  ]);
  const pendingAdminPayments = admin ? await listPendingManualPayments() : [];

  return {
    status: getBillingStatus(),
    balance,
    payments,
    ledger,
    isAdmin: admin,
    pendingAdminPayments,
  };
}

export async function createPayment(amountUsd: number): Promise<Payment> {
  const { user, workspace } = await getContext();
  const config = getBillingConfig();
  if (!config) throw new Error("Billing is not configured on this instance.");

  const amount = round2(amountUsd);
  if (
    !Number.isFinite(amount) ||
    amount < config.minTopUpUsd ||
    amount > config.maxTopUpUsd
  ) {
    throw new Error(
      `Top-up amount must be between $${config.minTopUpUsd} and $${config.maxTopUpUsd}.`,
    );
  }

  const credits = round2(amount * config.creditsPerUsd);
  const paymentId = randomId("pay");

  const inserted = await db
    .insert(schema.payments)
    .values({
      id: paymentId,
      userId: user.id,
      workspaceId: workspace.id,
      provider: config.provider,
      status: "pending",
      amountUsd: amount,
      credits,
    })
    .returning();
  const payment = inserted[0];

  try {
    const invoice = await createInvoice(config, {
      paymentId,
      amountUsd: amount,
      description: `Inkest credit top-up (${credits} credits)`,
      callbackUrl: billingWebhookUrl(),
      returnUrl: `${appBaseUrl()}/billing?payment=${encodeURIComponent(paymentId)}`,
    });
    const updated = await db
      .update(schema.payments)
      .set({
        providerInvoiceId: invoice.providerInvoiceId,
        walletAddress: invoice.walletAddress,
        paidAsset: invoice.payAsset,
        paidNetwork: invoice.payNetwork,
        paidAmount: invoice.payAmount,
        expiresAt: invoice.expiresAt,
        metadataJson: invoice.payUrl
          ? JSON.stringify({ payUrl: invoice.payUrl })
          : null,
        updatedAt: new Date(),
      })
      .where(eq(schema.payments.id, paymentId))
      .returning();
    return updated[0] ?? payment;
  } catch (err) {
    await db
      .update(schema.payments)
      .set({
        status: "failed",
        metadataJson: JSON.stringify({
          error: err instanceof Error ? err.message : "invoice_failed",
        }),
        updatedAt: new Date(),
      })
      .where(eq(schema.payments.id, paymentId));
    throw err;
  }
}

const OPEN_STATUSES = ["pending", "awaiting_confirmation"] as const;

// Single confirmation path shared by webhooks and admin confirmation. The
// guarded UPDATE (only from an open status) serializes concurrent calls; the
// unique (paymentId, reason) index on the ledger makes the credit grant
// idempotent even under races.
async function applyOutcome(
  payment: Payment,
  outcome: WebhookOutcome,
): Promise<{ applied: boolean; alreadyProcessed: boolean }> {
  const wasOpen = OPEN_STATUSES.includes(
    payment.status as (typeof OPEN_STATUSES)[number],
  );
  if (!wasOpen && outcome.status === "awaiting_confirmation") {
    return { applied: false, alreadyProcessed: true };
  }

  if (outcome.status === "confirmed") {
    await db
      .update(schema.payments)
      .set({
        status: "confirmed",
        confirmedAt: new Date(),
        paidAmount: outcome.paidAmount ?? payment.paidAmount,
        paidAsset: outcome.paidAsset ?? payment.paidAsset,
        paidNetwork: outcome.paidNetwork ?? payment.paidNetwork,
        txHash: outcome.txHash ?? payment.txHash,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(schema.payments.id, payment.id),
          inArray(schema.payments.status, [...OPEN_STATUSES]),
        ),
      );

    const refreshed = await db
      .select({ status: schema.payments.status })
      .from(schema.payments)
      .where(eq(schema.payments.id, payment.id))
      .limit(1);
    if (refreshed[0]?.status !== "confirmed") {
      // Another worker confirmed first (or a later webhook already did).
      return { applied: false, alreadyProcessed: true };
    }

    try {
      await db.insert(schema.creditLedger).values({
        id: randomId("led"),
        userId: payment.userId,
        workspaceId: payment.workspaceId,
        delta: payment.credits,
        reason: "payment",
        paymentId: payment.id,
      });
    } catch (err) {
      if (!isUniqueConstraintError(err)) throw err;
      return { applied: false, alreadyProcessed: true };
    }
    return { applied: true, alreadyProcessed: false };
  }

  const nextStatus =
    outcome.status === "awaiting_confirmation"
      ? "awaiting_confirmation"
      : outcome.status;
  await db
    .update(schema.payments)
    .set({
      status: nextStatus,
      paidAmount: outcome.paidAmount ?? payment.paidAmount,
      paidAsset: outcome.paidAsset ?? payment.paidAsset,
      paidNetwork: outcome.paidNetwork ?? payment.paidNetwork,
      txHash: outcome.txHash ?? payment.txHash,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(schema.payments.id, payment.id),
        inArray(schema.payments.status, [...OPEN_STATUSES]),
      ),
    );
  return { applied: true, alreadyProcessed: false };
}

export async function applyProviderCallback(
  outcome: WebhookOutcome,
): Promise<{ ok: boolean; reason?: string; applied?: boolean }> {
  const rows = await db
    .select()
    .from(schema.payments)
    .where(eq(schema.payments.providerInvoiceId, outcome.providerInvoiceId))
    .limit(1);
  const payment = rows[0];
  if (!payment) return { ok: false, reason: "unknown_payment" };

  const result = await applyOutcome(payment, outcome);
  return { ok: true, applied: result.applied };
}

export async function submitManualTx(
  paymentId: string,
  txHash: string,
): Promise<Payment> {
  const payment = await getPaymentForUser(paymentId);
  if (!payment) throw new Error("Payment not found.");
  if (payment.provider !== "manual") {
    throw new Error("Only manual payments accept a transaction hash.");
  }
  if (!OPEN_STATUSES.includes(payment.status as (typeof OPEN_STATUSES)[number])) {
    throw new Error("This payment can no longer be updated.");
  }
  await db
    .update(schema.payments)
    .set({ status: "awaiting_confirmation", txHash, updatedAt: new Date() })
    .where(eq(schema.payments.id, payment.id));

  const updated = await getPaymentForUser(paymentId);
  return updated ?? payment;
}

export type PendingManualPayment = Payment & { userEmail: string | null };

export async function listPendingManualPayments(): Promise<PendingManualPayment[]> {
  return db
    .select({
      id: schema.payments.id,
      userId: schema.payments.userId,
      workspaceId: schema.payments.workspaceId,
      provider: schema.payments.provider,
      providerInvoiceId: schema.payments.providerInvoiceId,
      status: schema.payments.status,
      amountUsd: schema.payments.amountUsd,
      credits: schema.payments.credits,
      paidAmount: schema.payments.paidAmount,
      paidAsset: schema.payments.paidAsset,
      paidNetwork: schema.payments.paidNetwork,
      walletAddress: schema.payments.walletAddress,
      txHash: schema.payments.txHash,
      metadataJson: schema.payments.metadataJson,
      confirmedAt: schema.payments.confirmedAt,
      expiresAt: schema.payments.expiresAt,
      createdAt: schema.payments.createdAt,
      updatedAt: schema.payments.updatedAt,
      userEmail: schema.users.email,
    })
    .from(schema.payments)
    .innerJoin(schema.users, eq(schema.users.id, schema.payments.userId))
    .where(
      and(
        eq(schema.payments.provider, "manual"),
        inArray(schema.payments.status, [...OPEN_STATUSES]),
      ),
    )
    .orderBy(desc(schema.payments.createdAt))
    .limit(50);
}

export async function confirmManualPayment(
  paymentId: string,
  txHash?: string,
): Promise<Payment> {
  await requireBillingAdmin();
  const rows = await db
    .select()
    .from(schema.payments)
    .where(eq(schema.payments.id, paymentId))
    .limit(1);
  const payment = rows[0];
  if (!payment) throw new Error("Payment not found.");
  if (payment.provider !== "manual") {
    throw new Error("Only manual payments are confirmed by admins.");
  }

  const result = await applyOutcome(payment, {
    providerInvoiceId: payment.providerInvoiceId ?? payment.id,
    status: "confirmed",
    paidAmount: payment.amountUsd,
    paidAsset: payment.paidAsset,
    paidNetwork: payment.paidNetwork,
    txHash: txHash?.trim() || payment.txHash,
  });
  if (!result.applied && !result.alreadyProcessed) {
    throw new Error("Payment can no longer be confirmed.");
  }

  const updated = await db
    .select()
    .from(schema.payments)
    .where(eq(schema.payments.id, paymentId))
    .limit(1);
  return updated[0];
}

export async function rejectManualPayment(
  paymentId: string,
  note?: string,
): Promise<Payment> {
  await requireBillingAdmin();
  const rows = await db
    .select()
    .from(schema.payments)
    .where(eq(schema.payments.id, paymentId))
    .limit(1);
  const payment = rows[0];
  if (!payment) throw new Error("Payment not found.");

  await db
    .update(schema.payments)
    .set({
      status: "rejected",
      metadataJson: note
        ? JSON.stringify({ rejectNote: note.slice(0, 300) })
        : payment.metadataJson,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(schema.payments.id, paymentId),
        inArray(schema.payments.status, [...OPEN_STATUSES]),
      ),
    );

  const updated = await db
    .select()
    .from(schema.payments)
    .where(eq(schema.payments.id, paymentId))
    .limit(1);
  return updated[0];
}

export async function grantCredits(
  targetUserId: string,
  delta: number,
  note?: string,
): Promise<CreditLedgerEntry> {
  await requireBillingAdmin();
  const amount = round2(delta);
  if (!Number.isFinite(amount) || amount === 0 || Math.abs(amount) > 1_000_000) {
    throw new Error("Credit adjustment must be a non-zero amount.");
  }

  const workspaceRows = await db
    .select({ id: schema.workspaces.id })
    .from(schema.workspaces)
    .where(eq(schema.workspaces.userId, targetUserId))
    .limit(1);
  const workspaceId = workspaceRows[0]?.id;
  if (!workspaceId) throw new Error("That user has no workspace.");

  const inserted = await db
    .insert(schema.creditLedger)
    .values({
      id: randomId("led"),
      userId: targetUserId,
      workspaceId,
      delta: amount,
      reason: "admin_grant",
      note: note?.trim().slice(0, 300) || null,
    })
    .returning();
  return inserted[0];
}

export async function grantCreditsByEmail(
  email: string,
  delta: number,
  note?: string,
): Promise<CreditLedgerEntry> {
  await requireBillingAdmin();
  const normalized = email.trim().toLowerCase();
  const rows = await db
    .select({ id: schema.users.id })
    .from(schema.users)
    .where(eq(schema.users.email, normalized))
    .limit(1);
  const targetUserId = rows[0]?.id;
  if (!targetUserId) throw new Error("No user found with that email.");
  return grantCredits(targetUserId, delta, note);
}
