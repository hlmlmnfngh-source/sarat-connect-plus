import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/payment/success")({
  validateSearch: (s: Record<string, unknown>) => ({
    session_id: typeof s.session_id === "string" ? s.session_id : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Payment successful — Sarat" },
      { name: "description", content: "Your payment was completed successfully." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PaymentSuccess,
  errorComponent: ({ error }) => (
    <div className="p-8 text-center text-sm text-muted-foreground">
      {error.message}
    </div>
  ),
  notFoundComponent: () => <div className="p-8 text-center">Not found</div>,
});

function PaymentSuccess() {
  const { session_id } = useSearch({ from: "/payment/success" });
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md rounded-xl border border-border bg-card p-8 text-center shadow-sm">
        <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-500" />
        <h1 className="mt-4 text-2xl font-semibold">Payment successful</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Thanks — your order is now active. You'll find it in your dashboard.
        </p>
        {session_id ? (
          <p className="mt-3 break-all text-xs text-muted-foreground">
            Reference: {session_id}
          </p>
        ) : null}
        <div className="mt-6 flex justify-center gap-3">
          <Link
            to="/wallet"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            View wallet
          </Link>
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent"
          >
            Go home
          </Link>
        </div>
      </div>
    </main>
  );
}