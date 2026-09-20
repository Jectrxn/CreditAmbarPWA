-- CreditAmbar PWA — test-mode partition seeds (T4)
-- Run in Supabase Dashboard → SQL Editor. The user runs this manually;
-- no app code executes against the remote database.
-- * 'ambar-store-1' is the real store the app sessions as (see App.tsx).
-- * 'store-test' is the isolated store used while test mode is active.
-- * on conflict (id) do nothing: safe to re-run.

insert into public.profiles (id, store_name)
values
  ('ambar-store-1', 'Ámbar Bodega'),
  ('store-test', 'Ámbar Test Lab')
on conflict (id) do nothing;
