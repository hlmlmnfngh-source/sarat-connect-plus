ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS stripe_account_id text,
  ADD COLUMN IF NOT EXISTS stripe_charges_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS stripe_payouts_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS stripe_onboarded boolean NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_stripe_account_id_key
  ON public.profiles (stripe_account_id) WHERE stripe_account_id IS NOT NULL;

-- Browsing-safe: everyone may see whether a seller can be paid, never the account id.
GRANT SELECT (stripe_charges_enabled, stripe_payouts_enabled, stripe_onboarded)
  ON public.profiles TO anon, authenticated;

-- Sellers may never self-assign payout state; only the backend (service role) writes it.
CREATE OR REPLACE FUNCTION public.profiles_guard_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> OLD.id THEN
    IF current_setting('request.jwt.claims', true) IS NULL THEN
      RETURN NEW;
    END IF;
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