import { createHmac, timingSafeEqual } from "node:crypto";
import type { BillingConfig } from "./config";

// Payment provider drivers. Each driver turns a payment row into something a
// user can pay, and turns an untrusted webhook payload into a verified status
// update. Signature verification here is the only auth for the webhook route.

export type CreateInvoiceInput = {
  paymentId: string;
  amountUsd: number;
  description: string;
  callbackUrl: string;
  returnUrl: string;
};

export type InvoiceResult = {
  providerInvoiceId: string | null;
  payUrl: string | null;
  payAsset: string | null;
  payNetwork: string | null;
  payAmount: number | null;
  walletAddress: string | null;
  expiresAt: Date | null;
};

// Normalized webhook outcome; "unchanged" statuses leave the payment alone.
export type WebhookOutcome = {
  providerInvoiceId: string;
  status:
    | "confirmed"
    | "failed"
    | "canceled"
    | "expired"
    | "awaiting_confirmation";
  paidAmount: number | null;
  paidAsset: string | null;
  paidNetwork: string | null;
  txHash: string | null;
};

// NexaPay signs webhooks using HMAC-SHA256 with the merchant's webhook secret.
export function nexapaySign(rawBody: string, secretKey: string): string {
  return createHmac("sha256", secretKey).update(rawBody).digest("hex");
}

