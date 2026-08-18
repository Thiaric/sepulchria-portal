-- ============================================================
-- SEPULCHRIA — ECONOMY 3A: ATOMIC MARKET PURCHASES
-- ============================================================

create table if not exists public.market_transactions (
  id uuid primary key default gen_random_uuid(),
  character_id uuid not null
    references public.characters(id) on delete restrict,
  shop_id uuid not null
    references public.market_shops(id) on delete restrict,
  listing_id uuid not null
    references public.market_listings(id) on delete restrict,
  item_id uuid not null
    references public.items(id) on delete restrict,
  direction text not null
    check (direction in ('buy', 'sell')),
  quantity integer not null
    check (quantity > 0),
  unit_price bigint not null
    check (unit_price >= 0),
  total_amount bigint not null
    check (total_amount >= 0),
  ledger_id uuid not null
    references public.remnant_ledger(id) on delete restrict,
  created_at timestamptz not null default now()
);

create index if not exists market_transactions_character_created_idx
  on public.market_transactions(character_id, created_at desc);

create index if not exists market_transactions_shop_created_idx
  on public.market_transactions(shop_id, created_at desc);

create or replace function public.prevent_market_transaction_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'Market transaction records are immutable.';
end;
$$;

drop trigger if exists market_transactions_immutable
  on public.market_transactions;

create trigger market_transactions_immutable
before update or delete on public.market_transactions
for each row
execute function public.prevent_market_transaction_mutation();

alter table public.market_transactions enable row level security;

drop policy if exists "own market transactions or staff can read"
  on public.market_transactions;

create policy "own market transactions or staff can read"
on public.market_transactions
for select
to authenticated
using (
  exists (
    select 1
    from public.characters c
    where c.id = market_transactions.character_id
      and c.user_id = auth.uid()
  )
  or exists (
    select 1
    from public.staff_members s
    where s.user_id = auth.uid()
  )
);

