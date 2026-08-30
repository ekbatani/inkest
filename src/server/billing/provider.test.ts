import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  cryptomusSign,
  mapCryptomusStatus,
  parseCryptomusWebhook,
  verifyCryptomusSignature,
} from "@/server/billing/provider";
import { getBillingStatus } from "@/server/billing/config";

describe("cryptomus webhook signature", () => {
  const apiKey = "test-api-key";
  const body = JSON.stringify({ type: "payment", uuid: "inv-1", status: "paid" });

  test("sign matches md5(base64(body) + key)", () => {
    const expected = cryptomusSign(body, apiKey);
    assert.equal(/^[0-9a-f]{32}$/.test(expected), true);
    assert.equal(expected, cryptomusSign(body, apiKey));
  });

  test("verify accepts the correct signature and rejects others", () => {
    const sign = cryptomusSign(body, apiKey);
    assert.equal(verifyCryptomusSignature(body, sign, apiKey), true);
    assert.equal(verifyCryptomusSignature(body, ` ${sign} `, apiKey), true);
    assert.equal(verifyCryptomusSignature(body, cryptomusSign(body, "other"), apiKey), false);
    assert.equal(verifyCryptomusSignature(body, null, apiKey), false);
    assert.equal(verifyCryptomusSignature(body, "", apiKey), false);
    // A tampered body must not verify against the original signature.
    assert.equal(
      verifyCryptomusSignature(body + " ", sign, apiKey),
      false,
    );
  });
});

describe("cryptomus status mapping", () => {
  test("paid statuses confirm", () => {
    assert.equal(mapCryptomusStatus("paid"), "confirmed");
    assert.equal(mapCryptomusStatus("paid_over"), "confirmed");
    assert.equal(mapCryptomusStatus("PAID"), "confirmed");
  });

  test("failure and cancellation statuses map to terminal states", () => {
    assert.equal(mapCryptomusStatus("fail"), "failed");
    assert.equal(mapCryptomusStatus("wrong_amount"), "failed");
    assert.equal(mapCryptomusStatus("cancel"), "canceled");
    assert.equal(mapCryptomusStatus("expired"), "expired");
  });

  test("intermediate statuses stay open and unknown ones are dropped", () => {
    assert.equal(mapCryptomusStatus("process"), "awaiting_confirmation");
    assert.equal(mapCryptomusStatus("check"), "awaiting_confirmation");
    assert.equal(mapCryptomusStatus("something_new"), null);
  });
});

describe("cryptomus webhook payload parsing", () => {
  test("parses a paid payment callback", () => {
    const outcome = parseCryptomusWebhook({
      type: "payment",
      uuid: "8f3c...uuid",
      status: "paid",
      amount: "10.00",
      payer_amount: "9.99",
      currency: "USDT",
      network: "tron",
    });
    assert.ok(outcome);
    assert.equal(outcome.providerInvoiceId, "8f3c...uuid");
    assert.equal(outcome.status, "confirmed");
    assert.equal(outcome.paidAmount, 9.99);
    assert.equal(outcome.paidAsset, "USDT");
    assert.equal(outcome.paidNetwork, "tron");
  });

  test("falls back to order_id and rejects non-payment types", () => {
    const outcome = parseCryptomusWebhook({
      type: "payment",
      order_id: "pay_abc",
      status: "cancel",
    });
    assert.ok(outcome);
    assert.equal(outcome.providerInvoiceId, "pay_abc");
    assert.equal(outcome.status, "canceled");

    assert.equal(parseCryptomusWebhook({ type: "wallet-check", uuid: "x", status: "paid" }), null);
    assert.equal(parseCryptomusWebhook({ status: "paid" }), null);
    assert.equal(parseCryptomusWebhook({ type: "payment", uuid: "x" }), null);
    assert.equal(parseCryptomusWebhook("nope"), null);
    assert.equal(parseCryptomusWebhook(null), null);
  });
});

describe("billing status", () => {
  test("disabled when BILLING_PROVIDER is unset or unknown", () => {
    const prev = process.env.BILLING_PROVIDER;
    try {
      delete process.env.BILLING_PROVIDER;
      assert.equal(getBillingStatus().enabled, false);
      process.env.BILLING_PROVIDER = "stripe";
      assert.equal(getBillingStatus().enabled, false);
    } finally {
      if (prev === undefined) delete process.env.BILLING_PROVIDER;
      else process.env.BILLING_PROVIDER = prev;
    }
  });

  test("manual driver exposes the wallet without leaking secrets", () => {
    const prev = { ...process.env };
    try {
      process.env.BILLING_PROVIDER = "manual";
      process.env.BILLING_MANUAL_WALLET_ADDRESS = "TXY...wallet";
      delete process.env.CRYPTOMUS_API_KEY;
      const status = getBillingStatus();
      assert.equal(status.enabled, true);
      assert.equal(status.provider, "manual");
      assert.equal(status.manualWalletAddress, "TXY...wallet");
      assert.equal(status.paymentAsset, "USDT");
      assert.equal(status.paymentNetwork, "tron");
      assert.equal("cryptomusApiKey" in status, false);
    } finally {
      process.env = prev;
    }
  });
});
