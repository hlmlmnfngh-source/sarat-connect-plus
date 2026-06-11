import { createFileRoute, Link } from "@tanstack/react-router";
import { XCircle } from "lucide-react";

export const Route = createFileRoute("/payment/cancelled")({
  validateSearch: (s: Record<string, unknown>) => ({
    order_id: typeof s.order_id === "string" ? s.order_id : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Payment cancelled — Sarat" },
      { name: "description", content: "Your payment was cancelled." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PaymentCancelled,
  errorComponent: ({ error }) => (
    <div className="p-8 text-center text-sm text-muted-foreground">
      {error.message}
    </div>
  ),
  notFoundComponent: () => <div className="p-8 text-center">Not found</div>,
});

function PaymentCancelled() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md rounded-xl border border-border bg-card p-8 text-center shadow-sm">
        <XCircle className="mx-auto h-14 w-14 text-destructive" />
        <h1 className="mt-4 text-2xl font-semibold">Payment cancelled</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Your payment was not completed. No charge was made — you can try again any time.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Back to home
          </Link>
        </div>
      </div>
    </main>
  );
}