begin;

create or replace function public.equip_npc_inventory_record_as_staff(
  p_character_id uuid,
  p_record_kind text,
  p_record_id uuid
)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_item_id uuid;
  v_slot text;
  v_layer text;
  v_hands smallint;
begin
  if auth.uid() is null then
    raise exception 'Authentication required.';
  end if;

  if not public.is_staff_user() then
    raise exception 'Staff access required.';
  end if;

  if not exists (
    select 1
    from public.characters c
    join public.npcs n on n.character_id = c.id
    where c.id = p_character_id
      and c.is_system = true
  ) then
    raise exception 'NPC Character not found.';
  end if;

  if p_record_kind = 'standard' then
    select ci.item_id
    into v_item_id
    from public.character_items ci
    where ci.id = p_record_id
      and ci.character_id = p_character_id;
  elsif p_record_kind = 'unique' then
    select inst.item_id
    into v_item_id
    from public.character_item_instances inst
    where inst.id = p_record_id
      and inst.owner_character_id = p_character_id
      and inst.vault_status = 'owned';
  else
    raise exception 'Invalid inventory record type.';
  end if;

  if v_item_id is null then
    raise exception 'NPC does not own this Item.';
  end if;

  select equip_slot, equip_layer, hands_required
  into v_slot, v_layer, v_hands
  from public.items
  where id = v_item_id
    and is_equippable = true
    and is_active = true;

  if v_slot is null or v_layer is null then
    raise exception 'This Item cannot be equipped.';
  end if;

  if not public.character_can_equip_item(
    p_character_id,
    v_item_id
  ) then
    raise exception 'This character does not meet the requirements to equip this Item.';
  end if;

  if p_record_kind = 'standard' then
    update public.character_items
    set container_instance_id = null,
        updated_at = now()
    where id = p_record_id
      and character_id = p_character_id;
  else
    update public.character_item_instances
    set container_instance_id = null,
        updated_at = now()
    where id = p_record_id
      and owner_character_id = p_character_id;
  end if;

  if v_hands = 2 then
    delete from public.character_equipment
    where character_id = p_character_id
      and slot_key in ('main_hand', 'off_hand');

  elsif v_slot in ('main_hand', 'off_hand') then
    delete from public.character_equipment ce
    using public.character_items ci
    join public.items i on i.id = ci.item_id
    where ce.character_id = p_character_id
      and ce.character_item_id = ci.id
      and i.hands_required = 2;

    delete from public.character_equipment ce
    using public.character_item_instances inst
    join public.items i on i.id = inst.item_id
    where ce.character_id = p_character_id
      and ce.item_instance_id = inst.id
      and i.hands_required = 2;
  end if;

  delete from public.character_equipment
  where character_id = p_character_id
    and slot_key = v_slot
    and layer_key = v_layer;

  if p_record_kind = 'standard' then
    insert into public.character_equipment(
      character_id,
      slot_key,
      layer_key,
      character_item_id
    )
    values(
      p_character_id,
      v_slot,
      v_layer,
      p_record_id
    );
  else
    insert into public.character_equipment(
      character_id,
      slot_key,
      layer_key,
      item_instance_id
    )
    values(
      p_character_id,
      v_slot,
      v_layer,
      p_record_id
    );
  end if;
end;
$function$;

create or replace function public.unequip_npc_inventory_record_as_staff(
  p_character_id uuid,
  p_record_kind text,
  p_record_id uuid
)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if auth.uid() is null then
    raise exception 'Authentication required.';
  end if;

  if not public.is_staff_user() then
    raise exception 'Staff access required.';
  end if;

  if not exists (
    select 1
    from public.characters c
    join public.npcs n on n.character_id = c.id
    where c.id = p_character_id
      and c.is_system = true
  ) then
    raise exception 'NPC Character not found.';
  end if;

  if p_record_kind = 'standard' then
    if not exists (
      select 1
      from public.character_items
      where id = p_record_id
        and character_id = p_character_id
    ) then
      raise exception 'NPC does not own this Item.';
    end if;

    delete from public.character_equipment
    where character_id = p_character_id
      and character_item_id = p_record_id;

  elsif p_record_kind = 'unique' then
    if not exists (
      select 1
      from public.character_item_instances
      where id = p_record_id
        and owner_character_id = p_character_id
        and vault_status = 'owned'
    ) then
      raise exception 'NPC does not own this Item.';
    end if;

    delete from public.character_equipment
    where character_id = p_character_id
      and item_instance_id = p_record_id;
  else
    raise exception 'Invalid inventory record type.';
  end if;
end;
$function$;

revoke all on function public.equip_npc_inventory_record_as_staff(
  uuid, text, uuid
) from public, anon;

revoke all on function public.unequip_npc_inventory_record_as_staff(
  uuid, text, uuid
) from public, anon;

grant execute on function public.equip_npc_inventory_record_as_staff(
  uuid, text, uuid
) to authenticated;

grant execute on function public.unequip_npc_inventory_record_as_staff(
  uuid, text, uuid
) to authenticated;

grant execute on function public.equip_npc_inventory_record_as_staff(
  uuid, text, uuid
) to service_role;

grant execute on function public.unequip_npc_inventory_record_as_staff(
  uuid, text, uuid
) to service_role;

commit;
