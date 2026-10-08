-- Keep the withdrawal mutation behind the trusted server runtime.
-- The existing client-facing SECURITY DEFINER RPC remains for backwards compatibility
-- but is no longer callable by API roles.
REVOKE EXECUTE ON FUNCTION public.request_withdrawal(numeric) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.request_withdrawal_internal(
  p_user_id uuid,
  p_amount numeric
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_wallet public.wallet_accounts%ROWTYPE;
  v_request public.withdrawal_requests%ROWTYPE;
  v_amount numeric(12,2);
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'User is required';
  END IF;

  v_amount := ROUND(p_amount, 2);

  IF v_amount < 10 THEN
    RAISE EXCEPTION 'Minimum withdrawal amount is $10.00';
  END IF;

  SELECT *
  INTO v_wallet
  FROM public.wallet_accounts
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Wallet not found';
  END IF;

  IF v_amount > v_wallet.available_balance THEN
    RAISE EXCEPTION 'Requested amount exceeds your available balance ($%)',
      TO_CHAR(v_wallet.available_balance, 'FM999999990.00');
  END IF;

  UPDATE public.wallet_accounts
  SET available_balance = available_balance - v_amount,
      updated_at = now()
  WHERE user_id = p_user_id;

  INSERT INTO public.withdrawal_requests (user_id, amount, status)
  VALUES (p_user_id, v_amount, 'pending')
  RETURNING * INTO v_request;

  INSERT INTO public.wallet_ledger (
    user_id, transaction_id, entry_type, bucket, amount, currency,
    external_reference, description
  )
  VALUES (
    p_user_id, NULL, 'withdrawal', 'available', -v_amount, 'usd',
    'withdrawal_request:' || v_request.id,
    'Withdrawal request ' || v_request.id
  );

  RETURN jsonb_build_object(
    'ok', true,
    'request', jsonb_build_object(
      'id', v_request.id,
      'amount', v_request.amount,
      'status', v_request.status,
      'created_at', v_request.created_at
    ),
    'available', ROUND(v_wallet.available_balance - v_amount, 2)
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.request_withdrawal_internal(uuid, numeric) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.request_withdrawal_internal(uuid, numeric) TO service_role;