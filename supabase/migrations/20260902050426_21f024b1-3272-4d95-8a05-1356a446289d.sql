CREATE OR REPLACE FUNCTION public.orders_guard_update()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.id <> OLD.id
     OR NEW.buyer_id <> OLD.buyer_id
     OR NEW.seller_id <> OLD.seller_id
     OR NEW.service_id IS DISTINCT FROM OLD.service_id
     OR NEW.project_id IS DISTINCT FROM OLD.project_id
     OR NEW.price <> OLD.price
     OR NEW.package_type IS DISTINCT FROM OLD.package_type
     OR NEW.created_at <> OLD.created_at THEN
    RAISE EXCEPTION 'Cannot modify protected order fields';
  END IF;

  IF auth.uid() = OLD.buyer_id THEN
    IF NEW.delivered_at IS DISTINCT FROM OLD.delivered_at THEN
      RAISE EXCEPTION 'Buyer cannot change delivered_at';
    END IF;
    IF NEW.status NOT IN (OLD.status, 'completed', 'cancelled') THEN
      RAISE EXCEPTION 'Buyer cannot set status to %', NEW.status;
    END IF;
    IF NEW.status = 'completed' AND OLD.status <> 'completed' THEN
      IF OLD.status <> 'delivered' THEN
        RAISE EXCEPTION 'Order must be delivered before it can be completed';
      END IF;
      IF OLD.paid_at IS NULL THEN
        RAISE EXCEPTION 'Order must have a recorded payment before it can be completed';
      END IF;
    END IF;
  ELSIF auth.uid() = OLD.seller_id THEN
    IF NEW.requirements IS DISTINCT FROM OLD.requirements THEN
      RAISE EXCEPTION 'Seller cannot modify requirements';
    END IF;
  ELSE
    RAISE EXCEPTION 'Not a party to this order';
  END IF;

  RETURN NEW;
END $function$;

DROP POLICY IF EXISTS reviews_insert_own ON public.reviews;
CREATE POLICY reviews_insert_own ON public.reviews
FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = reviewer_id
  AND review_type = ANY (ARRAY['buyer_to_seller'::text, 'seller_to_buyer'::text])
  AND EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = reviews.order_id
      AND o.status = 'completed'::order_status
      AND o.paid_at IS NOT NULL
      AND (
        (o.buyer_id = auth.uid() AND o.seller_id = reviews.reviewee_id AND reviews.review_type = 'buyer_to_seller')
        OR (o.seller_id = auth.uid() AND o.buyer_id = reviews.reviewee_id AND reviews.review_type = 'seller_to_buyer')
      )
  )
);

DROP POLICY IF EXISTS reviews_update_own ON public.reviews;
CREATE POLICY reviews_update_own ON public.reviews
FOR UPDATE TO authenticated
USING (auth.uid() = reviewer_id)
WITH CHECK (
  auth.uid() = reviewer_id
  AND EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = reviews.order_id
      AND o.status = 'completed'::order_status
      AND o.paid_at IS NOT NULL
      AND (
        (o.buyer_id = auth.uid() AND o.seller_id = reviews.reviewee_id AND reviews.review_type = 'buyer_to_seller')
        OR (o.seller_id = auth.uid() AND o.buyer_id = reviews.reviewee_id AND reviews.review_type = 'seller_to_buyer')
      )
  )
);