create or replace function public.market_buy_listing(
  p_listing_id uuid,
  p_quantity integer default 1
)
returns table (
  item_name text,
  quantity integer,
  total_paid bigint,
  new_balance bigint,
  stock_remaining integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_character_id uuid;
  v_character_status text;

  v_shop_id uuid;
  v_shop_name text;
  v_shop_active boolean;

  v_item_id uuid;
  v_item_name text;
  v_item_active boolean;
  v_stackable boolean;
  v_max_stack integer;
  v_use_behaviour text;
  v_max_charges integer;
  v_category_slug text;

  v_listing_active boolean;
  v_buy_price bigint;
  v_stock_mode text;
  v_stock_quantity integer;

  v_total bigint;
  v_remaining integer;
  v_free integer;
  v_add integer;
  v_stack_size integer;

  v_ledger_id uuid;
  v_balance bigint;
  v_instance_id uuid;

  r record;
begin
  if v_user_id is null then
    raise exception 'Authentication required.';
  end if;

  if p_listing_id is null then
    raise exception 'Market listing is required.';
  end if;

  if p_quantity is null
     or p_quantity < 1
     or p_quantity > 99 then
    raise exception 'Purchase quantity must be between 1 and 99.';
  end if;

  select
    c.id,
    c.status::text
  into
    v_character_id,
    v_character_status
  from public.characters c
  where c.user_id = v_user_id
  limit 1;

  if v_character_id is null then
    raise exception 'Character not found.';
  end if;

  if v_character_status <> 'approved' then
    raise exception 'Only approved characters can use the Market.';
  end if;

  select
    l.shop_id,
    s.name,
    s.is_active,
    l.is_active,
    l.buy_price,
    l.stock_mode,
    l.stock_quantity,
    i.id,
    i.name,
    i.is_active,
    i.stackable,
    i.max_stack,
    i.use_behaviour,
    i.max_charges,
    cat.slug
  into
    v_shop_id,
    v_shop_name,
    v_shop_active,
    v_listing_active,
    v_buy_price,
    v_stock_mode,
    v_stock_quantity,
    v_item_id,
    v_item_name,
    v_item_active,
    v_stackable,
    v_max_stack,
    v_use_behaviour,
    v_max_charges,
    v_category_slug
  from public.market_listings l
  join public.market_shops s
    on s.id = l.shop_id
  join public.items i
    on i.id = l.item_id
  join public.item_categories cat
    on cat.id = i.category_id
  where l.id = p_listing_id
  for update of l;

  if v_item_id is null then
    raise exception 'Market listing not found.';
  end if;

  if not v_shop_active then
    raise exception 'This shop is currently closed.';
  end if;

  if not v_listing_active then
    raise exception 'This Item is not currently for sale.';
  end if;

  if not v_item_active then
    raise exception 'This Item is currently inactive.';
  end if;

  if v_stock_mode = 'finite' then
    if coalesce(v_stock_quantity, 0) < p_quantity then
      raise exception 'There is not enough stock remaining.';
    end if;
  end if;

  v_total := v_buy_price * p_quantity::bigint;

  select
    t.ledger_id,
    t.new_balance
  into
    v_ledger_id,
    v_balance
  from public._post_remnant_transaction(
    v_character_id,
    -v_total,
    'market_purchase',
    'market',
    p_listing_id::text,
    'Market purchase — ' || v_shop_name || ' — ' ||
      v_item_name || ' ×' || p_quantity,
    v_user_id
  ) t;

  -- Containers require an individual instance so they can hold Items.
  if v_category_slug = 'container' then
    for r in
      select generate_series(1, p_quantity)
    loop
      insert into public.character_item_instances (
        item_id,
        owner_character_id,
        charges_remaining,
        vault_status,
        acquisition_source
      )
      values (
        v_item_id,
        v_character_id,
        case
          when v_use_behaviour = 'limited_charges'
            then v_max_charges
          else null
        end,
        'owned',
        'market'
      )
      returning id into v_instance_id;

      insert into public.item_instance_history (
        item_instance_id,
        to_character_id,
        actor_user_id,
        event_type,
        details
      )
      values (
        v_instance_id,
        v_character_id,
        v_user_id,
        'market_purchase',
        'Purchased from ' || v_shop_name || '.'
      );
    end loop;

  elsif not v_stackable then
    insert into public.character_items (
      character_id,
      item_id,
      quantity,
      container_instance_id,
      acquisition_source
    )
    select
      v_character_id,
      v_item_id,
      1,
      null,
      'market'
    from generate_series(1, p_quantity);

  else
    v_remaining := p_quantity;

    for r in
      select
        ci.id,
        ci.quantity
      from public.character_items ci
      where ci.character_id = v_character_id
        and ci.item_id = v_item_id
        and ci.container_instance_id is null
      order by ci.acquired_at asc
      for update
    loop
      exit when v_remaining <= 0;

      if v_max_stack is null then
        update public.character_items
        set quantity =
          r.quantity + v_remaining
        where id = r.id;

        v_remaining := 0;
        exit;
      end if;

      v_free :=
        greatest(
          0,
          v_max_stack -
          r.quantity
        );

      if v_free = 0 then
        continue;
      end if;

      v_add :=
        least(
          v_free,
          v_remaining
        );

      update public.character_items
      set quantity =
        r.quantity + v_add
      where id = r.id;

      v_remaining :=
        v_remaining - v_add;
    end loop;

    while v_remaining > 0 loop
      v_stack_size :=
        case
          when v_max_stack is null
            then v_remaining
          else least(
            v_max_stack,
            v_remaining
          )
        end;

      insert into public.character_items (
        character_id,
        item_id,
        quantity,
        container_instance_id,
        acquisition_source
      )
      values (
        v_character_id,
        v_item_id,
        v_stack_size,
        null,
        'market'
      );

      v_remaining :=
        v_remaining -
        v_stack_size;
    end loop;
  end if;

  if v_stock_mode = 'finite' then
    update public.market_listings
    set
      stock_quantity =
        stock_quantity -
        p_quantity,
      updated_at = now()
    where id = p_listing_id;

    v_stock_quantity :=
      v_stock_quantity -
      p_quantity;
  else
    v_stock_quantity := null;
  end if;

  insert into public.market_transactions (
    character_id,
    shop_id,
    listing_id,
    item_id,
    direction,
    quantity,
    unit_price,
    total_amount,
    ledger_id
  )
  values (
    v_character_id,
    v_shop_id,
    p_listing_id,
    v_item_id,
    'buy',
    p_quantity,
    v_buy_price,
    v_total,
    v_ledger_id
  );

  return query
  select
    v_item_name,
    p_quantity,
    v_total,
    v_balance,
    v_stock_quantity;
end;
$$;

revoke all on function public.market_buy_listing(uuid, integer)
from public, anon;

grant execute on function public.market_buy_listing(uuid, integer)
to authenticated;
