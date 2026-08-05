import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type StripeAccount = {
  id: string;
  charges_enabled?: boolean;
  payouts_enabled?: boolean;
  details_submitted?: boolean;
};

/** Current seller's Stripe Connect payout status. */
export const getPayoutStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("profiles")
      .select("stripe_account_id,stripe_charges_enabled,stripe_payouts_enabled,stripe_onboarded")
      .eq("id", context.userId)
      .maybeSingle();
    return {
      hasAccount: Boolean(data?.stripe_account_id),
      chargesEnabled: Boolean(data?.stripe_charges_enabled),
      payoutsEnabled: Boolean(data?.stripe_payouts_enabled),
      onboarded: Boolean(data?.stripe_onboarded),
    };
  });

/**
 * Creates (or reuses) the seller's Express account and returns a fresh
 * Stripe-hosted onboarding link. Account links are single-use and short-lived,
 * so this is called every time the seller clicks "connect".
 */
export const startConnectOnboarding = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { stripeRequest } = await import("@/lib/stripe.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const origin = new URL(getRequest().url).origin;

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("stripe_account_id")
      .eq("id", context.userId)
      .maybeSingle();

    let accountId = profile?.stripe_account_id ?? null;

    if (!accountId) {
      const account = await stripeRequest<StripeAccount>("accounts", {
        type: "express",
        email: context.claims?.email ?? undefined,
        capabilities: {
          card_payments: { requested: "true" },
          transfers: { requested: "true" },
        },
        business_type: "individual",
        metadata: { sarat_user_id: context.userId },
      });
      accountId = account.id;
      const { error } = await supabaseAdmin
        .from("profiles")
        .update({ stripe_account_id: accountId })
        .eq("id", context.userId);
      if (error) throw new Error("Could not save your payout account.");
    }

    const link = await stripeRequest<{ url: string }>("account_links", {
      account: accountId,
      type: "account_onboarding",
      refresh_url: `${origin}/wallet?connect=refresh`,
      return_url: `${origin}/wallet?connect=return`,
    });

    return { url: link.url };
  });

/**
 * Pulls the live account state from Stripe and syncs the flags. Used when the
 * seller lands back on /wallet, so the UI is correct without waiting for the
 * account.updated webhook.
 */
export const syncPayoutStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { stripeRequest } = await import("@/lib/stripe.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("stripe_account_id")
      .eq("id", context.userId)
      .maybeSingle();
    if (!profile?.stripe_account_id) {
      return { hasAccount: false, chargesEnabled: false, payoutsEnabled: false, onboarded: false };
    }

    const account = await stripeRequest<StripeAccount>(`accounts/${profile.stripe_account_id}`);
    const chargesEnabled = Boolean(account.charges_enabled);
    const payoutsEnabled = Boolean(account.payouts_enabled);
    const onboarded = Boolean(account.details_submitted) && chargesEnabled && payoutsEnabled;

    await supabaseAdmin
      .from("profiles")
      .update({
        stripe_charges_enabled: chargesEnabled,
        stripe_payouts_enabled: payoutsEnabled,
        stripe_onboarded: onboarded,
      })
      .eq("id", context.userId);

    return { hasAccount: true, chargesEnabled, payoutsEnabled, onboarded };
  });
