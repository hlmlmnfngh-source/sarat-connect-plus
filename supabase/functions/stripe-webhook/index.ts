import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "stripe-signature, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!stripeKey || !webhookSecret || !supabaseUrl || !serviceKey) {
    console.error("Missing required environment variables");

    return new Response("Server configuration error", {
      status: 500,
      headers: corsHeaders,
    });
  }

  const stripe = new Stripe(stripeKey, {
    apiVersion: "2025-08-27.basil",
  });

  const admin = createClient(supabaseUrl, serviceKey);

  const signature = req.headers.get("stripe-signature");
  const body = await req.text();

  if (!signature) {
    return new Response("Missing signature", {
      status: 400,
      headers: corsHeaders,
    });
  }

  let event: Stripe.Event;

  try {
    event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      webhookSecret,
    );
  } catch (error) {
    console.error("Stripe signature verification failed:", error);

    return new Response("Invalid signature", {
      status: 400,
      headers: corsHeaders,
    });
  }

  /*
   * Quick duplicate check.
   *
   * The database function used for successful payments also has
   * its own idempotency protection, so this check is only an
   * early exit for already-processed events.
   */
  const { data: existingEvent, error: existingEventError } = await admin
    .from("stripe_events")
    .select("id")
    .eq("id", event.id)
    .maybeSingle();

  if (existingEventError) {
    console.error(
      "Failed to check Stripe event:",
      existingEventError,
    );

    return new Response("Database error", {
      status: 500,
      headers: corsHeaders,
    });
  }

  if (existingEvent) {
    return new Response(
      JSON.stringify({
        received: true,
        duplicate: true,
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      },
    );
  }

  try {
    switch (event.type) {
      /*
       * ==========================================
       * SUCCESSFUL CHECKOUT
       * ==========================================
       *
       * Financial processing is delegated to the
       * atomic database function:
       *
       * record_seller_pending_payment
       *
       * That function:
       * - validates the order
       * - validates the payment amount
       * - records the Stripe event
       * - activates the order
       * - records buyer purchase
       * - calculates seller 80%
       * - adds seller amount to pending balance
       * - writes wallet ledger entry
       */
      case "checkout.session.completed": {
        const session =
          event.data.object as Stripe.Checkout.Session;

        const orderId = session.metadata?.order_id;

        if (!orderId) {
          throw new Error(
            "checkout.session.completed is missing order_id",
          );
        }

        const gross = (session.amount_total ?? 0) / 100;

        const currency = (
          session.currency ?? "usd"
        ).toLowerCase();

        const paymentIntent =
          typeof session.payment_intent === "string"
            ? session.payment_intent
            : session.payment_intent?.id ?? null;

        /*
         * We only record the financial transaction when
         * Stripe confirms the payment as paid.
         */
        if (session.payment_status === "paid") {
          const { data: walletResult, error: walletError } =
            await admin.rpc(
              "record_seller_pending_payment",
              {
                p_order_id: orderId,
                p_stripe_event_id: event.id,
                p_stripe_session_id: session.id,
                p_stripe_payment_intent_id: paymentIntent,
                p_gross_amount: gross,
                p_currency: currency,
              },
            );

          if (walletError) {
            console.error(
              "Failed to record seller pending payment:",
              walletError,
            );

            throw walletError;
          }

          console.log(
            "Wallet payment result:",
            walletResult,
          );

          /*
           * Notify seller only after the financial
           * operation succeeds.
           */
          const { data: order, error: orderError } =
            await admin
              .from("orders")
              .select("seller_id")
              .eq("id", orderId)
              .maybeSingle();

          if (orderError) {
            console.error(
              "Failed to load order seller:",
              orderError,
            );
          } else if (order?.seller_id) {
            const { error: notificationError } =
              await admin
                .from("notifications")
                .insert({
                  user_id: order.seller_id,
                  type: "payment",
                  title: "تم استلام طلب جديد",
                  message:
                    "تم تأكيد الدفع ويمكنك البدء بتنفيذ الطلب.",
                  link: "/orders",
                  is_read: false,
                });

            if (notificationError) {
              console.error(
                "Failed to create seller notification:",
                notificationError,
              );
            }
          }
        }

        break;
      }

      /*
       * ==========================================
       * CHECKOUT EXPIRED / PAYMENT FAILED
       * ==========================================
       */
      case "checkout.session.expired":
      case "checkout.session.async_payment_failed": {
        const session =
          event.data.object as Stripe.Checkout.Session;

        const orderId = session.metadata?.order_id;

        if (orderId) {
          const { error } = await admin
            .from("orders")
            .update({
              status: "cancelled",
            })
            .eq("id", orderId)
            .eq("status", "pending");

          if (error) {
            throw error;
          }
        }

        break;
      }

      /*
       * ==========================================
       * REFUND
       * ==========================================
       *
       * Refund accounting will be connected to the
       * wallet ledger in the next financial step.
       */
      case "charge.refunded": {
        const charge = event.data.object as Stripe.Charge;
        const paymentIntent =
          typeof charge.payment_intent === "string"
            ? charge.payment_intent
            : charge.payment_intent?.id;
        if (!paymentIntent) break;

        const { data: order, error: orderError } = await admin
          .from("orders")
          .select("id,price")
          .eq("stripe_payment_intent_id", paymentIntent)
          .maybeSingle();

        if (orderError) throw orderError;
        if (order) {
          const refundId = charge.refunds?.data?.[0]?.id;
          const refundAmount = (charge.amount_refunded ?? 0) / 100;
          if (!refundId || refundAmount <= 0) {
            throw new Error("Refund event is missing refund amount or refund id");
          }

          const { data: accounting, error: accountingError } =
            await admin.rpc("record_refund_accounting", {
              p_order_id: order.id,
              p_refund_id: refundId,
              p_payment_intent_id: paymentIntent,
              p_refund_amount: refundAmount,
              p_currency: (charge.currency ?? "usd").toLowerCase(),
            });

          if (accountingError) throw accountingError;
          if (!accounting?.success) {
            throw new Error("Refund accounting could not be completed");
          }
        }
        break;
      }
      case "account.updated": {
        const account =
          event.data.object as Stripe.Account;

        const chargesEnabled =
          Boolean(account.charges_enabled);

        const payoutsEnabled =
          Boolean(account.payouts_enabled);

        const onboarded =
          Boolean(account.details_submitted) &&
          chargesEnabled &&
          payoutsEnabled;

        const { error } = await admin
          .from("profiles")
          .update({
            stripe_charges_enabled: chargesEnabled,
            stripe_payouts_enabled: payoutsEnabled,
            stripe_onboarded: onboarded,
          })
          .eq(
            "stripe_account_id",
            account.id,
          );

        if (error) {
          throw error;
        }

        break;
      }

      default:
        break;
    }

    /*
     * For events other than checkout.session.completed,
     * record the event after successful processing.
     *
     * checkout.session.completed is already recorded
     * atomically by record_seller_pending_payment.
     */
    if (event.type !== "checkout.session.completed") {
      const { error: eventInsertError } =
        await admin
          .from("stripe_events")
          .insert({
            id: event.id,
            type: event.type,
          });

      if (eventInsertError) {
        /*
         * If another concurrent delivery already inserted
         * the event, it is safe to treat it as processed.
         */
        if (eventInsertError.code !== "23505") {
          throw eventInsertError;
        }
      }
    }

    return new Response(
      JSON.stringify({
        received: true,
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      },
    );
  } catch (error) {
    console.error(
      "Stripe webhook handler error:",
      error,
    );

    return new Response("Webhook processing error", {
      status: 500,
      headers: corsHeaders,
    });
  }
});