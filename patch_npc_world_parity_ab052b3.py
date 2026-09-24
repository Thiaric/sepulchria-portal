#!/usr/bin/env python3
from pathlib import Path
import argparse, shutil, subprocess

ROOT=Path.cwd()
BASE="ab052b3"
BACKUP=ROOT/".patch_backups"/"npc_world_parity_ab052b3"

NPC_ACTIONS=Path("app/(portal)/game/npc-actions.ts")
NPC_PANEL=Path("app/(portal)/game/components/NpcControlPanel.tsx")
NPC_MECH=Path("app/(portal)/game/npc-mechanics-actions.ts")
OPPOSED=Path("app/(portal)/game/opposed-actions.ts")
WARPING=Path("app/(portal)/game/warping-actions.ts")
GAME_CONTEXT=Path("components/portal/game-context-panel.tsx")
CITY=Path("components/portal/active-city-counter.tsx")
NPC_SHEET=Path("app/(portal)/npcs/[id]/page.tsx")
FILES=[NPC_ACTIONS,NPC_PANEL,NPC_MECH,OPPOSED,WARPING,GAME_CONTEXT,CITY]

SQL_NAME="supabase_npc_world_presence.sql"
ROLLBACK_NAME="supabase_npc_world_presence_ROLLBACK.sql"

