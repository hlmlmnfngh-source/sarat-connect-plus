
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS stripe_session_id text,
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id text,
  ADD COLUMN IF NOT EXISTS stripe_refund_id text,
  ADD COLUMN IF NOT EXISTS paid_at timestamptz,
  ADD COLUMN IF NOT EXISTS refunded_at timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS orders_stripe_session_id_key
  ON public.orders(stripe_session_id) WHERE stripe_session_id IS NOT NULL;

ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS stripe_session_id text,
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id text,
  ADD COLUMN IF NOT EXISTS stripe_refund_id text,
  ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'usd';

CREATE INDEX IF NOT EXISTS transactions_user_id_created_at_idx
  ON public.transactions(user_id, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS transactions_stripe_session_id_key
  ON public.transactions(stripe_session_id) WHERE stripe_session_id IS NOT NULL;
