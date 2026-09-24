-- NPC interaction integrity and Character/NPC parity
-- Built for application commit f24c6f4.
-- Run in Supabase SQL Editor after applying the Python source patch.

begin;

create or replace function public.normalize_npc_mechanics_room_message()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_npc public.npcs%rowtype;
  v_staff_character_id uuid;
  v_staff_role text;
  v_race jsonb;
begin
  select n.*
  into v_npc
  from public.npcs n
  join public.characters c on c.id = n.character_id
  where c.id = new.character_id
    and c.is_system = true
    and n.is_active = true
    and n.is_location_active = true
  limit 1;

  if not found then
    return new;
  end if;

  if auth.uid() is null then
    raise exception 'Authentication required.';
  end if;

  select sm.role
  into v_staff_role
  from public.staff_members sm
  where sm.user_id = auth.uid();

  if v_staff_role is null
     or v_staff_role not in ('owner','admin','master') then
    raise exception 'NPC mechanics require Master/Admin/Owner access.';
  end if;

  if v_npc.current_room_id is distinct from new.room_id then
    raise exception 'NPC is not in this Location.';
  end if;

  select c.id
  into v_staff_character_id
  from public.characters c
  where c.user_id = auth.uid()
    and c.is_system = false
    and c.status = 'approved'
    and c.current_room_id = new.room_id
  limit 1;

  if v_staff_character_id is null then
    raise exception 'Your staff Character must be in this Location to control an NPC.';
  end if;

  select case
    when r.id is null then null
    else jsonb_build_object(
      'id', r.id,
      'name', r.name,
      'icon_url', r.icon_url
    )
  end
  into v_race
  from public.characters c
  left join public.races r on r.id = c.race_id
  where c.id = v_npc.character_id;

  new.character_id := v_staff_character_id;
  new.speaker_type := 'npc';
  new.npc_id := v_npc.id;
  new.sent_by_user_id := auth.uid();
  new.npc_snapshot := jsonb_build_object(
    'id', v_npc.id,
    'character_id', v_npc.character_id,
    'name', v_npc.name,
    'pronouns', v_npc.pronouns,
    'portrait_url', v_npc.portrait_url,
    'description', v_npc.description,
    'race', v_race
  );

  return new;
end;
$function$;

create or replace function public.validate_room_message_npc_speaker()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  npc_row public.npcs%rowtype;
begin
  if new.speaker_type='npc' then
    if new.npc_id is null then
      raise exception 'NPC message requires npc_id';
    end if;

    select *
    into npc_row
    from public.npcs
    where id=new.npc_id;

    if not found then
      raise exception 'NPC not found';
    end if;

    if npc_row.is_active is not true then
      raise exception 'NPC is inactive';
    end if;

    if npc_row.is_location_active is not true then
      raise exception 'NPC is not Active in Locations';
    end if;

    if npc_row.current_room_id is distinct from new.room_id then
      raise exception 'NPC is not in this Location';
    end if;
  else
    new.npc_id=null;
    new.npc_snapshot=null;
  end if;

  return new;
end;
$function$;

create or replace function public.start_direct_conversation(recipient_character_id uuid)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  sender_character_id uuid;
  sender_user_id uuid;
  generated_pair_key text;
  target_conversation_id uuid;
