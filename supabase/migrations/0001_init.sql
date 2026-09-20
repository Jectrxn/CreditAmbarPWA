-- CreditAmbar PWA — initial schema
-- Run in Supabase Dashboard → SQL Editor (fresh project).
-- Notes:
-- * IDs are TEXT (not uuid): the offline-first client generates local ids
--   like 'store-default', 'cust-...', 'tx-...' before ever reaching the cloud.
-- * No hard FK constraints: offline rows may reference a store/customer that
--   syncs a few seconds later; FKs would reject valid out-of-order batches.
-- * RLS is ENABLED with permissive anon policies because the app syncs with
--   the ANON key from a shared device (no per-user auth identity yet).
--   TRADEOFF: anyone holding the anon key can read/write these tables.
--   Harden later with Supabase Auth + store_id-scoped policies.

-- ─── profiles ───
create table if not exists public.profiles (
  id text primary key,
  store_name text not null,
  created_at timestamptz not null default now()
);

-- ─── customers ───
create table if not exists public.customers (
  id text primary key,
  store_id text not null,
  name text not null,
  phone text,
  credit_limit numeric not null default 100,
  balance numeric not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists customers_store_id_idx on public.customers (store_id);

-- ─── products ───
create table if not exists public.products (
  id text primary key,
  store_id text not null,
  name text not null,
  price numeric not null default 0,
  sku text,
  created_at timestamptz not null default now()
);
create index if not exists products_store_id_idx on public.products (store_id);
create index if not exists products_name_idx on public.products (name);

-- ─── credit_transactions ───
create table if not exists public.credit_transactions (
  id text primary key,
  store_id text not null,
  customer_id text not null,
  cashier_pin_hash text not null default 'mostrador',
  total_amount numeric not null,
  status text not null default 'completed',
  created_at timestamptz not null default now(),
  synced boolean not null default false,
  type text,
  payment_method text,
  cashier_session_id text,
  edit_reason text,
  updated_at timestamptz,
  notes text
);
create index if not exists credit_transactions_store_id_idx on public.credit_transactions (store_id);
create index if not exists credit_transactions_customer_id_idx on public.credit_transactions (customer_id);

-- ─── transaction_items ───
create table if not exists public.transaction_items (
  id text primary key,
  transaction_id text not null,
  product_id text not null,
  quantity numeric not null default 1,
  unit_price numeric not null default 0
);
create index if not exists transaction_items_transaction_id_idx on public.transaction_items (transaction_id);

-- ─── RLS: enabled + permissive anon (shared-device sync) ───
alter table public.profiles enable row level security;
alter table public.customers enable row level security;
alter table public.products enable row level security;
alter table public.credit_transactions enable row level security;
alter table public.transaction_items enable row level security;

do $$
declare t text;
begin
  foreach t in array array['profiles','customers','products','credit_transactions','transaction_items'] loop
    execute format('drop policy if exists %I on public.%I', 'anon_all_' || t, t);
    execute format(
      'create policy %I on public.%I for all to anon using (true) with check (true)',
      'anon_all_' || t, t
    );
  end loop;
end $$;

-- ─── seed: default store used by the offline client fallback ───
insert into public.profiles (id, store_name)
values ('store-default', 'Ámbar Bodega')
on conflict (id) do nothing;
