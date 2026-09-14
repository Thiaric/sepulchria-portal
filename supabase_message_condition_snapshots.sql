begin;

create or replace function public.snapshot_room_message_conditions()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_message_time timestamptz;
begin
  if coalesce(new.speaker_type, 'character') = 'npc' then
    new.condition_snapshot := '[]'::jsonb;
    return new;
  end if;

  if new.character_id is null then
    new.condition_snapshot := '[]'::jsonb;
    return new;
  end if;

  v_message_time := coalesce(new.created_at, now());

  with all_conditions as (
    select
      btrim(c.label) as label
    from public.character_conditions c
    where c.character_id = new.character_id
      and btrim(coalesce(c.label, '')) <> ''

    union

    select
      btrim(condition_label) as label
    from public.character_shape_effects e
    cross join lateral
      unnest(coalesce(e.conditions, '{}'::text[]))
      as condition_label
    where e.character_id = new.character_id
      and e.starts_at <= v_message_time
      and (
        e.expires_at is null
        or e.expires_at > v_message_time
      )
      and btrim(condition_label) <> ''

    union

    select
      btrim(condition_label) as label
    from public.character_active_item_effects e
    cross join lateral
      unnest(coalesce(e.conditions, '{}'::text[]))
      as condition_label
    where e.character_id = new.character_id
      and e.activated_at <= v_message_time
      and e.expires_at > v_message_time
      and btrim(condition_label) <> ''
  )
  select
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'label',
          label
        )
        order by label
      ),
      '[]'::jsonb
    )
  into new.condition_snapshot
  from (
    select distinct label
    from all_conditions
    where label <> ''
  ) deduped;

  return new;
end;
$function$;

drop trigger if exists trg_snapshot_room_message_conditions
on public.room_messages;

create trigger trg_snapshot_room_message_conditions
before insert
on public.room_messages
for each row
execute function public.snapshot_room_message_conditions();

commit;

select
  id,
  character_id,
  message,
  condition_snapshot,
  created_at
from public.room_messages
where character_id = '37f69d7c-bcdf-4e03-9d39-ccae5c8cd750'::uuid
order by created_at desc
limit 10;
