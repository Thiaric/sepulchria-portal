-- Sepulchria Store — Phase 1 foundation
-- Generated 2026-09-06
-- Products, bundles, real-money/Remnant prices, orders,
-- discount codes, post-purchase discounts and entitlement grants.

begin;
create extension if not exists pgcrypto;

create table if not exists public.store_products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text not null default '',
  image_url text,
  product_type text not null default 'single' check (product_type in ('single','bundle')),
  category text not null check (category in ('skin','cosmetic','friend_list','private_location','bundle')),
  is_active boolean not null default true,
  is_featured boolean not null default false,
  sort_order integer not null default 0,
  available_from timestamptz,
  available_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint store_products_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint store_products_bundle_category check (
    (product_type='bundle' and category='bundle') or
    (product_type='single' and category<>'bundle')
  ),
  constraint store_products_availability_window check (
    available_from is null or available_until is null or available_until > available_from
  )
);
create index if not exists store_products_active_sort_idx on public.store_products (is_active,sort_order,name);
create index if not exists store_products_category_idx on public.store_products (category,is_active);

create table if not exists public.store_product_grants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.store_products(id) on delete cascade,
  grant_type text not null check (grant_type in ('portal_skin','cosmetic','feature')),
  portal_skin_id uuid references public.portal_skins(id) on delete restrict,
  cosmetic_item_id uuid references public.cosmetic_items(id) on delete restrict,
  feature_key text,
  quantity integer not null default 1 check (quantity > 0),
  created_at timestamptz not null default now(),
  constraint store_product_grants_target_check check (
    (grant_type='portal_skin' and portal_skin_id is not null and cosmetic_item_id is null and feature_key is null) or
    (grant_type='cosmetic' and portal_skin_id is null and cosmetic_item_id is not null and feature_key is null) or
    (grant_type='feature' and portal_skin_id is null and cosmetic_item_id is null and feature_key in ('friend_list','private_chat'))
  )
);
create index if not exists store_product_grants_product_idx on public.store_product_grants(product_id);
create unique index if not exists store_product_grants_skin_unique on public.store_product_grants(product_id,portal_skin_id) where portal_skin_id is not null;
create unique index if not exists store_product_grants_cosmetic_unique on public.store_product_grants(product_id,cosmetic_item_id) where cosmetic_item_id is not null;
create unique index if not exists store_product_grants_feature_unique on public.store_product_grants(product_id,feature_key) where feature_key is not null;

create table if not exists public.store_product_prices (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.store_products(id) on delete cascade,
  currency text,
  money_amount_minor integer,
  remnants_amount bigint,
  paddle_price_id text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint store_product_prices_currency_format check (currency is null or currency ~ '^[A-Z]{3}$'),
  constraint store_product_prices_money_pair check ((currency is null and money_amount_minor is null) or (currency is not null and money_amount_minor is not null)),
  constraint store_product_prices_money_nonnegative check (money_amount_minor is null or money_amount_minor >= 0),
  constraint store_product_prices_remnants_nonnegative check (remnants_amount is null or remnants_amount >= 0),
  constraint store_product_prices_has_price check (money_amount_minor is not null or remnants_amount is not null)
);
create unique index if not exists store_product_prices_money_unique on public.store_product_prices(product_id,currency) where currency is not null;
create unique index if not exists store_product_prices_remnants_unique on public.store_product_prices(product_id) where remnants_amount is not null;
create unique index if not exists store_product_prices_paddle_unique on public.store_product_prices(paddle_price_id) where paddle_price_id is not null;

