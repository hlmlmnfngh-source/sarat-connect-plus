import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type WorkflowAction =
  | "deliver"
  | "request_revision"
  | "resubmit"
  | "complete";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get(
      "SUPABASE_SERVICE_ROLE_KEY",
    );

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error(
        "Missing Supabase environment variables",
      );
    }

    const authHeader = req.headers.get("Authorization");

    if (!authHeader) {
      return new Response(
        JSON.stringify({
          error: "Missing authorization",
        }),
        {
          status: 401,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        },
      );
    }

    const admin = createClient(
      supabaseUrl,
      serviceRoleKey,
    );

    /*
     * Authenticate the caller.
     */
    const token = authHeader.replace("Bearer ", "");

    const {
      data: { user },
      error: userError,
    } = await admin.auth.getUser(token);

    if (userError || !user) {
      return new Response(
        JSON.stringify({
          error: "Unauthorized",
        }),
        {
          status: 401,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        },
      );
    }

    const body = await req.json();

    const orderId = body?.order_id as string;
    const action = body?.action as WorkflowAction;
    const message =
      typeof body?.message === "string"
        ? body.message.trim()
        : null;

    if (!orderId || !action) {
      return new Response(
        JSON.stringify({
          error: "order_id and action are required",
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        },
      );
    }

    const validActions: WorkflowAction[] = [
      "deliver",
      "request_revision",
      "resubmit",
      "complete",
    ];

    if (!validActions.includes(action)) {
      return new Response(
        JSON.stringify({
          error: "Invalid workflow action",
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        },
      );
    }

    /*
     * Load the order.
     */
    const { data: order, error: orderError } =
      await admin
        .from("orders")
        .select("*")
        .eq("id", orderId)
        .maybeSingle();

    if (orderError) {
      throw orderError;
    }

    if (!order) {
      return new Response(
        JSON.stringify({
          error: "Order not found",
        }),
        {
          status: 404,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        },
      );
    }

    const isBuyer = order.buyer_id === user.id;
    const isSeller = order.seller_id === user.id;

    /*
     * ==========================================
     * DELIVER
     * ==========================================
     *
     * Seller delivers the work.
     */
    if (action === "deliver") {
      if (!isSeller) {
        return new Response(
          JSON.stringify({
            error: "Only the seller can deliver the order",
          }),
          {
            status: 403,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
            },
          },
        );
      }

      if (
        order.status !== "active" &&
        order.status !== "revision"
      ) {
        return new Response(
          JSON.stringify({
            error:
              "Order cannot be delivered in its current status",
          }),
          {
            status: 400,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
            },
          },
        );
      }

      if (!message) {
        return new Response(
          JSON.stringify({
            error: "Delivery message is required",
          }),
          {
            status: 400,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
            },
          },
        );
      }

      const { error: deliveryError } =
        await admin
          .from("order_deliveries")
          .insert({
            order_id: orderId,
            seller_id: user.id,
            message,
          });

      if (deliveryError) {
        throw deliveryError;
      }

      const { error: updateError } =
        await admin
          .from("orders")
          .update({
            status: "delivered",
            delivered_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", orderId);

      if (updateError) {
        throw updateError;
      }

      return new Response(
        JSON.stringify({
          success: true,
          status: "delivered",
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

    /*
     * ==========================================
     * REQUEST REVISION
     * ==========================================
     *
     * Buyer requests changes.
     */
    if (action === "request_revision") {
      if (!isBuyer) {
        return new Response(
          JSON.stringify({
            error:
              "Only the buyer can request a revision",
          }),
          {
            status: 403,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
            },
          },
        );
      }

      if (order.status !== "delivered") {
        return new Response(
          JSON.stringify({
            error:
              "Revision can only be requested after delivery",
          }),
          {
            status: 400,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
            },
          },
        );
      }

      if (!message) {
        return new Response(
          JSON.stringify({
            error: "Revision message is required",
          }),
          {
            status: 400,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
            },
          },
        );
      }

      const { error: revisionError } =
        await admin
          .from("order_revisions")
          .insert({
            order_id: orderId,
            buyer_id: user.id,
            message,
          });

      if (revisionError) {
        throw revisionError;
      }

      const { error: updateError } =
        await admin
          .from("orders")
          .update({
            status: "revision",
            updated_at: new Date().toISOString(),
          })
          .eq("id", orderId);

      if (updateError) {
        throw updateError;
      }

      return new Response(
        JSON.stringify({
          success: true,
          status: "revision",
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

    /*
     * ==========================================
     * RESUBMIT
     * ==========================================
     *
     * Seller sends the revised work.
     */
    if (action === "resubmit") {
      if (!isSeller) {
        return new Response(
          JSON.stringify({
            error:
              "Only the seller can resubmit the order",
          }),
          {
            status: 403,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
            },
          },
        );
      }

      if (order.status !== "revision") {
        return new Response(
          JSON.stringify({
            error:
              "Order is not waiting for a revision",
          }),
          {
            status: 400,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
            },
          },
        );
      }

      if (!message) {
        return new Response(
          JSON.stringify({
            error: "Resubmission message is required",
          }),
          {
            status: 400,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
            },
          },
        );
      }

      const { error: deliveryError } =
        await admin
          .from("order_deliveries")
          .insert({
            order_id: orderId,
            seller_id: user.id,
            message,
          });

      if (deliveryError) {
        throw deliveryError;
      }

      const { error: updateError } =
        await admin
          .from("orders")
          .update({
            status: "delivered",
            delivered_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", orderId);

      if (updateError) {
        throw updateError;
      }

      return new Response(
        JSON.stringify({
          success: true,
          status: "delivered",
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

    /*
     * ==========================================
     * COMPLETE
     * ==========================================
     *
     * Buyer accepts the delivery.
     *
     * IMPORTANT:
     * The wallet release happens through the
     * SECURITY-DEFINER database function.
     *
     * The client never receives permission to
     * manipulate wallet balances directly.
     */
    if (action === "complete") {
      if (!isBuyer) {
        return new Response(
          JSON.stringify({
            error:
              "Only the buyer can complete the order",
          }),
          {
            status: 403,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
            },
          },
        );
      }

      if (order.status !== "delivered") {
        return new Response(
          JSON.stringify({
            error:
              "Only delivered orders can be completed",
          }),
          {
            status: 400,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
            },
          },
        );
      }

      /*
       * Release seller funds first.
       *
       * If this fails, the order is NOT marked
       * completed.
       */
      const {
        data: releaseResult,
        error: releaseError,
      } = await admin.rpc(
        "complete_order_and_release",
        {
          p_order_id: orderId,
        },
      );

      if (releaseError) {
        console.error(
          "Failed to atomically complete order and release seller funds:",
          releaseError,
        );

        throw releaseError;
      }

      /*
       * Notify the seller.
       */
      const { error: notificationError } =
        await admin
          .from("notifications")
          .insert({
            user_id: order.seller_id,
            type: "order",
            title: "تم إكمال الطلب",
            message:
              "تم إكمال الطلب وإضافة أرباحك إلى الرصيد المتاح.",
            link: "/wallet",
            is_read: false,
          });

      if (notificationError) {
        console.error(
          "Failed to notify seller:",
          notificationError,
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          status: "completed",
          release: releaseResult,
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

    return new Response(
      JSON.stringify({
        error: "Unsupported action",
      }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      },
    );
  } catch (error) {
    console.error(
      "Order workflow error:",
      error,
    );

    return new Response(
      JSON.stringify({
        error:
          error instanceof Error
            ? error.message
            : "Unexpected server error",
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      },
    );
  }
});