import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { requestWithdrawal } from "@/lib/withdrawals.functions";
import {
  getPayoutStatus,
  startConnectOnboarding,
  syncPayoutStatus,
} from "@/lib/connect.functions";
import {
  TransactionDetailsDialog,
  type TxnLike,
} from "@/components/TransactionDetailsDialog";

type WalletAccount = {
  user_id: string;
  available_balance: number;
  pending_balance: number;
  currency: string;
  updated_at: string;
};

type LedgerEntry = {
  id: string;
  order_id: string | null;
  transaction_id: string | null;
  entry_type:
    | "customer_payment"
    | "seller_pending"
    | "seller_release"
    | "platform_fee"
    | "refund"
    | "withdrawal"
    | "withdrawal_reversal"
    | "adjustment";
  bucket: "available" | "pending" | "external";
  amount: number;
  currency: string;
  description: string | null;
  created_at: string;
};

type Txn = {
  id: string;
  type: "earning" | "withdrawal" | "purchase" | "refund";
  amount: number;
  currency: string;
  status: "pending" | "completed" | "failed";
  description: string | null;
  reference_id: string | null;
  created_at: string;
  stripe_session_id: string | null;
  stripe_payment_intent_id: string | null;
  stripe_refund_id: string | null;
};

type WithdrawalRequest = {
  id: string;
  amount: number;
  status: "pending" | "approved" | "paid" | "rejected";
  notes: string | null;
  created_at: string;
  processed_at: string | null;
};

