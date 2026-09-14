begin;

alter table public.item_effects
add column if not exists conditions text[] not null default '{}';

alter table public.character_active_item_effects
add column if not exists conditions text[] not null default '{}';

do $patch$
declare
  f text;
begin
  select pg_get_functiondef(p.oid)
  into f
  from pg_proc p
  join pg_namespace n
    on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname = 'use_own_inventory_record_targeted'
  order by p.oid desc
  limit 1;

  if f is null then
    raise exception 'use_own_inventory_record_targeted was not found';
  end if;

  if position('v_condition_count integer := 0;' in f) = 0 then
    f := replace(
      f,
      '  v_temporary_count integer := 0;' || chr(10),
      '  v_temporary_count integer := 0;' || chr(10) ||
      '  v_condition_count integer := 0;' || chr(10)
    );
  end if;

  if position('source_name,conditions,' in f) = 0 then
    f := replace(
      f,
      '        character_id,item_id,item_instance_id,source_effect_id,source_name,' || chr(10) ||
      '        muscles_modifier,reflexes_modifier,vigour_modifier,shrewd_modifier,',
      '        character_id,item_id,item_instance_id,source_effect_id,source_name,conditions,' || chr(10) ||
      '        muscles_modifier,reflexes_modifier,vigour_modifier,shrewd_modifier,'
    );

    f := replace(
      f,
      '        v_target_character_id,v_item_id,v_item_instance_id,v_effect.id,v_item_name,' || chr(10) ||
      '        coalesce(v_effect.muscles_modifier,0),coalesce(v_effect.reflexes_modifier,0),',
      '        v_target_character_id,v_item_id,v_item_instance_id,v_effect.id,v_item_name,' || chr(10) ||
      '        coalesce(v_effect.conditions,''{}''::text[]),' || chr(10) ||
      '        coalesce(v_effect.muscles_modifier,0),coalesce(v_effect.reflexes_modifier,0),'
    );

    f := replace(
      f,
      '      v_temporary_count:=v_temporary_count+1;' || chr(10),
      '      v_temporary_count:=v_temporary_count+1;' || chr(10) ||
      '      v_condition_count:=v_condition_count+coalesce(cardinality(v_effect.conditions),0);' || chr(10)
    );
  end if;

  if position('''conditions'',v_condition_count' in f) = 0 then
    f := replace(
      f,
      '''health_delta'',v_health_delta,''temporary_effects'',v_temporary_count,' || chr(10) ||
      '      ''charges_remaining'',v_charges_remaining',
      '''health_delta'',v_health_delta,''temporary_effects'',v_temporary_count,' || chr(10) ||
      '      ''conditions'',v_condition_count,''charges_remaining'',v_charges_remaining'
    );

    f := replace(
      f,
      '''target_name'',v_target_name,''health_delta'',v_health_delta,''temporary_effects'',v_temporary_count,' || chr(10) ||
      '    ''charges_remaining'',v_charges_remaining,''cooldown_ready_at'',v_ready_at',
      '''target_name'',v_target_name,''health_delta'',v_health_delta,''temporary_effects'',v_temporary_count,' || chr(10) ||
      '    ''conditions'',v_condition_count,''charges_remaining'',v_charges_remaining,''cooldown_ready_at'',v_ready_at'
    );
  end if;

  execute f;
end
$patch$;

commit;
