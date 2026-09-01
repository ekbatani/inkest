import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  mapNexaPayStatus,
  nexapaySign,
  parseNexaPayWebhook,
  verifyNexaPaySignature,
} from "@/server/billing/provider";
import { getBillingStatus } from "@/server/billing/config";

describe("nexapay webhook signature", () => {
  const secretKey = "test-webhook-secret";
  const body = JSON.stringify({ event: "order.completed", id: "inv-1", status: "paid" });

  test("sign matches hmac-sha256 hex", () => {
    const expected = nexapaySign(body, secretKey);
    assert.equal(/^[0-9a-f]{64}$/.test(expected), true);
    assert.equal(expected, nexapaySign(body, secretKey));
  });

  test("verify accepts the correct signature and rejects others", () => {
    const sign = nexapaySign(body, secretKey);
    assert.equal(verifyNexaPaySignature(body, sign, secretKey), true);
    assert.equal(verifyNexaPaySignature(body, ` ${sign} `, secretKey), true);
    assert.equal(verifyNexaPaySignature(body, nexapaySign(body, "other-secret"), secretKey), false);
    assert.equal(verifyNexaPaySignature(body, null, secretKey), false);
    assert.equal(verifyNexaPaySignature(body, "", secretKey), false);
    // A tampered body must not verify against the original signature.
    assert.equal(
      verifyNexaPaySignature(body + " ", sign, secretKey),
      false,
    );
  });
});

describe("nexapay status mapping", () => {
  test("paid and success statuses confirm", () => {
    assert.equal(mapNexaPayStatus("paid"), "confirmed");
    assert.equal(mapNexaPayStatus("paid_over"), "confirmed");
    assert.equal(mapNexaPayStatus("PAID"), "confirmed");
    assert.equal(mapNexaPayStatus("success"), "confirmed");
    assert.equal(mapNexaPayStatus("succeeded"), "confirmed");
    assert.equal(mapNexaPayStatus("completed"), "confirmed");
    assert.equal(mapNexaPayStatus("settled"), "confirmed");
    assert.equal(mapNexaPayStatus("payment.success"), "confirmed");
    assert.equal(mapNexaPayStatus("order.completed"), "confirmed");
  });

  test("failure and cancellation statuses map to terminal states", () => {
    assert.equal(mapNexaPayStatus("fail"), "failed");
    assert.equal(mapNexaPayStatus("failed"), "failed");
    assert.equal(mapNexaPayStatus("declined"), "failed");
    assert.equal(mapNexaPayStatus("wrong_amount"), "failed");
    assert.equal(mapNexaPayStatus("payment.failed"), "failed");
    assert.equal(mapNexaPayStatus("cancel"), "canceled");
    assert.equal(mapNexaPayStatus("canceled"), "canceled");
    assert.equal(mapNexaPayStatus("cancelled"), "canceled");
    assert.equal(mapNexaPayStatus("expired"), "expired");
  });

  test("intermediate statuses stay open and unknown ones are dropped", () => {
    assert.equal(mapNexaPayStatus("process"), "awaiting_confirmation");
    assert.equal(mapNexaPayStatus("processing"), "awaiting_confirmation");
    assert.equal(mapNexaPayStatus("pending"), "awaiting_confirmation");
    assert.equal(mapNexaPayStatus("check"), "awaiting_confirmation");
    assert.equal(mapNexaPayStatus("something_unknown"), null);
  });
});

describe("nexapay webhook payload parsing", () => {
  test("parses a paid payment callback with flat structure", () => {
    const outcome = parseNexaPayWebhook({
      event: "payment.success",
      id: "nxp_inv_12345",
      status: "paid",
      amount: "25.00",
      paid_amount: "25.00",
      currency: "USDT",
      network: "TRC20",
      tx_hash: "0xabc123456789",
    });
    assert.ok(outcome);
    assert.equal(outcome.providerInvoiceId, "nxp_inv_12345");
    assert.equal(outcome.status, "confirmed");
    assert.equal(outcome.paidAmount, 25);
    assert.equal(outcome.paidAsset, "USDT");
    assert.equal(outcome.paidNetwork, "TRC20");
    assert.equal(outcome.txHash, "0xabc123456789");
  });

  test("parses nested data callback structure", () => {
    const outcome = parseNexaPayWebhook({
      event: "order.completed",
      data: {
        order_id: "pay_xyz987",
        status: "completed",
        amount_received: 50,
        currency: "USDC",
        network: "ERC20",
        txid: "0xdef987654321",
      },
    });
    assert.ok(outcome);
    assert.equal(outcome.providerInvoiceId, "pay_xyz987");
    assert.equal(outcome.status, "confirmed");
    assert.equal(outcome.paidAmount, 50);
    assert.equal(outcome.paidAsset, "USDC");
    assert.equal(outcome.paidNetwork, "ERC20");
    assert.equal(outcome.txHash, "0xdef987654321");
  });

  test("falls back to order_id and rejects invalid payloads", () => {
    const outcome = parseNexaPayWebhook({
      order_id: "pay_fallback",
      status: "cancel",
    });
    assert.ok(outcome);
    assert.equal(outcome.providerInvoiceId, "pay_fallback");
    assert.equal(outcome.status, "canceled");

    assert.equal(parseNexaPayWebhook({ status: "paid" }), null);
    assert.equal(parseNexaPayWebhook({ id: "x" }), null);
    assert.equal(parseNexaPayWebhook("invalid"), null);
    assert.equal(parseNexaPayWebhook(null), null);
  });
});

describe("billing status", () => {
  test("disabled when BILLING_PROVIDER is unset or unknown", () => {
    const prev = process.env.BILLING_PROVIDER;
    try {
      delete process.env.BILLING_PROVIDER;
      assert.equal(getBillingStatus().enabled, false);
      process.env.BILLING_PROVIDER = "unknown_gateway";
      assert.equal(getBillingStatus().enabled, false);
    } finally {
      if (prev === undefined) delete process.env.BILLING_PROVIDER;
      else process.env.BILLING_PROVIDER = prev;
    }
  });

  test("nexapay driver enables status without leaking secrets", () => {
    const prev = { ...process.env };
    try {
      process.env.BILLING_PROVIDER = "nexapay";
      process.env.NEXAPAY_API_KEY = "nxp_live_key";
      process.env.NEXAPAY_API_SECRET = "nxp_live_secret";
      const status = getBillingStatus();
      assert.equal(status.enabled, true);
      assert.equal(status.provider, "nexapay");
      assert.equal("nexapayApiKey" in status, false);
      assert.equal("nexapayApiSecret" in status, false);
      assert.equal("nexapayWebhookSecret" in status, false);
    } finally {
      process.env = prev;
    }
  });

  test("manual driver exposes the wallet without leaking secrets", () => {
    const prev = { ...process.env };
    try {
      process.env.BILLING_PROVIDER = "manual";
      process.env.BILLING_MANUAL_WALLET_ADDRESS = "TXY...wallet";
      delete process.env.NEXAPAY_API_KEY;
      delete process.env.NEXAPAY_API_SECRET;
      const status = getBillingStatus();
      assert.equal(status.enabled, true);
      assert.equal(status.provider, "manual");
      assert.equal(status.manualWalletAddress, "TXY...wallet");
      assert.equal(status.paymentAsset, "USDT");
      assert.equal(status.paymentNetwork, "tron");
      assert.equal("nexapayApiKey" in status, false);
    } finally {
      process.env = prev;
    }
  });
});
