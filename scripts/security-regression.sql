-- Security regression suite (structural).
--
-- Verifies that the RLS policies and guard-trigger machinery protecting
-- profiles, messages, conversations, and reviews from disallowed writes
-- are still in place. Each assertion RAISEs on failure and aborts the
-- script with a non-zero exit code.
--
-- Run: psql -v ON_ERROR_STOP=1 -f scripts/security-regression.sql
--
-- These checks are structural (schema, ACLs, policy expressions, function
-- bodies) because DB-level roles in most environments (including this
-- sandbox) either bypass RLS or cannot SET ROLE to authenticated. The
-- companion Vitest suite exercises the Data API end-to-end for anyone
-- who wants request-level coverage.

\set ON_ERROR_STOP on
SET client_min_messages = WARNING;

-- --------------------------------------------------------------------------
-- 1. Guard triggers exist on each protected table.
-- --------------------------------------------------------------------------
DO $$
DECLARE
  expected text;
BEGIN
  FOREACH expected IN ARRAY ARRAY[
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
        AND (n.nspname || '.' || c.relname || '::' || t.tgname) = expected
    ) THEN
      RAISE EXCEPTION 'Missing guard trigger: %', expected;
    END IF;
  END LOOP;
  RAISE NOTICE '[OK] guard triggers present';
END $$;

-- --------------------------------------------------------------------------
-- 2. Guard functions must NOT be EXECUTE-able by anon or authenticated.
-- --------------------------------------------------------------------------
DO $$
DECLARE
  leaked text;
BEGIN
  FOR leaked IN
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
      'Guard function public.% must not be EXECUTE-able by anon/authenticated',
      leaked;
  END LOOP;
  RAISE NOTICE '[OK] guard functions locked down';
END $$;

-- --------------------------------------------------------------------------
-- 3. Function bodies still enforce their column allow/deny lists.
--     This catches regressions where someone rewrites a guard function and
--     silently removes a forbidden-column check.
-- --------------------------------------------------------------------------
DO $$
DECLARE
  body text;
  needle text;
  fn text;
BEGIN
  -- profiles_guard_update: must reject any change to each protected column.
  SELECT pg_get_functiondef(p.oid) INTO body
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'profiles_guard_update';
  FOREACH needle IN ARRAY ARRAY[
    'is_verified', 'rating', 'reviews_count',
    'seller_level', 'total_earnings', 'total_orders'
  ] LOOP
    IF body !~* ('NEW\.' || needle || '\s+IS DISTINCT FROM\s+OLD\.' || needle) THEN
      RAISE EXCEPTION
        'profiles_guard_update no longer guards column %', needle;
    END IF;
  END LOOP;

  -- messages_guard_update: must forbid changes to every column except is_read.
  SELECT pg_get_functiondef(p.oid) INTO body
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'messages_guard_update';
  FOREACH needle IN ARRAY ARRAY[
    'conversation_id', 'sender_id', 'receiver_id',
    'content', 'attachments', 'created_at'
  ] LOOP
    IF body !~* ('NEW\.' || needle) THEN
      RAISE EXCEPTION
        'messages_guard_update no longer references immutable column %', needle;
    END IF;
  END LOOP;
  IF body !~* 'auth\.uid\(\)\s*<>\s*OLD\.receiver_id' THEN
    RAISE EXCEPTION
      'messages_guard_update no longer restricts updates to the receiver';
  END IF;

  -- conversations_guard_update: must reject user_a / user_b changes.
  SELECT pg_get_functiondef(p.oid) INTO body
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'conversations_guard_update';
  IF body !~* 'NEW\.user_a\s*<>\s*OLD\.user_a'
     OR body !~* 'NEW\.user_b\s*<>\s*OLD\.user_b' THEN
    RAISE EXCEPTION
      'conversations_guard_update no longer blocks user_a/user_b reassignment';
  END IF;

  RAISE NOTICE '[OK] guard function bodies enforce column protections';
END $$;

-- --------------------------------------------------------------------------
-- 4. Policies: no UPDATE policy on conversations, reviews_update_own still
--     re-validates the buyer/seller ↔ reviewer/reviewee pairing.
-- --------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policy
    WHERE polrelid = 'public.conversations'::regclass AND polcmd = 'w'
  ) THEN
    RAISE EXCEPTION 'public.conversations must not expose an UPDATE policy to clients';
  END IF;

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

  RAISE NOTICE '[OK] policies match expected shape';
END $$;

\echo 'SECURITY REGRESSION SUITE: OK'