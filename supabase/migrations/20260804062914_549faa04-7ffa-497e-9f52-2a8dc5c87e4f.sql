-- 1. Explicit UPDATE policy on conversations (defence in depth alongside the guard trigger)
DROP POLICY IF EXISTS convs_update_parties ON public.conversations;
CREATE POLICY convs_update_parties ON public.conversations
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_a OR auth.uid() = user_b)
  WITH CHECK (auth.uid() = user_a OR auth.uid() = user_b);

-- 2. Column-level lockdown on profiles: hide financial columns from public reads
REVOKE SELECT ON public.profiles FROM anon, authenticated;

GRANT SELECT (
  id, username, full_name, avatar_url, cover_url, bio, skills, languages,
  rating, reviews_count, is_verified, account_type, seller_level,
  response_time_hours, created_at, updated_at
) ON public.profiles TO anon, authenticated;

GRANT ALL ON public.profiles TO service_role;