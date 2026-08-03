import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const MIN_WITHDRAWAL = 10;

const inputSchema = z.object({
  amount: z.number().finite().positive(),
});

export const requestWithdrawal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => inputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const amount = Math.round(data.amount * 100) / 100;

    if (amount < MIN_WITHDRAWAL) {
      throw new Error(`Minimum withdrawal amount is $${MIN_WITHDRAWAL}.`);
    }

    // Available balance is derived server-side, never trusted from the client.
    const { data: txns, error: txErr } = await supabase
      .from("transactions")
      .select("type,amount")
      .eq("user_id", userId)
      .eq("status", "completed")
      .in("type", ["earning", "refund"]);
    if (txErr) throw new Error("Could not read your balance.");

    // Seller-side refund rows are negative (earning reversals); buyer-side
    // refunds are positive but a buyer has no earnings to withdraw anyway.
    const net = (txns ?? []).reduce((sum, t) => {
      const value = Number(t.amount);
      if (t.type === "earning") return sum + value;
      return value < 0 ? sum + value : sum;
    }, 0);

    const { data: existing, error: wErr } = await supabase
      .from("withdrawal_requests")
      .select("amount,status")
      .eq("user_id", userId)
      .neq("status", "rejected");
    if (wErr) throw new Error("Could not read your withdrawal history.");

    const committed = (existing ?? []).reduce((sum, w) => sum + Number(w.amount), 0);
    const available = Math.round((net - committed) * 100) / 100;

    if (amount > available) {
      throw new Error(`Requested amount exceeds your available balance ($${available.toFixed(2)}).`);
    }

    const { data: inserted, error: insErr } = await supabase
      .from("withdrawal_requests")
      .insert({ user_id: userId, amount })
      .select("id,amount,status,created_at")
      .single();
    if (insErr) throw new Error("Could not submit your withdrawal request.");

    return { ok: true as const, request: inserted, available: available - amount };
  });