SQL_TEXT="begin;\n\nalter table public.npcs\n  add column if not exists is_location_active boolean not null default false;\n\nupdate public.npcs\nset is_location_active = true\nwhere is_active = true\n  and current_room_id is not null\n  and is_location_active = false;\n\ncreate or replace function public.sync_npc_location_presence()\nreturns trigger\nlanguage plpgsql\nsecurity definer\nset search_path to 'public'\nas $function$\nbegin\n  if new.character_id is not null then\n    update public.characters\n    set current_room_id = new.current_room_id,\n        updated_at = now()\n    where id = new.character_id\n      and is_system = true;\n  end if;\n\n  if new.is_active = true\n     and new.is_location_active = true\n     and new.character_id is not null\n     and new.current_room_id is not null then\n\n    insert into public.character_presence(\n      character_id, room_id, status, manual_status, last_seen_at,\n      appear_offline, appeared_offline_at, updated_at\n    )\n    values(\n      new.character_id,\n      new.current_room_id,\n      'online',\n      'online',\n      '9999-12-31 23:59:59+00'::timestamptz,\n      false,\n      null,\n      now()\n    )\n    on conflict(character_id)\n    do update set\n      room_id = excluded.room_id,\n      status = 'online',\n      manual_status = 'online',\n      last_seen_at = '9999-12-31 23:59:59+00'::timestamptz,\n      appear_offline = false,\n      appeared_offline_at = null,\n      updated_at = now();\n  elsif new.character_id is not null then\n    delete from public.character_presence\n    where character_id = new.character_id;\n  end if;\n\n  return new;\nend;\n$function$;\n\ndrop trigger if exists sync_npc_location_presence_trigger on public.npcs;\n\ncreate trigger sync_npc_location_presence_trigger\nafter insert or update of character_id,current_room_id,is_active,is_location_active\non public.npcs\nfor each row\nexecute function public.sync_npc_location_presence();\n\ninsert into public.character_presence(\n  character_id, room_id, status, manual_status, last_seen_at,\n  appear_offline, appeared_offline_at, updated_at\n)\nselect\n  n.character_id,\n  n.current_room_id,\n  'online',\n  'online',\n  '9999-12-31 23:59:59+00'::timestamptz,\n  false,\n  null,\n  now()\nfrom public.npcs n\njoin public.characters c on c.id=n.character_id and c.is_system=true\nwhere n.is_active=true\n  and n.is_location_active=true\n  and n.character_id is not null\n  and n.current_room_id is not null\non conflict(character_id)\ndo update set\n  room_id=excluded.room_id,\n  status='online',\n  manual_status='online',\n  last_seen_at='9999-12-31 23:59:59+00'::timestamptz,\n  appear_offline=false,\n  appeared_offline_at=null,\n  updated_at=now();\n\ndelete from public.character_presence cp\nusing public.npcs n\nwhere cp.character_id=n.character_id\n  and (\n    n.is_active=false\n    or n.is_location_active=false\n    or n.current_room_id is null\n  );\n\ncommit;\n"
ROLLBACK_TEXT='begin;\ndrop trigger if exists sync_npc_location_presence_trigger on public.npcs;\ndrop function if exists public.sync_npc_location_presence();\ndelete from public.character_presence cp using public.npcs n where cp.character_id=n.character_id;\nalter table public.npcs drop column if exists is_location_active;\ncommit;\n'
NPC_SHEET_TEXT='"use server";\n\nimport { notFound } from "next/navigation";\nimport { createClient as createAdminClient } from "@supabase/supabase-js";\nimport { createClient } from "@/lib/supabase/server";\nimport { getEffectiveCharacterAttributes } from "@/lib/characters/get-effective-character-attributes";\n\nfunction admin(){\n  const url=process.env.NEXT_PUBLIC_SUPABASE_URL;\n  const key=process.env.SUPABASE_SECRET_KEY;\n  if(!url||!key)throw new Error("Missing Supabase server credentials.");\n  return createAdminClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});\n}\nfunction one<T>(value:T|T[]|null):T|null{\n  return Array.isArray(value)?value[0]??null:value;\n}\n\nexport default async function NpcSheetPage({params}:{params:Promise<{id:string}>}){\n  const {id}=await params;\n  const session=await createClient();\n  const auth=await session.auth.getUser();\n  if(!auth.data.user)notFound();\n\n  const db=admin();\n  const result=await db\n    .from("npcs")\n    .select(`\n      id,name,pronouns,portrait_url,description,current_room_id,is_active,is_location_active,\n      race:races(id,name,icon_url),\n      order:orders(id,name),\n      character:characters!npcs_character_id_fkey(\n        id,display_name,current_health,muscles,reflexes,vigor,brains,shrewd,presence_score,life_state\n      )\n    `)\n    .eq("id",id)\n    .eq("is_active",true)\n    .eq("is_location_active",true)\n    .maybeSingle();\n\n  if(result.error||!result.data)notFound();\n\n  const npc:any=result.data;\n  const character:any=one(npc.character);\n  if(!character)notFound();\n\n  const attrs=await getEffectiveCharacterAttributes(character.id,{\n    muscles:character.muscles,\n    reflexes:character.reflexes,\n    vigor:character.vigor,\n    brains:character.brains,\n    shrewd:character.shrewd,\n    presence_score:character.presence_score,\n  });\n\n  const race:any=one(npc.race);\n  const order:any=one(npc.order);\n\n  return <div className="mx-auto w-full max-w-4xl p-6">\n    <div className="border border-[rgb(var(--sep-colour-60482e))]/50 bg-[rgb(var(--sep-colour-15100d))] p-6">\n      <div className="flex flex-col gap-5 sm:flex-row">\n        <div className="h-40 w-32 shrink-0 overflow-hidden border border-[rgb(var(--sep-colour-765937))] bg-[rgb(var(--sep-colour-100c09))]">\n          {npc.portrait_url\n            ? <img src={npc.portrait_url} alt="" className="h-full w-full object-cover"/>\n            : <div className="flex h-full items-center justify-center font-serif text-4xl text-[rgb(var(--sep-colour-8e7555))]">{npc.name?.charAt(0)??"?"}</div>}\n        </div>\n        <div className="min-w-0 flex-1">\n          <p className="text-[8px] uppercase tracking-[0.24em] text-[rgb(var(--sep-colour-876a46))]">NPC</p>\n          <h1 className="mt-1 font-serif text-3xl text-[rgb(var(--sep-colour-e0c79a))]">{npc.name}</h1>\n          <p className="mt-2 text-xs text-[rgb(var(--sep-colour-9d8d78))]">{[race?.name,order?.name,npc.pronouns].filter(Boolean).join(" · ")}</p>\n          {npc.description?<p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-[rgb(var(--sep-colour-b7a68d))]">{npc.description}</p>:null}\n        </div>\n      </div>\n\n      <div className="mt-6 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">\n        <div className="border border-[rgb(var(--sep-colour-59432c))]/40 p-3">\n          <p className="text-[8px] uppercase text-[rgb(var(--sep-colour-75644f))]">Health</p>\n          <p className="mt-1 font-serif text-xl">{character.current_health??0}</p>\n        </div>\n        <div className="border border-[rgb(var(--sep-colour-59432c))]/40 p-3">\n          <p className="text-[8px] uppercase text-[rgb(var(--sep-colour-75644f))]">State</p>\n          <p className="mt-1 font-serif text-xl">{character.life_state}</p>\n        </div>\n      </div>\n\n      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">\n        {[\n          ["Muscles",attrs.muscles],\n          ["Reflexes",attrs.reflexes],\n          ["Vigour",attrs.vigor],\n          ["Brains",attrs.brains],\n          ["Shrewd",attrs.shrewd],\n          ["Presence",attrs.presence_score],\n        ].map(([label,value])=><div key={String(label)} className="border border-[rgb(var(--sep-colour-59432c))]/40 p-3">\n          <p className="text-[8px] uppercase text-[rgb(var(--sep-colour-75644f))]">{label}</p>\n          <p className="mt-1 font-serif text-xl text-[rgb(var(--sep-colour-d7bd91))]">{String(value??0)}</p>\n        </div>)}\n      </div>\n    </div>\n  </div>;\n}\n'
PENDING_HELPERS='export async function npcCounterOpposedAction(previous:any,formData:FormData){\n  return counterOpposedAction(previous,formData);\n}\nexport async function npcResolveIncomingShape(previous:any,formData:FormData){\n  return resolveIncomingShape(previous,formData);\n}\nexport async function npcResolveIncomingDispel(previous:any,formData:FormData){\n  return resolveIncomingDispel(previous,formData);\n}\nexport async function loadNpcPendingResponses(input:{npcId:string;roomId:string}){\n  try{\n    const {a,character}=await requireStaffNpc(input.npcId,input.roomId);\n    const attrs=await getEffectiveCharacterAttributes(character.id,{\n      muscles:character.muscles,reflexes:character.reflexes,vigor:character.vigor,\n      brains:character.brains,shrewd:character.shrewd,presence_score:character.presence_score,\n    });\n    const [opposed,shapeTargets,dispels]=await Promise.all([\n      a.from("opposed_actions")\n        .select(`id,action_label,attack_total,allowed_counters,expires_at,attacker:characters!opposed_actions_attacker_character_id_fkey(display_name)`)\n        .eq("target_character_id",character.id).eq("status","pending")\n        .gt("expires_at",new Date().toISOString()).order("created_at",{ascending:true}),\n      a.from("shape_cast_targets")\n        .select(`id,target_character_id,other_effect_choice,outcome,cast:shape_casts!shape_cast_targets_cast_id_fkey(id,room_id,caster:characters!shape_casts_caster_character_id_fkey(id,display_name),shape:shapes!shape_casts_shape_id_fkey(*))`)\n        .eq("target_character_id",character.id).eq("outcome","pending").order("created_at",{ascending:true}),\n      a.from("shape_casts")\n        .select(`id,room_id,dispel_effect_id,dispel_target_character_id,caster:characters!shape_casts_caster_character_id_fkey(id,display_name),shape:shapes!shape_casts_shape_id_fkey(*)`)\n        .eq("dispel_target_character_id",character.id).not("dispel_effect_id","is",null).order("created_at",{ascending:true}),\n    ]);\n    const error=opposed.error??shapeTargets.error??dispels.error;\n    if(error)throw new Error(error.message);\n\n    const shapes=(shapeTargets.data??[]).flatMap((row:any)=>{\n      const cast=one(row.cast) as any,caster=one(cast?.caster) as any,shape=one(cast?.shape) as any;\n      if(!shape||!caster||cast?.room_id!==input.roomId||caster.id===character.id)return [];\n      const profile=row.target_character_id===caster.id?"self":shape.other_alternative_enabled&&row.other_effect_choice==="harmful"?"other_alt":"other";\n      const mode=shape[`${profile}_resolution_mode`]??shape.resolution_mode??"save";\n      if(mode!=="save")return [];\n      const saves=Array.isArray(shape[`${profile}_save_options`])?shape[`${profile}_save_options`]:(Array.isArray(shape.save_options)?shape.save_options:[]);\n      return [{id:row.id,kind:shape.is_feat_backing?"Feat":"Shape",name:shape.name,casterName:caster.display_name??"Someone",saveOptions:saves}];\n    });\n\n    const dispelRows=(dispels.data??[]).flatMap((row:any)=>{\n      const shape=one(row.shape) as any,caster=one(row.caster) as any;\n      if(!shape?.is_dispel||row.room_id!==input.roomId)return [];\n      const profile=row.dispel_target_character_id===caster?.id?"self":"other";\n      const saves=Array.isArray(shape[`${profile}_save_options`])?shape[`${profile}_save_options`]:(Array.isArray(shape.save_options)?shape.save_options:[]);\n      return [{id:row.id,name:shape.name,casterName:caster?.display_name??"Someone",saveOptions:saves}];\n    });\n\n    return {ok:true,attributes:attrs,opposed:opposed.data??[],shapes,dispels:dispelRows};\n  }catch(error){\n    return {ok:false,message:error instanceof Error?error.message:"Unable to load NPC reactions.",attributes:null,opposed:[],shapes:[],dispels:[]};\n  }\n}\n\n'
INCOMING_COMPONENT='const NPC_COUNTER_LABELS:Record<string,string>={\n  dodge:"Dodge — Reflexes",defend:"Defend — Vigour",\n  resist_vigour:"Resist — Vigour",resist_vigor:"Resist — Vigour",\n  resist_shrewd:"Resist — Shrewd",resist_brains:"Resist — Brains",resist_presence:"Resist — Presence",\n};\nconst NPC_COUNTER_ATTR:Record<string,string>={\n  dodge:"reflexes",defend:"vigor",resist_vigour:"vigor",resist_vigor:"vigor",\n  resist_shrewd:"shrewd",resist_brains:"brains",resist_presence:"presence_score",\n};\n\nfunction NpcIncomingResponses({npcId,actorCharacterId,roomId}:{npcId:string;actorCharacterId:string;roomId:string}){\n  const [data,setData]=useState<any>({ok:true,attributes:null,opposed:[],shapes:[],dispels:[]});\n  const [opposedState,opposedAction]=useActionState(npcCounterOpposedAction,{ok:false,message:""});\n  const [shapeState,shapeAction]=useActionState(npcResolveIncomingShape,{ok:false,message:""});\n  const [dispelState,dispelAction]=useActionState(npcResolveIncomingDispel,{ok:false,message:""});\n\n  const reload=useCallback(async()=>setData(await loadNpcPendingResponses({npcId,roomId})),[npcId,roomId]);\n  useEffect(()=>{void reload();const timer=window.setInterval(()=>void reload(),2500);return()=>window.clearInterval(timer);},[reload,opposedState.submittedAt,shapeState.submittedAt,dispelState.submittedAt]);\n\n  const mod=(key:string)=>{const n=Number(data.attributes?.[NPC_COUNTER_ATTR[key]]??0);return `${n>=0?"+":""}${n}`;};\n  if(!data.opposed?.length&&!data.shapes?.length&&!data.dispels?.length)return null;\n\n  return <div className="mt-3 space-y-2 border-t border-[rgb(var(--sep-colour-60482e))]/35 pt-3">\n    <p className="text-[8px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-b99765))]">Incoming Reactions</p>\n    {data.opposed?.map((entry:any)=>{\n      const attacker=Array.isArray(entry.attacker)?entry.attacker[0]:entry.attacker;\n      return <section key={entry.id} className="border border-[rgb(var(--sep-colour-986a37))]/60 bg-[rgb(var(--sep-colour-20140c))] p-3">\n        <p className="font-serif text-sm text-[rgb(var(--sep-colour-efd2a0))]">{attacker?.display_name??"Someone"} — {entry.action_label}</p>\n        <p className="mt-1 text-[9px] text-[rgb(var(--sep-colour-a18d6e))]">Action total: {entry.attack_total}</p>\n        <form action={opposedAction} className="mt-2 flex flex-wrap gap-2">\n          <input type="hidden" name="npc_actor_character_id" value={actorCharacterId}/>\n          <input type="hidden" name="opposed_action_id" value={entry.id}/>\n          {(entry.allowed_counters??[]).map((counter:string)=><button key={counter} type="submit" name="counter_kind" value={counter} className="border border-[rgb(var(--sep-colour-765937))] px-3 py-2 text-[8px] uppercase">{NPC_COUNTER_LABELS[counter]??counter} ({mod(counter)})</button>)}\n          <button type="submit" name="counter_kind" value="__do_nothing__" className="border border-[rgb(var(--sep-colour-765937))] px-3 py-2 text-[8px] uppercase">Do nothing</button>\n        </form>\n      </section>;\n    })}\n    {data.shapes?.map((entry:any)=><section key={entry.id} className="border border-[rgb(var(--sep-colour-765937))] bg-[rgb(var(--sep-colour-20140c))] p-3">\n      <p className="font-serif text-sm text-[rgb(var(--sep-colour-efd2a0))]">{entry.casterName} — {entry.name}</p>\n      <p className="mt-1 text-[9px] text-[rgb(var(--sep-colour-a18d6e))]">Incoming {entry.kind}</p>\n      <form action={shapeAction} className="mt-2 flex flex-wrap gap-2">\n        <input type="hidden" name="npc_actor_character_id" value={actorCharacterId}/>\n        <input type="hidden" name="shape_cast_target_id" value={entry.id}/>\n        {(entry.saveOptions??[]).map((save:string)=><button key={save} type="submit" name="save_choice" value={save} className="border border-[rgb(var(--sep-colour-765937))] px-3 py-2 text-[8px] uppercase">{NPC_COUNTER_LABELS[save]??save} ({mod(save)})</button>)}\n        <button type="submit" name="save_choice" value="__do_nothing__" className="border border-[rgb(var(--sep-colour-765937))] px-3 py-2 text-[8px] uppercase">Do nothing</button>\n      </form>\n    </section>)}\n    {data.dispels?.map((entry:any)=><section key={entry.id} className="border border-[rgb(var(--sep-colour-765937))] bg-[rgb(var(--sep-colour-20140c))] p-3">\n      <p className="font-serif text-sm text-[rgb(var(--sep-colour-efd2a0))]">{entry.casterName} — {entry.name}</p>\n      <p className="mt-1 text-[9px] text-[rgb(var(--sep-colour-a18d6e))]">Incoming Dispel</p>\n      <form action={dispelAction} className="mt-2 flex flex-wrap gap-2">\n        <input type="hidden" name="npc_actor_character_id" value={actorCharacterId}/>\n        <input type="hidden" name="dispel_cast_id" value={entry.id}/>\n        {(entry.saveOptions??[]).map((save:string)=><button key={save} type="submit" name="save_choice" value={save} className="border border-[rgb(var(--sep-colour-765937))] px-3 py-2 text-[8px] uppercase">{NPC_COUNTER_LABELS[save]??save} ({mod(save)})</button>)}\n        <button type="submit" name="save_choice" value="__do_nothing__" className="border border-[rgb(var(--sep-colour-765937))] px-3 py-2 text-[8px] uppercase">Do nothing</button>\n      </form>\n    </section>)}\n  </div>;\n}\n\n'
ACTIVE_CONTROLS_OLD='{!creating?<label className="mt-3 flex items-center gap-2 text-[8px] uppercase"><input type="checkbox" checked={active} onChange={e=>setActive(e.target.checked)}/>Active</label>:null}'
ACTIVE_CONTROLS_NEW='{!creating?<div className="mt-3 flex flex-wrap gap-4">\n          <label className="flex items-center gap-2 text-[8px] uppercase"><input type="checkbox" checked={active} onChange={e=>setActive(e.target.checked)}/>NPC record active</label>\n          <label className="flex items-center gap-2 text-[8px] uppercase"><input type="checkbox" checked={locationActive} onChange={e=>setLocationActive(e.target.checked)}/>Active in Locations</label>\n        </div>:null}'
WARPING_OLD='async function mine(){const db=await createClient(),au=await db.auth.getUser();if(!au.data.user)throw Error("Authentication required.");const q=await db.from("characters").select("id,display_name,current_room_id,muscles,reflexes,vigor,brains,shrewd,presence_score,life_state").eq("user_id",au.data.user.id).maybeSingle();if(q.error||!q.data)throw Error("Character not found.");if(q.data.life_state!=="alive")throw Error(q.data.life_state==="dead"?"Dead Characters cannot Warp Shapes or respond with Saves.":"Characters at Death\'s Threshold cannot Warp Shapes or respond with Saves.");return q.data}'
WARPING_NEW='async function mine(formData?:FormData){\n const db=await createClient(),au=await db.auth.getUser();\n if(!au.data.user)throw Error("Authentication required.");\n const npcActorId=field(formData??new FormData(),"npc_actor_character_id");\n if(npcActorId){\n  const {getStaffSession}=await import("@/lib/auth/require-staff");\n  const staff=await getStaffSession();\n  if(!staff||!["owner","admin","master"].includes(staff.role))throw Error("NPC reactions require Master/Admin/Owner access.");\n  const a=admin();\n  const link=await a.from("npcs").select("id,current_room_id,is_active,is_location_active").eq("character_id",npcActorId).eq("is_active",true).eq("is_location_active",true).maybeSingle();\n  if(link.error||!link.data)throw Error(link.error?.message??"Active NPC not found.");\n  const q=await a.from("characters").select("id,display_name,current_room_id,muscles,reflexes,vigor,brains,shrewd,presence_score,life_state").eq("id",npcActorId).eq("is_system",true).maybeSingle();\n  if(q.error||!q.data)throw Error(q.error?.message??"NPC Character not found.");\n  if(q.data.current_room_id!==link.data.current_room_id)throw Error("NPC Location is out of sync.");\n  if(q.data.life_state!=="alive")throw Error(q.data.life_state==="dead"?"Dead Characters cannot Warp Shapes or respond with Saves.":"Characters at Death\'s Threshold cannot Warp Shapes or respond with Saves.");\n  return q.data;\n }\n const q=await db.from("characters").select("id,display_name,current_room_id,muscles,reflexes,vigor,brains,shrewd,presence_score,life_state").eq("user_id",au.data.user.id).maybeSingle();\n if(q.error||!q.data)throw Error("Character not found.");\n if(q.data.life_state!=="alive")throw Error(q.data.life_state==="dead"?"Dead Characters cannot Warp Shapes or respond with Saves.":"Characters at Death\'s Threshold cannot Warp Shapes or respond with Saves.");\n return q.data;\n}'

