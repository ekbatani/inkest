"use client";

import React from "react";
import { toast } from "sonner";
import {
  BadgeCheck,
  CircleAlert,
  Clock,
  Copy,
  CreditCard,
  ExternalLink,
  Loader2,
  ShieldCheck,
  Wallet,
  XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { CreditLedgerEntry, Payment } from "@/server/db/schema";
import type {
  BillingOverview,
  PendingManualPayment,
} from "@/server/billing/service";
import {
  confirmManualPaymentAction,
  createTopUpAction,
  getBillingOverviewAction,
  getPaymentAction,
  grantCreditsAction,
  rejectManualPaymentAction,
  submitManualTxAction,
} from "@/server/billing/actions";

const OPEN_STATUSES = new Set(["pending", "awaiting_confirmation"]);
const TERMINAL_BAD_STATUSES = new Set([
  "failed",
  "canceled",
  "expired",
  "rejected",
]);

function fmtUsd(value: number) {
  return `$${value.toFixed(2)}`;
}

function fmtCredits(value: number) {
  return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function fmtDate(value: Date | string | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function getPayUrl(payment: Payment) {
  try {
    const meta = JSON.parse(payment.metadataJson ?? "{}");
    return typeof meta.payUrl === "string" && meta.payUrl
      ? meta.payUrl
      : null;
  } catch {
    return null;
  }
}

async function copyText(value: string, label: string) {
  try {
    await navigator.clipboard.writeText(value);
    toast.success(`${label} copied.`);
  } catch {
    toast.error("Could not copy to clipboard.");
  }
}

function StatusBadge({ status }: { status: Payment["status"] }) {
  const styles: Record<Payment["status"], { label: string; className: string }> = {
    pending: {
      label: "Pending",
      className: "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400",
    },
    awaiting_confirmation: {
      label: "Checking",
      className: "border-sky-500/40 bg-sky-500/10 text-sky-600 dark:text-sky-400",
    },
    confirmed: {
      label: "Confirmed",
      className:
        "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    },
    failed: {
      label: "Failed",
      className: "border-red-500/40 bg-red-500/10 text-red-600 dark:text-red-400",
    },
    canceled: {
      label: "Canceled",
      className: "text-muted-foreground",
    },
    expired: {
      label: "Expired",
      className: "text-muted-foreground",
    },
    rejected: {
      label: "Rejected",
      className: "border-red-500/40 bg-red-500/10 text-red-600 dark:text-red-400",
    },
  };
  const style = styles[status] ?? { label: status, className: "" };
  return (
    <Badge variant="outline" className={style.className}>
      {style.label}
    </Badge>
  );
}

function CopyField({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <code className="min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap rounded-md border border-border/70 bg-muted/40 px-2.5 py-1.5 font-mono text-xs">
        {value}
      </code>
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={() => copyText(value, label)}
        aria-label={`Copy ${label}`}
        className="gap-1.5 shrink-0"
      >
        <Copy className="size-3.5" /> Copy
      </Button>
    </div>
  );
}

function PaymentInstructions({
  payment,
  onSubmitTx,
  submittingTx,
  txHash,
  onTxHashChange,
}: {
  payment: Payment;
  onSubmitTx?: () => void;
  submittingTx?: boolean;
  txHash?: string;
  onTxHashChange?: (value: string) => void;
}) {
  const isManual = payment.provider === "manual";
  const payUrl = getPayUrl(payment);
  const asset = payment.paidAsset ?? "crypto";
  const network = payment.paidNetwork;

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-xl border border-border/70 bg-muted/20 p-4 text-sm">
        Send{" "}
        <span className="font-semibold">
          {payment.paidAmount != null
            ? `${payment.paidAmount} ${asset}`
            : `${fmtUsd(payment.amountUsd)} in ${asset}`}
        </span>
        {network ? (
          <>
            {" "}
            on the <span className="font-semibold">{network}</span> network
          </>
        ) : null}{" "}
        to the address below.
      </div>

      {payment.walletAddress ? (
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs font-medium text-muted-foreground">
            Wallet address
          </Label>
          <CopyField value={payment.walletAddress} label="Wallet address" />
        </div>
      ) : null}

      {isManual ? (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="billing-tx-hash" className="text-xs font-medium text-muted-foreground">
            Transaction hash
          </Label>
          {payment.txHash ? (
            <CopyField value={payment.txHash} label="Transaction hash" />
          ) : (
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                id="billing-tx-hash"
                value={txHash ?? ""}
                onChange={(e) => onTxHashChange?.(e.target.value)}
                placeholder="Paste the transfer hash to speed up confirmation"
                className="font-mono text-xs"
                autoComplete="off"
              />
              <Button
                type="button"
                size="sm"
                onClick={onSubmitTx}
                disabled={submittingTx || !txHash?.trim()}
                className="shrink-0"
              >
                {submittingTx ? "Submitting..." : "I&apos;ve sent it"}
              </Button>
            </div>
          )}
          <p className="text-[11px] text-muted-foreground">
            An operator verifies the transfer before credits are added.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {payUrl ? (
            <Button
              size="sm"
              nativeButton={false}
              render={
                <a href={payUrl} target="_blank" rel="noopener noreferrer" />
              }
              className="gap-1.5 self-start"
            >
              <ExternalLink className="size-3.5" /> Open payment page
            </Button>
          ) : null}
          <p className="text-[11px] text-muted-foreground">
            Complete the payment in the opened tab. This page updates
            automatically once the network confirms your transaction.
          </p>
        </div>
      )}

      <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-[11px] text-muted-foreground">
        <CircleAlert className="mt-0.5 size-3.5 shrink-0 text-amber-500" />
        <span>
          Double-check the asset and network before sending — transfers on the
          wrong network cannot be recovered. Credits are granted only after the
          payment is confirmed.
        </span>
      </div>
    </div>
  );
}

export function BillingView({
  initialOverview,
  highlightedPaymentId,
}: {
  initialOverview: BillingOverview | null;
  highlightedPaymentId: string | null;
}) {
  const [overview, setOverview] = React.useState(initialOverview);
  const [topUpOpen, setTopUpOpen] = React.useState(false);
  const [amount, setAmount] = React.useState("");
  const [creating, setCreating] = React.useState(false);
  const [activePayment, setActivePayment] = React.useState<Payment | null>(null);
  const [txHash, setTxHash] = React.useState("");
  const [submittingTx, setSubmittingTx] = React.useState(false);
  const [busyAdminPaymentId, setBusyAdminPaymentId] = React.useState<string | null>(null);
  const [grantEmail, setGrantEmail] = React.useState("");
  const [grantDelta, setGrantDelta] = React.useState("");
  const [grantNote, setGrantNote] = React.useState("");
  const [granting, setGranting] = React.useState(false);
  const prevStatusRef = React.useRef<string | null>(null);

  const refreshOverview = React.useCallback(async () => {
    try {
      const next = await getBillingOverviewAction();
      setOverview(next);
    } catch {
      // Keep showing the last known overview on transient errors.
    }
  }, []);

  // Resume a payment the user came back for (return URL from the gateway).
  React.useEffect(() => {
    if (!highlightedPaymentId) return;
    getPaymentAction(highlightedPaymentId)
      .then((payment) => {
        if (payment && OPEN_STATUSES.has(payment.status)) {
          prevStatusRef.current = payment.status;
          setActivePayment(payment);
        }
      })
      .catch(() => {});
  }, [highlightedPaymentId]);

  // Poll an open payment until it reaches a terminal state, toasting on the
  // transition (ref-tracked so it fires once per status change).
  const activeId = activePayment?.id;
  const activeStatus = activePayment?.status;
  React.useEffect(() => {
    if (!activeId || !activeStatus || !OPEN_STATUSES.has(activeStatus)) return;
    const timer = setInterval(async () => {
      try {
        const updated = await getPaymentAction(activeId);
        if (!updated) return;
        const prev = prevStatusRef.current;
        prevStatusRef.current = updated.status;
        setActivePayment(updated);
        if (!prev || prev === updated.status) return;
        if (updated.status === "confirmed") {
          toast.success("Payment confirmed — credits have been added.");
          refreshOverview();
        } else if (TERMINAL_BAD_STATUSES.has(updated.status)) {
          toast.error(`The payment was ${updated.status}. No credits were added.`);
          refreshOverview();
        }
      } catch {
        // Transient polling errors are ignored; the next tick retries.
      }
    }, 5000);
    return () => clearInterval(timer);
  }, [activeId, activeStatus, refreshOverview]);

  if (!overview) {
    return (
      <section className="surface-card flex flex-col gap-2 p-6">
        <h1 className="text-lg font-semibold">Billing</h1>
        <p className="text-sm text-muted-foreground">
          Billing could not be loaded. Try refreshing the page.
        </p>
      </section>
    );
  }

  const { status } = overview;
  const presets = [5, 10, 25, 50, 100].filter(
    (v) => v >= status.minTopUpUsd && v <= status.maxTopUpUsd,
  );

  const startTopUp = async () => {
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) {
      toast.error("Enter a valid amount.");
      return;
    }
    if (value < status.minTopUpUsd || value > status.maxTopUpUsd) {
      toast.error(
        `Amount must be between ${fmtUsd(status.minTopUpUsd)} and ${fmtUsd(status.maxTopUpUsd)}.`,
      );
      return;
    }
    setCreating(true);
    try {
      const payment = await createTopUpAction({ amountUsd: value });
      prevStatusRef.current = payment.status;
      setActivePayment(payment);
      setTxHash("");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Could not start the payment.",
      );
    } finally {
      setCreating(false);
    }
  };

  const submitTx = async () => {
    if (!activePayment) return;
    setSubmittingTx(true);
    try {
      const updated = await submitManualTxAction({
        paymentId: activePayment.id,
        txHash: txHash.trim(),
      });
      prevStatusRef.current = updated.status;
      setActivePayment(updated);
      setTxHash("");
      toast.success("Submitted — waiting for confirmation.");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Could not submit the transaction.",
      );
    } finally {
      setSubmittingTx(false);
    }
  };

  const reviewManualPayment = async (
    payment: PendingManualPayment,
    decision: "confirm" | "reject",
  ) => {
    setBusyAdminPaymentId(payment.id);
    try {
      if (decision === "confirm") {
        await confirmManualPaymentAction({ paymentId: payment.id });
        toast.success(`Confirmed ${fmtUsd(payment.amountUsd)} for ${payment.userEmail ?? "user"}.`);
      } else {
        await rejectManualPaymentAction({ paymentId: payment.id });
        toast.success("Payment rejected.");
      }
      await refreshOverview();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Could not update the payment.",
      );
    } finally {
      setBusyAdminPaymentId(null);
    }
  };

  const submitGrant = async () => {
    const delta = Number(grantDelta);
    if (!Number.isFinite(delta) || delta === 0) {
      toast.error("Enter a non-zero credit amount.");
      return;
    }
    setGranting(true);
    try {
      await grantCreditsAction({
        email: grantEmail.trim(),
        delta,
        note: grantNote.trim() || undefined,
      });
      toast.success(`Credits adjusted for ${grantEmail.trim()}.`);
      setGrantEmail("");
      setGrantDelta("");
      setGrantNote("");
      await refreshOverview();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Could not adjust credits.",
      );
    } finally {
      setGranting(false);
    }
  };

  const activeOpen = activePayment && OPEN_STATUSES.has(activePayment.status);

  return (
    <div className="flex flex-col gap-6">
      {/* Balance */}
      <section className="surface-card flex flex-col gap-6 p-6">
        <div className="flex items-start justify-between gap-4 border-b pb-4">
          <div>
            <div className="flex items-center gap-2">
              <Wallet className="size-4 text-primary" />
              <h2 className="text-base font-semibold">Credit balance</h2>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {status.enabled
                ? status.provider === "manual"
                  ? "Top up with a direct crypto transfer; an operator confirms it."
                  : "Top up with card (Visa, Mastercard, Apple Pay, Google Pay) or crypto through NexaPay."
                : "Payments are not enabled on this instance."}
            </p>
          </div>
          {status.enabled ? (
            <Button
              size="sm"
              onClick={() => {
                setActivePayment(null);
                prevStatusRef.current = null;
                setTopUpOpen(true);
              }}
              className="gap-1.5 shrink-0"
            >
              <CreditCard className="size-3.5" /> Top up
            </Button>
          ) : (
            <Badge variant="secondary" className="shrink-0">
              Payments disabled
            </Badge>
          )}
        </div>

        <div className="flex flex-wrap items-end gap-x-8 gap-y-3">
          <div>
            <div className="text-3xl font-semibold tabular-nums">
              {fmtCredits(overview.balance)}
            </div>
            <div className="text-xs text-muted-foreground">credits available</div>
          </div>
          {status.enabled ? (
            <div className="text-xs text-muted-foreground">
              {fmtCredits(status.creditsPerUsd)} credits per $1 · min{" "}
              {fmtUsd(status.minTopUpUsd)} · max {fmtUsd(status.maxTopUpUsd)}
            </div>
          ) : null}
        </div>

        {activeOpen ? (
          <div className="flex flex-col gap-4 rounded-xl border border-border/70 p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Clock className="size-4 text-primary" />
                Open payment — {fmtUsd(activePayment.amountUsd)} ·{" "}
                {fmtCredits(activePayment.credits)} credits
              </div>
              <StatusBadge status={activePayment.status} />
            </div>
            <PaymentInstructions
              payment={activePayment}
              onSubmitTx={submitTx}
              submittingTx={submittingTx}
              txHash={txHash}
              onTxHashChange={setTxHash}
            />
          </div>
        ) : null}
      </section>

      {/* Payments history */}
      <section className="surface-card flex flex-col gap-4 p-6">
        <div className="flex items-center gap-2 border-b pb-4">
          <CreditCard className="size-4 text-primary" />
          <h2 className="text-base font-semibold">Payments</h2>
        </div>
        {overview.payments.length === 0 ? (
          <p className="text-sm text-muted-foreground">No payments yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-start text-xs text-muted-foreground">
                  <th className="px-2 py-2 text-start font-medium">Date</th>
                  <th className="px-2 py-2 text-start font-medium">Amount</th>
                  <th className="px-2 py-2 text-start font-medium">Credits</th>
                  <th className="px-2 py-2 text-start font-medium">Paid with</th>
                  <th className="px-2 py-2 text-start font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {overview.payments.map((payment) => (
                  <tr key={payment.id} className="border-t border-border/60">
                    <td className="px-2 py-2.5 whitespace-nowrap text-xs text-muted-foreground">
                      {fmtDate(payment.createdAt)}
                    </td>
                    <td className="px-2 py-2.5 tabular-nums">
                      {fmtUsd(payment.amountUsd)}
                    </td>
                    <td className="px-2 py-2.5 tabular-nums">
                      {fmtCredits(payment.credits)}
                    </td>
                    <td className="px-2 py-2.5 text-xs text-muted-foreground">
                      {payment.paidAsset
                        ? `${payment.paidAsset}${payment.paidNetwork ? ` · ${payment.paidNetwork}` : ""}`
                        : payment.provider === "manual"
                          ? "Direct transfer"
                          : "Card / Crypto"}
                    </td>
                    <td className="px-2 py-2.5">
                      <StatusBadge status={payment.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Credit ledger */}
      <section className="surface-card flex flex-col gap-4 p-6">
        <div className="flex items-center gap-2 border-b pb-4">
          <BadgeCheck className="size-4 text-primary" />
          <h2 className="text-base font-semibold">Credit history</h2>
        </div>
        {overview.ledger.length === 0 ? (
          <p className="text-sm text-muted-foreground">No credit activity yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-start text-xs text-muted-foreground">
                  <th className="px-2 py-2 text-start font-medium">Date</th>
                  <th className="px-2 py-2 text-start font-medium">Change</th>
                  <th className="px-2 py-2 text-start font-medium">Reason</th>
                  <th className="px-2 py-2 text-start font-medium">Note</th>
                </tr>
              </thead>
              <tbody>
                {overview.ledger.map((entry: CreditLedgerEntry) => (
                  <tr key={entry.id} className="border-t border-border/60">
                    <td className="px-2 py-2.5 whitespace-nowrap text-xs text-muted-foreground">
                      {fmtDate(entry.createdAt)}
                    </td>
                    <td className="px-2 py-2.5 tabular-nums">
                      <span
                        className={
                          entry.delta > 0
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-red-600 dark:text-red-400"
                        }
                      >
                        {entry.delta > 0 ? "+" : ""}
                        {fmtCredits(entry.delta)}
                      </span>
                    </td>
                    <td className="px-2 py-2.5 text-xs text-muted-foreground">
                      {entry.reason === "payment" ? "Payment" : "Admin grant"}
                    </td>
                    <td className="px-2 py-2.5 text-xs text-muted-foreground">
                      {entry.note ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Admin: manual payment review + credit grants */}
      {overview.isAdmin ? (
        <section className="surface-card flex flex-col gap-6 p-6">
          <div className="flex items-start justify-between gap-4 border-b pb-4">
            <div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="size-4 text-primary" />
                <h2 className="text-base font-semibold">Payment administration</h2>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Verify transfers in the wallet before confirming. Confirmation
                credits the user&apos;s balance and cannot be undone.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Awaiting confirmation
            </h3>
            {overview.pendingAdminPayments.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No manual payments are waiting.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-start text-xs text-muted-foreground">
                      <th className="px-2 py-2 text-start font-medium">User</th>
                      <th className="px-2 py-2 text-start font-medium">Amount</th>
                      <th className="px-2 py-2 text-start font-medium">Asset</th>
                      <th className="px-2 py-2 text-start font-medium">Tx hash</th>
                      <th className="px-2 py-2 text-start font-medium">Requested</th>
                      <th className="px-2 py-2 text-start font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {overview.pendingAdminPayments.map((payment) => (
                      <tr key={payment.id} className="border-t border-border/60">
                        <td className="px-2 py-2.5 text-xs">
                          {payment.userEmail ?? payment.userId}
                        </td>
                        <td className="px-2 py-2.5 tabular-nums">
                          {fmtUsd(payment.amountUsd)}
                        </td>
                        <td className="px-2 py-2.5 text-xs text-muted-foreground">
                          {payment.paidAsset ?? "—"}
                          {payment.paidNetwork ? ` · ${payment.paidNetwork}` : ""}
                        </td>
                        <td className="px-2 py-2.5">
                          {payment.txHash ? (
                            <button
                              type="button"
                              onClick={() => copyText(payment.txHash!, "Transaction hash")}
                              className="max-w-40 truncate font-mono text-xs text-primary hover:underline"
                              title={payment.txHash}
                            >
                              {payment.txHash}
                            </button>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              not provided
                            </span>
                          )}
                        </td>
                        <td className="px-2 py-2.5 whitespace-nowrap text-xs text-muted-foreground">
                          {fmtDate(payment.createdAt)}
                        </td>
                        <td className="px-2 py-2.5">
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              onClick={() => reviewManualPayment(payment, "confirm")}
                              disabled={busyAdminPaymentId === payment.id}
                              className="gap-1"
                            >
                              {busyAdminPaymentId === payment.id ? (
                                <Loader2 className="size-3.5 animate-spin" />
                              ) : (
                                <BadgeCheck className="size-3.5" />
                              )}
                              Confirm
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => reviewManualPayment(payment, "reject")}
                              disabled={busyAdminPaymentId === payment.id}
                              className="gap-1"
                            >
                              <XCircle className="size-3.5" /> Reject
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-3 rounded-xl border border-border/70 bg-muted/20 p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Adjust credits manually
            </h3>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="billing-grant-email" className="text-xs text-muted-foreground">
                  User email
                </Label>
                <Input
                  id="billing-grant-email"
                  value={grantEmail}
                  onChange={(e) => setGrantEmail(e.target.value)}
                  placeholder="user@example.com"
                  autoComplete="off"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="billing-grant-delta" className="text-xs text-muted-foreground">
                  Credits (negative to deduct)
                </Label>
                <Input
                  id="billing-grant-delta"
                  value={grantDelta}
                  onChange={(e) => setGrantDelta(e.target.value)}
                  placeholder="e.g. 500 or -100"
                  inputMode="numeric"
                  autoComplete="off"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="billing-grant-note" className="text-xs text-muted-foreground">
                  Note (optional)
                </Label>
                <Input
                  id="billing-grant-note"
                  value={grantNote}
                  onChange={(e) => setGrantNote(e.target.value)}
                  placeholder="Reason for the adjustment"
                />
              </div>
            </div>
            <Button size="sm" onClick={submitGrant} disabled={granting} className="self-start">
              {granting ? "Applying..." : "Apply adjustment"}
            </Button>
          </div>
        </section>
      ) : null}

      {/* Top-up dialog */}
      <Dialog
        open={topUpOpen}
        onOpenChange={(open) => {
          setTopUpOpen(open);
          if (!open) setAmount("");
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {activePayment ? "Complete your payment" : "Top up credits"}
            </DialogTitle>
            <DialogDescription>
              {activePayment
                ? "Finish the payment to receive your credits."
                : status.provider === "manual"
                  ? "Pay with a direct transfer from your crypto wallet."
                  : "Pay with card or crypto through NexaPay secure checkout."}
            </DialogDescription>
          </DialogHeader>

          {activePayment ? (
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-muted/20 p-3 text-sm">
                <span>
                  {fmtUsd(activePayment.amountUsd)} ·{" "}
                  {fmtCredits(activePayment.credits)} credits
                </span>
                <StatusBadge status={activePayment.status} />
              </div>
              <PaymentInstructions
                payment={activePayment}
                onSubmitTx={submitTx}
                submittingTx={submittingTx}
                txHash={txHash}
                onTxHashChange={setTxHash}
              />
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap gap-2">
                {presets.map((preset) => (
                  <Button
                    key={preset}
                    type="button"
                    size="sm"
                    variant={amount === String(preset) ? "default" : "outline"}
                    onClick={() => setAmount(String(preset))}
                  >
                    ${preset}
                  </Button>
                ))}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="billing-amount" className="text-xs text-muted-foreground">
                  Amount (USD)
                </Label>
                <Input
                  id="billing-amount"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder={`Between ${status.minTopUpUsd} and ${status.maxTopUpUsd}`}
                  inputMode="decimal"
                  autoFocus
                />
                <p className="text-[11px] text-muted-foreground">
                  {fmtCredits(status.creditsPerUsd)} credits per $1 ·{" "}
                  {status.paymentAsset
                    ? `paid in ${status.paymentAsset}${status.paymentNetwork ? ` on ${status.paymentNetwork}` : ""}`
                    : "paid in crypto of your choice"}
                </p>
              </div>
              <Button onClick={startTopUp} disabled={creating}>
                {creating ? (
                  <>
                    <Loader2 className="size-4 animate-spin" /> Starting...
                  </>
                ) : (
                  "Continue to payment"
                )}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
