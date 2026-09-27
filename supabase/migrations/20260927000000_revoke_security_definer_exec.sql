-- Restrict SECURITY DEFINER helpers to internal execution paths.
REVOKE EXECUTE ON FUNCTION public.create_wallet_for_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.create_wallet_for_user() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.withdrawal_requests_guard_update() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.withdrawal_requests_guard_update() FROM anon, authenticated;
