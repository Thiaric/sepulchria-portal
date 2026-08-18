create or replace function public.market_sell_listing(
  p_listing_id uuid,
  p_quantity integer default 1
)
returns table (
  item_name text,
  quantity integer,
  total_received bigint,
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
  v_listing_active boolean;
  v_sell_price bigint;
  v_stock_mode text;
  v_stock_quantity integer;
  v_available integer := 0;
  v_remaining integer;
  v_take integer;
  v_total bigint;
  v_ledger_id uuid;
  v_balance bigint;
  r record;
begin
  if v_user_id is null then
    raise exception 'Authentication required.';
  end if;

  if p_listing_id is null then
    raise exception 'Market listing is required.';
  end if;

  if p_quantity is null or p_quantity < 1 or p_quantity > 99 then
    raise exception 'Sale quantity must be between 1 and 99.';
  end if;

  select c.id, c.status::text
  into v_character_id, v_character_status
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
    l.sell_price,
    l.stock_mode,
    l.stock_quantity,
    i.id,
    i.name,
    i.is_active
  into
    v_shop_id,
    v_shop_name,
    v_shop_active,
    v_listing_active,
    v_sell_price,
    v_stock_mode,
    v_stock_quantity,
    v_item_id,
    v_item_name,
    v_item_active
  from public.market_listings l
  join public.market_shops s on s.id = l.shop_id
  join public.items i on i.id = l.item_id
  where l.id = p_listing_id
  for update of l;

  if v_item_id is null then
    raise exception 'Market listing not found.';
  end if;

  if not v_shop_active then
    raise exception 'This shop is currently closed.';
  end if;

  if not v_listing_active then
    raise exception 'This Item is not currently traded by this shop.';
  end if;

  if not v_item_active then
    raise exception 'This Item is currently inactive.';
  end if;

  if v_sell_price is null or v_sell_price <= 0 then
    raise exception 'This shop is not buying this Item.';
  end if;

  select coalesce(sum(inv.quantity), 0)::integer
  into v_available
  from public.get_public_character_inventory(v_character_id) inv
  where inv.record_kind = 'standard'
    and inv.item_id = v_item_id
    and inv.parent_container_id is null
    and inv.is_equipped = false
    and inv.transfer_policy = 'free'
    and inv.is_quest_item = false;

  if v_available < p_quantity then
    raise exception 'You do not have enough eligible copies of this Item to sell.';
  end if;

  v_remaining := p_quantity;

  for r in
    select inv.record_id, inv.quantity
    from public.get_public_character_inventory(v_character_id) inv
    where inv.record_kind = 'standard'
      and inv.item_id = v_item_id
      and inv.parent_container_id is null
      and inv.is_equipped = false
      and inv.transfer_policy = 'free'
      and inv.is_quest_item = false
    order by inv.record_id
  loop
    exit when v_remaining <= 0;

    v_take := least(r.quantity, v_remaining);

    if v_take >= r.quantity then
      delete from public.character_items ci
      where ci.id = r.record_id
        and ci.character_id = v_character_id;
    else
      update public.character_items ci
      set quantity = ci.quantity - v_take
      where ci.id = r.record_id
        and ci.character_id = v_character_id;
    end if;

    v_remaining := v_remaining - v_take;
  end loop;

  if v_remaining <> 0 then
    raise exception 'Inventory changed while the sale was being processed.';
  end if;

  v_total := v_sell_price * p_quantity::bigint;

  select t.ledger_id, t.new_balance
  into v_ledger_id, v_balance
  from public._post_remnant_transaction(
    v_character_id,
    v_total,
    'market_sale',
    'market',
    p_listing_id::text,
    'Market sale — ' || v_shop_name || ' — ' || v_item_name || ' ×' || p_quantity,
    v_user_id
  ) t;

  if v_stock_mode = 'finite' then
    update public.market_listings
    set stock_quantity = coalesce(stock_quantity, 0) + p_quantity,
        updated_at = now()
    where id = p_listing_id;

    v_stock_quantity := coalesce(v_stock_quantity, 0) + p_quantity;
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
    'sell',
    p_quantity,
    v_sell_price,
    v_total,
    v_ledger_id
  );

  return query
  select v_item_name, p_quantity, v_total, v_balance, v_stock_quantity;
end;
$$;

revoke all on function public.market_sell_listing(uuid, integer)
from public, anon;

grant execute on function public.market_sell_listing(uuid, integer)
to authenticated;