def die(msg):
    raise SystemExit(f"\nERROR: {msg}\n")

def head():
    try:
        return subprocess.check_output(["git","rev-parse","--short","HEAD"],cwd=ROOT,text=True,stderr=subprocess.DEVNULL).strip()
    except Exception:
        return "unknown"

def read(rel):
    p=ROOT/rel
    if not p.exists(): die(f"Missing expected file: {rel}")
    return p.read_text(encoding="utf-8")

def rep(s,old,new,label,count=1):
    n=s.count(old)
    if n!=count: die(f"{label}: expected {count} match(es), found {n}")
    return s.replace(old,new,count)

def backup():
    if BACKUP.exists():
        print(f"Backup already exists: {BACKUP}")
        return
    for rel in FILES:
        src=ROOT/rel
        dst=BACKUP/rel
        dst.parent.mkdir(parents=True,exist_ok=True)
        shutil.copy2(src,dst)
    print(f"Backup created: {BACKUP}")

def revert():
    if not BACKUP.exists(): die(f"No backup found at {BACKUP}")
    for rel in FILES:
        src=BACKUP/rel
        if src.exists():
            dst=ROOT/rel
            dst.parent.mkdir(parents=True,exist_ok=True)
            shutil.copy2(src,dst)
            print(f"Restored {rel}")
    sheet=ROOT/NPC_SHEET
    if sheet.exists():
        sheet.unlink()
        print(f"Removed {NPC_SHEET}")
    print("Code reverted. Nothing committed or pushed.")
    print(f"If SQL was run, also run {ROLLBACK_NAME}.")

