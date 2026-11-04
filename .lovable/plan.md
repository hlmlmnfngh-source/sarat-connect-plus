# Seller subscriptions (free / pro / business): audit and proposed migration

## Audit status: the live database could not be reached
Every live-database query this turn failed with "connection pooler unavailable", which usually means the backend is paused or still waking up. Below, anything taken from the repo is marked **[repo]**. Anything that only exists in the live database is marked **[UNVERIFIED]**. The first build step re-runs these queries and pastes the results word for word before any SQL is applied.

### 1. Function sources
- `record_refund_accounting` **[repo]**: `supabase/migrations/20260926000001_atomic_wallet_refunds.sql`. It's a single-line plpgsql function. Its seller share is `v_seller_refund := ROUND(v_order.price*0.80,2)`. It is idempotent on `wallet_ledger.external_reference = 'refund:'||p_refund_id`, only allows full refunds, locks rows with FOR UPDATE (orders, wallet_accounts, the latest `earning` transaction), checks the pending or available bucket, writes two transactions plus one ledger row, and cancels the order. The live version may have changed since then **[UNVERIFIED]**.
- `record_seller_pending_payment` **[UNVERIFIED]**: it is not in any migration. Only `stripe-webhook/index.ts` calls it, at about lines 113–160. Its body has to be read from the live database with `pg_get_functiondef`. **Open question:** does it compute 80% itself, or does the webhook send it a precomputed net amount? The rewrite depends on the answer.

### 2. Hardcoded commission
- **[repo]** `supabase/functions/create-checkout/index.ts:31` sets `PLATFORM_FEE_RATE = 0.2`, which drives Stripe's `application_fee_amount`.
- **[repo]** `supabase/functions/refund-order/index.ts:11` sets `PLATFORM_COMMISSION_RATE = 0.2`.
- **[repo]** `src/components/site/ServiceForm.tsx:105-106` and `:149` use `0.2`/`0.8` plus the label "٢٠٪". `src/routes/services.$id.index.tsx:114` also uses `0.2`.
- **[repo]** `stripe-webhook/index.ts` needs a full read to check for any 0.8 net calculation passed into the function.
- **[UNVERIFIED]** I still need to check `complete_order_and_release` (called from `order-workflow/index.ts:509`), the withdrawal functions (`20261008000000_secure_withdrawal_rpc.sql`), and any view. Query to run: `pg_get_functiondef` for every `public` function whose body matches `0\.8|0\.2|commission|fee`, plus `information_schema.views`.

### 3. RLS, grants and triggers on orders and services
**[repo]**, from the base migration `20260609165328`:
- `orders`: `GRANT SELECT, INSERT, UPDATE, DELETE TO authenticated`.
  - `orders_insert_buyer` lets a client insert when `auth.uid() = buyer_id`.
  - `orders_update_parties` lets a client update when `auth.uid() IN (buyer_id, seller_id)`.
  - Triggers: `trg_orders_updated` and `orders_guard_update_trg`. The guard limits status transitions and requires `paid_at` before completion.
  - **So yes: today a signed-in client can INSERT orders directly with any column values, and UPDATE whatever columns the guard trigger does not block.**
- `services`: `GRANT SELECT TO anon` and `SELECT, INSERT, UPDATE, DELETE TO authenticated`.
  - The own-row policies only check `seller_id`.
  - The only trigger is `trg_services_updated`.
  - **So yes: a seller can set any column on their own services.**
- Live column grants and any later policy changes are **[UNVERIFIED]**.

### 4. Existing schema
- No `seller_subscriptions` table appears in the repo. The live database is **[UNVERIFIED]**.
- The allowed values for `services.status` come from the live CHECK constraint **[UNVERIFIED]**. The UI uses draft, active and paused; you also mentioned rejected.