create table if not exists public.store_discount_codes (
  id uuid primary key default gen_random_uuid(),
  code text unique,
  name text not null,
  description text not null default '',
  discount_type text not null check (discount_type in ('percentage','fixed_money','fixed_remnants')),
  discount_value integer not null check (discount_value > 0),
  currency text,
  scope_type text not null default 'all' check (scope_type in ('all','products','category')),
  scope_category text check (scope_category is null or scope_category in ('skin','cosmetic','friend_list','private_location','bundle')),
  starts_at timestamptz,
  ends_at timestamptz,
  max_redemptions integer check (max_redemptions is null or max_redemptions > 0),
  max_redemptions_per_user integer not null default 1 check (max_redemptions_per_user > 0),
  minimum_money_minor integer check (minimum_money_minor is null or minimum_money_minor >= 0),
  minimum_remnants bigint check (minimum_remnants is null or minimum_remnants >= 0),
  is_public boolean not null default true,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint store_discount_codes_percentage_limit check (discount_type <> 'percentage' or discount_value between 1 and 100),
  constraint store_discount_codes_currency_rule check ((discount_type='fixed_money' and currency ~ '^[A-Z]{3}$') or (discount_type<>'fixed_money' and currency is null)),
  constraint store_discount_codes_scope_rule check ((scope_type='category' and scope_category is not null) or (scope_type<>'category' and scope_category is null)),
  constraint store_discount_codes_dates check (starts_at is null or ends_at is null or ends_at > starts_at),
  constraint store_discount_codes_public_code_rule check ((is_public=true and code is not null) or is_public=false)
);
create index if not exists store_discount_codes_active_idx on public.store_discount_codes(is_active,starts_at,ends_at);
create index if not exists store_discount_codes_code_upper_idx on public.store_discount_codes(upper(code)) where code is not null;

create table if not exists public.store_discount_code_products (
  discount_code_id uuid not null references public.store_discount_codes(id) on delete cascade,
  product_id uuid not null references public.store_products(id) on delete cascade,
  primary key (discount_code_id,product_id)
);

create table if not exists public.store_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete restrict,
  character_id uuid not null references public.characters(id) on delete restrict,
  status text not null default 'pending' check (status in ('pending','paid','fulfilled','failed','cancelled','refunded','partially_refunded')),
  payment_method text not null check (payment_method in ('paddle','remnants')),
  currency text,
  subtotal_money_minor integer not null default 0 check (subtotal_money_minor >= 0),
  discount_money_minor integer not null default 0 check (discount_money_minor >= 0),
  total_money_minor integer not null default 0 check (total_money_minor >= 0),
  subtotal_remnants bigint not null default 0 check (subtotal_remnants >= 0),
  discount_remnants bigint not null default 0 check (discount_remnants >= 0),
  total_remnants bigint not null default 0 check (total_remnants >= 0),
  discount_code_id uuid references public.store_discount_codes(id) on delete set null,
  paddle_transaction_id text,
  paddle_customer_id text,
  paddle_checkout_id text,
  created_at timestamptz not null default now(),
  paid_at timestamptz,
  fulfilled_at timestamptz,
  cancelled_at timestamptz,
  refunded_at timestamptz,
  constraint store_orders_currency_format check (currency is null or currency ~ '^[A-Z]{3}$'),
  constraint store_orders_payment_totals check (
    (payment_method='paddle' and currency is not null and total_remnants=0) or
    (payment_method='remnants' and currency is null and total_money_minor=0)
  ),
  constraint store_orders_money_math check (subtotal_money_minor - discount_money_minor = total_money_minor),
  constraint store_orders_remnant_math check (subtotal_remnants - discount_remnants = total_remnants)
);
create index if not exists store_orders_user_created_idx on public.store_orders(user_id,created_at desc);
create index if not exists store_orders_character_created_idx on public.store_orders(character_id,created_at desc);
create index if not exists store_orders_status_idx on public.store_orders(status,created_at);
create unique index if not exists store_orders_paddle_transaction_unique on public.store_orders(paddle_transaction_id) where paddle_transaction_id is not null;

create table if not exists public.store_order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.store_orders(id) on delete cascade,
  product_id uuid references public.store_products(id) on delete set null,
  product_slug_snapshot text not null,
  product_name_snapshot text not null,
  product_type_snapshot text not null,
  category_snapshot text not null,
  quantity integer not null default 1 check (quantity > 0),
  unit_money_minor_snapshot integer check (unit_money_minor_snapshot is null or unit_money_minor_snapshot >= 0),
  total_money_minor_snapshot integer check (total_money_minor_snapshot is null or total_money_minor_snapshot >= 0),
  unit_remnants_snapshot bigint check (unit_remnants_snapshot is null or unit_remnants_snapshot >= 0),
  total_remnants_snapshot bigint check (total_remnants_snapshot is null or total_remnants_snapshot >= 0),
  created_at timestamptz not null default now()
);
create index if not exists store_order_items_order_idx on public.store_order_items(order_id);

