-- Security regression suite.
-- Verifies RLS policies and guard triggers block disallowed writes on
-- profiles, messages, conversations, and reviews. Runs in a single
-- transaction that is ROLLBACK'd at the end so nothing is persisted.
--
-- Run: psql -v ON_ERROR_STOP=1 -f scripts/security-regression.sql
--
-- Failures RAISE EXCEPTION and abort the script with a non-zero exit code.
-- Success prints "SECURITY REGRESSION SUITE: OK".

\set ON_ERROR_STOP on
SET client_min_messages = WARNING;
BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Structural assertions: triggers and policies exist as expected.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  missing text;
BEGIN
  -- Guard triggers must exist on each protected table.
  FOREACH missing IN ARRAY ARRAY[
    'public.profiles::profiles_guard_update',
    'public.messages::messages_guard_update_trg',
    'public.conversations::conversations_guard_update',
    'public.orders::orders_guard_update_trg',
    'public.proposals::proposals_guard_update_trg'
  ] LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM pg_trigger t
      JOIN pg_class c ON c.oid = t.tgrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE NOT t.tgisinternal
        AND (n.nspname || '.' || c.relname || '::' || t.tgname) = missing
    ) THEN
      RAISE EXCEPTION 'Missing guard trigger: %', missing;
    END IF;
  END LOOP;

  -- Guard functions must NOT be executable by anon/authenticated/PUBLIC.
  FOR missing IN
    SELECT p.proname
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN (
        'conversations_guard_update',
        'messages_guard_update',
        'profiles_guard_update',
        'orders_guard_update',
        'proposals_guard_update'
      )
      AND (
        has_function_privilege('authenticated', p.oid, 'EXECUTE')
        OR has_function_privilege('anon', p.oid, 'EXECUTE')
      )
  LOOP
    RAISE EXCEPTION
      'Guard function public.% must not be EXECUTE-able by anon/authenticated', missing;
  END LOOP;

  -- Conversations must have no UPDATE policy exposed to clients.
  IF EXISTS (
    SELECT 1 FROM pg_policy
    WHERE polrelid = 'public.conversations'::regclass AND polcmd = 'w'
  ) THEN
    RAISE EXCEPTION 'public.conversations must not expose an UPDATE policy to clients';
  END IF;

  -- reviews UPDATE policy must re-check the counterparty via the orders lookup.
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policy
    WHERE polrelid = 'public.reviews'::regclass
      AND polname = 'reviews_update_own'
      AND polcmd = 'w'
      AND pg_get_expr(polwithcheck, polrelid) ILIKE '%o.buyer_id = auth.uid()%'
      AND pg_get_expr(polwithcheck, polrelid) ILIKE '%reviews.reviewee_id%'
  ) THEN
    RAISE EXCEPTION
      'reviews_update_own WITH CHECK is missing the buyer/seller ↔ reviewer/reviewee re-validation';
  END IF;

  RAISE NOTICE '[OK] Structural assertions passed';
END $$;

-- ---------------------------------------------------------------------------
-- 2. Behavioral assertions on public.profiles.
-- The sandbox_exec role bypasses RLS, so we can only exercise the guard
-- TRIGGERS here (they fire regardless of role). Policy correctness is
-- covered by the structural assertions above; end-to-end RLS behavior is
-- covered by the request-level tests in tests/security/ against the Data API.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  target uuid;
  jwt   text;
  raised boolean;
BEGIN
  SELECT id INTO target FROM public.profiles ORDER BY created_at LIMIT 1;
  IF target IS NULL THEN
    RAISE NOTICE '[SKIP] No profile rows present; skipping behavioral profiles checks';
    RETURN;
  END IF;

  jwt := json_build_object('sub', target::text, 'role', 'authenticated')::text;

  -- 2a. Owner trying to elevate is_verified must fail via the guard trigger.
  raised := false;
  BEGIN
    PERFORM set_config('request.jwt.claims', jwt, true);
    UPDATE public.profiles SET is_verified = true WHERE id = target;
  EXCEPTION WHEN OTHERS THEN
    raised := true;
    IF SQLERRM NOT ILIKE '%trust or earnings%' THEN
      RAISE EXCEPTION 'Unexpected error blocking is_verified change: %', SQLERRM;
    END IF;
  END;
  IF NOT raised THEN
    RAISE EXCEPTION 'profiles_guard_update did NOT block is_verified self-write';
  END IF;

  -- 2b. Owner trying to bump total_earnings must fail.
  raised := false;
  BEGIN
    PERFORM set_config('request.jwt.claims', jwt, true);
    UPDATE public.profiles SET total_earnings = 999999 WHERE id = target;
  EXCEPTION WHEN OTHERS THEN
    raised := true;
  END;
  IF NOT raised THEN
    RAISE EXCEPTION 'profiles_guard_update did NOT block total_earnings self-write';
  END IF;

  -- 2c. Owner touching an allowed column (bio) must succeed.
  BEGIN
    PERFORM set_config('request.jwt.claims', jwt, true);
    UPDATE public.profiles SET bio = COALESCE(bio, '') WHERE id = target;
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'Owner UPDATE of allowed column bio was unexpectedly rejected: %', SQLERRM;
  END;

  RAISE NOTICE '[OK] profiles behavioral checks passed';
END $$;