export const Route = createFileRoute("/wallet")({
  validateSearch: (
    s: Record<string, unknown>,
  ): { connect?: "return" | "refresh" } =>
    s.connect === "return" || s.connect === "refresh"
      ? { connect: s.connect }
      : {},
  head: () => ({
    meta: [
      { title: "Wallet & payment history — Sarat" },
      {
        name: "description",
        content:
          "Your Sarat wallet, earnings, purchases, and refunds.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: WalletPage,
  errorComponent: ({ error }) => (
    <div className="p-8 text-center text-sm text-muted-foreground">
      {error.message}
    </div>
  ),
  notFoundComponent: () => (
    <div className="p-8 text-center">Not found</div>
  ),
});

function fmt(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(amount);
  } catch {
    return `$${amount.toFixed(2)}`;
  }
}

function ledgerLabel(entryType: LedgerEntry["entry_type"]) {
  switch (entryType) {
    case "seller_pending":
      return "Pending seller earning";
    case "seller_release":
      return "Earning released";
    case "customer_payment":
      return "Customer payment";
    case "platform_fee":
      return "Platform fee";
    case "refund":
      return "Refund";
    case "withdrawal":
      return "Withdrawal";
    case "withdrawal_reversal":
      return "Withdrawal reversal";
    default:
      return "Wallet adjustment";
  }
}

function ledgerAmount(entry: LedgerEntry) {
  return Number(entry.amount);
}

function WalletPage() {
  const { user, loading: authLoading } = useAuth();
  const { connect } = Route.useSearch();

  const submitWithdrawalFn = useServerFn(requestWithdrawal);
  const fetchPayoutStatus = useServerFn(getPayoutStatus);
  const syncPayoutStatusFn = useServerFn(syncPayoutStatus);
  const startOnboarding = useServerFn(startConnectOnboarding);

  const [wallet, setWallet] = useState<WalletAccount | null>(null);
  const [ledger, setLedger] = useState<LedgerEntry[] | null>(null);
  const [txns, setTxns] = useState<Txn[] | null>(null);
  const [withdrawals, setWithdrawals] =
    useState<WithdrawalRequest[] | null>(null);

  const [payout, setPayout] = useState<{
    hasAccount: boolean;
    chargesEnabled: boolean;
    payoutsEnabled: boolean;
    onboarded: boolean;
  } | null>(null);

  const [connecting, setConnecting] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<TxnLike | null>(null);

  const [showWithdrawForm, setShowWithdrawForm] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawing, setWithdrawing] = useState(false);
  const [withdrawError, setWithdrawError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!user) return;

    setError(null);

    const [walletRes, ledgerRes, txRes, wRes] =
      await Promise.all([
        supabase
          .from("wallet_accounts")
          .select(
            "user_id,available_balance,pending_balance,currency,updated_at",
          )
          .eq("user_id", user.id)
          .maybeSingle(),

        supabase
          .from("wallet_ledger")
          .select(
            "id,order_id,transaction_id,entry_type,bucket,amount,currency,description,created_at",
          )
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(100),

        supabase
          .from("transactions")
          .select(
            "id,type,amount,currency,status,description,reference_id,created_at,stripe_session_id,stripe_payment_intent_id,stripe_refund_id",
          )
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(100),

        supabase
          .from("withdrawal_requests")
          .select(
            "id,amount,status,notes,created_at,processed_at",
          )
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(50),
      ]);

    if (walletRes.error) {
      setError(walletRes.error.message);
    } else {
      setWallet(
        walletRes.data
          ? (walletRes.data as WalletAccount)
          : null,
      );
    }

    if (ledgerRes.error) {
      setError(
        (current) => current ?? ledgerRes.error.message,
      );
    } else {
      setLedger(
        (ledgerRes.data ?? []) as LedgerEntry[],
      );
    }

    if (txRes.error) {
      setError(
        (current) => current ?? txRes.error.message,
      );
    } else {
      setTxns((txRes.data ?? []) as Txn[]);
    }

    if (wRes.error) {
      setError(
        (current) => current ?? wRes.error.message,
      );
    } else {
      setWithdrawals(
        (wRes.data ?? []) as WithdrawalRequest[],
      );
    }
  }, [user]);

  useEffect(() => {
    if (authLoading || !user) return;
    loadData();
  }, [user, authLoading, loadData]);

  useEffect(() => {
    if (authLoading || !user) return;

    const load = connect
      ? syncPayoutStatusFn({})
      : fetchPayoutStatus({});

    load
      .then(setPayout)
      .catch(() => setPayout(null));
  }, [
    user,
    authLoading,
    connect,
    fetchPayoutStatus,
    syncPayoutStatusFn,
  ]);

  async function handleConnect() {
    setConnectError(null);
    setConnecting(true);

    try {
      const { url } = await startOnboarding({});
      window.location.href = url;
    } catch (err) {
      setConnectError(
        err instanceof Error
          ? err.message
          : "Could not start payout setup.",
      );
      setConnecting(false);
    }
  }

  async function submitWithdrawal() {
    setWithdrawError(null);

    const amount = Number(withdrawAmount);

    if (!amount || amount <= 0) {
      setWithdrawError("Enter a valid amount.");
      return;
    }

    const available = Number(
      wallet?.available_balance ?? 0,
    );

    if (amount > available) {
      setWithdrawError(
        "The withdrawal amount cannot exceed your available balance.",
      );
      return;
    }

    setWithdrawing(true);

    try {
      await submitWithdrawalFn({
        data: { amount },
      });

      setShowWithdrawForm(false);
      setWithdrawAmount("");
      await loadData();
    } catch (err) {
      setWithdrawError(
        err instanceof Error
          ? err.message
          : "Failed to submit withdrawal request.",
      );
    } finally {
      setWithdrawing(false);
    }
  }

  if (!authLoading && !user) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <div className="rounded-lg border border-border bg-card p-6 text-center">
          <p className="text-sm text-muted-foreground">
            Sign in to view your wallet.
          </p>
          <Link
            to="/auth"
            search={{}}
            className="mt-4 inline-flex rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            Sign in
          </Link>
        </div>
      </main>
    );
  }

  const currency = wallet?.currency ?? "usd";
  const availableBalance = Number(
    wallet?.available_balance ?? 0,
  );
  const pendingBalance = Number(
    wallet?.pending_balance ?? 0,
  );

  const completedEarnings = (txns ?? [])
    .filter(
      (t) =>
        t.type === "earning" &&
        t.status === "completed",
    )
    .reduce(
      (sum, t) => sum + Number(t.amount),
      0,
    );

  const spent = (txns ?? [])
    .filter(
      (t) =>
        t.type === "purchase" &&
        t.status === "completed",
    )
    .reduce(
      (sum, t) => sum + Number(t.amount),
      0,
    );

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Wallet
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your real wallet balance and financial activity on Sarat.
        </p>
      </div>

      {error && (
        <div className="mt-4 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Available balance"
          value={fmt(availableBalance, currency)}
          highlight
        />

        <Stat
          label="Pending balance"
          value={fmt(pendingBalance, currency)}
        />

        <Stat
          label="Recent completed earnings"
          value={fmt(completedEarnings, currency)}
        />

        <Stat
          label="Total spent"
          value={fmt(spent, currency)}
        />
      </div>

      <section className="mt-6 rounded-xl border border-border bg-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-sm font-medium">
              Payout account (Stripe)
            </div>

            <p className="mt-0.5 text-xs text-muted-foreground">
              {payout?.onboarded
                ? "Your Stripe payout account is active."
                : payout?.hasAccount
                  ? "Your payout account setup is incomplete. Finish it to receive payments."
                  : "Connect a payout account to receive payments for your orders."}
            </p>

            {payout &&
              !payout.onboarded &&
              payout.hasAccount && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Charges enabled:{" "}
                  {payout.chargesEnabled ? "yes" : "no"} ·
                  Payouts enabled:{" "}
                  {payout.payoutsEnabled ? "yes" : "no"}
                </p>
              )}

            {connectError && (
              <p className="mt-1 text-xs text-destructive">
                {connectError}
              </p>
            )}
          </div>

          {payout?.onboarded ? (
            <span className="shrink-0 rounded-full bg-emerald-500/10 px-3 py-1 text-xs text-emerald-600">
              Connected
            </span>
          ) : (
            <button
              type="button"
              onClick={handleConnect}
              disabled={connecting}
              className="shrink-0 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
            >
              {connecting
                ? "Redirecting…"
                : payout?.hasAccount
                  ? "Continue setup"
                  : "Connect payout account"}
            </button>
          )}
        </div>
      </section>

      <section className="mt-6 rounded-xl border border-border bg-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-sm font-medium">
              Withdrawals
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Withdrawal requests are shown here for review.
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              setShowWithdrawForm((value) => !value)
            }
            disabled={availableBalance <= 0}
            className="shrink-0 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
          >
            Request withdrawal
          </button>
        </div>

        {showWithdrawForm && (
          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border pt-4">
            <input
              type="number"
              min={0}
              step="0.01"
              max={availableBalance}
              value={withdrawAmount}
              onChange={(e) =>
                setWithdrawAmount(e.target.value)
              }
              placeholder={`Up to ${fmt(availableBalance, currency)}`}
              className="w-40 rounded-md border border-border bg-background px-3 py-2 text-sm"
            />

            <button
              type="button"
              onClick={submitWithdrawal}
              disabled={withdrawing}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
            >
              {withdrawing
                ? "Submitting…"
                : "Submit request"}
            </button>

            {withdrawError && (
              <p className="w-full text-xs text-destructive">
                {withdrawError}
              </p>
            )}
          </div>
        )}

        {withdrawals && withdrawals.length > 0 && (
          <ul className="mt-4 divide-y divide-border border-t border-border">
            {withdrawals.map((withdrawal) => (
              <li
                key={withdrawal.id}
                className="flex items-center justify-between py-2 text-sm"
              >
                <div>
                  <span className="font-medium">
                    {fmt(
                      Number(withdrawal.amount),
                      currency,
                    )}
                  </span>
                  <span className="ml-2 text-xs text-muted-foreground">
                    {new Date(
                      withdrawal.created_at,
                    ).toLocaleDateString()}
                  </span>
                </div>

                <span
                  className={`rounded-full px-2 py-0.5 text-xs ${
                    withdrawal.status === "paid"
                      ? "bg-emerald-500/10 text-emerald-600"
                      : withdrawal.status === "rejected"
                        ? "bg-destructive/10 text-destructive"
                        : "bg-amber-500/10 text-amber-600"
                  }`}
                >
                  {withdrawal.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-8 rounded-xl border border-border bg-card">
        <header className="border-b border-border px-4 py-3 text-sm font-medium">
          Wallet activity
        </header>

        {ledger === null ? (
          <div className="p-6 text-sm text-muted-foreground">
            Loading…
          </div>
        ) : ledger.length === 0 ? (
          <div className="p-6 text-sm text-muted-foreground">
            No wallet activity yet.
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {ledger.map((entry) => {
              const amount = ledgerAmount(entry);
              const positive = amount > 0;

              return (
                <li
                  key={entry.id}
                  className="flex items-center justify-between gap-4 px-4 py-3"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-medium">
                      {ledgerLabel(entry.entry_type)}
                    </div>

                    <div className="mt-0.5 truncate text-xs text-muted-foreground">
                      {entry.description ??
                        entry.order_id ??
                        "—"}
                    </div>

                    <div className="mt-0.5 text-xs text-muted-foreground">
                      {new Date(
                        entry.created_at,
                      ).toLocaleString()}
                    </div>
                  </div>

                  <div
                    className={`shrink-0 text-sm font-semibold ${
                      positive
                        ? "text-emerald-600"
                        : "text-foreground"
                    }`}
                  >
                    {positive ? "+" : ""}
                    {fmt(Math.abs(amount), entry.currency)}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="mt-8 rounded-xl border border-border bg-card">
        <header className="border-b border-border px-4 py-3 text-sm font-medium">
          Transaction history
        </header>

        {txns === null ? (
          <div className="p-6 text-sm text-muted-foreground">
            Loading…
          </div>
        ) : txns.length === 0 ? (
          <div className="p-6 text-sm text-muted-foreground">
            No transactions yet.
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {txns.map((txn) => {
              const amount = Number(txn.amount);
              const positive = amount >= 0;

              return (
                <li key={txn.id}>
                  <button
                    type="button"
                    onClick={() => setSelected(txn)}
                    className="flex w-full items-center justify-between gap-4 px-4 py-3 text-right hover:bg-muted/40"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="font-medium capitalize">
                          {txn.type}
                        </span>

                        <span
                          className={`rounded-full px-2 py-0.5 text-xs ${
                            txn.status === "completed"
                              ? "bg-emerald-500/10 text-emerald-600"
                              : txn.status === "pending"
                                ? "bg-amber-500/10 text-amber-600"
                                : "bg-destructive/10 text-destructive"
                          }`}
                        >
                          {txn.status}
                        </span>
                      </div>

                      <div className="mt-0.5 truncate text-xs text-muted-foreground">
                        {txn.description ??
                          txn.reference_id ??
                          "—"}
                      </div>

                      <div className="mt-0.5 text-xs text-muted-foreground">
                        {new Date(
                          txn.created_at,
                        ).toLocaleString()}
                      </div>
                    </div>

                    <div
                      className={`shrink-0 text-sm font-semibold ${
                        positive
                          ? "text-emerald-600"
                          : "text-foreground"
                      }`}
                    >
                      {positive ? "+" : "-"}
                      {fmt(
                        Math.abs(amount),
                        txn.currency || currency,
                      )}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <TransactionDetailsDialog
        txn={selected}
        open={selected !== null}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      />
    </main>
  );
}

function Stat({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-4 ${
        highlight
          ? "border-primary bg-primary/5"
          : "border-border bg-card"
      }`}
    >
      <div className="text-xs text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 text-xl font-semibold">
        {value}
      </div>
    </div>
  );
}