begin
  sender_user_id := auth.uid();

  perform public.raise_if_user_sanctioned(
    sender_user_id,
    'communication'
  );

  select c.id
  into sender_character_id
  from public.characters c
  where c.user_id = sender_user_id
  limit 1;

  if sender_character_id is null then
    raise exception 'No character belongs to the authenticated user.';
  end if;

  if recipient_character_id is null then
    raise exception 'Missing recipient.';
  end if;

  if recipient_character_id = sender_character_id then
    raise exception 'You cannot message yourself.';
  end if;

  if not exists (
    select 1
    from public.characters c
    where c.id = recipient_character_id
  ) then
    raise exception 'Recipient not found.';
  end if;

  if exists (
    select 1
    from public.npcs n
    where n.character_id = recipient_character_id
  ) then
    raise exception 'NPCs cannot receive private messages.';
  end if;

  if exists (
    select 1
    from public.character_blocks cb
    where
      (
        cb.blocker_character_id = sender_character_id
        and cb.blocked_character_id = recipient_character_id
      )
      or
      (
        cb.blocker_character_id = recipient_character_id
        and cb.blocked_character_id = sender_character_id
      )
  ) then
    raise exception 'This conversation is unavailable.';
  end if;

  generated_pair_key :=
    case
      when sender_character_id::text < recipient_character_id::text
        then sender_character_id::text || ':' || recipient_character_id::text
      else recipient_character_id::text || ':' || sender_character_id::text
    end;

  insert into public.direct_conversations (pair_key)
  values (generated_pair_key)
  on conflict (pair_key)
  do update set pair_key = excluded.pair_key
  returning id into target_conversation_id;

  insert into public.direct_conversation_participants (
    conversation_id,
    character_id
  )
  values
    (target_conversation_id, sender_character_id),
    (target_conversation_id, recipient_character_id)
  on conflict (conversation_id, character_id)
  do nothing;

  return target_conversation_id;
end;
$function$;

create or replace function public.create_item_trade(other uuid)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  me uuid := public.my_character_id();
  a uuid;
  b uuid;
  tid uuid;
begin
  if me is null or other = me then
    raise exception 'Invalid exchange.';
  end if;

  if exists (
    select 1
    from public.npcs n
    where n.character_id = other
  ) then
    raise exception 'NPCs cannot take part in Item Exchanges. Use Give Item instead.';
  end if;

  perform 1
  from public.characters
  where id in (me, other)
  order by id
  for update;

  select current_room_id into a
  from public.characters
  where id = me and status = 'approved';

  select current_room_id into b
  from public.characters
  where id = other and status = 'approved';

  if a is null or b is distinct from a then
    raise exception 'Both characters must be in the same Location.';
  end if;

  if exists (
    select 1
    from public.item_trades
    where status = 'open'
      and (
        me in (character_one_id, character_two_id)
        or other in (character_one_id, character_two_id)
      )
  ) then
    raise exception 'One character already has an open Item Exchange.';
  end if;

  insert into public.item_trades(character_one_id, character_two_id)
  values(me, other)
  returning id into tid;

  return tid;
end;
$function$;

create or replace function public.give_npc_inventory_record_as_staff(
  p_source_character_id uuid,
  p_record_kind text,
  p_record_id uuid,
  p_target_character_id uuid,
  p_quantity integer default 1
)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_source_room uuid;
  v_target_room uuid;
  v_item_id uuid;
  v_have integer;
  v_policy text;
  v_quest boolean;
  v_instance public.character_item_instances%rowtype;
  v_action_id uuid;
  v_item_name text;
  v_giver_name text;
  v_target_name text;
