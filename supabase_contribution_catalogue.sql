-- Sepulchria separate Contributions catalogue.
-- Run AFTER the original supabase_contributions.sql.

create table if not exists public.support_contribution_products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text not null default '',
  image_url text null,
  tax_code text not null,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  stripe_product_id_test text unique null,
  stripe_product_id_live text unique null,
  stripe_sync_status text not null default 'pending'
    check (stripe_sync_status in ('pending','synced','error')),
  stripe_sync_error text null,
  stripe_synced_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.support_contribution_prices (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.support_contribution_products(id) on delete cascade,
  currency text not null default 'GBP',
  amount_minor integer not null check (amount_minor > 0),
  is_active boolean not null default true,
  sort_order integer not null default 0,
  stripe_price_id_test text unique null,
  stripe_price_id_live text unique null,
  stripe_sync_status text not null default 'pending'
    check (stripe_sync_status in ('pending','synced','error')),
  stripe_sync_error text null,
  stripe_synced_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.support_contributions
  add column if not exists product_id uuid null
    references public.support_contribution_products(id);

alter table public.support_contributions
  add column if not exists price_id uuid null
    references public.support_contribution_prices(id);

create index if not exists support_contribution_products_sort_idx
  on public.support_contribution_products(sort_order, name);

create index if not exists support_contribution_prices_product_idx
  on public.support_contribution_prices(product_id, sort_order);

alter table public.support_contribution_products enable row level security;
alter table public.support_contribution_prices enable row level security;
