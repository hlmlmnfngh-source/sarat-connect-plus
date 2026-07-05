
-- 1) conversations: block reassignment of parties
CREATE OR REPLACE FUNCTION public.conversations_guard_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.user_a <> OLD.user_a OR NEW.user_b <> OLD.user_b OR NEW.id <> OLD.id THEN
    RAISE EXCEPTION 'Cannot change conversation participants';
  END IF;
  IF auth.uid() <> OLD.user_a AND auth.uid() <> OLD.user_b THEN
    RAISE EXCEPTION 'Not a party to this conversation';
  END IF;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.conversations_guard_update() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS conversations_guard_update ON public.conversations;
CREATE TRIGGER conversations_guard_update
  BEFORE UPDATE ON public.conversations
  FOR EACH ROW EXECUTE FUNCTION public.conversations_guard_update();

-- 2) messages: receiver may only toggle is_read (existing guard allows nothing to change; relax to allow is_read)
CREATE OR REPLACE FUNCTION public.messages_guard_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() <> OLD.receiver_id THEN
    RAISE EXCEPTION 'Only the receiver can update this message';
  END IF;
  IF NEW.id <> OLD.id
     OR NEW.conversation_id <> OLD.conversation_id
     OR NEW.sender_id <> OLD.sender_id
     OR NEW.receiver_id <> OLD.receiver_id
     OR NEW.content <> OLD.content
     OR NEW.attachments IS DISTINCT FROM OLD.attachments
     OR NEW.created_at <> OLD.created_at THEN
    RAISE EXCEPTION 'Receiver may only update the is_read flag';
  END IF;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.messages_guard_update() FROM PUBLIC, anon, authenticated;

-- 3) profiles: block self-writes to trust/earnings fields
CREATE OR REPLACE FUNCTION public.profiles_guard_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> OLD.id THEN
    -- allow service_role / triggers bypassing auth context
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
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.profiles_guard_update() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS profiles_guard_update ON public.profiles;
CREATE TRIGGER profiles_guard_update
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.profiles_guard_update();

-- 4) reviews: tighten UPDATE WITH CHECK to match INSERT pairing
DROP POLICY IF EXISTS reviews_update_own ON public.reviews;
CREATE POLICY reviews_update_own ON public.reviews
  FOR UPDATE TO authenticated
  USING (auth.uid() = reviewer_id)
  WITH CHECK (
    auth.uid() = reviewer_id AND EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = reviews.order_id
        AND o.status = 'completed'::order_status
        AND (
          (o.buyer_id = auth.uid() AND o.seller_id = reviews.reviewee_id)
          OR (o.seller_id = auth.uid() AND o.buyer_id = reviews.reviewee_id)
        )
    )
  );