begin
  if auth.uid() is null then
    raise exception 'Authentication required.';
  end if;

  if not public.is_staff_user() then
    raise exception 'Staff access required.';
  end if;

  if p_quantity is null or p_quantity < 1 then
    raise exception 'Invalid transfer quantity.';
  end if;

  if not exists (
    select 1
    from public.characters c
    join public.npcs n on n.character_id = c.id
    where c.id = p_source_character_id
      and c.is_system = true
      and c.status = 'approved'
      and n.is_active = true
      and n.is_location_active = true
  ) then
    raise exception 'Active NPC Character not found.';
  end if;

  if not exists (
    select 1
    from public.characters c
    where c.id = p_target_character_id
      and c.status = 'approved'
      and c.is_system = false
  ) then
    raise exception 'Choose an ordinary Character.';
  end if;

  if p_target_character_id = p_source_character_id then
    raise exception 'You cannot give an Item to yourself.';
  end if;

  select current_room_id,
         coalesce(nullif(display_name,''), btrim(coalesce(first_name,'')||' '||coalesce(surname,'')), id::text)
  into v_source_room, v_giver_name
  from public.characters
  where id = p_source_character_id;

  select current_room_id,
         coalesce(nullif(display_name,''), btrim(coalesce(first_name,'')||' '||coalesce(surname,'')), id::text)
  into v_target_room, v_target_name
  from public.characters
  where id = p_target_character_id;

  if v_source_room is null
     or v_target_room is distinct from v_source_room then
    raise exception 'Both characters must be in the same Location.';
  end if;

  if public.item_record_is_equipped(
       p_record_kind,
       p_record_id,
       p_source_character_id
     ) then
    raise exception 'Unequip this Item first.';
  end if;

  if p_record_kind = 'standard' then
    select ci.item_id, ci.quantity, i.transfer_policy, i.is_quest_item
    into v_item_id, v_have, v_policy, v_quest
    from public.character_items ci
    join public.items i on i.id = ci.item_id
    where ci.id = p_record_id
      and ci.character_id = p_source_character_id
      and ci.container_instance_id is null
    for update of ci;

    if not found then
      raise exception 'Item not found in Loose Inventory.';
    end if;

    if v_policy <> 'free' or v_quest then
      raise exception 'This Item cannot be transferred.';
    end if;

    if p_quantity > v_have then
      raise exception 'Not enough quantity.';
    end if;

    select name into v_item_name
    from public.items
    where id = v_item_id;

    v_action_id :=
      public.character_audit_begin_action(
        'item_gift',
        'gift'
      );

    if p_quantity = v_have then
      update public.character_items
      set character_id = p_target_character_id,
          acquisition_source = 'gift',
          assigned_by = null,
          updated_at = now()
      where id = p_record_id;
    else
      update public.character_items
      set quantity = quantity - p_quantity,
          updated_at = now()
      where id = p_record_id;

      insert into public.character_items(
        character_id,
        item_id,
        quantity,
        acquisition_source,
        acquired_at
      )
      values(
        p_target_character_id,
        v_item_id,
        p_quantity,
        'gift',
        now()
      );
    end if;

  elsif p_record_kind = 'unique' then
    if p_quantity <> 1 then
      raise exception 'Unique Items have quantity 1.';
    end if;

    select *
    into v_instance
    from public.character_item_instances
    where id = p_record_id
      and owner_character_id = p_source_character_id
      and container_instance_id is null
      and vault_status = 'owned'
    for update;

    if not found then
      raise exception 'Unique Item not found in Loose Inventory.';
    end if;

    select
      coalesce(v_instance.transfer_policy_override, i.transfer_policy),
      coalesce(v_instance.is_quest_item_override, i.is_quest_item)
    into v_policy, v_quest
    from public.items i
    where i.id = v_instance.item_id;

    if v_policy <> 'free' or v_quest then
      raise exception 'This Item cannot be transferred.';
    end if;

    v_item_id := v_instance.item_id;

    select name into v_item_name
    from public.items
    where id = v_item_id;

    v_action_id :=
      public.character_audit_begin_action(
        'item_gift',
        'gift'
      );

    update public.character_item_instances
    set owner_character_id = p_target_character_id,
        acquisition_source = 'gift',
        acquired_at = now(),
        updated_at = now()
    where id = p_record_id;

    insert into public.item_instance_history(
      item_instance_id,
      event_type,
      from_character_id,
      to_character_id,
      actor_user_id,
      details
    )
    values(
      p_record_id,
      'gift',
      p_source_character_id,
      p_target_character_id,
      auth.uid(),
      'Given directly by staff-controlled NPC.'
    );

  else
    raise exception 'Invalid Item type.';
  end if;

  perform public.character_audit_write_event(
    p_source_character_id,
    'item_given',
    'gift',
    v_action_id,
    jsonb_build_object(
      'item_id', v_item_id,
      'item_name', v_item_name,
      'quantity', p_quantity,
      'other_character_id', p_target_character_id,
      'other_character_name', v_target_name,
      'direction', 'given'
    ),
    'item_gift',
    v_action_id::text
  );

  perform public.character_audit_write_event(
    p_target_character_id,
    'item_received',
    'gift',
    v_action_id,
    jsonb_build_object(
      'item_id', v_item_id,
      'item_name', v_item_name,
      'quantity', p_quantity,
      'other_character_id', p_source_character_id,
      'other_character_name', v_giver_name,
      'direction', 'received'
    ),
    'item_gift',
    v_action_id::text
  );

  perform public._normalize_character_inventory_stacks(
    p_source_character_id
  );
  perform public._normalize_character_inventory_stacks(
    p_target_character_id
  );