def patch_npc_actions(s):
    s=rep(s,'  is_active:boolean; race_id:string|null; race:NpcRace|null;','  is_active:boolean; is_location_active:boolean; race_id:string|null; race:NpcRace|null;',"StaffNpc type")
    s=rep(s,'id,name,pronouns,portrait_url,description,current_room_id,is_active,race_id,order_id,character_id,','id,name,pronouns,portrait_url,description,current_room_id,is_active,is_location_active,race_id,order_id,character_id,',"NPC select")
    s=rep(s,'is_active:row.is_active===true,race_id:','is_active:row.is_active===true,is_location_active:row.is_location_active===true,race_id:',"NPC map")
    s=rep(s,'current_room_id:input.roomId,is_active:true,created_by_user_id:','current_room_id:input.roomId,is_active:true,is_location_active:true,created_by_user_id:',"NPC create active-in-location")
    s=rep(s,'export async function updateNpc(input:{npcId:string;roomId:string;name:string;pronouns?:string;portraitUrl?:string;description?:string;raceId?:string;orderId?:string;isActive:boolean;moveHere:boolean})','export async function updateNpc(input:{npcId:string;roomId:string;name:string;pronouns?:string;portraitUrl?:string;description?:string;raceId?:string;orderId?:string;isActive:boolean;isLocationActive:boolean;moveHere:boolean})',"updateNpc input")
    s=rep(s,'order_id:orderId,is_active:input.isActive,updated_by_user_id:','order_id:orderId,is_active:input.isActive,is_location_active:input.isLocationActive,updated_by_user_id:',"updateNpc write")
    return s

