
-- 1) service_packages: restrict public reads to active services only
DROP POLICY IF EXISTS packages_read_all ON public.service_packages;
CREATE POLICY packages_read_active_services ON public.service_packages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.services s
      WHERE s.id = service_packages.service_id
        AND (s.status = 'active' OR s.seller_id = auth.uid())
    )
  );

-- 2) proposals: split UPDATE policies and lock columns with a trigger
DROP POLICY IF EXISTS proposals_update_own ON public.proposals;

CREATE POLICY proposals_update_freelancer ON public.proposals
  FOR UPDATE TO authenticated
  USING (auth.uid() = freelancer_id AND status = 'pending')
  WITH CHECK (auth.uid() = freelancer_id AND status = 'pending');

CREATE POLICY proposals_update_buyer ON public.proposals
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = proposals.project_id AND p.buyer_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = proposals.project_id AND p.buyer_id = auth.uid()));

CREATE OR REPLACE FUNCTION public.proposals_guard_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  is_buyer boolean;
BEGIN
  -- Immutable identity columns for everyone
  IF NEW.project_id <> OLD.project_id OR NEW.freelancer_id <> OLD.freelancer_id THEN
    RAISE EXCEPTION 'Cannot change project_id or freelancer_id';
  END IF;

  SELECT EXISTS (SELECT 1 FROM public.projects p WHERE p.id = OLD.project_id AND p.buyer_id = auth.uid())
    INTO is_buyer;

  IF auth.uid() = OLD.freelancer_id THEN
    -- Freelancer may edit cover_letter, price, delivery_days, portfolio_samples while pending; may withdraw
    IF NEW.status NOT IN (OLD.status, 'withdrawn') THEN
      RAISE EXCEPTION 'Freelancer cannot change proposal status to %', NEW.status;
    END IF;
  ELSIF is_buyer THEN
    -- Buyer may only change status (accept/reject); cannot edit price or cover_letter
    IF NEW.price <> OLD.price
       OR NEW.cover_letter <> OLD.cover_letter
       OR NEW.delivery_days <> OLD.delivery_days
       OR NEW.portfolio_samples IS DISTINCT FROM OLD.portfolio_samples THEN
      RAISE EXCEPTION 'Buyer cannot modify proposal content fields';
    END IF;
  ELSE
    RAISE EXCEPTION 'Not authorized to update this proposal';
  END IF;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS proposals_guard_update_trg ON public.proposals;
CREATE TRIGGER proposals_guard_update_trg
  BEFORE UPDATE ON public.proposals
  FOR EACH ROW EXECUTE FUNCTION public.proposals_guard_update();

-- 3) reviews: verify reviewer is a party to a completed order
DROP POLICY IF EXISTS reviews_insert_own ON public.reviews;
CREATE POLICY reviews_insert_own ON public.reviews
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = reviewer_id
    AND EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = reviews.order_id
        AND (o.buyer_id = auth.uid() OR o.seller_id = auth.uid())
        AND o.status = 'completed'
        AND ((o.buyer_id = auth.uid() AND o.seller_id = reviews.reviewee_id)
          OR (o.seller_id = auth.uid() AND o.buyer_id = reviews.reviewee_id))
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
        AND (o.buyer_id = auth.uid() OR o.seller_id = auth.uid())
        AND o.status = 'completed'
    )
  );

-- 4) orders: column guard so buyer/seller can only update their relevant fields
CREATE OR REPLACE FUNCTION public.orders_guard_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- Identity columns are always immutable via this path
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
    -- Buyer may edit requirements and confirm completion
    IF NEW.delivered_at IS DISTINCT FROM OLD.delivered_at THEN
      RAISE EXCEPTION 'Buyer cannot change delivered_at';
    END IF;
    IF NEW.status NOT IN (OLD.status, 'completed', 'cancelled') THEN
      RAISE EXCEPTION 'Buyer cannot set status to %', NEW.status;
    END IF;
  ELSIF auth.uid() = OLD.seller_id THEN
    -- Seller may update status (delivered/in_progress) and delivered_at; not requirements
    IF NEW.requirements IS DISTINCT FROM OLD.requirements THEN
      RAISE EXCEPTION 'Seller cannot modify requirements';
    END IF;
  ELSE
    RAISE EXCEPTION 'Not a party to this order';
  END IF;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS orders_guard_update_trg ON public.orders;
CREATE TRIGGER orders_guard_update_trg
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.orders_guard_update();

-- 5) profiles: hide financial fields from public/general SELECT
REVOKE SELECT (total_earnings, total_orders) ON public.profiles FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_my_financials()
RETURNS TABLE(total_earnings numeric, total_orders integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT total_earnings, total_orders FROM public.profiles WHERE id = auth.uid();
$$;
GRANT EXECUTE ON FUNCTION public.get_my_financials() TO authenticated;
