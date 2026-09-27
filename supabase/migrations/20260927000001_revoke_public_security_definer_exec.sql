-- Keep these explicit PUBLIC revokes for databases upgraded from older grants.
REVOKE EXECUTE ON FUNCTION public.create_wallet_for_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.withdrawal_requests_guard_update() FROM PUBLIC;
