begin;

alter table public.npcs
  add column if not exists is_location_active boolean not null default false;

update public.npcs
set is_location_active = true
where is_active = true
  and current_room_id is not null
  and is_location_active = false;

create or replace function public.sync_npc_location_presence()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if new.character_id is not null then
    update public.characters
    set current_room_id = new.current_room_id,
        updated_at = now()
    where id = new.character_id
      and is_system = true;
  end if;

  if new.is_active = true
     and new.is_location_active = true
     and new.character_id is not null
     and new.current_room_id is not null then

    insert into public.character_presence(
      character_id, room_id, status, manual_status, last_seen_at,
      appear_offline, appeared_offline_at, updated_at
    )
    values(
      new.character_id,
      new.current_room_id,
      'online',
      'online',
      '9999-12-31 23:59:59+00'::timestamptz,
      false,
      null,
      now()
    )
    on conflict(character_id)
    do update set
      room_id = excluded.room_id,
      status = 'online',
      manual_status = 'online',
      last_seen_at = '9999-12-31 23:59:59+00'::timestamptz,
      appear_offline = false,
      appeared_offline_at = null,
      updated_at = now();
  elsif new.character_id is not null then
    delete from public.character_presence
    where character_id = new.character_id;
  end if;

  return new;
end;
$function$;

drop trigger if exists sync_npc_location_presence_trigger on public.npcs;

create trigger sync_npc_location_presence_trigger
after insert or update of character_id,current_room_id,is_active,is_location_active
on public.npcs
for each row
execute function public.sync_npc_location_presence();

insert into public.character_presence(
  character_id, room_id, status, manual_status, last_seen_at,
  appear_offline, appeared_offline_at, updated_at
)
select
  n.character_id,
  n.current_room_id,
  'online',
  'online',
  '9999-12-31 23:59:59+00'::timestamptz,
  false,
  null,
  now()
from public.npcs n
join public.characters c on c.id=n.character_id and c.is_system=true
where n.is_active=true
  and n.is_location_active=true
  and n.character_id is not null
  and n.current_room_id is not null
on conflict(character_id)
do update set
  room_id=excluded.room_id,
  status='online',
  manual_status='online',
  last_seen_at='9999-12-31 23:59:59+00'::timestamptz,
  appear_offline=false,
  appeared_offline_at=null,
  updated_at=now();

delete from public.character_presence cp
using public.npcs n
where cp.character_id=n.character_id
  and (
    n.is_active=false
    or n.is_location_active=false
    or n.current_room_id is null
  );

commit;
