begin;

create or replace function public.snapshot_room_message_conditions()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_subject_character_id uuid;
begin
  if new.character_id is null and new.npc_id is null then
    new.condition_snapshot := '[]'::jsonb;
    return new;
  end if;

  if coalesce(new.speaker_type, 'character') = 'npc' then
    select n.character_id
    into v_subject_character_id
    from public.npcs n
    where n.id = new.npc_id
    limit 1;
  else
    v_subject_character_id := new.character_id;
  end if;

  if v_subject_character_id is null then
    new.condition_snapshot := '[]'::jsonb;
    return new;
  end if;

  select
    coalesce(
      jsonb_agg(
        jsonb_build_object('label', c.label)
        order by c.created_at asc, c.id asc
      ),
      '[]'::jsonb
    )
  into new.condition_snapshot
  from public.character_conditions c
  where c.character_id = v_subject_character_id;

  return new;
end;
$function$;

create or replace function public.get_room_message_effect_conditions(
  p_message_ids uuid[]
)
returns table(message_id uuid, conditions jsonb)
language sql
stable
security definer
set search_path to 'public'
as $function$
  with selected_messages as (
    select
      m.id,
      case
        when coalesce(m.speaker_type, 'character') = 'npc'
          then n.character_id
        else m.character_id
      end as subject_character_id,
      m.created_at
    from public.room_messages m
    left join public.npcs n
      on n.id = m.npc_id
    where m.id = any(p_message_ids)
  ),
  effect_conditions as (
    select
      m.id as message_id,
      btrim(item_condition.value) as label
    from selected_messages m
    join public.character_active_item_effects e
      on e.character_id = m.subject_character_id
     and e.activated_at <= m.created_at
     and e.expires_at > m.created_at
    cross join lateral
      jsonb_array_elements_text(
        coalesce(to_jsonb(e)->'conditions', '[]'::jsonb)
      ) as item_condition(value)
    where m.subject_character_id is not null
      and btrim(item_condition.value) <> ''

    union

    select
      m.id as message_id,
      btrim(shape_condition.value) as label
    from selected_messages m
    join public.character_shape_effects e
      on coalesce(
           nullif(to_jsonb(e)->>'target_character_id',''),
           nullif(to_jsonb(e)->>'character_id','')
         )::uuid = m.subject_character_id
     and coalesce(
           nullif(to_jsonb(e)->>'starts_at','')::timestamptz,
           nullif(to_jsonb(e)->>'created_at','')::timestamptz,
           nullif(to_jsonb(e)->>'activated_at','')::timestamptz
         ) <= m.created_at
     and (
       nullif(to_jsonb(e)->>'expires_at','') is null
       or nullif(to_jsonb(e)->>'expires_at','')::timestamptz > m.created_at
     )
     and (
       nullif(to_jsonb(e)->>'dispelled_at','') is null
       or nullif(to_jsonb(e)->>'dispelled_at','')::timestamptz > m.created_at
     )
    cross join lateral
      jsonb_array_elements_text(
        coalesce(to_jsonb(e)->'conditions', '[]'::jsonb)
      ) as shape_condition(value)
    where m.subject_character_id is not null
      and btrim(shape_condition.value) <> ''
  )
  select
    m.id as message_id,
    to_jsonb(
      coalesce(
        array_agg(distinct ec.label order by ec.label)
          filter (where ec.label is not null and ec.label <> ''),
        '{}'::text[]
      )
    ) as conditions
  from selected_messages m
  left join effect_conditions ec
    on ec.message_id = m.id
  group by m.id;
$function$;

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

commit;
