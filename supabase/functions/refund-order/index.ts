import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY")!;
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Not authenticated");

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userRes } = await userClient.auth.getUser();
    const user = userRes.user;
    if (!user) throw new Error("Not authenticated");

    const { order_id } = await req.json();
    if (!order_id) throw new Error("order_id required");

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: order, error } = await admin
      .from("orders")
      .select("id,buyer_id,seller_id,stripe_payment_intent_id,status,price")
      .eq("id", order_id)
      .maybeSingle();
    if (error || !order) throw new Error("Order not found");
    if (order.buyer_id !== user.id && order.seller_id !== user.id) {
      throw new Error("Not authorized");
    }
    if (!order.stripe_payment_intent_id) throw new Error("Order was not paid via Stripe");
    if (order.status === "cancelled") throw new Error("Order already cancelled");

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

    await admin.from("transactions").insert({
      user_id: order.buyer_id,
      type: "refund",
      amount: Number(order.price),
      currency: "usd",
      status: "completed",
      reference_id: order.id,
      description: `Refund for order ${order.id}`,
      stripe_refund_id: refund.id,
      stripe_payment_intent_id: order.stripe_payment_intent_id,
    });

    return new Response(JSON.stringify({ ok: true, refund_id: refund.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});