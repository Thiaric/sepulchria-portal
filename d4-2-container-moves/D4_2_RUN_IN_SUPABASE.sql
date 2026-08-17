-- SEPULCHRIA — D4.2 PLAYER CONTAINER MOVEMENT
-- Run after D4 + D4.1.
--
-- Lets a character move their own standard or unique Items:
-- - Loose Inventory -> owned Container
-- - Container -> Loose Inventory
-- - Container -> another owned Container
--
-- Containers themselves cannot be nested.
-- Capacity counts inventory records/slots, matching the current Inventory UI.
-- Moving an equipped Item into a Container automatically unequips it through
-- the D4 auto-unequip trigger.

create or replace function public.move_own_inventory_record(
  p_record_kind text,
  p_record_id uuid,
  p_target_container_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_character_id uuid;
  v_item_id uuid;
  v_current_container_id uuid;
  v_target_owner_id uuid;
  v_target_capacity integer;
  v_used_slots integer;
  v_is_container boolean;
begin
  if auth.uid() is null then
    raise exception 'Authentication required.';
  end if;

  -- Resolve the source record and prove ownership.
  if p_record_kind = 'standard' then
    select
      ci.character_id,
      ci.item_id,
      ci.container_instance_id
    into
      v_character_id,
      v_item_id,
      v_current_container_id
    from public.character_items ci
    join public.characters c
      on c.id = ci.character_id
    where ci.id = p_record_id
      and c.user_id = auth.uid();

  elsif p_record_kind = 'unique' then
    select
      inst.owner_character_id,
      inst.item_id,
      inst.container_instance_id
    into
      v_character_id,
      v_item_id,
      v_current_container_id
    from public.character_item_instances inst
    join public.characters c
      on c.id = inst.owner_character_id
    where inst.id = p_record_id
      and inst.vault_status = 'owned'
      and c.user_id = auth.uid();

  else
    raise exception 'Invalid inventory record type.';
  end if;

  if v_character_id is null or v_item_id is null then
    raise exception 'You do not own this Item.';
  end if;

  -- No-op if already there.
  if v_current_container_id is not distinct from p_target_container_id then
    return;
  end if;

  -- Is the source itself a Container?
  select (i.container_capacity is not null)
  into v_is_container
  from public.items i
  where i.id = v_item_id;

  if coalesce(v_is_container, false) and p_target_container_id is not null then
    raise exception 'Containers cannot be placed inside other Containers.';
  end if;

  -- Null means Loose Inventory.
  if p_target_container_id is not null then
    if p_record_kind = 'unique' and p_record_id = p_target_container_id then
      raise exception 'A Container cannot contain itself.';
    end if;

    select
      target.owner_character_id,
      master.container_capacity
    into
      v_target_owner_id,
      v_target_capacity
    from public.character_item_instances target
    join public.items master
      on master.id = target.item_id
    where target.id = p_target_container_id
      and target.vault_status = 'owned';

    if v_target_owner_id is null then
      raise exception 'Target Container not found.';
    end if;

    if v_target_owner_id <> v_character_id then
      raise exception 'You can only use your own Containers.';
    end if;

    if v_target_capacity is null then
      raise exception 'The selected Item is not a Container.';
    end if;

    select
      (
        select count(*)::integer
        from public.character_items ci
        where ci.container_instance_id = p_target_container_id
      )
      +
      (
        select count(*)::integer
        from public.character_item_instances inst
        where inst.container_instance_id = p_target_container_id
      )
    into v_used_slots;

    if coalesce(v_used_slots, 0) >= v_target_capacity then
      raise exception 'That Container is full.';
    end if;
  end if;

  if p_record_kind = 'standard' then
    update public.character_items
    set
      container_instance_id = p_target_container_id,
      updated_at = now()
    where id = p_record_id;

  else
    update public.character_item_instances
    set
      container_instance_id = p_target_container_id,
      updated_at = now()
    where id = p_record_id;
  end if;
end;
$$;

revoke all
on function public.move_own_inventory_record(text, uuid, uuid)
from public;

grant execute
on function public.move_own_inventory_record(text, uuid, uuid)
to authenticated;

notify pgrst, 'reload schema';
