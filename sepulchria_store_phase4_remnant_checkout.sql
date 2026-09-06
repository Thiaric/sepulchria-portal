-- Sepulchria Store — Phase 4 Remnant checkout + fulfilment
begin;

create or replace function public.purchase_store_product_with_remnants(p_product_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_character_id uuid;
  v_product public.store_products%rowtype;
  v_price public.store_product_prices%rowtype;
  v_balance bigint;
  v_new_balance bigint;
  v_order_id uuid;
  v_order_item_id uuid;
  v_grant public.store_product_grants%rowtype;
  v_all_owned boolean := true;
begin
  if v_user_id is null then raise exception 'You must be signed in.'; end if;

  select id into v_character_id from public.characters where user_id = v_user_id limit 1;
  if v_character_id is null then raise exception 'No character is attached to this account.'; end if;

  select * into v_product from public.store_products
  where id = p_product_id and is_active = true
    and (available_from is null or available_from <= now())
    and (available_until is null or available_until > now());
  if not found then raise exception 'This Store product is not available.'; end if;

  select * into v_price from public.store_product_prices
  where product_id = p_product_id and is_active = true and remnants_amount is not null
  order by created_at asc limit 1;
  if not found then raise exception 'This Store product does not have a Remnant price.'; end if;

  if not exists (select 1 from public.store_product_grants where product_id = p_product_id) then
    raise exception 'This Store product has no fulfilment grants.';
  end if;

  for v_grant in select * from public.store_product_grants where product_id = p_product_id loop
    if v_grant.grant_type = 'portal_skin' then
      if not exists (select 1 from public.user_portal_skin_entitlements e where e.user_id=v_user_id and e.skin_id=v_grant.portal_skin_id and e.enabled=true) then v_all_owned := false; end if;
    elsif v_grant.grant_type = 'cosmetic' then
      if not exists (select 1 from public.character_cosmetic_entitlements e where e.character_id=v_character_id and e.cosmetic_item_id=v_grant.cosmetic_item_id and e.enabled=true) then v_all_owned := false; end if;
    elsif v_grant.grant_type = 'music' then
      if not exists (select 1 from public.character_music_entitlements e where e.character_id=v_character_id and e.music_track_id=v_grant.music_track_id and e.enabled=true) then v_all_owned := false; end if;
    elsif v_grant.grant_type = 'feature' then
      if not exists (select 1 from public.character_feature_entitlements e where e.character_id=v_character_id and e.feature_key=v_grant.feature_key and e.enabled=true) then v_all_owned := false; end if;
    else
      v_all_owned := false;
    end if;
  end loop;

  if v_all_owned then raise exception 'You already own everything included in this product.'; end if;

  select balance into v_balance from public.character_wallets where character_id=v_character_id for update;
  if not found then raise exception 'Character wallet not found.'; end if;
  if v_balance < v_price.remnants_amount then raise exception 'Not enough Remnants.'; end if;

  v_new_balance := v_balance - v_price.remnants_amount;
  update public.character_wallets set balance=v_new_balance where character_id=v_character_id;

  insert into public.store_orders (
    user_id, character_id, status, payment_method, currency,
    subtotal_money_minor, discount_money_minor, total_money_minor,
    subtotal_remnants, discount_remnants, total_remnants, paid_at, fulfilled_at
  ) values (
    v_user_id, v_character_id, 'fulfilled', 'remnants', null,
    0,0,0, v_price.remnants_amount,0,v_price.remnants_amount, now(),now()
  ) returning id into v_order_id;

  insert into public.store_order_items (
    order_id, product_id, product_slug_snapshot, product_name_snapshot,
    product_type_snapshot, category_snapshot, quantity,
    unit_money_minor_snapshot, total_money_minor_snapshot,
    unit_remnants_snapshot, total_remnants_snapshot
  ) values (
    v_order_id, v_product.id, v_product.slug, v_product.name,
    v_product.product_type, v_product.category, 1,
    null,null,v_price.remnants_amount,v_price.remnants_amount
  ) returning id into v_order_item_id;

  for v_grant in select * from public.store_product_grants where product_id=p_product_id order by created_at asc loop
    insert into public.store_order_grants (
      order_id, order_item_id, grant_type, portal_skin_id, cosmetic_item_id,
      music_track_id, feature_key, quantity, fulfilled_at
    ) values (
      v_order_id, v_order_item_id, v_grant.grant_type, v_grant.portal_skin_id,
      v_grant.cosmetic_item_id, v_grant.music_track_id, v_grant.feature_key,
      v_grant.quantity, now()
    );

    if v_grant.grant_type = 'portal_skin' then
      insert into public.user_portal_skin_entitlements (user_id,skin_id,enabled,source,note,granted_by,granted_at,updated_at)
      values (v_user_id,v_grant.portal_skin_id,true,'paid','Purchased from the Sepulchria Store with Remnants.',v_user_id,now(),now())
      on conflict (user_id,skin_id) do update set enabled=true,source='paid',note=excluded.note,granted_at=now(),updated_at=now();
    elsif v_grant.grant_type = 'cosmetic' then
      insert into public.character_cosmetic_entitlements (character_id,cosmetic_item_id,enabled,source,note,granted_at,granted_by,updated_at)
      values (v_character_id,v_grant.cosmetic_item_id,true,'paid','Purchased from the Sepulchria Store with Remnants.',now(),v_user_id,now())
      on conflict (character_id,cosmetic_item_id) do update set enabled=true,source='paid',note=excluded.note,granted_at=now(),granted_by=v_user_id,updated_at=now();
    elsif v_grant.grant_type = 'music' then
      insert into public.character_music_entitlements (character_id,music_track_id,enabled,source,note,granted_at)
      values (v_character_id,v_grant.music_track_id,true,'paid','Purchased from the Sepulchria Store with Remnants.',now())
      on conflict (character_id,music_track_id) do update set enabled=true,source='paid',note=excluded.note,granted_at=now();
    elsif v_grant.grant_type = 'feature' then
      insert into public.character_feature_entitlements (character_id,feature_key,enabled,source,note,granted_by,granted_at,updated_at)
      values (v_character_id,v_grant.feature_key,true,'paid','Purchased from the Sepulchria Store with Remnants.',v_user_id,now(),now())
      on conflict (character_id,feature_key) do update set enabled=true,source='paid',note=excluded.note,granted_by=v_user_id,granted_at=now(),updated_at=now();
    end if;
  end loop;

  insert into public.remnant_ledger (character_id,amount,balance_after,reason)
  values (v_character_id,-v_price.remnants_amount,v_new_balance,'Sepulchria Store purchase: ' || v_product.name);

  return v_order_id;
end;
$$;

revoke all on function public.purchase_store_product_with_remnants(uuid) from public;
grant execute on function public.purchase_store_product_with_remnants(uuid) to authenticated;
commit;
