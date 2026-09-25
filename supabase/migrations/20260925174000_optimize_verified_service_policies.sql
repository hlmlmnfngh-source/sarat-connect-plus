drop policy if exists services_insert_own on public.services;
create policy services_insert_own on public.services for insert to authenticated
with check (
  (select auth.uid()) = seller_id
  and (
    status <> 'active'
    or exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.email_verified = true and p.verification_status = 'approved' and p.stripe_onboarded = true)
  )
);
drop policy if exists services_update_own on public.services;
create policy services_update_own on public.services for update to authenticated
using ((select auth.uid()) = seller_id)
with check (
  (select auth.uid()) = seller_id
  and (
    status <> 'active'
    or exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.email_verified = true and p.verification_status = 'approved' and p.stripe_onboarded = true)
  )
);