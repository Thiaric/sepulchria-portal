-- Sepulchria Store — Phase 7 production commerce operations
-- Targets repository state based on master commit 4cb4e08.
begin;

alter table public.store_products
  add column if not exists paddle_product_id_sandbox text,
  add column if not exists paddle_product_id_live text,
  add column if not exists paddle_sync_status text not null default 'not_synced',
  add column if not exists paddle_sync_error text,
  add column if not exists paddle_synced_at timestamptz;

alter table public.store_product_prices
  add column if not exists paddle_price_id_sandbox text,
  add column if not exists paddle_price_id_live text,
  add column if not exists paddle_sync_status text not null default 'not_synced',
  add column if not exists paddle_sync_error text,
  add column if not exists paddle_synced_at timestamptz;

update public.store_product_prices
set paddle_price_id_sandbox = paddle_price_id
where paddle_price_id_sandbox is null
  and paddle_price_id is not null;

alter table public.store_orders
  add column if not exists cancelled_at timestamptz,
  add column if not exists refunded_at timestamptz;

alter table public.store_orders
  drop constraint if exists store_orders_status_check;

alter table public.store_orders
  add constraint store_orders_status_check
  check (status in (
    'pending',
    'paid',
    'fulfilled',
    'failed',
    'cancelled',
    'partially_refunded',
    'refunded'
  ));

create table if not exists public.store_price_region_overrides (
  id uuid primary key default gen_random_uuid(),
  price_id uuid not null references public.store_product_prices(id) on delete cascade,
  country_codes text[] not null,
  currency text not null,
  money_amount_minor integer not null check (money_amount_minor >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists store_price_region_overrides_price_idx
  on public.store_price_region_overrides(price_id);

create table if not exists public.store_paddle_sync_log (
  id uuid primary key default gen_random_uuid(),
  environment text not null check (environment in ('sandbox','production')),
  entity_type text not null check (entity_type in ('product','price','webhook','refund')),
  entity_id uuid,
  action text not null,
  status text not null check (status in ('success','error')),
  paddle_id text,
  message text,
  created_at timestamptz not null default now()
);

create index if not exists store_paddle_sync_log_created_idx
  on public.store_paddle_sync_log(created_at desc);

create table if not exists public.store_email_log (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.store_orders(id) on delete set null,
  kind text not null check (kind in ('receipt','refund')),
  recipient text not null,
  status text not null check (status in ('sent','skipped','error')),
  provider_message_id text,
  error text,
  created_at timestamptz not null default now()
);

create index if not exists store_email_log_order_idx
  on public.store_email_log(order_id, created_at desc);

alter table public.store_price_region_overrides enable row level security;
alter table public.store_paddle_sync_log enable row level security;
alter table public.store_email_log enable row level security;

commit;