def patch_panel(s):
    s=rep(s,'  npcStartWeaponOpposedAttack,\n} from "../npc-mechanics-actions";','  npcStartWeaponOpposedAttack,\n  loadNpcPendingResponses,\n  npcCounterOpposedAction,\n  npcResolveIncomingShape,\n  npcResolveIncomingDispel,\n} from "../npc-mechanics-actions";',"response imports")
    if "function NpcIncomingResponses" not in s:
        s=rep(s,"\n\nexport function NpcControlPanel",INCOMING_COMPONENT+"\n\nexport function NpcControlPanel","incoming component")
    s=rep(s,'const [raceId,setRaceId]=useState(""); const [orderId,setOrderId]=useState(""); const [active,setActive]=useState(true);','const [raceId,setRaceId]=useState(""); const [orderId,setOrderId]=useState(""); const [active,setActive]=useState(true); const [locationActive,setLocationActive]=useState(true);',"location state")
    s=rep(s,'setDescription(selected.description??"");setRaceId(selected.race_id??"");setOrderId(selected.order_id??"");setActive(selected.is_active);','setDescription(selected.description??"");setRaceId(selected.race_id??"");setOrderId(selected.order_id??"");setActive(selected.is_active);setLocationActive(selected.is_location_active);',"load selected location state",2)
    s=rep(s,'setDescription("");setRaceId("");setOrderId("");setActive(true);setStatus("");','setDescription("");setRaceId("");setOrderId("");setActive(true);setLocationActive(true);setStatus("");',"new location state")
    s=rep(s,'raceId,orderId,isActive:active,moveHere:','raceId,orderId,isActive:active,isLocationActive:locationActive,moveHere:',"save location state")
    s=rep(s,ACTIVE_CONTROLS_OLD,ACTIVE_CONTROLS_NEW,"active controls")
    anchor='    {selected&&<div className="border-t border-[rgb(var(--sep-colour-60482e))]/35 pt-3">\n      <p className="mb-2 text-[8px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-b99765))]">Post as {selected.name}</p>'
    insertion='    {selected&&selected.character_id&&inThisRoom&&selected.is_location_active?<NpcIncomingResponses npcId={selected.id} actorCharacterId={selected.character_id} roomId={roomId}/>:null}\n\n'
    s=rep(s,anchor,insertion+anchor,"incoming reactions placement")
    return s