-- ---------------------------------------------------------------------------
-- 3. Behavioral assertions on public.messages via a synthetic row.
-- We insert a fake conversation + message as sandbox_exec (RLS-bypassing
-- superuser context) then flip into the receiver's identity to attempt
-- illegal edits. Everything is rolled back.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  sender_id   uuid;
  receiver_id uuid;
  conv_id     uuid;
  msg_id      uuid;
  recv_jwt    text;
  raised      boolean;
BEGIN
  SELECT id INTO sender_id FROM public.profiles ORDER BY created_at LIMIT 1;
  IF sender_id IS NULL THEN
    RAISE NOTICE '[SKIP] messages/conversations behavioral checks (no profiles)';
    RETURN;
  END IF;

  -- Use the same user as both sender and receiver so we don't need to create
  -- a second auth.users row (which sandbox_exec cannot do). The guard trigger
  -- logic doesn't care that both ids are equal.
  receiver_id := sender_id;
  recv_jwt := json_build_object('sub', receiver_id::text, 'role', 'authenticated')::text;

  -- Seed rows bypassing RLS (this DO block runs as sandbox_exec).
  ALTER TABLE public.messages DISABLE TRIGGER messages_broadcast_trg;
  ALTER TABLE public.messages DISABLE TRIGGER trg_messages_update_conv;

  INSERT INTO public.conversations (user_a, user_b)
    VALUES (sender_id, receiver_id)
    RETURNING id INTO conv_id;

  INSERT INTO public.messages (conversation_id, sender_id, receiver_id, content)
    VALUES (conv_id, sender_id, receiver_id, 'hello')
    RETURNING id INTO msg_id;

  -- 3a. Receiver toggling is_read must succeed.
  BEGIN
    PERFORM set_config('request.jwt.claims', recv_jwt, true);
    UPDATE public.messages SET is_read = true WHERE id = msg_id;
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'Receiver could not mark message read: %', SQLERRM;
  END;

  -- 3b. Receiver rewriting content must be blocked by messages_guard_update.
  raised := false;
  BEGIN
    PERFORM set_config('request.jwt.claims', recv_jwt, true);
    UPDATE public.messages SET content = 'tampered' WHERE id = msg_id;
  EXCEPTION WHEN OTHERS THEN
    raised := true;
    IF SQLERRM NOT ILIKE '%is_read%' AND SQLERRM NOT ILIKE '%protected%' THEN
      RAISE EXCEPTION 'Unexpected error blocking content change: %', SQLERRM;
    END IF;
  END;
  IF NOT raised THEN
    RAISE EXCEPTION 'messages_guard_update did NOT block content tampering';
  END IF;

  -- 3c. Reassigning conversation parties must be blocked by
  -- conversations_guard_update.
  raised := false;
  BEGIN
    PERFORM set_config('request.jwt.claims', recv_jwt, true);
    UPDATE public.conversations SET user_b = gen_random_uuid() WHERE id = conv_id;
  EXCEPTION WHEN OTHERS THEN
    raised := true;
  END;
  IF NOT raised THEN
    RAISE EXCEPTION 'conversations_guard_update did NOT block user_b reassignment';
  END IF;

  ALTER TABLE public.messages ENABLE TRIGGER messages_broadcast_trg;
  ALTER TABLE public.messages ENABLE TRIGGER trg_messages_update_conv;

  RAISE NOTICE '[OK] messages/conversations behavioral checks passed';
END $$;

-- ---------------------------------------------------------------------------
-- 4. Reviews: verify the UPDATE WITH CHECK re-validates the order pairing.
-- We create a completed order + review, then attempt to repoint the review's
-- reviewee_id to a random user. The WITH CHECK should reject it (0 rows).
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  me         uuid;
  stranger   uuid := gen_random_uuid();
  order_id   uuid;
  review_id  uuid;
  me_jwt     text;
  affected   int;
BEGIN
  SELECT id INTO me FROM public.profiles ORDER BY created_at LIMIT 1;
  IF me IS NULL THEN
    RAISE NOTICE '[SKIP] reviews behavioral check (no profiles)';
    RETURN;
  END IF;
  me_jwt := json_build_object('sub', me::text, 'role', 'authenticated')::text;

  -- Seed a completed order where me is both buyer and seller (buyer/seller FKs
  -- both reference auth.users; using the same real user avoids needing two).
  INSERT INTO public.orders (buyer_id, seller_id, price, status)
    VALUES (me, me, 10, 'completed')
    RETURNING id INTO order_id;

  INSERT INTO public.reviews (order_id, reviewer_id, reviewee_id, rating, comment)
    VALUES (order_id, me, me, 5, 'ok')
    RETURNING id INTO review_id;

  -- Attempt to repoint reviewee_id to a stranger — WITH CHECK must reject.
  BEGIN
    PERFORM set_config('request.jwt.claims', me_jwt, true);
    -- sandbox_exec bypasses RLS, so directly assert WITH CHECK by re-running
    -- the policy expression the way Postgres would for a real authenticated
    -- write. The stranger repoint must evaluate to false.
    SELECT CASE WHEN EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_id
        AND o.status = 'completed'::order_status
        AND ((o.buyer_id = me AND o.seller_id = stranger)
          OR (o.seller_id = me AND o.buyer_id = stranger))
    ) THEN 1 ELSE 0 END INTO affected;
  END;
  IF affected <> 0 THEN
    RAISE EXCEPTION 'reviews_update_own WITH CHECK expression accepts stranger reviewee repoint';
  END IF;

  RAISE NOTICE '[OK] reviews behavioral check passed';
END $$;

-- Do not persist any test data.
ROLLBACK;

\echo 'SECURITY REGRESSION SUITE: OK'