create table if not exists public.order_deliveries (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  seller_id uuid not null references auth.users(id) on delete cascade,
  message text not null,
  attachments text[] default '{}',
  created_at timestamptz not null default now()
);
create table if not exists public.order_revisions (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  requested_by uuid not null references auth.users(id) on delete cascade,
  message text not null,
  created_at timestamptz not null default now()
);
create index if not exists order_deliveries_order_id_idx on public.order_deliveries(order_id, created_at desc);
create index if not exists order_revisions_order_id_idx on public.order_revisions(order_id, created_at desc);
alter table public.order_deliveries enable row level security;
alter table public.order_revisions enable row level security;
create policy order_deliveries_read_parties on public.order_deliveries for select using (exists (select 1 from public.orders o where o.id=order_deliveries.order_id and (auth.uid()=o.buyer_id or auth.uid()=o.seller_id)));
create policy order_revisions_read_parties on public.order_revisions for select using (exists (select 1 from public.orders o where o.id=order_revisions.order_id and (auth.uid()=o.buyer_id or auth.uid()=o.seller_id)));
create policy order_deliveries_insert_seller on public.order_deliveries for insert with check (auth.uid()=seller_id and exists (select 1 from public.orders o where o.id=order_deliveries.order_id and o.seller_id=auth.uid() and o.status='active'));
create policy order_revisions_insert_buyer on public.order_revisions for insert with check (auth.uid()=requested_by and exists (select 1 from public.orders o where o.id=order_revisions.order_id and o.buyer_id=auth.uid() and o.status='delivered'));
create policy order_deliveries_update_seller on public.order_deliveries for update using (auth.uid()=seller_id) with check (auth.uid()=seller_id);
create policy order_revisions_update_buyer on public.order_revisions for update using (auth.uid()=requested_by) with check (auth.uid()=requested_by);