def patch_mech(s):
    s=rep(s,'import { resolveImmediateShapeCastForNpc } from "./warping-actions";','import { resolveImmediateShapeCastForNpc, resolveIncomingShape, resolveIncomingDispel } from "./warping-actions";',"warping response imports")
    s=rep(s,'  startWeaponOpposedAttack,\n} from "./opposed-actions";','  startWeaponOpposedAttack,\n  counterOpposedAction,\n} from "./opposed-actions";',"opposed response import")
    if "export async function loadNpcPendingResponses" not in s:
        s=rep(s,"export async function loadNpcMechanicsData",PENDING_HELPERS+"\nexport async function loadNpcMechanicsData","pending response helpers")
    s=rep(s,'.filter((x:any)=>x&&x.status==="approved"&&x.is_system!==true&&x.id!==character.id)','.filter((x:any)=>x&&x.status==="approved"&&x.id!==character.id)',"NPC can target NPC")
    return s

def patch_opposed(s):
    s=rep(s,'const { supabase, character } = await ownedCharacter();','const { supabase, character } = await ownedCharacter(formData);',"counter NPC actor")
    return s

def patch_warping(s):
    s=rep(s,WARPING_OLD,WARPING_NEW,"warping NPC reaction actor")
    s=rep(s,'const c=await mine(),id=field(f,"shape_cast_target_id")','const c=await mine(f),id=field(f,"shape_cast_target_id")',"shape reaction actor")
    s=rep(s,'const c=await mine(),castId=field(f,"dispel_cast_id")','const c=await mine(f),castId=field(f,"dispel_cast_id")',"dispel reaction actor")
    return s

