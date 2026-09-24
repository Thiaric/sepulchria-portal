begin;

create or replace function public.use_character_inventory_record_targeted_as_staff(
  p_source_character_id uuid,
  p_record_kind text,
  p_record_id uuid,
  p_target_character_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_source_room_id uuid;
  v_item_id uuid;
  v_item_instance_id uuid;
  v_item_name text;
  v_is_usable boolean;
  v_use_behaviour text;
  v_target_mode text;
  v_cooldown_minutes integer;
  v_max_charges integer;
  v_charges_remaining integer;
  v_quantity integer;
  v_target_character_id uuid;
  v_target_name text;
  v_target_room_id uuid;
  v_target_health integer;
  v_target_max_health integer;
  v_source_key text;
  v_ready_at timestamptz;
  v_has_use_effect boolean:=false;
  v_has_temporary boolean:=false;
  v_has_applicable_instant boolean:=false;
  v_has_positive_heal boolean:=false;
  v_health_delta integer:=0;
  v_temporary_count integer:=0;
  v_effect record;
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
    join public.npcs n on n.character_id=c.id
    where c.id=p_source_character_id
      and c.is_system=true
      and c.status='approved'
      and n.is_active=true
  ) then
    raise exception 'NPC Character not found.';
  end if;

  if p_record_kind='standard' then
    select c.current_room_id,ci.item_id,null::uuid,i.name,i.is_usable,
           i.use_behaviour,i.target_mode,i.cooldown_minutes,i.max_charges,
           null::integer,ci.quantity
    into v_source_room_id,v_item_id,v_item_instance_id,v_item_name,
         v_is_usable,v_use_behaviour,v_target_mode,v_cooldown_minutes,
         v_max_charges,v_charges_remaining,v_quantity
    from public.character_items ci
    join public.items i on i.id=ci.item_id
    join public.characters c on c.id=ci.character_id
    where ci.id=p_record_id and ci.character_id=p_source_character_id;

  elsif p_record_kind='unique' then
    select c.current_room_id,inst.item_id,inst.id,coalesce(inst.custom_name,i.name),
           i.is_usable,i.use_behaviour,i.target_mode,i.cooldown_minutes,i.max_charges,
           coalesce(inst.charges_remaining,i.max_charges),1
    into v_source_room_id,v_item_id,v_item_instance_id,v_item_name,
         v_is_usable,v_use_behaviour,v_target_mode,v_cooldown_minutes,
         v_max_charges,v_charges_remaining,v_quantity
    from public.character_item_instances inst
    join public.items i on i.id=inst.item_id
    join public.characters c on c.id=inst.owner_character_id
    where inst.id=p_record_id
      and inst.owner_character_id=p_source_character_id
      and inst.vault_status='owned';

  else
    raise exception 'Invalid inventory record type.';
  end if;

  if v_item_id is null then
    raise exception 'NPC does not own this Item.';
  end if;

  if coalesce(v_is_usable,false)=false then
    raise exception 'This Item cannot be used.';
  end if;

  if coalesce(v_target_mode,'self')='self' then
    v_target_character_id:=p_source_character_id;
  elsif v_target_mode='other' then
    if p_target_character_id is null then
      raise exception 'Choose a target.';
    end if;
    if p_target_character_id=p_source_character_id then
      raise exception 'This Item must target another character.';
    end if;
    v_target_character_id:=p_target_character_id;
  elsif v_target_mode='either' then
    v_target_character_id:=coalesce(p_target_character_id,p_source_character_id);
  else
    raise exception 'Invalid Item target mode.';
  end if;

  select c.display_name,c.current_room_id,c.current_health
  into v_target_name,v_target_room_id,v_target_health
  from public.characters c
  where c.id=v_target_character_id and c.status='approved';

  if v_target_room_id is null then
    raise exception 'Target character is not available.';
  end if;

  if v_target_character_id<>p_source_character_id
     and v_source_room_id<>v_target_room_id then
    raise exception 'Target character must be in the same location.';
  end if;

  v_source_key:=case
    when p_record_kind='standard' then 'standard:'||v_item_id::text
    else 'unique:'||v_item_instance_id::text
  end;

  select ready_at into v_ready_at
  from public.character_item_use_cooldowns
  where character_id=p_source_character_id and source_key=v_source_key;

  if v_ready_at is not null and v_ready_at>now() then
    raise exception 'This Item is still on cooldown.';
  end if;

  v_target_max_health:=public.get_character_current_max_health(v_target_character_id);
  v_target_health:=greatest(
    0,
    least(coalesce(v_target_health,v_target_max_health),v_target_max_health)
  );

  select
    exists(select 1 from public.item_effects e
           where e.item_id=v_item_id and e.trigger_type='use'),
    exists(select 1 from public.item_effects e
           where e.item_id=v_item_id and e.trigger_type='use'
             and e.effect_mode='temporary'),
    exists(select 1 from public.item_effects e
           where e.item_id=v_item_id and e.trigger_type='use'
             and e.effect_mode='instant' and e.health_delta>0),
    exists(select 1 from public.item_effects e
           where e.item_id=v_item_id and e.trigger_type='use'
             and e.effect_mode='instant'
             and (
               (e.health_delta>0 and v_target_health<v_target_max_health)
               or
               (e.health_delta<0 and v_target_health>0)
             ))
  into v_has_use_effect,v_has_temporary,v_has_positive_heal,v_has_applicable_instant;

  if not v_has_use_effect then
    return jsonb_build_object(
      'ok',false,'blocked',true,
      'block_reason','This Item has no configured Use effect.'
    );
  end if;

  if not v_has_temporary and not v_has_applicable_instant then
    if v_has_positive_heal and v_target_health>=v_target_max_health then
      return jsonb_build_object(
        'ok',false,'blocked',true,
        'block_reason','Target is already at full Health.'
      );
    end if;

    return jsonb_build_object(
      'ok',false,'blocked',true,
      'block_reason','This Item would have no effect on that target right now.'
    );
  end if;

  for v_effect in
    select e.*
    from public.item_effects e
    where e.item_id=v_item_id and e.trigger_type='use'
    order by e.sort_order,e.id
  loop
    if v_effect.effect_mode='instant' then
      v_health_delta:=v_health_delta+coalesce(v_effect.health_delta,0);

    elsif v_effect.effect_mode='temporary' then
      if coalesce(v_effect.allow_duplicate_stacking,false)=false then
        delete from public.character_active_item_effects
        where character_id=v_target_character_id
          and source_effect_id=v_effect.id;
      end if;

      insert into public.character_active_item_effects(
        character_id,item_id,item_instance_id,source_effect_id,source_name,
        muscles_modifier,reflexes_modifier,vigour_modifier,shrewd_modifier,
        brains_modifier,presence_modifier,max_health_modifier,
        warping_affinity_modifier,warps_per_day_modifier,
        activated_at,expires_at
      )
      values(
        v_target_character_id,v_item_id,v_item_instance_id,v_effect.id,v_item_name,
        coalesce(v_effect.muscles_modifier,0),
        coalesce(v_effect.reflexes_modifier,0),
        coalesce(v_effect.vigour_modifier,0),
        coalesce(v_effect.shrewd_modifier,0),
        coalesce(v_effect.brains_modifier,0),
        coalesce(v_effect.presence_modifier,0),
        coalesce(v_effect.max_health_modifier,0),
        coalesce(v_effect.warping_affinity_modifier,0),
        coalesce(v_effect.warps_per_day_modifier,0),
        now(),
        now()+make_interval(mins=>v_effect.duration_minutes)
      );

      v_temporary_count:=v_temporary_count+1;
    end if;
  end loop;

  if v_health_delta<>0 then
    v_target_max_health:=public.get_character_current_max_health(v_target_character_id);

    update public.characters
    set current_health=greatest(
          0,
          least(
            coalesce(current_health,v_target_max_health)+v_health_delta,
            v_target_max_health
          )
        ),
        updated_at=now()
    where id=v_target_character_id;
  end if;

  if p_record_kind='standard' and v_use_behaviour='consumable' then
    if v_quantity<=1 then
      delete from public.character_items where id=p_record_id;
    else
      update public.character_items
      set quantity=quantity-1,updated_at=now()
      where id=p_record_id;
    end if;

  elsif p_record_kind='unique' and v_max_charges is not null then
    update public.character_item_instances
    set charges_remaining=greatest(
          0,
          coalesce(charges_remaining,v_max_charges)-1
        ),
        updated_at=now()
    where id=p_record_id;

    v_charges_remaining:=greatest(
      0,
      coalesce(v_charges_remaining,v_max_charges)-1
    );
  end if;

  if coalesce(v_cooldown_minutes,0)>0 then
    v_ready_at:=now()+make_interval(mins=>v_cooldown_minutes);

    insert into public.character_item_use_cooldowns(
      character_id,source_key,item_id,item_instance_id,ready_at,updated_at
    )
    values(
      p_source_character_id,v_source_key,v_item_id,v_item_instance_id,
      v_ready_at,now()
    )
    on conflict(character_id,source_key)
    do update set
      ready_at=excluded.ready_at,
      updated_at=now();
  end if;

  return jsonb_build_object(
    'ok',true,
    'item_name',v_item_name,
    'target_character_id',v_target_character_id,
    'target_name',v_target_name,
    'health_delta',v_health_delta,
    'temporary_effects',v_temporary_count,
    'charges_remaining',v_charges_remaining,
    'cooldown_ready_at',v_ready_at
  );
end;
$function$;

revoke all on function public.use_character_inventory_record_targeted_as_staff(
  uuid,text,uuid,uuid
) from public,anon;

grant execute on function public.use_character_inventory_record_targeted_as_staff(
  uuid,text,uuid,uuid
) to authenticated;

grant execute on function public.use_character_inventory_record_targeted_as_staff(
  uuid,text,uuid,uuid
) to service_role;

commit;
