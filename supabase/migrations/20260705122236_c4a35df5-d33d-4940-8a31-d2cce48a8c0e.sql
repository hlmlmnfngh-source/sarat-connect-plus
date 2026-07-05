CREATE OR REPLACE FUNCTION public.get_my_financials()
RETURNS TABLE(total_earnings numeric, total_orders integer)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT total_earnings, total_orders FROM public.profiles WHERE id = auth.uid();
$$;