## Risks
1. **Direct client inserts into orders.** Table-level INSERT/UPDATE grants make column-level REVOKE useless, so `commission_rate` has to be enforced by a trigger. Better still, drop `orders_insert_buyer`, because checkout already inserts with service_role. That needs confirmation that no client code inserts orders; `rg` found none so far.
2. **Grants on services work the same way.** `featured_rank` also has to be enforced by a trigger.
3. **Stripe fee and ledger must agree.** `create-checkout` must compute `application_fee_amount` from the same `commission_rate` it stores on the order, or Stripe's split and the wallet will drift apart.
4. **`refund-order` reversal.** The reversed transfer amount must use the order's stored rate.
5. **Plan changes mid-order.** A rate stored on the order at checkout is correct. It must never be re-derived later.
6. **Bypassing the free limit.** The limit trigger has to fire on INSERT as well as on a status UPDATE.
7. **Race condition.** Two quick activations could both pass the limit check. Fix: take a per-seller advisory lock (`pg_advisory_xact_lock(hashtext(seller_id::text))`) in the limit trigger.

## Proposed migration (not applied)

```sql
-- a) subscriptions
CREATE TABLE public.seller_subscriptions (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  plan text NOT NULL DEFAULT 'free' CHECK (plan IN ('free','pro','business')),
  status text NOT NULL DEFAULT 'inactive',
  stripe_customer_id text,
  stripe_subscription_id text UNIQUE,
  current_period_end timestamptz,
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.seller_subscriptions TO authenticated;
GRANT ALL ON public.seller_subscriptions TO service_role;
ALTER TABLE public.seller_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY seller_subscriptions_select_own ON public.seller_subscriptions
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE TRIGGER trg_seller_subscriptions_updated BEFORE UPDATE ON public.seller_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- b) plan helpers
CREATE OR REPLACE FUNCTION public.get_seller_plan(p_seller_id uuid) RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((SELECT plan FROM public.seller_subscriptions
    WHERE user_id = p_seller_id AND status IN ('active','trialing')), 'free') $$;
CREATE OR REPLACE FUNCTION public.plan_commission_rate(p_plan text) RETURNS numeric
LANGUAGE sql IMMUTABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE p_plan WHEN 'business' THEN 0.10 WHEN 'pro' THEN 0.15 ELSE 0.20 END::numeric $$;
CREATE OR REPLACE FUNCTION public.get_seller_commission_rate(p_seller_id uuid) RETURNS numeric
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.plan_commission_rate(public.get_seller_plan(p_seller_id)) $$;
CREATE OR REPLACE FUNCTION public.plan_featured_rank(p_plan text) RETURNS smallint
LANGUAGE sql IMMUTABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE p_plan WHEN 'business' THEN 2 WHEN 'pro' THEN 1 ELSE 0 END::smallint $$;
REVOKE EXECUTE ON FUNCTION public.get_seller_plan(uuid), public.plan_commission_rate(text),
  public.get_seller_commission_rate(uuid), public.plan_featured_rank(text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_seller_plan(uuid), public.plan_commission_rate(text),
  public.get_seller_commission_rate(uuid), public.plan_featured_rank(text) TO service_role;

-- c) per-order commission
ALTER TABLE public.orders ADD COLUMN commission_rate numeric(5,4) NOT NULL DEFAULT 0.2000
  CHECK (commission_rate >= 0 AND commission_rate <= 1);

CREATE OR REPLACE FUNCTION public.orders_guard_commission() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF current_user IN ('service_role','postgres','supabase_admin') THEN RETURN NEW; END IF;
  IF TG_OP = 'INSERT' THEN
    NEW.commission_rate := public.get_seller_commission_rate(NEW.seller_id);
  ELSIF NEW.commission_rate IS DISTINCT FROM OLD.commission_rate THEN
    RAISE EXCEPTION 'commission_rate is read-only';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER orders_guard_commission_trg BEFORE INSERT OR UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.orders_guard_commission();
REVOKE EXECUTE ON FUNCTION public.orders_guard_commission() FROM PUBLIC, anon, authenticated;
-- Optional, recommended: DROP POLICY orders_insert_buyer ON public.orders;  (needs approval)

-- d) accounting rewrites (shape; final body = live source with only the rate line changed)
-- record_refund_accounting: replace
--   v_seller_refund := ROUND(v_order.price*0.80,2);
-- with
--   v_seller_refund := ROUND(v_order.price*(1 - v_order.commission_rate),2);
-- Also prefer reversing exactly v_seller_transaction.amount when present,
-- and RAISE if it differs from the computed value (catches drift).
-- record_seller_pending_payment and complete_order_and_release: same substitution,
-- platform fee = price - seller_share. Idempotency, locks, ledger and grants unchanged;
-- re-apply REVOKE ... FROM PUBLIC, anon, authenticated; GRANT ... TO service_role.

-- e) free plan service limit
CREATE OR REPLACE FUNCTION public.services_enforce_plan_limit() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_count int;
BEGIN
  IF NEW.status = 'active' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'active') THEN
    PERFORM pg_advisory_xact_lock(hashtext(NEW.seller_id::text));
    IF public.get_seller_plan(NEW.seller_id) = 'free' THEN
      SELECT count(*) INTO v_count FROM public.services
        WHERE seller_id = NEW.seller_id AND status = 'active' AND id <> NEW.id;
      IF v_count >= 3 THEN
        RAISE EXCEPTION 'SERVICE_LIMIT_REACHED: free plan allows 3 active services';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER services_plan_limit_trg BEFORE INSERT OR UPDATE OF status ON public.services
  FOR EACH ROW EXECUTE FUNCTION public.services_enforce_plan_limit();
REVOKE EXECUTE ON FUNCTION public.services_enforce_plan_limit() FROM PUBLIC, anon, authenticated;

-- f) featured_rank
ALTER TABLE public.services ADD COLUMN featured_rank smallint NOT NULL DEFAULT 0;
CREATE INDEX idx_services_featured_rank ON public.services(featured_rank DESC, created_at DESC);

CREATE OR REPLACE FUNCTION public.services_set_featured_rank() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF current_setting('app.sync_featured_rank', true) = 'on' THEN RETURN NEW; END IF;
  NEW.featured_rank := public.plan_featured_rank(public.get_seller_plan(NEW.seller_id));
  RETURN NEW;
END $$;
CREATE TRIGGER services_featured_rank_trg BEFORE INSERT OR UPDATE ON public.services
  FOR EACH ROW EXECUTE FUNCTION public.services_set_featured_rank();

CREATE OR REPLACE FUNCTION public.seller_subscriptions_sync_rank() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user uuid := COALESCE(NEW.user_id, OLD.user_id);
BEGIN
  PERFORM set_config('app.sync_featured_rank','on', true);
  UPDATE public.services SET featured_rank = public.plan_featured_rank(public.get_seller_plan(v_user))
    WHERE seller_id = v_user;
  PERFORM set_config('app.sync_featured_rank','off', true);
  RETURN NULL;
END $$;
CREATE TRIGGER seller_subscriptions_sync_rank_trg
  AFTER INSERT OR UPDATE OR DELETE ON public.seller_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.seller_subscriptions_sync_rank();
REVOKE EXECUTE ON FUNCTION public.services_set_featured_rank(),
  public.seller_subscriptions_sync_rank() FROM PUBLIC, anon, authenticated;
```

