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
    const { supabase } = context;
    const amount = Math.round(data.amount * 100) / 100;

    if (amount < MIN_WITHDRAWAL) {
      throw new Error(`Minimum withdrawal amount is $${MIN_WITHDRAWAL}.`);
    }

    const { data: result, error } = await supabase.rpc("request_withdrawal", {
      p_amount: amount,
    });

    if (error) {
      throw new Error(error.message || "Could not submit your withdrawal request.");
    }

    if (!result?.ok) {
      throw new Error("Could not submit your withdrawal request.");
    }

    return result;
  });
