import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const MIN_WITHDRAWAL = 10;

const inputSchema = z.object({
  amount: z.number().finite().positive(),
});

export const requestWithdrawal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => inputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    void supabase;
    const amount = Math.round(data.amount * 100) / 100;

    if (amount < MIN_WITHDRAWAL) {
      throw new Error(`Minimum withdrawal amount is $${MIN_WITHDRAWAL}.`);
    }

    const { data: result, error } = await supabaseAdmin.rpc("request_withdrawal_internal" as never, {
      p_user_id: context.userId,
      p_amount: amount,
    } as never);

    if (error) {
      throw new Error(error.message || "Could not submit your withdrawal request.");
    }

    if (!result?.ok) {
      throw new Error("Could not submit your withdrawal request.");
    }

    return result;
  });