end;
$function$;

revoke all on function public.give_npc_inventory_record_as_staff(uuid,text,uuid,uuid,integer) from public, anon;
grant execute on function public.give_npc_inventory_record_as_staff(uuid,text,uuid,uuid,integer) to authenticated, service_role;

create or replace function public.resolve_opposed_item_use(
  p_action_id uuid,
  p_apply_effects boolean
)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'auth'
as $function$
declare
  v_action public.opposed_actions%rowtype;
  v_item public.items%rowtype;
  v_my_character uuid;
  v_attacker_user uuid;
  v_attacker_is_npc boolean := false;
  v_source_key text;
  v_quantity integer;
  v_charges integer;
  v_rpc jsonb;
  v_audit_action_id uuid;
begin
  select *
  into v_action
  from public.opposed_actions
  where id = p_action_id
  for update;

  if v_action.id is null then
    raise exception 'Opposed Action not found.';
  end if;

  if v_action.status <> 'pending' then
    raise exception 'That Action is no longer pending.';
  end if;

  v_my_character := public.my_character_id();

  if v_my_character = v_action.target_character_id then
    null;
  elsif public.is_staff_user() and exists (
    select 1
    from public.characters c
    join public.npcs n on n.character_id = c.id
    where c.id = v_action.target_character_id
      and c.is_system = true
      and n.is_active = true
      and n.is_location_active = true
      and n.current_room_id = v_action.room_id
  ) then
    null;
  else
    raise exception 'You cannot resolve that Action.';
  end if;

  if v_action.action_kind <> 'item' then
    return jsonb_build_object('ok', true, 'handled', false);
  end if;

  if v_action.source_item_id is null
     or v_action.source_record_kind is null
     or v_action.source_record_id is null then
    raise exception 'This opposed Item is missing its source Inventory record.';
  end if;

  select *
  into v_item
  from public.items
  where id = v_action.source_item_id;

  if v_item.id is null then
    raise exception 'The source Item no longer exists.';
  end if;

  v_source_key :=
    case
      when v_action.source_record_kind = 'unique'
        then 'unique:' || v_action.source_record_id::text
      else 'standard:' || v_action.source_item_id::text
    end;

  if exists (
    select 1
    from public.character_item_use_cooldowns c
    where c.character_id = v_action.attacker_character_id
      and c.source_key = v_source_key
      and c.ready_at > now()
  ) then
    raise exception 'This Item is still on cooldown.';
  end if;

  if not p_apply_effects then
    v_audit_action_id :=
      public.character_audit_begin_action(
        'item_used',
        'item_use'
      );

    if v_item.use_behaviour = 'consumable' then
      if v_action.source_record_kind = 'standard' then
        select quantity
        into v_quantity
        from public.character_items
        where id = v_action.source_record_id
          and character_id = v_action.attacker_character_id
        for update;

        if coalesce(v_quantity, 0) <= 0 then
          raise exception 'This Item has no uses remaining.';
        end if;

        if v_quantity = 1 then
          delete from public.character_items
          where id = v_action.source_record_id
            and character_id = v_action.attacker_character_id;
        else
          update public.character_items
          set quantity = quantity - 1
          where id = v_action.source_record_id
            and character_id = v_action.attacker_character_id;
        end if;
      else
        delete from public.character_item_instances
        where id = v_action.source_record_id
          and owner_character_id = v_action.attacker_character_id
          and vault_status = 'owned';

        if not found then
          raise exception 'That Item is no longer in the attacker''s Inventory.';
        end if;
      end if;

    elsif v_item.use_behaviour = 'limited_charges' then
      if v_action.source_record_kind <> 'unique' then
        raise exception 'Limited-charge Items require an individual Item instance.';
      end if;

      select charges_remaining
      into v_charges
      from public.character_item_instances
      where id = v_action.source_record_id
        and owner_character_id = v_action.attacker_character_id
        and vault_status = 'owned'
      for update;

      if coalesce(v_charges, 0) <= 0 then
        raise exception 'This Item has no charges remaining.';
      end if;

      update public.character_item_instances
      set charges_remaining = v_charges - 1
      where id = v_action.source_record_id
        and owner_character_id = v_action.attacker_character_id
        and vault_status = 'owned';
    end if;

    perform public.character_audit_write_event(
      v_action.attacker_character_id,
      'item_used',
      'item_use',
      v_audit_action_id,
      jsonb_build_object(
        'item_id', v_item.id,
        'item_name', v_item.name,
        'record_kind', v_action.source_record_kind,
        'target_character_id', v_action.target_character_id,
        'opposed_action_id', p_action_id,
        'effects_applied', false,
        'countered', true
      ),
      'item_use',
      v_action.source_record_id::text
    );

    return jsonb_build_object(
      'ok', true,
      'handled', true,
      'effects_applied', false,
      'cooldown_started', false
    );
  end if;

  select exists (
    select 1
    from public.characters c
    join public.npcs n on n.character_id = c.id
    where c.id = v_action.attacker_character_id
      and c.is_system = true
      and n.is_active = true
      and n.is_location_active = true
      and n.current_room_id = v_action.room_id
  )
  into v_attacker_is_npc;

  if v_attacker_is_npc then
    select public.use_character_inventory_record_targeted_as_staff(
      v_action.attacker_character_id,
      v_action.source_record_kind,
      v_action.source_record_id,
      v_action.target_character_id
    )::jsonb
    into v_rpc;

    return coalesce(v_rpc, '{}'::jsonb);
  end if;

  select user_id
  into v_attacker_user
  from public.characters
  where id = v_action.attacker_character_id;

  if v_attacker_user is null then
    raise exception 'Attacker account could not be resolved.';
  end if;

  perform set_config(
    'request.jwt.claim.sub',
    v_attacker_user::text,
    true
  );

  begin
    select public.use_own_inventory_record_targeted(
      v_action.source_record_kind,
      v_action.source_record_id,
      v_action.target_character_id
    )::jsonb
    into v_rpc;
  exception
    when others then
      if sqlerrm not ilike '%no configured Use effect%' then
        raise;
      end if;

      if v_item.use_behaviour = 'consumable' then
        if v_action.source_record_kind = 'standard' then
          select quantity
          into v_quantity
          from public.character_items
          where id = v_action.source_record_id
            and character_id = v_action.attacker_character_id
          for update;

          if coalesce(v_quantity, 0) <= 0 then
            raise exception 'This Item has no uses remaining.';
          end if;

          if v_quantity = 1 then
            delete from public.character_items
            where id = v_action.source_record_id
              and character_id = v_action.attacker_character_id;
          else
            update public.character_items
            set quantity = quantity - 1
            where id = v_action.source_record_id
              and character_id = v_action.attacker_character_id;
          end if;
        else
          delete from public.character_item_instances
          where id = v_action.source_record_id
            and owner_character_id = v_action.attacker_character_id
            and vault_status = 'owned';
        end if;

      elsif v_item.use_behaviour = 'limited_charges' then
        select charges_remaining
        into v_charges
        from public.character_item_instances
        where id = v_action.source_record_id
          and owner_character_id = v_action.attacker_character_id
          and vault_status = 'owned'
        for update;

        if coalesce(v_charges, 0) <= 0 then
          raise exception 'This Item has no charges remaining.';
        end if;

        update public.character_item_instances
        set charges_remaining = v_charges - 1
        where id = v_action.source_record_id
          and owner_character_id = v_action.attacker_character_id
          and vault_status = 'owned';
      end if;

      if coalesce(v_item.cooldown_minutes, 0) > 0 then
        insert into public.character_item_use_cooldowns(
          character_id,
          source_key,
          ready_at
        )
        values(
          v_action.attacker_character_id,
          v_source_key,
          now() + make_interval(mins => v_item.cooldown_minutes)
        )
        on conflict (character_id, source_key)
        do update set ready_at = excluded.ready_at;
      end if;

      v_rpc := jsonb_build_object(
        'ok', true,
        'blocked', false,
        'damage_only_fallback', true
      );
  end;

  return coalesce(v_rpc, '{}'::jsonb);
end;
$function$;

commit;
