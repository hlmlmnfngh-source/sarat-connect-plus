import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { TransactionDetailsDialog, type TxnLike } from "@/components/TransactionDetailsDialog";

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
  head: () => ({
    meta: [
      { title: "Wallet & payment history — Sarat" },
      { name: "description", content: "Your Sarat wallet, earnings, purchases, and refunds." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: WalletPage,
  errorComponent: ({ error }) => (
    <div className="p-8 text-center text-sm text-muted-foreground">{error.message}</div>
  ),
  notFoundComponent: () => <div className="p-8 text-center">Not found</div>,
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

function WalletPage() {
  const { user, loading: authLoading } = useAuth();
  const [txns, setTxns] = useState<Txn[] | null>(null);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<TxnLike | null>(null);
  const [showWithdrawForm, setShowWithdrawForm] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawing, setWithdrawing] = useState(false);
  const [withdrawError, setWithdrawError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!user) return;
    const [txRes, wRes] = await Promise.all([
      supabase
        .from("transactions")
        .select("id,type,amount,currency,status,description,reference_id,created_at,stripe_session_id,stripe_payment_intent_id,stripe_refund_id")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(100),
      supabase
        .from("withdrawal_requests")
        .select("id,amount,status,notes,created_at,processed_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50),
    ]);
    if (txRes.error) setError(txRes.error.message);
    else setTxns((txRes.data ?? []) as Txn[]);
    if (!wRes.error) setWithdrawals((wRes.data ?? []) as WithdrawalRequest[]);
  }, [user]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) return;
    loadData();
  }, [user, authLoading, loadData]);

  if (!authLoading && !user) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <div className="rounded-lg border border-border bg-card p-6 text-center">
          <p className="text-sm text-muted-foreground">Sign in to view your wallet.</p>
          <Link
            to="/auth"
            className="mt-4 inline-flex rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            Sign in
          </Link>
        </div>
      </main>
    );
  }

  const completed = (txns ?? []).filter((t) => t.status === "completed");
  const earnings = completed
    .filter((t) => t.type === "earning")
    .reduce((s, t) => s + Number(t.amount), 0);
  const spent = completed
    .filter((t) => t.type === "purchase")
    .reduce((s, t) => s + Number(t.amount), 0);
  // Refund rows can be positive (buyer got money back) or negative (seller's
  // earning was reversed because an order they were paid for got refunded).
  const refundAdjustments = completed
    .filter((t) => t.type === "refund")
    .reduce((s, t) => s + Number(t.amount), 0);

  const requestedOrPaid = (withdrawals ?? [])
    .filter((w) => w.status !== "rejected")
    .reduce((s, w) => s + Number(w.amount), 0);

  // Available balance is only meaningful as "seller balance": net earnings
  // (already commission-adjusted), plus/minus refund reversals, minus
  // anything already requested or paid out.
  const availableBalance = Math.max(0, earnings + refundAdjustments - requestedOrPaid);

  async function submitWithdrawal() {
    setWithdrawError(null);
    const amount = Number(withdrawAmount);
    if (!amount || amount <= 0) {
      setWithdrawError("Enter a valid amount.");
      return;
    }
    setWithdrawing(true);
    try {
      const { data: sessionRes } = await supabase.auth.getSession();
      const token = sessionRes.session?.access_token;
      const { data, error: fnError } = await supabase.functions.invoke("request-withdrawal", {
        body: { amount },
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (fnError) throw fnError;
      if (data?.error) throw new Error(data.error);
      setShowWithdrawForm(false);
      setWithdrawAmount("");
      await loadData();
    } catch (err) {
      setWithdrawError(err instanceof Error ? err.message : "Failed to submit withdrawal request.");
    } finally {
      setWithdrawing(false);
    }
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Wallet</h1>
      <p className="mt-1 text-sm text-muted-foreground">Your payment history on Sarat.</p>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-4">
        <Stat label="Available balance" value={fmt(availableBalance, "usd")} highlight />
        <Stat label="Total earnings (net)" value={fmt(earnings, "usd")} />
        <Stat label="Total spent" value={fmt(spent, "usd")} />
        <Stat label="Refund adjustments" value={fmt(refundAdjustments, "usd")} />
      </div>

      <section className="mt-6 rounded-xl border border-border bg-card p-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-sm font-medium">Withdrawals</div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Request a payout of your available balance. Requests are reviewed and paid out manually for now.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowWithdrawForm((v) => !v)}
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
              value={withdrawAmount}
              onChange={(e) => setWithdrawAmount(e.target.value)}
              placeholder={`Up to ${fmt(availableBalance, "usd")}`}
              className="w-40 rounded-md border border-border bg-background px-3 py-2 text-sm"
            />
            <button
              type="button"
              onClick={submitWithdrawal}
              disabled={withdrawing}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
            >
              {withdrawing ? "Submitting…" : "Submit request"}
            </button>
            {withdrawError && <p className="w-full text-xs text-destructive">{withdrawError}</p>}
          </div>
        )}

        {withdrawals && withdrawals.length > 0 && (
          <ul className="mt-4 divide-y divide-border border-t border-border">
            {withdrawals.map((w) => (
              <li key={w.id} className="flex items-center justify-between py-2 text-sm">
                <div>
                  <span className="font-medium">{fmt(Number(w.amount), "usd")}</span>
                  <span className="ml-2 text-xs text-muted-foreground">
                    {new Date(w.created_at).toLocaleDateString()}
                  </span>
                </div>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs ${
                    w.status === "paid"
                      ? "bg-emerald-500/10 text-emerald-600"
                      : w.status === "rejected"
                        ? "bg-destructive/10 text-destructive"
                        : "bg-amber-500/10 text-amber-600"
                  }`}
                >
                  {w.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-8 rounded-xl border border-border bg-card">
        <header className="border-b border-border px-4 py-3 text-sm font-medium">
          Payment history
        </header>
        {error ? (
          <div className="p-6 text-sm text-destructive">{error}</div>
        ) : txns === null ? (
          <div className="p-6 text-sm text-muted-foreground">Loading…</div>
        ) : txns.length === 0 ? (
          <div className="p-6 text-sm text-muted-foreground">No transactions yet.</div>
        ) : (
          <ul className="divide-y divide-border">
            {txns.map((t) => {
              const isPositive = Number(t.amount) >= 0;
              return (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => setSelected(t)}
                    className="flex w-full items-center justify-between gap-4 px-4 py-3 text-right hover:bg-muted/40"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="font-medium capitalize">{t.type}</span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs ${
                            t.status === "completed"
                              ? "bg-emerald-500/10 text-emerald-600"
                              : t.status === "pending"
                                ? "bg-amber-500/10 text-amber-600"
                                : "bg-destructive/10 text-destructive"
                          }`}
                        >
                          {t.status}
                        </span>
                      </div>
                      <div className="mt-0.5 truncate text-xs text-muted-foreground">
                        {t.description ?? t.reference_id ?? "—"}
                      </div>
                      <div className="mt-0.5 text-xs text-muted-foreground">
                        {new Date(t.created_at).toLocaleString()}
                      </div>
                    </div>
                    <div
                      className={`shrink-0 text-sm font-semibold ${
                        isPositive ? "text-emerald-600" : "text-foreground"
                      }`}
                    >
                      {isPositive ? "+" : "-"}
                      {fmt(Math.abs(Number(t.amount)), t.currency || "usd")}
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
        onOpenChange={(v) => !v && setSelected(null)}
      />
    </main>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-xl border p-4 ${highlight ? "border-primary bg-primary/5" : "border-border bg-card"}`}>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-xl font-semibold">{value}</div>
    </div>
  );
}
