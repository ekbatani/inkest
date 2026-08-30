import { createHash, timingSafeEqual } from "node:crypto";
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

export function md5Hex(value: string) {
  return createHash("md5").update(value).digest("hex");
}

// Cryptomus signs both requests and webhooks as md5(base64(json) + api key).
export function cryptomusSign(jsonBody: string, apiKey: string) {
  return md5Hex(Buffer.from(jsonBody, "utf8").toString("base64") + apiKey);
}

export function verifyCryptomusSignature(
  rawBody: string,
  signature: string | null,
  apiKey: string,
) {
  if (!signature) return false;
  const expected = cryptomusSign(rawBody, apiKey);
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(signature.trim(), "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}

const TERMINAL_CONFIRMED = new Set(["paid", "paid_over"]);
const TERMINAL_FAILED = new Set(["fail", "wrong_amount"]);
const TERMINAL_CANCELED = new Set(["cancel", "delete"]);
const TERMINAL_EXPIRED = new Set(["expired", "cancel_expired"]);
const INTERMEDIATE = new Set(["check", "process", "confirm_check", "locked"]);

export function mapCryptomusStatus(
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

type CryptomusPaymentPayload = {
  type?: string;
  order_id?: string;
  uuid?: string;
  status?: string;
  amount?: string | number;
  payment_amount?: string | number;
  payer_amount?: string | number;
  currency?: string;
  network?: string;
  txid?: string;
};

function toNumber(value: string | number | undefined) {
  if (value === undefined) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export function parseCryptomusWebhook(
  payload: unknown,
): WebhookOutcome | null {
  if (typeof payload !== "object" || payload === null) return null;
  const data = payload as CryptomusPaymentPayload;
  if (data.type && data.type !== "payment") return null;

  const invoiceId = data.uuid?.trim() || data.order_id?.trim();
  if (!invoiceId) return null;

  const mapped = data.status ? mapCryptomusStatus(data.status) : null;
  if (!mapped) return null;

  return {
    providerInvoiceId: invoiceId,
    status: mapped,
    paidAmount: toNumber(data.payer_amount ?? data.payment_amount ?? data.amount),
    paidAsset: data.currency?.trim() || null,
    paidNetwork: data.network?.trim() || null,
    txHash: data.txid?.trim() || null,
  };
}

async function createCryptomusInvoice(
  config: BillingConfig,
  input: CreateInvoiceInput,
  paymentAsset: string | null,
  paymentNetwork: string | null,
): Promise<InvoiceResult> {
  // Invoice in USD lets the payer pick any coin on the checkout page; setting
  // BILLING_PAYMENT_ASSET (e.g. USDT) instead invoices in that asset, which
  // pins the coin and (optionally) the network. Stablecoins settle ~1:1.
  const body: Record<string, unknown> = {
    amount: input.amountUsd.toFixed(2),
    currency: paymentAsset ?? "USD",
    order_id: input.paymentId,
    url_callback: input.callbackUrl,
    url_return: input.returnUrl,
    url_success: input.returnUrl,
    lifetime: config.invoiceLifetimeMinutes * 60,
  };
  if (paymentAsset && paymentNetwork) body.network = paymentNetwork;

  const json = JSON.stringify(body);
  const res = await fetch("https://api.cryptomus.com/v1/payment", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(config.cryptomusMerchantId
        ? { merchant: config.cryptomusMerchantId }
        : {}),
      sign: cryptomusSign(json, config.cryptomusApiKey),
    },
    body: json,
  });

  const raw = await res.text();
  let parsed: {
    state?: number;
    message?: string;
    result?: {
      uuid?: string;
      url?: string;
      payer_amount?: string | number;
      amount?: string | number;
      currency?: string;
      network?: string;
      expired_at?: number;
    };
  };
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`Cryptomus returned an unexpected response (HTTP ${res.status}).`);
  }

  const result = parsed.result;
  if (!res.ok || !result?.uuid) {
    throw new Error(
      parsed.message || `Cryptomus invoice creation failed (HTTP ${res.status}).`,
    );
  }

  return {
    providerInvoiceId: result.uuid,
    payUrl: result.url ?? null,
    payAsset: result.currency ?? paymentAsset,
    payNetwork: result.network ?? paymentNetwork,
    payAmount: toNumber(result.payer_amount ?? result.amount),
    walletAddress: null,
    expiresAt: result.expired_at ? new Date(result.expired_at * 1000) : null,
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
  if (config.provider === "cryptomus") {
    return createCryptomusInvoice(
      config,
      input,
      process.env.BILLING_PAYMENT_ASSET?.trim() || null,
      process.env.BILLING_PAYMENT_NETWORK?.trim() || null,
    );
  }
  return createManualInvoice(config, input);
}
