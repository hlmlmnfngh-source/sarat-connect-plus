import { supabase } from "@/integrations/supabase/client";

export type OrderAction = "deliver" | "request_revision" | "complete" | "resubmit";

export async function runOrderAction(orderId: string, action: OrderAction, message?: string) {
  const { data, error } = await supabase.functions.invoke("order-workflow", {
    body: { order_id: orderId, action, message: message?.trim() || undefined },
  });
  if (error) throw error;
  if (!data?.ok) throw new Error(data?.error ?? "تعذر تنفيذ العملية");
  return data;
}
