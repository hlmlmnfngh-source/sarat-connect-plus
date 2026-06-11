import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type Body = {
  // What we're paying for
  kind: "service" | "package" | "project" | "milestone";
  // For services / packages
  service_id?: string;
  package_type?: "basic" | "standard" | "premium";
  // For project / milestone payments
  project_id?: string;
  // Optional override (used for milestone amounts), USD
  amount?: number;
  // For project payments, the seller is the freelancer chosen
  seller_id?: string;
  title?: string;
  description?: string;
  requirements?: string;
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY")!;
    if (!stripeKey) throw new Error("Stripe is not configured");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Not authenticated");

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userRes, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userRes.user?.email) throw new Error("Not authenticated");
    const user = userRes.user;

    const admin = createClient(supabaseUrl, serviceKey);

    const body: Body = await req.json();

    // Resolve seller, price, title
    let sellerId = body.seller_id ?? null;
    let amountUsd = body.amount ?? 0;
    let title = body.title ?? "Sarat order";
    let description = body.description ?? "";
    let serviceId: string | null = body.service_id ?? null;
    let projectId: string | null = body.project_id ?? null;
    let packageType: Body["package_type"] | null = body.package_type ?? null;

    if (body.kind === "service" || body.kind === "package") {
      if (!serviceId) throw new Error("service_id is required");
      const { data: svc, error } = await admin
        .from("services")
        .select("id,user_id,title,price")
        .eq("id", serviceId)
        .maybeSingle();
      if (error || !svc) throw new Error("Service not found");
      sellerId = svc.user_id;
      title = svc.title;

      if (body.kind === "package") {
        if (!packageType) throw new Error("package_type is required");
        const { data: pkg, error: pErr } = await admin
          .from("service_packages")
          .select("price,title")
          .eq("service_id", serviceId)
          .eq("package_type", packageType)
          .maybeSingle();
        if (pErr || !pkg) throw new Error("Package not found");
        amountUsd = Number(pkg.price);
        title = `${svc.title} — ${pkg.title}`;
      } else {
        amountUsd = Number(svc.price);
      }
    } else if (body.kind === "project" || body.kind === "milestone") {
      if (!projectId) throw new Error("project_id is required");
      const { data: proj, error } = await admin
        .from("projects")
        .select("id,buyer_id,title,budget_max")
        .eq("id", projectId)
        .maybeSingle();
      if (error || !proj) throw new Error("Project not found");
      if (proj.buyer_id !== user.id) throw new Error("Only the project owner can pay");
      if (!sellerId) throw new Error("seller_id is required for project payments");
      title = body.kind === "milestone"
        ? `${proj.title} — Milestone`
        : proj.title;
      if (!amountUsd) amountUsd = Number(proj.budget_max ?? 0);
    }

    if (!sellerId) throw new Error("Seller could not be resolved");
    if (!amountUsd || amountUsd <= 0) throw new Error("Invalid amount");
    if (sellerId === user.id) throw new Error("You cannot pay yourself");

    // Create pending order
    const { data: order, error: orderErr } = await admin
      .from("orders")
      .insert({
        buyer_id: user.id,
        seller_id: sellerId,
        service_id: serviceId,
        project_id: projectId,
        package_type: packageType,
        price: amountUsd,
        status: "pending",
        requirements: body.requirements ?? null,
      })
      .select("id")
      .single();
    if (orderErr || !order) throw new Error(orderErr?.message ?? "Failed to create order");

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    const customerId = customers.data[0]?.id;

    const origin = req.headers.get("origin") ?? "https://sarat-connect-plus.lovable.app";

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [
        {
          price_data: {
            currency: "usd",
            unit_amount: Math.round(amountUsd * 100),
            product_data: { name: title, description: description || undefined },
          },
          quantity: 1,
        },
      ],
      metadata: {
        order_id: order.id,
        buyer_id: user.id,
        seller_id: sellerId,
        kind: body.kind,
      },
      success_url: `${origin}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/payment/cancelled?order_id=${order.id}`,
    });

    await admin
      .from("orders")
      .update({ stripe_session_id: session.id })
      .eq("id", order.id);

    return new Response(
      JSON.stringify({ url: session.url, session_id: session.id, order_id: order.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});