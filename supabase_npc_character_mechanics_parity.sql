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
    'name', v_npc.name,
    'pronouns', v_npc.pronouns,
    'portrait_url', v_npc.portrait_url,
    'description', v_npc.description,
    'race', v_race
  );

  return new;
end;
$function$;

drop trigger if exists aaa_normalize_npc_mechanics_room_message
on public.room_messages;

create trigger aaa_normalize_npc_mechanics_room_message
before insert on public.room_messages
for each row
execute function public.normalize_npc_mechanics_room_message();

commit;
