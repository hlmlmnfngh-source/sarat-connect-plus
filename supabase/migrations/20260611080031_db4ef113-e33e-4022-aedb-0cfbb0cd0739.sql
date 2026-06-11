-- Restrict access to sensitive financial columns on profiles
REVOKE SELECT (total_earnings, total_orders) ON public.profiles FROM anon, authenticated, PUBLIC;

-- Re-affirm execute permissions on the owner-only financials accessor
REVOKE EXECUTE ON FUNCTION public.get_my_financials() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_financials() TO authenticated;