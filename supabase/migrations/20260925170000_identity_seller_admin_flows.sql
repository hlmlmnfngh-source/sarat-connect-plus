-- Identity, seller onboarding, payouts, and moderation support.
alter table public.profiles
  add column if not exists email_verified boolean not null default false,
  add column if not exists verification_status text not null default 'pending',
  add column if not exists identity_document_path text,
  add column if not exists verification_notes text,
  add column if not exists verification_submitted_at timestamptz,
  add column if not exists verification_reviewed_at timestamptz,
  add column if not exists years_experience integer,
  add column if not exists stripe_account_id text,
  add column if not exists stripe_charges_enabled boolean not null default false,
  add column if not exists stripe_payouts_enabled boolean not null default false,
  add column if not exists stripe_onboarded boolean not null default false,
  add column if not exists portfolio_samples text[] not null default '{}';

alter table public.profiles
  drop constraint if exists profiles_verification_status_check;
alter table public.profiles
  add constraint profiles_verification_status_check
  check (verification_status in ('pending','approved','rejected'));

alter table public.services
  add column if not exists moderation_note text,
  add column if not exists reviewed_at timestamptz,
  add column if not exists reviewed_by uuid references auth.users(id);

create index if not exists profiles_verification_status_idx on public.profiles(verification_status);
create index if not exists services_reviewed_at_idx on public.services(reviewed_at);

-- Private identity-document bucket.
insert into storage.buckets (id, name, public)
values ('id-verification', 'id-verification', false)
on conflict (id) do update set public = false;

drop policy if exists id_verification_read_own on storage.objects;
create policy id_verification_read_own
on storage.objects for select
to authenticated
using (
  bucket_id = 'id-verification'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

drop policy if exists id_verification_insert_own on storage.objects;
create policy id_verification_insert_own
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'id-verification'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

drop policy if exists id_verification_update_own on storage.objects;
create policy id_verification_update_own
on storage.objects for update
to authenticated
using (
  bucket_id = 'id-verification'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
)
with check (
  bucket_id = 'id-verification'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

drop policy if exists id_verification_delete_own on storage.objects;
create policy id_verification_delete_own
on storage.objects for delete
to authenticated
using (
  bucket_id = 'id-verification'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

-- Prevent ordinary users from approving themselves or changing payout verification.
create or replace function public.protect_sensitive_profile_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  is_staff boolean;
begin
  is_staff := exists (
    select 1 from public.user_roles
    where user_id = auth.uid()
      and role in ('admin','moderator')
  );

  if auth.uid() is not null and not is_staff then
    if new.verification_status is distinct from old.verification_status
       and new.verification_status <> 'pending' then
      new.verification_status := old.verification_status;
    end if;
    if new.is_verified is distinct from old.is_verified then
      new.is_verified := old.is_verified;
    end if;
    if new.verification_notes is distinct from old.verification_notes then
      new.verification_notes := old.verification_notes;
    end if;
    if new.verification_reviewed_at is distinct from old.verification_reviewed_at then
      new.verification_reviewed_at := old.verification_reviewed_at;
    end if;
    if new.stripe_account_id is distinct from old.stripe_account_id then
      new.stripe_account_id := old.stripe_account_id;
    end if;
    if new.stripe_charges_enabled is distinct from old.stripe_charges_enabled then
      new.stripe_charges_enabled := old.stripe_charges_enabled;
    end if;
    if new.stripe_payouts_enabled is distinct from old.stripe_payouts_enabled then
      new.stripe_payouts_enabled := old.stripe_payouts_enabled;
    end if;
    if new.stripe_onboarded is distinct from old.stripe_onboarded then
      new.stripe_onboarded := old.stripe_onboarded;
    end if;
    if new.identity_document_path is distinct from old.identity_document_path then
      new.verification_status := 'pending';
      new.verification_submitted_at := now();
      new.verification_reviewed_at := null;
      new.verification_notes := null;
      new.is_verified := false;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_sensitive_profile_fields on public.profiles;
create trigger protect_sensitive_profile_fields
before update on public.profiles
for each row execute function public.protect_sensitive_profile_fields();


-- Active services require the seller to have a confirmed email, approved identity, and payout account.
drop policy if exists services_insert_own on public.services;
create policy services_insert_own on public.services
for insert to authenticated
with check (
  auth.uid() = seller_id
  and (
    status <> 'active'
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.email_verified = true
        and p.verification_status = 'approved'
        and p.stripe_onboarded = true
    )
  )
);

drop policy if exists services_update_own on public.services;
create policy services_update_own on public.services
for update to authenticated
using (auth.uid() = seller_id)
with check (
  auth.uid() = seller_id
  and (
    status <> 'active'
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.email_verified = true
        and p.verification_status = 'approved'
        and p.stripe_onboarded = true
    )
  )
);
