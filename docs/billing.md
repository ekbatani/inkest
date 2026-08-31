# Billing: Crypto Payments & Credits

Inkest can accept payments from users and settle them into the operator's
crypto wallet. Confirmed payments grant credits to the user's balance
(`credit_ledger`). The feature is **disabled by default** and only activates
when `BILLING_PROVIDER` is set.

## Architecture

```
src/server/billing/
  config.ts     Env-driven configuration + secret-free status for the UI
  provider.ts   Payment drivers: invoice creation + webhook verification
  service.ts    User-scoped service layer (auth guard, idempotent confirm, ledger)
  actions.ts    "use server" actions (zod-validated boundary)
src/app/api/billing/webhook/route.ts   Provider webhook (signature = auth)
src/app/(app)/billing/page.tsx         Billing route (redirects to /settings?tab=billing)
src/app/(app)/settings/page.tsx        Settings page (hosts Billing & Credits tab)
src/components/billing/billing-view.tsx  UI: balance, top-up, history, admin panel
```

Schema (`src/server/db/schema.ts`, migration `drizzle/0012_*`):

- `payments` — one row per top-up attempt: provider, provider invoice id,
  status (`pending → awaiting_confirmation → confirmed | failed | canceled |
  expired | rejected`), USD amount, credits (rate locked at creation), paid
  asset/network/amount, wallet address, tx hash.
- `credit_ledger` — append-only credit history. Balance is `SUM(delta)`. The
  unique `(payment_id, reason)` index makes confirmation idempotent: webhook
  retries and races can grant a payment's credits exactly once.

## Providers

### `cryptomus` (hosted gateway, recommended)

1. Create a Cryptomus account and configure your **payout wallet** in its
   dashboard — that wallet is where received funds are settled; Inkest never
   holds crypto keys.
2. Set `BILLING_PROVIDER=cryptomus`, `CRYPTOMUS_API_KEY` (and
   `CRYPTOMUS_MERCHANT_ID` for business accounts).
3. Point the gateway's callback URL at `https://<your-host>/api/billing/webhook`
   (the app also sends `url_callback` on every invoice, which overrides the
   dashboard setting).

Users get a checkout page and can pay in the coin of their choice; the webhook
is verified with Cryptomus's `md5(base64(body) + API key)` signature before
anything is applied.

### `manual` (direct transfer)

Set `BILLING_PROVIDER=manual` and `BILLING_MANUAL_WALLET_ADDRESS` (plus
optional `_NETWORK`/`_ASSET`, default USDT on tron). Users see the address,
transfer directly, and submit the transaction hash. An admin verifies the
transfer in the wallet and confirms it on the Billing page (Payment
administration panel); confirmation is what credits the user.

## Credit economics

`BILLING_CREDITS_PER_USD` (default 100) defines credits per USD; the rate is
locked into the payment row at invoice creation. `BILLING_MIN_TOPUP_USD` /
`BILLING_MAX_TOPUP_USD` (5 / 500) bound a single top-up.
`BILLING_PAYMENT_ASSET` / `BILLING_PAYMENT_NETWORK` (e.g. `USDT` / `tron`)
pin the invoice currency for the cryptomus driver; leave the asset empty to
let payers choose any coin. Spending credits (e.g. AI usage metering) is not
wired yet — the ledger's `reason` enum will grow for that.

## Security model

- Every query/mutation is scoped to the current user (`getCurrentUser` +
  workspace), matching the other services. An ID alone is never authorization.
- The webhook route is public by design; the provider signature is its only
  authentication and is compared in constant time. Malformed or unknown
  payloads are acked (HTTP 200) to stop pointless retries; transient failures
  return 500 so the gateway retries.
- Confirmation is a guarded state transition (`pending/awaiting_confirmation
  → confirmed`) plus a ledger insert protected by a unique index, so duplicate
  webhooks or concurrent workers cannot double-credit.
- API keys live only in env vars and are never returned to the client; the UI
  receives a secret-free status object.
- Billing admin actions (`confirm`, `reject`, `grantCredits`) require a
  database-level `admin` role. This is deliberately **not** gated on cloud
  deployment mode (`isAdmin()` returns false self-hosted), so a self-hosted
  operator can still confirm manual payments; see
  `src/server/billing/service.ts`.
- The manual driver's wallet address is public information by nature and is
  shown to authenticated users; no secret ever appears in client payloads.

## Operations

- Apply the migration: `bun run db:migrate`.
- Verify a deployment: with billing unset, the Billing page shows
  "Payments disabled" and `POST /api/billing/webhook` returns 404. With the
  cryptomus driver, a top-up should create an invoice, and replaying the
  webhook with a bad signature must return 403.
- Manual confirmation flow: verify the tx hash in a block explorer for the
  exact asset/network and amount, then Confirm. Rejected payments can be
  re-submitted by the user as a new top-up.
