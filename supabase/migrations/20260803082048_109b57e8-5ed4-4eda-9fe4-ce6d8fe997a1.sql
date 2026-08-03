-- 1. stripe_events
CREATE TABLE public.stripe_events (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.stripe_events TO service_role;
ALTER TABLE public.stripe_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "stripe_events_no_client_access" ON public.stripe_events FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

-- 2. withdrawal_requests
CREATE TYPE public.withdrawal_status AS ENUM ('pending', 'approved', 'paid', 'rejected');
CREATE TABLE public.withdrawal_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  status public.withdrawal_status NOT NULL DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ
);
CREATE INDEX withdrawal_requests_user_idx ON public.withdrawal_requests(user_id);
GRANT SELECT, INSERT ON public.withdrawal_requests TO authenticated;
GRANT ALL ON public.withdrawal_requests TO service_role;
ALTER TABLE public.withdrawal_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "withdrawals_read_own" ON public.withdrawal_requests FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "withdrawals_insert_own" ON public.withdrawal_requests FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- 3. contact_messages
CREATE TABLE public.contact_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  subject TEXT,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT INSERT ON public.contact_messages TO anon, authenticated;
GRANT SELECT ON public.contact_messages TO authenticated;
GRANT ALL ON public.contact_messages TO service_role;
ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "contact_messages_insert_any" ON public.contact_messages FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "contact_messages_admin_read" ON public.contact_messages FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 4. reviews: type must match role + one review per (order, type)
DROP POLICY IF EXISTS reviews_insert_own ON public.reviews;
CREATE POLICY reviews_insert_own ON public.reviews FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = reviewer_id
  AND review_type IN ('buyer_to_seller','seller_to_buyer')
  AND EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = reviews.order_id
      AND o.status = 'completed'
      AND (
        (o.buyer_id = auth.uid() AND o.seller_id = reviews.reviewee_id AND reviews.review_type = 'buyer_to_seller')
        OR (o.seller_id = auth.uid() AND o.buyer_id = reviews.reviewee_id AND reviews.review_type = 'seller_to_buyer')
      )
  )
);
DROP POLICY IF EXISTS reviews_update_own ON public.reviews;
CREATE POLICY reviews_update_own ON public.reviews FOR UPDATE TO authenticated
USING (auth.uid() = reviewer_id)
WITH CHECK (
  auth.uid() = reviewer_id
  AND EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = reviews.order_id
      AND o.status = 'completed'
      AND (
        (o.buyer_id = auth.uid() AND o.seller_id = reviews.reviewee_id AND reviews.review_type = 'buyer_to_seller')
        OR (o.seller_id = auth.uid() AND o.buyer_id = reviews.reviewee_id AND reviews.review_type = 'seller_to_buyer')
      )
  )
);
ALTER TABLE public.reviews ADD CONSTRAINT reviews_rating_range CHECK (rating BETWEEN 1 AND 5);
CREATE UNIQUE INDEX reviews_unique_per_order_type ON public.reviews(order_id, review_type);

-- 5. rating aggregation trigger
CREATE OR REPLACE FUNCTION public.recompute_review_aggregates()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_user UUID;
  target_service UUID;
BEGIN
  target_user := COALESCE(NEW.reviewee_id, OLD.reviewee_id);

  UPDATE public.profiles p SET
    rating = COALESCE((SELECT ROUND(AVG(r.rating)::numeric, 2) FROM public.reviews r WHERE r.reviewee_id = target_user), 0),
    reviews_count = (SELECT COUNT(*) FROM public.reviews r WHERE r.reviewee_id = target_user)
  WHERE p.id = target_user;

  SELECT o.service_id INTO target_service
  FROM public.orders o WHERE o.id = COALESCE(NEW.order_id, OLD.order_id);

  IF target_service IS NOT NULL THEN
    UPDATE public.services s SET
      rating = COALESCE((
        SELECT ROUND(AVG(r.rating)::numeric, 2) FROM public.reviews r
        JOIN public.orders o2 ON o2.id = r.order_id
        WHERE o2.service_id = target_service AND r.review_type = 'buyer_to_seller'
      ), 0),
      reviews_count = (
        SELECT COUNT(*) FROM public.reviews r
        JOIN public.orders o2 ON o2.id = r.order_id
        WHERE o2.service_id = target_service AND r.review_type = 'buyer_to_seller'
      )
    WHERE s.id = target_service;
  END IF;

  RETURN NULL;
END $$;

REVOKE EXECUTE ON FUNCTION public.recompute_review_aggregates() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER reviews_recompute_aggregates
AFTER INSERT OR UPDATE OR DELETE ON public.reviews
FOR EACH ROW EXECUTE FUNCTION public.recompute_review_aggregates();

-- 6. live financials
CREATE OR REPLACE FUNCTION public.get_my_financials()
RETURNS TABLE(total_earnings numeric, total_orders integer)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    COALESCE((
      SELECT SUM(CASE WHEN t.type = 'earning' THEN t.amount
                      WHEN t.type = 'refund' THEN t.amount
                      ELSE 0 END)
      FROM public.transactions t
      WHERE t.user_id = auth.uid()
        AND t.status = 'completed'
        AND t.type IN ('earning','refund')
        AND (t.type = 'earning' OR t.amount < 0)
    ), 0)::numeric AS total_earnings,
    COALESCE((
      SELECT COUNT(*) FROM public.orders o
      WHERE o.seller_id = auth.uid() AND o.status = 'completed'
    ), 0)::integer AS total_orders;
$$;