**How featured_rank stays tamper-proof:** a BEFORE trigger recomputes `featured_rank` from the plan on every insert and update, so any value a client sends is overwritten. The subscription sync sets a transaction-local flag. A client cannot use that flag to keep a forged rank, because the sync's own UPDATE writes the correct value directly. Both the limit trigger and the sync UPDATE hold the per-seller advisory lock, and the sync touches `status` only through `UPDATE OF status` paths. Since the sync never changes `status`, the limit trigger does not fire on it.

## Follow-up app changes (after the migration)
- `create-checkout`: read `get_seller_commission_rate(seller_id)`, store it on the order, and use it for `application_fee_amount`.
- `refund-order`: use `order.commission_rate` instead of the 0.2 constant.
- `stripe-webhook`: handle `customer.subscription.created`, `updated` and `deleted`, and upsert `seller_subscriptions` as service_role.
- `ServiceForm` and the service page: show the seller's real rate. Map `SERVICE_LIMIT_REACHED` to an Arabic message with an upgrade link.
- Update `scripts/security-regression.sql` and add tests for the 20 / 15 / 10 rates and the limit of 3.

## First build step
Re-run the live audit queries: function definitions, policies, column grants, triggers, CHECK constraints, views and the subscriptions table. Paste the results here verbatim. Then finalize part d using the real bodies before applying anything.
