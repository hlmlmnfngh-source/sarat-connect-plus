import { supabase } from "@/integrations/supabase/client";

export type CheckoutPayload = {
  kind: "service" | "package" | "project" | "milestone";
  service_id?: string;
  package_type?: "basic" | "standard" | "premium";
  project_id?: string;
  seller_id?: string;
  amount?: number;
  title?: string;
  description?: string;
  requirements?: string;
};

export async function startCheckout(payload: CheckoutPayload) {
  const { data, error } = await supabase.functions.invoke("create-checkout", {
    body: payload,
  });
  if (error) throw error;
  if (!data?.url) throw new Error("No checkout URL returned");
  window.location.href = data.url as string;
}

export async function refundOrder(orderId: string) {
  const { data, error } = await supabase.functions.invoke("refund-order", {
    body: { order_id: orderId },
  });
  if (error) throw error;
  return data as { ok: boolean; refund_id: string };
}