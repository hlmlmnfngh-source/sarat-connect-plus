import { useState } from "react";
import { toast } from "sonner";
import { startCheckout, type CheckoutPayload } from "@/lib/checkout";
import { useAuth } from "@/hooks/use-auth";
import { useNavigate } from "@tanstack/react-router";

type Props = {
  payload: CheckoutPayload;
  label?: string;
  className?: string;
};

/**
 * Drop-in button that starts a Stripe Checkout session for a service,
 * package, project, or milestone payment. Redirects unauthenticated
 * users to /auth, then handles the redirect to Stripe.
 */
export function PayButton({ payload, label = "Pay with card", className }: Props) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const onClick = async () => {
    if (!user) {
      navigate({ to: "/auth" });
      return;
    }
    setLoading(true);
    try {
      await startCheckout(payload);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Checkout failed";
      toast.error(message);
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className={
        className ??
        "inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
      }
    >
      {loading ? "Redirecting…" : label}
    </button>
  );
}