create table if not exists public.store_order_grants (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.store_orders(id) on delete cascade,
  order_item_id uuid not null references public.store_order_items(id) on delete cascade,
  grant_type text not null check (grant_type in ('portal_skin','cosmetic','feature')),
  portal_skin_id uuid references public.portal_skins(id) on delete restrict,
  cosmetic_item_id uuid references public.cosmetic_items(id) on delete restrict,
  feature_key text,
  quantity integer not null default 1 check (quantity > 0),
  fulfilled_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  constraint store_order_grants_target_check check (
    (grant_type='portal_skin' and portal_skin_id is not null and cosmetic_item_id is null and feature_key is null) or
    (grant_type='cosmetic' and portal_skin_id is null and cosmetic_item_id is not null and feature_key is null) or
    (grant_type='feature' and portal_skin_id is null and cosmetic_item_id is null and feature_key in ('friend_list','private_chat'))
  )
);
create index if not exists store_order_grants_order_idx on public.store_order_grants(order_id);
create index if not exists store_order_grants_unfulfilled_idx on public.store_order_grants(order_id,fulfilled_at) where fulfilled_at is null;

create table if not exists public.store_discount_redemptions (
  id uuid primary key default gen_random_uuid(),
  discount_code_id uuid not null references public.store_discount_codes(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete restrict,
  order_id uuid not null unique references public.store_orders(id) on delete restrict,
  redeemed_at timestamptz not null default now()
);
create index if not exists store_discount_redemptions_code_idx on public.store_discount_redemptions(discount_code_id,redeemed_at);
create index if not exists store_discount_redemptions_user_idx on public.store_discount_redemptions(user_id,discount_code_id);

create table if not exists public.store_post_purchase_offers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null default '',
  trigger_product_id uuid references public.store_products(id) on delete cascade,
  trigger_category text check (trigger_category is null or trigger_category in ('skin','cosmetic','friend_list','private_location','bundle')),
  discount_code_template_id uuid not null references public.store_discount_codes(id) on delete restrict,
  valid_for_days integer not null default 14 check (valid_for_days > 0),
  is_active boolean not null default true,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint store_post_purchase_offer_trigger check (trigger_product_id is not null or trigger_category is not null),
  constraint store_post_purchase_offer_dates check (starts_at is null or ends_at is null or ends_at > starts_at)
);

create table if not exists public.store_user_discount_codes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete restrict,
  discount_code_id uuid not null references public.store_discount_codes(id) on delete restrict,
  post_purchase_offer_id uuid references public.store_post_purchase_offers(id) on delete set null,
  source_order_id uuid references public.store_orders(id) on delete set null,
  code text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  used_order_id uuid references public.store_orders(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint store_user_discount_codes_format check (code ~ '^[A-Z0-9-]{6,64}$'),
  constraint store_user_discount_codes_expiry check (expires_at > created_at)
);
create index if not exists store_user_discount_codes_user_idx on public.store_user_discount_codes(user_id,expires_at);

create or replace function public.store_set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

drop trigger if exists store_products_set_updated_at on public.store_products;
create trigger store_products_set_updated_at before update on public.store_products for each row execute function public.store_set_updated_at();
drop trigger if exists store_product_prices_set_updated_at on public.store_product_prices;
create trigger store_product_prices_set_updated_at before update on public.store_product_prices for each row execute function public.store_set_updated_at();
drop trigger if exists store_discount_codes_set_updated_at on public.store_discount_codes;
create trigger store_discount_codes_set_updated_at before update on public.store_discount_codes for each row execute function public.store_set_updated_at();
drop trigger if exists store_post_purchase_offers_set_updated_at on public.store_post_purchase_offers;
create trigger store_post_purchase_offers_set_updated_at before update on public.store_post_purchase_offers for each row execute function public.store_set_updated_at();