def patch_game_context(s):
    s=rep(s,'  public_slug: string;\n  title: string | null;','  public_slug: string;\n  is_system: boolean;\n  title: string | null;',"sidebar type")
    s=rep(s,'  public_slug,\n                title,','  public_slug,\n                is_system,\n                title,',"sidebar query")
    s=rep(s,'href: `/characters/${person.public_slug}?from=game`,','href: person.is_system?`/npcs/${person.id}`:`/characters/${person.public_slug}?from=game`,',"sidebar NPC route")
    s=rep(s,'person.id !== currentCharacterId &&\n      !blockedCharacterIds.has(person.id) &&','person.id !== currentCharacterId &&\n      !person.is_system &&\n      !blockedCharacterIds.has(person.id) &&',"hide NPC message sidebar")
    return s

def patch_city(s):
    s=rep(s,'  public_slug: string;\n  title: string | null;','  public_slug: string;\n  is_system: boolean;\n  title: string | null;',"city type")
    s=rep(s,'  public_slug,\n  title,','  public_slug,\n  is_system,\n  title,',"city query")
    s=rep(s,'!communication.blocked &&\n                      !blockedCharacterIds.has(','!person.is_system &&\n                      !communication.blocked &&\n                      !blockedCharacterIds.has(',"hide NPC message city")
    s=rep(s,'href: `/characters/${person.public_slug}`,','href: person.is_system?`/npcs/${person.id}`:`/characters/${person.public_slug}`,',"city NPC route")
    return s