export function verifyNexaPaySignature(
  rawBody: string,
  signature: string | null,
  secretKey: string,
): boolean {
  if (!signature || !secretKey) return false;
  const expected = nexapaySign(rawBody, secretKey);
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(signature.trim(), "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}

const TERMINAL_CONFIRMED = new Set([
  "paid",
  "paid_over",
  "success",
  "succeeded",
  "completed",
  "confirmed",
  "settled",
  "payment.success",
  "order.completed",
]);

const TERMINAL_FAILED = new Set([
  "fail",
  "failed",
  "declined",
  "error",
  "wrong_amount",
  "payment.failed",
  "order.failed",
]);

const TERMINAL_CANCELED = new Set([
  "cancel",
  "canceled",
  "cancelled",
  "delete",
  "void",
  "order.canceled",
]);

const TERMINAL_EXPIRED = new Set([
  "expired",
  "cancel_expired",
  "order.expired",
]);

const INTERMEDIATE = new Set([
  "pending",
  "processing",
  "in_review",
  "check",
  "process",
  "confirm_check",
  "locked",
  "awaiting_payment",
  "awaiting_confirmation",
  "order.created",
]);

export function mapNexaPayStatus(
  status: string,
): WebhookOutcome["status"] | null {
  const s = status.trim().toLowerCase();
  if (TERMINAL_CONFIRMED.has(s)) return "confirmed";
  if (TERMINAL_FAILED.has(s)) return "failed";
  if (TERMINAL_CANCELED.has(s)) return "canceled";
  if (TERMINAL_EXPIRED.has(s)) return "expired";
  if (INTERMEDIATE.has(s)) return "awaiting_confirmation";
  return null;
}

type NexaPayWebhookPayload = {
  event?: string;
  type?: string;
  id?: string;
  order_id?: string;
  uuid?: string;
  intent_id?: string;
  payment_id?: string;
  status?: string;
  amount?: string | number;
  paid_amount?: string | number;
  payment_amount?: string | number;
  payer_amount?: string | number;
  amount_received?: string | number;
  currency?: string;
  asset?: string;
  network?: string;
  txid?: string;
  tx_hash?: string;
  transaction_hash?: string;
  data?: Record<string, unknown>;
};

function toNumber(value: string | number | undefined): number | null {
  if (value === undefined || value === null) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export function parseNexaPayWebhook(
  payload: unknown,
): WebhookOutcome | null {
  if (typeof payload !== "object" || payload === null) return null;
  const raw = payload as NexaPayWebhookPayload;
  const nested = (typeof raw.data === "object" && raw.data !== null
    ? raw.data
    : raw) as NexaPayWebhookPayload;

  const rawStatus = raw.event || raw.status || nested.event || nested.status;
  if (!rawStatus || typeof rawStatus !== "string") return null;

  const mapped = mapNexaPayStatus(rawStatus);
  if (!mapped) return null;

  const invoiceId =
    raw.order_id?.trim() ||
    raw.id?.trim() ||
    raw.uuid?.trim() ||
    raw.intent_id?.trim() ||
    raw.payment_id?.trim() ||
    nested.order_id?.trim() ||
    nested.id?.trim() ||
    nested.uuid?.trim() ||
    nested.intent_id?.trim() ||
    nested.payment_id?.trim();

  if (!invoiceId) return null;

  const paidAmount = toNumber(
    raw.payer_amount ??
      raw.paid_amount ??
      raw.payment_amount ??
      raw.amount_received ??
      raw.amount ??
      nested.payer_amount ??
      nested.paid_amount ??
      nested.payment_amount ??
      nested.amount_received ??
      nested.amount,
  );

  const paidAsset =
    raw.currency?.trim() ||
    raw.asset?.trim() ||
    nested.currency?.trim() ||
    nested.asset?.trim() ||
    null;

  const paidNetwork =
    raw.network?.trim() || nested.network?.trim() || null;

  const txHash =
    raw.txid?.trim() ||
    raw.tx_hash?.trim() ||
    raw.transaction_hash?.trim() ||
    nested.txid?.trim() ||
    nested.tx_hash?.trim() ||
    nested.transaction_hash?.trim() ||
    null;

  return {
    providerInvoiceId: invoiceId,
    status: mapped,
    paidAmount,
    paidAsset,
    paidNetwork,
    txHash,
  };
}

async function createNexaPayInvoice(
  config: BillingConfig,
  input: CreateInvoiceInput,
  paymentAsset: string | null,
  paymentNetwork: string | null,
): Promise<InvoiceResult> {
  const body: Record<string, unknown> = {
    amount: input.amountUsd.toFixed(2),
    currency: paymentAsset ?? "USD",
    order_id: input.paymentId,
    description: input.description,
    callback_url: input.callbackUrl,
    return_url: input.returnUrl,
    success_url: input.returnUrl,
    cancel_url: input.returnUrl,
    lifetime: config.invoiceLifetimeMinutes * 60,
  };
  if (paymentAsset) body.settlement_asset = paymentAsset;
  if (paymentNetwork) body.settlement_network = paymentNetwork;

  const endpoint = `${config.nexapayBaseUrl}/api/create-order`;
  const json = JSON.stringify(body);
  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": config.nexapayApiKey,
      "X-API-Secret": config.nexapayApiSecret,
    },
    body: json,
  });

  const raw = await res.text();
  let parsed: {
    status?: string | boolean;
    message?: string;
    error?: string;
    data?: {
      id?: string;
      order_id?: string;
      uuid?: string;
      checkout_url?: string;
      pay_url?: string;
      url?: string;
      amount?: string | number;
      currency?: string;
      network?: string;
      wallet_address?: string;
      expires_at?: string | number;
    };
    id?: string;
    order_id?: string;
    uuid?: string;
    checkout_url?: string;
    pay_url?: string;
    url?: string;
    amount?: string | number;
    currency?: string;
    network?: string;
    wallet_address?: string;
    expires_at?: string | number;
  };
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(
      `NexaPay returned an unexpected response (HTTP ${res.status}).`,
    );
  }

  if (!res.ok) {
    throw new Error(
      parsed.message ||
        parsed.error ||
        `NexaPay order creation failed (HTTP ${res.status}).`,
    );
  }

  const data = parsed.data ?? parsed;
  const payUrl =
    data.checkout_url ||
    data.pay_url ||
    data.url ||
    null;
  const invoiceId =
    data.id ||
    data.order_id ||
    data.uuid ||
    input.paymentId;

  let expiresAt: Date | null = null;
  if (data.expires_at) {
    expiresAt =
      typeof data.expires_at === "number"
        ? new Date(data.expires_at * 1000)
        : new Date(data.expires_at);
  } else {
    expiresAt = new Date(
      Date.now() + config.invoiceLifetimeMinutes * 60 * 1000,
    );
  }

  return {
    providerInvoiceId: String(invoiceId),
    payUrl,
    payAsset: data.currency ?? paymentAsset,
    payNetwork: data.network ?? paymentNetwork,
    payAmount: toNumber(data.amount ?? input.amountUsd),
    walletAddress: data.wallet_address ?? null,
    expiresAt,
  };
}

function createManualInvoice(
  config: BillingConfig,
  input: CreateInvoiceInput,
): InvoiceResult {
  const wallet = config.manualWallet;
  if (!wallet) throw new Error("Manual billing is missing its wallet address.");

  return {
    providerInvoiceId: null,
    payUrl: null,
    payAsset: wallet.asset,
    payNetwork: wallet.network,
    // Asset is assumed roughly 1:1 with USD for the displayed amount; the
    // admin compares the actual transfer when confirming.
    payAmount: input.amountUsd,
    walletAddress: wallet.address,
    expiresAt: new Date(Date.now() + config.invoiceLifetimeMinutes * 60 * 1000),
  };
}

export async function createInvoice(
  config: BillingConfig,
  input: CreateInvoiceInput,
): Promise<InvoiceResult> {
  if (config.provider === "nexapay") {
    return createNexaPayInvoice(
      config,
      input,
      process.env.BILLING_PAYMENT_ASSET?.trim() || null,
      process.env.BILLING_PAYMENT_NETWORK?.trim() || null,
    );
  }
  return createManualInvoice(config, input);
}
