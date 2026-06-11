import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "stripe-signature, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY")!;
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET")!;
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
  const admin = createClient(supabaseUrl, serviceKey);

  const signature = req.headers.get("stripe-signature");
  const body = await req.text();
  if (!signature) return new Response("Missing signature", { status: 400 });

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
  } catch (err) {
    console.error("Signature verification failed", err);
    return new Response("Invalid signature", { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const orderId = session.metadata?.order_id;
        const buyerId = session.metadata?.buyer_id;
        const sellerId = session.metadata?.seller_id;
        if (!orderId || !buyerId || !sellerId) break;

        const amount = (session.amount_total ?? 0) / 100;
        const pi = typeof session.payment_intent === "string"
          ? session.payment_intent
          : session.payment_intent?.id ?? null;

        if (session.payment_status === "paid") {
          await admin
            .from("orders")
            .update({
              status: "active",
              stripe_payment_intent_id: pi,
              paid_at: new Date().toISOString(),
            })
            .eq("id", orderId);

          // Buyer purchase row
          await admin.from("transactions").insert({
            user_id: buyerId,
            type: "purchase",
            amount,
            currency: (session.currency ?? "usd").toLowerCase(),
            status: "completed",
            reference_id: orderId,
            description: `Payment for order ${orderId}`,
            stripe_session_id: session.id,
            stripe_payment_intent_id: pi,
          });

          // Seller earning row
          await admin.from("transactions").insert({
            user_id: sellerId,
            type: "earning",
            amount,
            currency: (session.currency ?? "usd").toLowerCase(),
            status: "completed",
            reference_id: orderId,
            description: `Earning from order ${orderId}`,
            stripe_payment_intent_id: pi,
          });
        }
        break;
      }
      case "checkout.session.expired":
      case "checkout.session.async_payment_failed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const orderId = session.metadata?.order_id;
        if (orderId) {
          await admin
            .from("orders")
            .update({ status: "cancelled" })
            .eq("id", orderId)
            .eq("status", "pending");
        }
        break;
      }
      case "charge.refunded": {
        const charge = event.data.object as Stripe.Charge;
        const pi = typeof charge.payment_intent === "string"
          ? charge.payment_intent
          : charge.payment_intent?.id;
        if (!pi) break;
        const { data: order } = await admin
          .from("orders")
          .select("id,buyer_id,price")
          .eq("stripe_payment_intent_id", pi)
          .maybeSingle();
        if (order) {
          await admin
            .from("orders")
            .update({
              status: "cancelled",
              refunded_at: new Date().toISOString(),
              stripe_refund_id: charge.refunds?.data?.[0]?.id ?? null,
            })
            .eq("id", order.id);
        }
        break;
      }
      default:
        break;
    }
    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("webhook handler error", err);
    return new Response("error", { status: 500 });
  }
});