alter table public.store_products enable row level security;
alter table public.store_product_grants enable row level security;
alter table public.store_product_prices enable row level security;
alter table public.store_discount_codes enable row level security;
alter table public.store_discount_code_products enable row level security;
alter table public.store_orders enable row level security;
alter table public.store_order_items enable row level security;
alter table public.store_order_grants enable row level security;
alter table public.store_discount_redemptions enable row level security;
alter table public.store_post_purchase_offers enable row level security;
alter table public.store_user_discount_codes enable row level security;

drop policy if exists "store products authenticated read" on public.store_products;
create policy "store products authenticated read" on public.store_products for select to authenticated using (
  is_active=true and (available_from is null or available_from<=now()) and (available_until is null or available_until>now())
);

drop policy if exists "store grants authenticated read" on public.store_product_grants;
create policy "store grants authenticated read" on public.store_product_grants for select to authenticated using (
  exists (select 1 from public.store_products p where p.id=store_product_grants.product_id and p.is_active=true and (p.available_from is null or p.available_from<=now()) and (p.available_until is null or p.available_until>now()))
);

drop policy if exists "store prices authenticated read" on public.store_product_prices;
create policy "store prices authenticated read" on public.store_product_prices for select to authenticated using (
  is_active=true and exists (select 1 from public.store_products p where p.id=store_product_prices.product_id and p.is_active=true and (p.available_from is null or p.available_from<=now()) and (p.available_until is null or p.available_until>now()))
);

drop policy if exists "store own orders read" on public.store_orders;
create policy "store own orders read" on public.store_orders for select to authenticated using (user_id=auth.uid());

drop policy if exists "store own order items read" on public.store_order_items;
create policy "store own order items read" on public.store_order_items for select to authenticated using (
  exists (select 1 from public.store_orders o where o.id=store_order_items.order_id and o.user_id=auth.uid())
);

drop policy if exists "store own order grants read" on public.store_order_grants;
create policy "store own order grants read" on public.store_order_grants for select to authenticated using (
  exists (select 1 from public.store_orders o where o.id=store_order_grants.order_id and o.user_id=auth.uid())
);

drop policy if exists "store own discount redemptions read" on public.store_discount_redemptions;
create policy "store own discount redemptions read" on public.store_discount_redemptions for select to authenticated using (user_id=auth.uid());

drop policy if exists "store own issued discounts read" on public.store_user_discount_codes;
create policy "store own issued discounts read" on public.store_user_discount_codes for select to authenticated using (user_id=auth.uid());

create or replace view public.store_catalogue with (security_invoker=true) as
select p.id,p.slug,p.name,p.description,p.image_url,p.product_type,p.category,p.is_featured,p.sort_order,
       p.available_from,p.available_until,pr.id as price_id,pr.currency,pr.money_amount_minor,pr.remnants_amount
from public.store_products p
join public.store_product_prices pr on pr.product_id=p.id and pr.is_active=true
where p.is_active=true
  and (p.available_from is null or p.available_from<=now())
  and (p.available_until is null or p.available_until>now());

create or replace function public.store_validate_order_character()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare character_user_id uuid;
begin
  select c.user_id into character_user_id from public.characters c where c.id=new.character_id;
  if character_user_id is null then raise exception 'Store order character does not exist.'; end if;
  if character_user_id <> new.user_id then raise exception 'Store order character does not belong to this user.'; end if;
  return new;
end;
$$;

drop trigger if exists store_orders_validate_character on public.store_orders;
create trigger store_orders_validate_character before insert or update of user_id,character_id on public.store_orders
for each row execute function public.store_validate_order_character();

commit;

-- Phase 1 result:
-- store_products
-- store_product_grants
-- store_product_prices
-- store_discount_codes
-- store_discount_code_products
-- store_orders
-- store_order_items
-- store_order_grants
-- store_discount_redemptions
-- store_post_purchase_offers
-- store_user_discount_codes
--
-- Next: admin Store management UI + central fulfilment service.
-- Paddle/webhooks and atomic Remnant checkout come after this schema is verified.
