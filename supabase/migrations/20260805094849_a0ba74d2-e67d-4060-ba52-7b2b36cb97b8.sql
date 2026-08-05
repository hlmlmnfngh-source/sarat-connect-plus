CREATE OR REPLACE FUNCTION public.profiles_guard_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  claims jsonb;
  claim_role text;
BEGIN
  claims := NULLIF(current_setting('request.jwt.claims', true), '')::jsonb;
  claim_role := claims->>'role';

  -- Trusted backend paths (service role / direct SQL) bypass the guard.
  IF claims IS NULL OR claim_role = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF auth.uid() IS NULL OR auth.uid() <> OLD.id THEN
    RETURN NEW;
  END IF;

  IF NEW.is_verified IS DISTINCT FROM OLD.is_verified
     OR NEW.rating IS DISTINCT FROM OLD.rating
     OR NEW.reviews_count IS DISTINCT FROM OLD.reviews_count
     OR NEW.seller_level IS DISTINCT FROM OLD.seller_level
     OR NEW.total_earnings IS DISTINCT FROM OLD.total_earnings
     OR NEW.total_orders IS DISTINCT FROM OLD.total_orders THEN
    RAISE EXCEPTION 'Cannot modify trust or earnings fields';
  END IF;

  IF NEW.stripe_account_id IS DISTINCT FROM OLD.stripe_account_id
     OR NEW.stripe_charges_enabled IS DISTINCT FROM OLD.stripe_charges_enabled
     OR NEW.stripe_payouts_enabled IS DISTINCT FROM OLD.stripe_payouts_enabled
     OR NEW.stripe_onboarded IS DISTINCT FROM OLD.stripe_onboarded THEN
    RAISE EXCEPTION 'Cannot modify Stripe payout fields';
  END IF;

  RETURN NEW;
END $function$;

REVOKE EXECUTE ON FUNCTION public.profiles_guard_update() FROM anon, authenticated;