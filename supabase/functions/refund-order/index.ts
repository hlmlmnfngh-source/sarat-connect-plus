import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SELLER_SHARE = 0.8;
const REFUNDABLE_STATUSES = ["pending", "active"];

class PublicError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY")!;
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new PublicError("Not authenticated", 401);

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userRes } = await userClient.auth.getUser();
    const user = userRes.user;
    if (!user) throw new PublicError("Not authenticated", 401);

    const { order_id } = await req.json();
    if (!order_id) throw new PublicError("order_id required");

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: order, error } = await admin
      .from("orders")
      .select("id,buyer_id,seller_id,stripe_payment_intent_id,status,price")
      .eq("id", order_id)
      .maybeSingle();
    if (error || !order) throw new PublicError("Order not found", 404);

    // Only the buyer may request a refund.
    if (order.buyer_id !== user.id) throw new PublicError("Not authorized", 403);

    if (!REFUNDABLE_STATUSES.includes(order.status)) {
      throw new PublicError("This order can no longer be refunded");
    }
    if (!order.stripe_payment_intent_id) {
      throw new PublicError("Order was not paid via Stripe");
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const refund = await stripe.refunds.create({
      payment_intent: order.stripe_payment_intent_id,
      reason: "requested_by_customer",
    });

    await admin
      .from("orders")
      .update({
        status: "cancelled",
        stripe_refund_id: refund.id,
        refunded_at: new Date().toISOString(),
      })
      .eq("id", order.id);

    const gross = Number(order.price);
    const sellerNet = Math.round(gross * SELLER_SHARE * 100) / 100;

    await admin.from("transactions").insert([
      {
        user_id: order.buyer_id,
        type: "refund",
        amount: gross,
        currency: "usd",
        status: "completed",
        reference_id: order.id,
        description: `Refund for order ${order.id}`,
        stripe_refund_id: refund.id,
        stripe_payment_intent_id: order.stripe_payment_intent_id,
      },
      {
        // Reverses the seller's net earning for this order.
        user_id: order.seller_id,
        type: "refund",
        amount: -sellerNet,
        currency: "usd",
        status: "completed",
        reference_id: order.id,
        description: `Earning reversed for refunded order ${order.id}`,
        stripe_refund_id: refund.id,
        stripe_payment_intent_id: order.stripe_payment_intent_id,
      },
    ]);

    return new Response(JSON.stringify({ ok: true, refund_id: refund.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    if (err instanceof PublicError) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: err.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    console.error("refund-order error", err);
    return new Response(
      JSON.stringify({ error: "Refund could not be processed. Please try again later." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
