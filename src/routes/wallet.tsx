import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

type Txn = {
  id: string;
  type: "earning" | "withdrawal" | "purchase" | "refund";
  amount: number;
  currency: string;
  status: "pending" | "completed" | "failed";
  description: string | null;
  reference_id: string | null;
  created_at: string;
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
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) return;
    (async () => {
      const { data, error } = await supabase
        .from("transactions")
        .select("id,type,amount,currency,status,description,reference_id,created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) setError(error.message);
      else setTxns((data ?? []) as Txn[]);
    })();
  }, [user, authLoading]);

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
  const refunded = completed
    .filter((t) => t.type === "refund")
    .reduce((s, t) => s + Number(t.amount), 0);

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Wallet</h1>
      <p className="mt-1 text-sm text-muted-foreground">Your payment history on Sarat.</p>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Stat label="Total earnings" value={fmt(earnings, "usd")} />
        <Stat label="Total spent" value={fmt(spent, "usd")} />
        <Stat label="Refunded" value={fmt(refunded, "usd")} />
      </div>

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
            {txns.map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-4 px-4 py-3">
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
                    t.type === "earning" || t.type === "refund"
                      ? "text-emerald-600"
                      : "text-foreground"
                  }`}
                >
                  {t.type === "earning" || t.type === "refund" ? "+" : "-"}
                  {fmt(Number(t.amount), t.currency || "usd")}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-xl font-semibold">{value}</div>
    </div>
  );
}