def apply():
    h=head()
    print(f"Current HEAD: {h}")
    if h!=BASE: print(f"WARNING: built against {BASE}; current HEAD is {h}")

    transformed={
      NPC_ACTIONS:patch_npc_actions(read(NPC_ACTIONS)),
      NPC_PANEL:patch_panel(read(NPC_PANEL)),
      NPC_MECH:patch_mech(read(NPC_MECH)),
      OPPOSED:patch_opposed(read(OPPOSED)),
      WARPING:patch_warping(read(WARPING)),
      GAME_CONTEXT:patch_game_context(read(GAME_CONTEXT)),
      CITY:patch_city(read(CITY)),
    }

    backup()
    for rel,data in transformed.items():
        (ROOT/rel).write_text(data,encoding="utf-8")
        print(f"Patched {rel}")

    sheet=ROOT/NPC_SHEET
    sheet.parent.mkdir(parents=True,exist_ok=True)
    sheet.write_text(NPC_SHEET_TEXT,encoding="utf-8")
    print(f"Created {NPC_SHEET}")

    (ROOT/SQL_NAME).write_text(SQL_TEXT,encoding="utf-8")
    (ROOT/ROLLBACK_NAME).write_text(ROLLBACK_TEXT,encoding="utf-8")
    print(f"Created {SQL_NAME}")
    print(f"Created {ROLLBACK_NAME}")

    print("\nPATCH APPLIED LOCALLY ONLY.")
    print("Nothing committed or pushed.")
    print("\nNext:")
    print(f"1) Run {SQL_NAME} in Supabase SQL Editor")
    print("2) Run: npm run build")
    print("\nRevert:")
    print("python patch_npc_world_parity_ab052b3.py --revert")

def main():
    p=argparse.ArgumentParser()
    p.add_argument("--revert",action="store_true")
    a=p.parse_args()
    revert() if a.revert else apply()

if __name__=="__main__":
    main()
