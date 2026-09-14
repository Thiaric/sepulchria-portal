#!/usr/bin/env python3
from pathlib import Path
import sys

ROOT = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else Path.cwd()
PATH = ROOT / "app/(portal)/game/components/RoomMessageList.tsx"

if not PATH.exists():
    raise SystemExit(f"Missing file: {PATH}")

text = PATH.read_text(encoding="utf-8")

def ensure_replace(old: str, new: str, label: str):
    global text
    if new in text:
        print(f"SKIP  {label} (already restored)")
        return
    if old not in text:
        raise SystemExit(f"Could not restore {label}: expected current block not found.")
    text = text.replace(old, new, 1)
    print(f"RESTORE {label}")

ensure_replace(
'''      const [shapeResult,priceResult]=await Promise.all([
        supabase.rpc("get_active_shape_chat_tags",{p_character_ids:ids}),
        supabase.rpc("get_active_price_chat_tags",{p_character_ids:ids}),
      ]);
''',
'''      const [shapeResult,itemResult,priceResult]=await Promise.all([
        supabase.rpc("get_active_shape_chat_tags",{p_character_ids:ids}),
        supabase.rpc("get_active_item_chat_tags_v2",{p_character_ids:ids}),
        supabase.rpc("get_active_price_chat_tags",{p_character_ids:ids}),
      ]);
''',
"Item chat RPC"
)

ensure_replace(
'''      if(priceResult.error){
        console.error("Unable to load Price chat tags:",priceResult.error.message);
        return;
      }
''',
'''      if(itemResult.error){
        console.error("Unable to load Item chat tags:",itemResult.error.message);
        return;
      }

      if(priceResult.error){
        console.error("Unable to load Price chat tags:",priceResult.error.message);
        return;
      }
''',
"Item chat RPC error handling"
)

ensure_replace(
'''        for(const row of priceResult.data??[]){
          const id=String(row.character_id);
          if(!next[id])next[id]={buffs:[],debuffs:[],conditions:[],prices:[]};
          next[id].prices=row.prices??[];
        }

        setActiveShapeTags(next);
''',
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

        for(const row of priceResult.data??[]){
          const id=String(row.character_id);
          if(!next[id])next[id]={buffs:[],debuffs:[],conditions:[],prices:[]};
          next[id].prices=row.prices??[];
        }

        setActiveShapeTags(next);
''',
"Item Conditions merge"
)

ensure_replace(
'''      .on("postgres_changes",{event:"*",schema:"public",table:"character_shape_effects"},()=>void loadShapeTags())
      .on("postgres_changes",{event:"*",schema:"public",table:"character_price_effects"},()=>void loadShapeTags())
''',
'''      .on("postgres_changes",{event:"*",schema:"public",table:"character_shape_effects"},()=>void loadShapeTags())
      .on("postgres_changes",{event:"*",schema:"public",table:"character_active_item_effects"},()=>void loadShapeTags())
      .on("postgres_changes",{event:"*",schema:"public",table:"character_price_effects"},()=>void loadShapeTags())
''',
"Item realtime subscription"
)

ensure_replace(
'''    if(tags.buffs.length)normalGroups.push(tags.buffs.join(" - "));
    if(tags.debuffs.length)normalGroups.push(tags.debuffs.join(" - "));

    if(!normalGroups.length&&!tags.prices.length)return null;
''',
'''    if(tags.buffs.length)normalGroups.push(tags.buffs.join(" - "));
    if(tags.debuffs.length)normalGroups.push(tags.debuffs.join(" - "));
    if(tags.conditions.length)normalGroups.push(tags.conditions.join(" - "));

    if(!normalGroups.length&&!tags.prices.length)return null;
''',
"live Conditions rendering"
)

PATH.write_text(text, encoding="utf-8")
print(f"\nRESTORED {PATH}")

sql = r'''begin;

drop trigger if exists trg_snapshot_room_message_conditions
on public.room_messages;

drop function if exists public.snapshot_room_message_conditions();

commit;
'''

sql_path = ROOT / "rollback_message_condition_snapshots.sql"
sql_path.write_text(sql, encoding="utf-8")
print(f"WRITE {sql_path.name}")

print("\nDONE")
print("1) Run rollback_message_condition_snapshots.sql in Supabase SQL Editor")
print("2) npm run build")
