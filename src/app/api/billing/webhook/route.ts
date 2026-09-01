import { NextRequest, NextResponse } from "next/server";
import { getBillingConfig } from "@/server/billing/config";
import {
  parseNexaPayWebhook,
  verifyNexaPaySignature,
} from "@/server/billing/provider";
import { applyProviderCallback } from "@/server/billing/service";

// The provider's signature is the authentication for this route (it is public
// by design and outside the proxy auth matcher). Processing errors return a
// non-2xx status so the gateway retries; malformed/unknown payloads are acked
// to stop retry loops that can never succeed.
export async function POST(request: NextRequest) {
  let config;
  try {
    config = getBillingConfig();
  } catch (err) {
    console.error("[billing webhook] misconfigured billing:", err);
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!config || config.provider !== "nexapay") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const signature =
    request.headers.get("x-nexapay-signature") ||
    request.headers.get("x-signature") ||
    request.headers.get("signature") ||
    request.headers.get("sign");

  const rawBody = await request.text();
  if (
    !verifyNexaPaySignature(
      rawBody,
      signature,
      config.nexapayWebhookSecret,
    )
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ ok: true });
  }

  const outcome = parseNexaPayWebhook(payload);
  if (!outcome) {
    console.warn("[billing webhook] unhandled payload shape");
    return NextResponse.json({ ok: true });
  }

  try {
    const result = await applyProviderCallback(outcome);
    if (!result.ok) {
      console.warn(
        `[billing webhook] no payment for invoice ${outcome.providerInvoiceId}`,
      );
    }
  } catch (err) {
    // Let the gateway retry on transient failures (e.g. database hiccups).
    console.error("[billing webhook] failed to apply update:", err);
    return NextResponse.json({ error: "Retry later" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
