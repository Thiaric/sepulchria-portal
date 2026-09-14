#!/usr/bin/env python3
from pathlib import Path
import sys

ROOT = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else Path.cwd()

def patch(path_str: str, old: str, new: str) -> None:
    path = ROOT / path_str
    if not path.exists():
        raise SystemExit(f"Missing file: {path}")

    text = path.read_text(encoding="utf-8")

    if new in text:
        print(f"SKIP  {path_str} (already patched)")
        return

    if old not in text:
        raise SystemExit(
            f"\nCould not find expected block in:\n  {path_str}\n\n"
            "Stop here: use the current RoomMessageList.tsx you pasted."
        )

    path.write_text(text.replace(old, new, 1), encoding="utf-8")
    print(f"PATCH {path_str}")

path = "app/(portal)/game/components/RoomMessageList.tsx"

patch(
    path,
    '''      const [shapeResult,itemResult,priceResult]=await Promise.all([
        supabase.rpc("get_active_shape_chat_tags",{p_character_ids:ids}),
        supabase.rpc("get_active_item_chat_tags_v2",{p_character_ids:ids}),
        supabase.rpc("get_active_price_chat_tags",{p_character_ids:ids}),
      ]);
''',
    '''      const [shapeResult,priceResult]=await Promise.all([
        supabase.rpc("get_active_shape_chat_tags",{p_character_ids:ids}),
        supabase.rpc("get_active_price_chat_tags",{p_character_ids:ids}),
      ]);
''',
)

patch(
    path,
    '''      if(itemResult.error){
        console.error("Unable to load Item chat tags:",itemResult.error.message);
        return;
      }

''',
    '',
)

patch(
    path,
    '''        for(const row of itemResult.data??[]){
          const id=String(row.character_id);
          if(!next[id])next[id]={buffs:[],debuffs:[],conditions:[],prices:[]};

          const mergedConditions=[
            ...(next[id].conditions??[]),
            ...(Array.isArray(row.conditions)
              ? row.conditions
              : []),
          ];

          next[id].conditions=[
            ...new Set(mergedConditions),
          ];
        }

''',
    '',
)

patch(
    path,
    '''      .on("postgres_changes",{event:"*",schema:"public",table:"character_shape_effects"},()=>void loadShapeTags())
      .on("postgres_changes",{event:"*",schema:"public",table:"character_active_item_effects"},()=>void loadShapeTags())
      .on("postgres_changes",{event:"*",schema:"public",table:"character_price_effects"},()=>void loadShapeTags())
''',
    '''      .on("postgres_changes",{event:"*",schema:"public",table:"character_shape_effects"},()=>void loadShapeTags())
      .on("postgres_changes",{event:"*",schema:"public",table:"character_price_effects"},()=>void loadShapeTags())
''',
)

patch(
    path,
    '''    if(tags.buffs.length)normalGroups.push(tags.buffs.join(" - "));
    if(tags.debuffs.length)normalGroups.push(tags.debuffs.join(" - "));
    if(tags.conditions.length)normalGroups.push(tags.conditions.join(" - "));
''',
    '''    if(tags.buffs.length)normalGroups.push(tags.buffs.join(" - "));
    if(tags.debuffs.length)normalGroups.push(tags.debuffs.join(" - "));
''',
)

sql = r'''begin;

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
'''

sql_path = ROOT / "supabase_message_condition_snapshots.sql"
sql_path.write_text(sql, encoding="utf-8")
print(f"WRITE {sql_path.name}")

print()
print("DONE")
print("1) Run supabase_message_condition_snapshots.sql in Supabase SQL Editor")
print("2) npm run build")
print("3) While Warm is active, send a NEW location message")
print("4) Messages from before Warm must remain unchanged; the new message should show Warm")
