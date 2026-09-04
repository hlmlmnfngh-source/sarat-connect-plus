ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS identity_document_path TEXT,
  ADD COLUMN IF NOT EXISTS verification_status TEXT NOT NULL DEFAULT 'pending';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_verification_status_check') THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_verification_status_check
      CHECK (verification_status IN ('pending','approved','rejected'));
  END IF;
END $$;

-- prevent self-approval: only admins/backend may change verification_status
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

  -- users may not approve/reject themselves; admins can
  IF NEW.verification_status IS DISTINCT FROM OLD.verification_status
     AND NOT public.has_role(auth.uid(), 'admin') THEN
    IF NEW.verification_status <> 'pending' THEN
      RAISE EXCEPTION 'Cannot set your own verification status';
    END IF;
  END IF;

  RETURN NEW;
END $function$;
