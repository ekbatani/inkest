// Billing configuration. Follows the house integration style (see
// attachments/storage.ts): env vars are read lazily, the feature has a
// graceful "not configured" state, and secrets never leave the server.

export type BillingProviderId = "nexapay" | "manual";

export type BillingConfig = {
  provider: BillingProviderId;
  nexapayApiKey: string;
  nexapayApiSecret: string;
  nexapayWebhookSecret: string;
  nexapayBaseUrl: string;
  manualWallet: { address: string; network: string; asset: string } | null;
  creditsPerUsd: number;
  minTopUpUsd: number;
  maxTopUpUsd: number;
  invoiceLifetimeMinutes: number;
};

// Coin/network users are asked to pay in. Null lets the gateway checkout page
// offer every supported asset. Settlement to the operator's crypto wallet is
// configured at the gateway (payout wallet), not here.
export type BillingStatus = {
  enabled: boolean;
  provider: BillingProviderId | null;
  creditsPerUsd: number;
  minTopUpUsd: number;
  maxTopUpUsd: number;
  paymentAsset: string | null;
  paymentNetwork: string | null;
  // Only set for the manual driver: payers need the address to transfer to.
  // Public information by nature, safe to expose to authenticated users.
  manualWalletAddress: string | null;
};

function readNumberEnv(name: string, fallback: number, min: number, max: number) {
  const raw = Number(process.env[name]);
  if (!Number.isFinite(raw) || raw <= 0) return fallback;
  return Math.min(Math.max(raw, min), max);
}

export function appBaseUrl() {
  const raw =
    process.env.NEXTAUTH_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    "http://localhost:3000";
  return raw.replace(/\/+$/, "");
}

export function billingWebhookUrl() {
  return `${appBaseUrl()}/api/billing/webhook`;
}

export function getBillingConfig(): BillingConfig | null {
  const provider = process.env.BILLING_PROVIDER?.trim().toLowerCase();
  if (provider !== "nexapay" && provider !== "manual") return null;

  if (provider === "nexapay") {
    const apiKey = process.env.NEXAPAY_API_KEY?.trim() ?? "";
    const apiSecret = process.env.NEXAPAY_API_SECRET?.trim() ?? "";
    if (!apiKey || !apiSecret) {
      throw new Error(
        "NexaPay billing requires NEXAPAY_API_KEY and NEXAPAY_API_SECRET.",
      );
    }
    const webhookSecret =
      process.env.NEXAPAY_WEBHOOK_SECRET?.trim() || apiSecret;
    const baseUrl =
      process.env.NEXAPAY_BASE_URL?.trim().replace(/\/+$/, "") ||
      "https://api.nexapay.one";

    return {
      provider,
      nexapayApiKey: apiKey,
      nexapayApiSecret: apiSecret,
      nexapayWebhookSecret: webhookSecret,
      nexapayBaseUrl: baseUrl,
      manualWallet: null,
      creditsPerUsd: readNumberEnv("BILLING_CREDITS_PER_USD", 100, 1, 1_000_000),
      minTopUpUsd: readNumberEnv("BILLING_MIN_TOPUP_USD", 5, 0.5, 10_000),
      maxTopUpUsd: readNumberEnv("BILLING_MAX_TOPUP_USD", 500, 1, 100_000),
      invoiceLifetimeMinutes: readNumberEnv("BILLING_INVOICE_LIFETIME_MINUTES", 60, 10, 7 * 24 * 60),
    };
  }

  const address = process.env.BILLING_MANUAL_WALLET_ADDRESS?.trim() ?? "";
  if (!address) {
    throw new Error(
      "Manual billing requires BILLING_MANUAL_WALLET_ADDRESS (plus optional BILLING_MANUAL_WALLET_NETWORK/_ASSET).",
    );
  }
  return {
    provider,
    nexapayApiKey: "",
    nexapayApiSecret: "",
    nexapayWebhookSecret: "",
    nexapayBaseUrl: "",
    manualWallet: {
      address,
      network: process.env.BILLING_MANUAL_WALLET_NETWORK?.trim() || "tron",
      asset: process.env.BILLING_MANUAL_WALLET_ASSET?.trim() || "USDT",
    },
    creditsPerUsd: readNumberEnv("BILLING_CREDITS_PER_USD", 100, 1, 1_000_000),
    minTopUpUsd: readNumberEnv("BILLING_MIN_TOPUP_USD", 5, 0.5, 10_000),
    maxTopUpUsd: readNumberEnv("BILLING_MAX_TOPUP_USD", 500, 1, 100_000),
    invoiceLifetimeMinutes: readNumberEnv("BILLING_INVOICE_LIFETIME_MINUTES", 60, 10, 7 * 24 * 60),
  };
}

export function getBillingStatus(): BillingStatus {
  const base: BillingStatus = {
    enabled: false,
    provider: null,
    creditsPerUsd: 100,
    minTopUpUsd: 5,
    maxTopUpUsd: 500,
    paymentAsset: null,
    paymentNetwork: null,
    manualWalletAddress: null,
  };

  let config: BillingConfig | null = null;
  try {
    config = getBillingConfig();
  } catch {
    // Misconfigured keys must not take the whole page down; surface disabled.
    return base;
  }
  if (!config) return base;

  return {
    enabled: true,
    provider: config.provider,
    creditsPerUsd: config.creditsPerUsd,
    minTopUpUsd: config.minTopUpUsd,
    maxTopUpUsd: config.maxTopUpUsd,
    paymentAsset:
      config.provider === "manual"
        ? config.manualWallet?.asset ?? null
        : process.env.BILLING_PAYMENT_ASSET?.trim() || null,
    paymentNetwork:
      config.provider === "manual"
        ? config.manualWallet?.network ?? null
        : process.env.BILLING_PAYMENT_NETWORK?.trim() || null,
    manualWalletAddress: config.manualWallet?.address ?? null,
  };
}
