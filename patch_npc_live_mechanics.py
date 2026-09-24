#!/usr/bin/env python3
from __future__ import annotations
import argparse, shutil, re
from pathlib import Path

ROOT=Path.cwd()
BACKUP=ROOT/".patch_backups"/"npc_live_mechanics"
FILES=[
 Path("app/(portal)/game/actions.ts"),
 Path("app/(portal)/game/opposed-actions.ts"),
 Path("app/(portal)/game/warping-actions.ts"),
 Path("app/(portal)/game/components/NpcControlPanel.tsx"),
]
NEWFILE=Path("app/(portal)/game/npc-mechanics-actions.ts")
SQL=ROOT/"supabase_npc_live_mechanics.sql"
ROLLBACK=ROOT/"supabase_npc_live_mechanics_ROLLBACK.sql"

NPC_MECHANICS_TS = '"use server";\n\nimport { revalidatePath } from "next/cache";\nimport { createClient as createAdminClient } from "@supabase/supabase-js";\nimport { getStaffSession } from "@/lib/auth/require-staff";\nimport { createClient } from "@/lib/supabase/server";\nimport { getCharacterShapeAccess } from "@/lib/warping/shape-access";\nimport { resolveImmediateShapeCastForNpc } from "./warping-actions";\n\nfunction admin(){\n  const u=process.env.NEXT_PUBLIC_SUPABASE_URL;\n  const k=process.env.SUPABASE_SECRET_KEY;\n  if(!u||!k)throw new Error("Missing Supabase server credentials.");\n  return createAdminClient(u,k,{auth:{persistSession:false,autoRefreshToken:false}});\n}\nfunction one<T>(v:T|T[]|null):T|null{return Array.isArray(v)?v[0]??null:v}\nasync function requireStaffNpc(npcId:string,roomId:string){\n  const staff=await getStaffSession();\n  if(!staff||!["owner","admin","master"].includes(staff.role))throw new Error("NPC mechanics require Master/Admin/Owner access.");\n  const db=await createClient();\n  const au=await db.auth.getUser();\n  if(!au.data.user)throw new Error("Authentication required.");\n  const a=admin();\n  const q=await a.from("npcs").select("id,name,pronouns,portrait_url,description,current_room_id,is_active,character_id,race:races(id,name,icon_url)").eq("id",npcId).maybeSingle();\n  if(q.error||!q.data)throw new Error(q.error?.message??"NPC not found.");\n  if(!q.data.is_active)throw new Error("This NPC is inactive.");\n  if(q.data.current_room_id!==roomId)throw new Error("Bring this NPC to this Location first.");\n  if(!q.data.character_id)throw new Error("This NPC has no mechanics Character record.");\n  const c=await a.from("characters").select("id,display_name,current_room_id,status,is_system").eq("id",q.data.character_id).maybeSingle();\n  if(c.error||!c.data||!c.data.is_system)throw new Error(c.error?.message??"NPC mechanics Character not found.");\n  return {a,userId:au.data.user.id,npc:q.data,character:c.data};\n}\nfunction snapshot(n:any){\n  const race=one(n.race);\n  return {id:n.id,name:n.name,pronouns:n.pronouns??null,portrait_url:n.portrait_url??null,description:n.description??null,race:race?{id:race.id,name:race.name,icon_url:race.icon_url??null}:null};\n}\nasync function npcMessage(a:any,npc:any,userId:string,roomId:string,message:string){\n  const r=await a.from("room_messages").insert({\n    room_id:roomId,character_id:npc.character_id,message,message_type:"action",\n    speaker_type:"npc",npc_id:npc.id,npc_snapshot:snapshot(npc),\n    sent_by_user_id:userId,client_nonce:crypto.randomUUID(),\n  });\n  if(r.error)throw new Error(r.error.message);\n}\n\nexport async function loadNpcMechanicsData(input:{npcId:string;roomId:string}){\n  try{\n    const {a,character}=await requireStaffNpc(input.npcId,input.roomId);\n    const [gifts,inv,shapes,targets]=await Promise.all([\n      a.from("character_gifts").select(`id,gift:gifts(id,name,description,effect_mode,target_mode,is_active)`).eq("character_id",character.id),\n      a.rpc("get_public_character_inventory",{p_character_id:character.id}),\n      a.from("character_shapes").select(`shape_id,shape:shapes(id,name,level,target_mode,target_scope,max_targets,is_active,is_dispel,price_key)`).eq("character_id",character.id),\n      a.from("characters").select("id,display_name").eq("current_room_id",input.roomId).eq("status","approved").eq("is_system",false).order("display_name"),\n    ]);\n    const err=gifts.error??inv.error??shapes.error??targets.error;\n    if(err)throw new Error(err.message);\n    return {\n      ok:true,\n      characterId:character.id,\n      gifts:(gifts.data??[]).map((x:any)=>({characterGiftId:x.id,...one(x.gift)})).filter((x:any)=>x.is_active!==false),\n      items:(inv.data??[]).filter((x:any)=>x.is_usable===true||x.is_equipped===true),\n      shapes:(shapes.data??[]).map((x:any)=>one(x.shape)).filter((x:any)=>x?.is_active===true),\n      targets:(targets.data??[]).filter((x:any)=>x.id!==character.id),\n    };\n  }catch(e){\n    return {ok:false,message:e instanceof Error?e.message:"Unable to load NPC mechanics.",gifts:[],items:[],shapes:[],targets:[]};\n  }\n}\n\nexport async function npcWarpShape(input:{npcId:string;roomId:string;shapeId:string;targetIds:string[];writtenTarget?:string}){\n  try{\n    const {a,userId,npc,character}=await requireStaffNpc(input.npcId,input.roomId);\n    const access=await getCharacterShapeAccess(character.id,input.shapeId);\n    if(!access.allowed)return {ok:false,message:access.reasons.join(" · ")||"This Shape cannot currently be Warped."};\n\n    const sq=await a.from("shapes").select("*").eq("id",input.shapeId).maybeSingle();\n    if(sq.error||!sq.data)return {ok:false,message:sq.error?.message??"Shape not found."};\n    const s:any=sq.data;\n    if(s.is_dispel)return {ok:false,message:"NPC Dispel uses are not enabled in this panel yet."};\n\n    const written=String(input.writtenTarget??"").trim();\n    const isWritten=s.target_mode==="written";\n    const self=s.target_mode==="self";\n    let targetIds=self?[character.id]:[...new Set(input.targetIds??[])];\n\n    if(isWritten&&!written)return {ok:false,message:"Write the Fate target."};\n    if(!isWritten&&!self&&!targetIds.length)return {ok:false,message:"Choose a target."};\n    if(s.target_scope!=="multiple"&&targetIds.length>1)targetIds=targetIds.slice(0,1);\n    if(s.target_scope==="multiple")targetIds=targetIds.slice(0,Math.max(1,Number(s.max_targets??1)));\n\n    const cr=await a.from("shape_casts").insert({\n      caster_character_id:character.id,shape_id:s.id,room_id:input.roomId,\n      written_target:isWritten?written:null,resource_type:"character",\n    }).select("id").single();\n    if(cr.error||!cr.data)return {ok:false,message:cr.error?.message??"Cast failed."};\n    const castId=String(cr.data.id);\n\n    if(s.price_key){\n      const pe=await a.rpc("create_price_for_shape_cast_for_staff",{\n        p_cast_id:castId,p_shape_id:s.id,p_character_id:character.id,\n      });\n      if(pe.error){\n        await a.from("shape_casts").delete().eq("id",castId);\n        return {ok:false,message:pe.error.message};\n      }\n    }\n\n    const rows=isWritten\n      ? [{cast_id:castId,target_kind:"written",outcome:"manual"}]\n      : targetIds.map(id=>({cast_id:castId,target_character_id:id,target_kind:id===character.id?"self":"character",outcome:"pending",resolved_at:null}));\n    const tr=await a.from("shape_cast_targets").insert(rows);\n    if(tr.error){\n      await a.from("shape_casts").update({status:"failed"}).eq("id",castId);\n      return {ok:false,message:tr.error.message};\n    }\n\n    let resolved="";\n    if(!isWritten){\n      const rr=await resolveImmediateShapeCastForNpc(castId,character.id);\n      if(!rr.ok)return rr;\n      resolved=rr.message??"";\n    }\n    await a.from("shape_casts").update({status:"resolved"}).eq("id",castId);\n    const names=(await a.from("characters").select("id,display_name").in("id",targetIds)).data??[];\n    const targetText=isWritten?written:(self?"Self":names.map((x:any)=>x.display_name).join(", "));\n    await npcMessage(a,npc,userId,input.roomId,`◆ ${s.name} · Shape Level ${s.level} · Target: ${targetText}${resolved?` · ${resolved}`:""}`);\n    revalidatePath("/game");\n    return {ok:true,message:`${s.name} warped.`};\n  }catch(e){\n    return {ok:false,message:e instanceof Error?e.message:"Unable to Warp Shape."};\n  }\n}\n'
SQL_TEXT = "begin;\n\ncreate or replace function public.use_character_inventory_record_targeted_as_staff(\n  p_source_character_id uuid,\n  p_record_kind text,\n  p_record_id uuid,\n  p_target_character_id uuid default null\n) returns jsonb\nlanguage plpgsql\nsecurity definer\nset search_path='public'\nas $$\ndeclare\n  v_source_room_id uuid; v_item_id uuid; v_item_instance_id uuid; v_item_name text;\n  v_is_usable boolean; v_use_behaviour text; v_target_mode text; v_cooldown_minutes integer;\n  v_max_charges integer; v_charges_remaining integer; v_quantity integer;\n  v_target_character_id uuid; v_target_name text; v_target_room_id uuid; v_target_health integer; v_target_max_health integer;\n  v_source_key text; v_ready_at timestamptz; v_has_use_effect boolean:=false; v_has_temporary boolean:=false;\n  v_has_applicable_instant boolean:=false; v_has_positive_heal boolean:=false; v_health_delta integer:=0;\n  v_temporary_count integer:=0; v_effect record;\nbegin\n  if p_record_kind='standard' then\n    select c.current_room_id,ci.item_id,null::uuid,i.name,i.is_usable,i.use_behaviour,i.target_mode,i.cooldown_minutes,i.max_charges,null::integer,ci.quantity\n    into v_source_room_id,v_item_id,v_item_instance_id,v_item_name,v_is_usable,v_use_behaviour,v_target_mode,v_cooldown_minutes,v_max_charges,v_charges_remaining,v_quantity\n    from public.character_items ci join public.items i on i.id=ci.item_id join public.characters c on c.id=ci.character_id\n    where ci.id=p_record_id and ci.character_id=p_source_character_id;\n  elsif p_record_kind='unique' then\n    select c.current_room_id,inst.item_id,inst.id,coalesce(inst.custom_name,i.name),i.is_usable,i.use_behaviour,i.target_mode,i.cooldown_minutes,i.max_charges,coalesce(inst.charges_remaining,i.max_charges),1\n    into v_source_room_id,v_item_id,v_item_instance_id,v_item_name,v_is_usable,v_use_behaviour,v_target_mode,v_cooldown_minutes,v_max_charges,v_charges_remaining,v_quantity\n    from public.character_item_instances inst join public.items i on i.id=inst.item_id join public.characters c on c.id=inst.owner_character_id\n    where inst.id=p_record_id and inst.owner_character_id=p_source_character_id and inst.vault_status='owned';\n  else raise exception 'Invalid inventory record type.'; end if;\n\n  if v_item_id is null then raise exception 'NPC does not own this Item.'; end if;\n  if coalesce(v_is_usable,false)=false then raise exception 'This Item cannot be used.'; end if;\n\n  if coalesce(v_target_mode,'self')='self' then v_target_character_id:=p_source_character_id;\n  elsif v_target_mode='other' then\n    if p_target_character_id is null then raise exception 'Choose a target.'; end if;\n    if p_target_character_id=p_source_character_id then raise exception 'This Item must target another character.'; end if;\n    v_target_character_id:=p_target_character_id;\n  elsif v_target_mode='either' then v_target_character_id:=coalesce(p_target_character_id,p_source_character_id);\n  else raise exception 'Invalid Item target mode.'; end if;\n\n  select c.display_name,c.current_room_id,c.current_health into v_target_name,v_target_room_id,v_target_health\n  from public.characters c where c.id=v_target_character_id and c.status='approved';\n  if v_target_room_id is null then raise exception 'Target character is not available.'; end if;\n  if v_target_character_id<>p_source_character_id and v_source_room_id<>v_target_room_id then raise exception 'Target character must be in the same location.'; end if;\n\n  v_source_key:=case when p_record_kind='standard' then 'standard:'||v_item_id::text else 'unique:'||v_item_instance_id::text end;\n  select ready_at into v_ready_at from public.character_item_use_cooldowns where character_id=p_source_character_id and source_key=v_source_key;\n  if v_ready_at is not null and v_ready_at>now() then raise exception 'This Item is still on cooldown.'; end if;\n\n  v_target_max_health:=public.get_character_current_max_health(v_target_character_id);\n  v_target_health:=greatest(0,least(coalesce(v_target_health,v_target_max_health),v_target_max_health));\n\n  select\n    exists(select 1 from public.item_effects e where e.item_id=v_item_id and e.trigger_type='use'),\n    exists(select 1 from public.item_effects e where e.item_id=v_item_id and e.trigger_type='use' and e.effect_mode='temporary'),\n    exists(select 1 from public.item_effects e where e.item_id=v_item_id and e.trigger_type='use' and e.effect_mode='instant' and e.health_delta>0),\n    exists(select 1 from public.item_effects e where e.item_id=v_item_id and e.trigger_type='use' and e.effect_mode='instant' and ((e.health_delta>0 and v_target_health<v_target_max_health) or (e.health_delta<0 and v_target_health>0)))\n  into v_has_use_effect,v_has_temporary,v_has_positive_heal,v_has_applicable_instant;\n\n  if not v_has_use_effect then return jsonb_build_object('ok',false,'blocked',true,'block_reason','This Item has no configured Use effect.'); end if;\n  if not v_has_temporary and not v_has_applicable_instant then\n    if v_has_positive_heal and v_target_health>=v_target_max_health then return jsonb_build_object('ok',false,'blocked',true,'block_reason','Target is already at full Health.'); end if;\n    return jsonb_build_object('ok',false,'blocked',true,'block_reason','This Item would have no effect on that target right now.');\n  end if;\n\n  for v_effect in select e.* from public.item_effects e where e.item_id=v_item_id and e.trigger_type='use' order by e.sort_order,e.id loop\n    if v_effect.effect_mode='instant' then v_health_delta:=v_health_delta+coalesce(v_effect.health_delta,0);\n    elsif v_effect.effect_mode='temporary' then\n      if coalesce(v_effect.allow_duplicate_stacking,false)=false then delete from public.character_active_item_effects where character_id=v_target_character_id and source_effect_id=v_effect.id; end if;\n      insert into public.character_active_item_effects(character_id,item_id,item_instance_id,source_effect_id,source_name,muscles_modifier,reflexes_modifier,vigour_modifier,shrewd_modifier,brains_modifier,presence_modifier,max_health_modifier,warping_affinity_modifier,warps_per_day_modifier,activated_at,expires_at)\n      values(v_target_character_id,v_item_id,v_item_instance_id,v_effect.id,v_item_name,coalesce(v_effect.muscles_modifier,0),coalesce(v_effect.reflexes_modifier,0),coalesce(v_effect.vigour_modifier,0),coalesce(v_effect.shrewd_modifier,0),coalesce(v_effect.brains_modifier,0),coalesce(v_effect.presence_modifier,0),coalesce(v_effect.max_health_modifier,0),coalesce(v_effect.warping_affinity_modifier,0),coalesce(v_effect.warps_per_day_modifier,0),now(),now()+make_interval(mins=>v_effect.duration_minutes));\n      v_temporary_count:=v_temporary_count+1;\n    end if;\n  end loop;\n\n  if v_health_delta<>0 then\n    v_target_max_health:=public.get_character_current_max_health(v_target_character_id);\n    update public.characters set current_health=greatest(0,least(coalesce(current_health,v_target_max_health)+v_health_delta,v_target_max_health)),updated_at=now() where id=v_target_character_id;\n  end if;\n\n  if p_record_kind='standard' and v_use_behaviour='consumable' then\n    if v_quantity<=1 then delete from public.character_items where id=p_record_id; else update public.character_items set quantity=quantity-1,updated_at=now() where id=p_record_id; end if;\n  elsif p_record_kind='unique' and v_max_charges is not null then\n    update public.character_item_instances set charges_remaining=greatest(0,coalesce(charges_remaining,v_max_charges)-1),updated_at=now() where id=p_record_id;\n    v_charges_remaining:=greatest(0,coalesce(v_charges_remaining,v_max_charges)-1);\n  end if;\n\n  if coalesce(v_cooldown_minutes,0)>0 then\n    v_ready_at:=now()+make_interval(mins=>v_cooldown_minutes);\n    insert into public.character_item_use_cooldowns(character_id,source_key,item_id,item_instance_id,ready_at,updated_at)\n    values(p_source_character_id,v_source_key,v_item_id,v_item_instance_id,v_ready_at,now())\n    on conflict(character_id,source_key) do update set ready_at=excluded.ready_at,updated_at=now();\n  end if;\n\n  return jsonb_build_object('ok',true,'item_name',v_item_name,'target_character_id',v_target_character_id,'target_name',v_target_name,'health_delta',v_health_delta,'temporary_effects',v_temporary_count,'charges_remaining',v_charges_remaining,'cooldown_ready_at',v_ready_at);\nend $$;\n\nrevoke all on function public.use_character_inventory_record_targeted_as_staff(uuid,text,uuid,uuid) from public, anon, authenticated;\ngrant execute on function public.use_character_inventory_record_targeted_as_staff(uuid,text,uuid,uuid) to service_role;\n\ncreate or replace function public.create_price_for_shape_cast_for_staff(\n  p_cast_id uuid,p_shape_id uuid,p_character_id uuid\n) returns void language plpgsql security definer set search_path='public' as $$\ndeclare v_key text; v_stage integer; v_days integer; v_existing uuid;\nbegin\n  if not exists(select 1 from public.shape_casts where id=p_cast_id and caster_character_id=p_character_id) then raise exception 'Invalid Shape cast'; end if;\n  select s.price_key,p.stage,p.duration_days into v_key,v_stage,v_days from public.shapes s left join public.warping_prices p on p.key=s.price_key where s.id=p_shape_id;\n  if v_key is null then return; end if;\n  if v_stage is null or v_days is null then raise exception 'Shape Price % is not configured.',v_key; end if;\n  select id into v_existing from public.character_price_effects where character_id=p_character_id and price_key=v_key and expires_at>now() order by expires_at desc limit 1 for update;\n  if v_existing is not null then update public.character_price_effects set expires_at=expires_at+make_interval(days=>v_days),cast_id=p_cast_id where id=v_existing;\n  else insert into public.character_price_effects(cast_id,character_id,price_key,stage,expires_at) values(p_cast_id,p_character_id,v_key,v_stage,now()+make_interval(days=>v_days)); end if;\nend $$;\n\nrevoke all on function public.create_price_for_shape_cast_for_staff(uuid,uuid,uuid) from public, anon, authenticated;\ngrant execute on function public.create_price_for_shape_cast_for_staff(uuid,uuid,uuid) to service_role;\n\ncommit;\n"
ROLLBACK_SQL = 'begin;\ndrop function if exists public.use_character_inventory_record_targeted_as_staff(uuid,text,uuid,uuid);\ndrop function if exists public.create_price_for_shape_cast_for_staff(uuid,uuid,uuid);\ncommit;\n'

def die(m): raise SystemExit(f"\nERROR: {m}\n")
def read(p):
    f=ROOT/p
    if not f.exists(): die(f"Missing {p}")
    return f.read_text(encoding="utf-8")
def write(p,s):
    f=ROOT/p; f.parent.mkdir(parents=True,exist_ok=True); f.write_text(s,encoding="utf-8")
def once(s,a,b,label):
    n=s.count(a)
    if n!=1: die(f"{label}: expected 1 match, found {n}")
    return s.replace(a,b,1)

def backup():
    if BACKUP.exists():
        print(f"Backup already exists: {BACKUP}"); return
    for p in FILES:
        src=ROOT/p; dst=BACKUP/p; dst.parent.mkdir(parents=True,exist_ok=True); shutil.copy2(src,dst)
    print(f"Backup created: {BACKUP}")

def revert():
    if not BACKUP.exists(): die("No backup found")
    for p in FILES:
        src=BACKUP/p
        if src.exists():
            dst=ROOT/p; dst.parent.mkdir(parents=True,exist_ok=True); shutil.copy2(src,dst)
            print(f"Restored {p}")
    for f in [ROOT/NEWFILE,SQL,ROLLBACK]:
        if f.exists(): f.unlink(); print(f"Removed {f.name}")
    print("Reverted code. If SQL was applied, run the rollback SQL too.")

def patch_game_actions():
    p=Path("app/(portal)/game/actions.ts"); s=read(p)

    if "actorCharacterId?: string | null;" not in s:
        s=once(s,
'''async function getOwnedCharacter(
  options?: {
    skipCurrentAccessCheck?: boolean;
    allowDeadGhost?: boolean;
  },
): Promise<{''',
'''async function getOwnedCharacter(
  options?: {
    skipCurrentAccessCheck?: boolean;
    allowDeadGhost?: boolean;
    actorCharacterId?: string | null;
  },
): Promise<{''',"game actor option")

    if "options?.actorCharacterId" not in s:
        marker='''  const { data: character, error: characterError } = await supabase
    .from("characters")
'''
        inject='''  if (options?.actorCharacterId) {
    const staff = await getStaffSession();
    if (!staff || !["owner", "admin", "master"].includes(staff.role)) {
      throw new Error("NPC actions require Master/Admin/Owner access.");
    }
    const admin = createPrivilegedClient();
    const { data: npcLink, error: npcError } = await admin
      .from("npcs")
      .select("id,character_id,current_room_id,is_active")
      .eq("character_id", options.actorCharacterId)
      .eq("is_active", true)
      .maybeSingle();
    if (npcError || !npcLink) throw new Error(npcError?.message ?? "NPC mechanics record not found.");

    const { data: npcCharacter, error: npcCharacterError } = await admin
      .from("characters")
      .select(`id,display_name,current_room_id,status,muscles,reflexes,vigor,brains,shrewd,presence_score,current_health,life_state,dead_until,died_at`)
      .eq("id", options.actorCharacterId)
      .eq("is_system", true)
      .maybeSingle();
    if (npcCharacterError || !npcCharacter) throw new Error(npcCharacterError?.message ?? "NPC Character record not found.");

    return {supabase: admin as unknown as SupabaseClient, character: npcCharacter as unknown as OwnedCharacter};
  }

'''
        s=once(s,marker,inject+marker,"game npc actor branch")

    for fn in ["useRoomGift","activateRoomGift","sendRoomAttributeCheck","useRoomItem"]:
        a=s.find(f"export async function {fn}")
        if a<0: die(f"{fn} not found")
        b=s.find("\nexport async function",a+10)
        if b<0:b=len(s)
        block=s[a:b]
        if "actorCharacterId:" not in block:
            old="await getOwnedCharacter();"
            if old not in block: die(f"{fn}: owned-character call not found")
            block=block.replace(old,'''await getOwnedCharacter({
        actorCharacterId: String(formData.get("npc_actor_character_id") ?? "").trim() || null,
      });''',1)
            s=s[:a]+block+s[b:]

    a=s.find("export async function useRoomItem")
    block=s[a:]
    if "use_character_inventory_record_targeted_as_staff" not in block:
        old='''    const rpcResult = await supabase.rpc(
      "use_own_inventory_record_targeted",
      {
        p_record_kind: recordKind,
        p_record_id: recordId,
        p_target_character_id:
          targetCharacterId,
      },
    );'''
        new='''    const npcActorId = String(formData.get("npc_actor_character_id") ?? "").trim();
    const rpcResult = npcActorId
      ? await supabase.rpc("use_character_inventory_record_targeted_as_staff", {
          p_source_character_id: character.id,
          p_record_kind: recordKind,
          p_record_id: recordId,
          p_target_character_id: targetCharacterId,
        })
      : await supabase.rpc("use_own_inventory_record_targeted", {
          p_record_kind: recordKind,
          p_record_id: recordId,
          p_target_character_id: targetCharacterId,
        });'''
        if old not in block: die("item RPC marker changed")
        block=block.replace(old,new,1)
        s=s[:a]+block
    write(p,s)

def patch_opposed():
    p=Path("app/(portal)/game/opposed-actions.ts"); s=read(p)
    if "async function ownedCharacter(formData?: FormData)" not in s:
        s=once(s,"async function ownedCharacter() {","async function ownedCharacter(formData?: FormData) {","opposed actor signature")
        marker='''  const { data, error } = await supabase
    .from("characters")
'''
        inject='''  const npcActorId = field(formData ?? new FormData(), "npc_actor_character_id");
  if (npcActorId) {
    const { getStaffSession } = await import("@/lib/auth/require-staff");
    const staff = await getStaffSession();
    if (!staff || !["owner","admin","master"].includes(staff.role)) throw new Error("NPC combat requires Master/Admin/Owner access.");
    const admin = privilegedClient();
    const link = await admin.from("npcs").select("id,character_id,is_active,current_room_id").eq("character_id",npcActorId).eq("is_active",true).maybeSingle();
    if (link.error || !link.data) throw new Error(link.error?.message ?? "NPC not found.");
    const row = await admin.from("characters").select("id,display_name,current_room_id,muscles,reflexes,vigor,brains,shrewd,presence_score,life_state").eq("id",npcActorId).eq("is_system",true).maybeSingle();
    if (row.error || !row.data) throw new Error(row.error?.message ?? "NPC Character not found.");
    if (!row.data.current_room_id) throw new Error("NPC is not at a Location.");
    return {supabase:admin as any,character:row.data as OwnedCharacter};
  }

'''
        s=once(s,marker,inject+marker,"opposed npc actor branch")

    for fn in ["startAttributeOpposedAction","startUnarmedAttack","startWeaponOpposedAttack"]:
        a=s.find(f"export async function {fn}")
        if a<0:die(f"{fn} missing")
        b=s.find("\nexport async function",a+10)
        if b<0:b=len(s)
        block=s[a:b]
        if "ownedCharacter(formData)" not in block:
            if "ownedCharacter();" not in block: die(f"{fn}: actor call missing")
            block=block.replace("ownedCharacter();","ownedCharacter(formData);",1)
            s=s[:a]+block+s[b:]
    write(p,s)

def patch_warping():
    p=Path("app/(portal)/game/warping-actions.ts"); s=read(p)
    if "resolveImmediateShapeCastForNpc" in s:
        return
    start=s.find("export async function resolveImmediateShapeCast(")
    end=s.find("\nexport async function resolveIncomingShape",start)
    if start<0 or end<0:die("warping resolver block not found")
    block=s[start:end]
    block=block.replace(
'''export async function resolveImmediateShapeCast(
  castId: string,
): Promise<WarpingActionState> {''',
'''async function resolveImmediateShapeCastAs(
  castId: string,
  actorCharacterId?: string,
): Promise<WarpingActionState> {''',1)
    block=block.replace(
'''    const caster =
      await mine();

    const a =
      admin();
''',
'''    const a = admin();
    const actorResult = actorCharacterId
      ? await a.from("characters")
          .select("id,display_name,current_room_id,muscles,reflexes,vigor,brains,shrewd,presence_score,life_state")
          .eq("id",actorCharacterId)
          .eq("is_system",true)
          .maybeSingle()
      : null;
    const caster = actorCharacterId ? actorResult?.data : await mine();
    if (!caster) throw Error(actorResult?.error?.message ?? "NPC caster not found.");
''',1)
    wrapper='''

export async function resolveImmediateShapeCast(
  castId: string,
): Promise<WarpingActionState> {
  return resolveImmediateShapeCastAs(castId);
}

export async function resolveImmediateShapeCastForNpc(
  castId: string,
  actorCharacterId: string,
): Promise<WarpingActionState> {
  return resolveImmediateShapeCastAs(castId, actorCharacterId);
}
'''
    s=s[:start]+block+wrapper+s[end:]
    write(p,s)

def patch_panel():
    p=Path("app/(portal)/game/components/NpcControlPanel.tsx"); s=read(p)
    if "useActionState" not in s:
        s=s.replace("useCallback,useEffect,useMemo,useState,useTransition","useActionState,useCallback,useEffect,useMemo,useState,useTransition",1)
    if 'from "../npc-mechanics-actions"' not in s:
        line=re.search(r'import \{[^\n]+from "\.\./npc-actions";',s)
        if not line:die("npc-actions import not found")
        add='''\nimport { loadNpcMechanicsData,npcWarpShape } from "../npc-mechanics-actions";
import { activateRoomGift,useRoomGift,useRoomItem,sendRoomAttributeCheck } from "../actions";
import { startAttributeOpposedAction,startUnarmedAttack,startWeaponOpposedAttack } from "../opposed-actions";'''
        s=s[:line.end()]+add+s[line.end():]

    if "const [mechanics,setMechanics]" not in s:
        marker='''  const [pending,startTransition]=useTransition();'''
        add='''\n  const [mechanics,setMechanics]=useState<any>({ok:false,gifts:[],items:[],shapes:[],targets:[]});
  const [mechanicsMode,setMechanicsMode]=useState<"attribute"|"feat"|"item"|"shape"|"combat"|null>(null);
  const [mechanicsStatus,setMechanicsStatus]=useState("");
  const [selectedGift,setSelectedGift]=useState("");
  const [selectedItem,setSelectedItem]=useState("");
  const [selectedShape,setSelectedShape]=useState("");
  const [mechanicsTarget,setMechanicsTarget]=useState("");
  const [shapeWritten,setShapeWritten]=useState("");
  const [attributeAction,setAttributeAction]=useState("use_muscles");
  const [featState,featAction]=useActionState(useRoomGift,{ok:false,message:""});
  const [activateFeatState,activateFeatAction]=useActionState(activateRoomGift,{ok:false,message:""});
  const [itemState,itemAction]=useActionState(useRoomItem,{ok:false,message:""});
  const [attributeState,attributeServerAction]=useActionState(sendRoomAttributeCheck,{ok:false,message:""});
  const [opposedState,opposedAction]=useActionState(startAttributeOpposedAction,{ok:false,message:""});
  const [unarmedState,unarmedAction]=useActionState(startUnarmedAttack,{ok:false,message:""});
  const [weaponState,weaponAction]=useActionState(startWeaponOpposedAttack,{ok:false,message:""});
'''
        s=once(s,marker,marker+add,"mechanics state")

    if "loadNpcMechanicsData({npcId:selected.id,roomId})" not in s:
        marker='''  const inThisRoom=selected?.current_room_id===roomId;'''
        add='''

  useEffect(()=>{
    if(!selected||creating||!inThisRoom||!selected.character_id){
      setMechanics({ok:false,gifts:[],items:[],shapes:[],targets:[]});
      return;
    }
    let live=true;
    void loadNpcMechanicsData({npcId:selected.id,roomId}).then(next=>{
      if(!live)return;
      setMechanics(next);
      if(next.ok){
        setSelectedGift((v:string)=>v||next.gifts?.[0]?.characterGiftId||"");
        setSelectedItem((v:string)=>v||next.items?.[0]?.record_id||"");
        setSelectedShape((v:string)=>v||next.shapes?.[0]?.id||"");
      }
    });
    return()=>{live=false};
  },[selected?.id,creating,inThisRoom,roomId]);
'''
        s=once(s,marker,marker+add,"mechanics load")

    if "NPC Actions" not in s:
        marker='''    {!creating&&selected&&<div className="border-t border-[rgb(var(--sep-colour-60482e))]/35 pt-3">'''
        ui='''    {!creating&&selected&&selected.character_id&&inThisRoom&&<div className="border-t border-[rgb(var(--sep-colour-60482e))]/35 pt-3">
      <p className="mb-2 text-[8px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-b99765))]">NPC Actions</p>
      <div className="flex flex-wrap gap-2">
        {(["attribute","feat","item","shape","combat"] as const).map(m=><button key={m} type="button" onClick={()=>{setMechanicsMode(mechanicsMode===m?null:m);setMechanicsStatus("");}} className="border border-[rgb(var(--sep-colour-60482e))]/55 px-3 py-2 text-[8px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-c4a675))]">{m}</button>)}
      </div>

      {mechanicsMode==="attribute"&&<div className="mt-3 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
        <select value={attributeAction} onChange={e=>setAttributeAction(e.target.value)} className={inputClass}><option value="use_muscles">Use Muscles</option><option value="use_reflexes">Use Reflexes</option><option value="use_brains">Use Brains</option><option value="use_shrewd">Use Shrewd</option><option value="use_presence">Use Presence</option></select>
        <select value={mechanicsTarget} onChange={e=>setMechanicsTarget(e.target.value)} className={inputClass}><option value="">No target / Fate</option>{mechanics.targets?.map((t:any)=><option key={t.id} value={t.id}>{t.display_name}</option>)}</select>
        <form action={mechanicsTarget?opposedAction:attributeServerAction}>
          <input type="hidden" name="npc_actor_character_id" value={selected.character_id}/>
          {mechanicsTarget?<><input type="hidden" name="opposed_action" value={attributeAction}/><input type="hidden" name="opposed_target_character_id" value={mechanicsTarget}/></>:<><input type="hidden" name="check_key" value={attributeAction}/><input type="hidden" name="client_nonce" value={selected.id+"-"+attributeAction+"-"+Date.now()}/></>}
          <button className="mt-1 border border-[rgb(var(--sep-colour-8d6d3e))]/70 px-3 py-2 text-[8px] uppercase">Roll</button>
        </form>
      </div>}

      {mechanicsMode==="feat"&&<div className="mt-3 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
        <select value={selectedGift} onChange={e=>setSelectedGift(e.target.value)} className={inputClass}>{mechanics.gifts?.map((g:any)=><option key={g.characterGiftId} value={g.characterGiftId}>{g.name} · {g.effect_mode}</option>)}</select>
        <select value={mechanicsTarget} onChange={e=>setMechanicsTarget(e.target.value)} className={inputClass}><option value="">Self / automatic</option>{mechanics.targets?.map((t:any)=><option key={t.id} value={t.id}>{t.display_name}</option>)}</select>
        <form action={(mechanics.gifts?.find((g:any)=>g.characterGiftId===selectedGift)?.effect_mode==="temporary")?activateFeatAction:featAction}>
          <input type="hidden" name="npc_actor_character_id" value={selected.character_id}/><input type="hidden" name="character_gift_id" value={selectedGift}/><input type="hidden" name="gift_target_character_id" value={mechanicsTarget}/>
          <button disabled={!selectedGift} className="mt-1 border border-[rgb(var(--sep-colour-8d6d3e))]/70 px-3 py-2 text-[8px] uppercase disabled:opacity-40">Use Feat</button>
        </form>
      </div>}

      {mechanicsMode==="item"&&<div className="mt-3 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
        <select value={selectedItem} onChange={e=>setSelectedItem(e.target.value)} className={inputClass}>{mechanics.items?.map((i:any)=><option key={i.record_id} value={i.record_id}>{i.name}{i.is_equipped?" · equipped":""}</option>)}</select>
        <select value={mechanicsTarget} onChange={e=>setMechanicsTarget(e.target.value)} className={inputClass}><option value="">Self / automatic</option>{mechanics.targets?.map((t:any)=><option key={t.id} value={t.id}>{t.display_name}</option>)}</select>
        <form action={itemAction}>
          {(()=>{const i=mechanics.items?.find((x:any)=>x.record_id===selectedItem);return <><input type="hidden" name="npc_actor_character_id" value={selected.character_id}/><input type="hidden" name="item_record_kind" value={i?.record_kind??""}/><input type="hidden" name="item_record_id" value={i?.record_id??""}/><input type="hidden" name="item_target_character_id" value={mechanicsTarget}/></>})()}
          <button disabled={!selectedItem} className="mt-1 border border-[rgb(var(--sep-colour-8d6d3e))]/70 px-3 py-2 text-[8px] uppercase disabled:opacity-40">Use Item</button>
        </form>
      </div>}

      {mechanicsMode==="shape"&&<div className="mt-3 grid gap-2">
        <select value={selectedShape} onChange={e=>setSelectedShape(e.target.value)} className={inputClass}>{mechanics.shapes?.map((x:any)=><option key={x.id} value={x.id}>{x.name} · Level {x.level}</option>)}</select>
        <select value={mechanicsTarget} onChange={e=>setMechanicsTarget(e.target.value)} className={inputClass}><option value="">Choose target</option>{mechanics.targets?.map((t:any)=><option key={t.id} value={t.id}>{t.display_name}</option>)}</select>
        <input value={shapeWritten} onChange={e=>setShapeWritten(e.target.value)} placeholder="Written/Fate target, when required" className={inputClass}/>
        <button type="button" disabled={!selectedShape||pending} onClick={()=>startTransition(async()=>{const r=await npcWarpShape({npcId:selected.id,roomId,shapeId:selectedShape,targetIds:mechanicsTarget?[mechanicsTarget]:[],writtenTarget:shapeWritten});setMechanicsStatus(r.message);})} className="border border-[rgb(var(--sep-colour-8d6d3e))]/70 px-3 py-2 text-[8px] uppercase disabled:opacity-40">Warp Shape</button>
      </div>}

      {mechanicsMode==="combat"&&<div className="mt-3 grid gap-2">
        <select value={mechanicsTarget} onChange={e=>setMechanicsTarget(e.target.value)} className={inputClass}><option value="">Choose target</option>{mechanics.targets?.map((t:any)=><option key={t.id} value={t.id}>{t.display_name}</option>)}</select>
        <div className="flex flex-wrap gap-2">
          <form action={unarmedAction}><input type="hidden" name="npc_actor_character_id" value={selected.character_id}/><input type="hidden" name="opposed_target_character_id" value={mechanicsTarget}/><button disabled={!mechanicsTarget} className="border border-[rgb(var(--sep-colour-8d6d3e))]/70 px-3 py-2 text-[8px] uppercase disabled:opacity-40">Unarmed Attack</button></form>
          {mechanics.items?.filter((i:any)=>i.is_equipped&&["main_hand","off_hand"].includes(String(i.equipped_slot??""))).map((i:any)=><form key={i.record_id} action={weaponAction}><input type="hidden" name="npc_actor_character_id" value={selected.character_id}/><input type="hidden" name="item_record_kind" value={i.record_kind}/><input type="hidden" name="item_record_id" value={i.record_id}/><input type="hidden" name="opposed_target_character_id" value={mechanicsTarget}/><button disabled={!mechanicsTarget} className="border border-[rgb(var(--sep-colour-8d6d3e))]/70 px-3 py-2 text-[8px] uppercase disabled:opacity-40">Attack with {i.name}</button></form>)}
        </div>
      </div>}

      {[attributeState,opposedState,featState,activateFeatState,itemState,unarmedState,weaponState].map((x:any)=>x?.message).filter(Boolean).slice(-1).map((m:string)=><p key={m} className="mt-2 text-[9px] text-[rgb(var(--sep-colour-c6ad86))]">{m}</p>)}
      {mechanicsStatus&&<p className="mt-2 text-[9px] text-[rgb(var(--sep-colour-c6ad86))]">{mechanicsStatus}</p>}
    </div>}

'''
        s=once(s,marker,ui+marker,"NPC actions UI")
    write(p,s)

def main():
    ap=argparse.ArgumentParser();ap.add_argument("--revert",action="store_true");args=ap.parse_args()
    if args.revert:revert();return
    backup()
    patch_game_actions()
    patch_opposed()
    patch_warping()
    write(NEWFILE,NPC_MECHANICS_TS)
    patch_panel()
    SQL.write_text(SQL_TEXT,encoding="utf-8")
    ROLLBACK.write_text(ROLLBACK_SQL,encoding="utf-8")
    print("\nPATCH APPLIED LOCALLY. Nothing committed or pushed.")
    print("1) Run supabase_npc_live_mechanics.sql in Supabase SQL Editor")
    print("2) Restart: npm run dev")
    print("Revert code: python patch_npc_live_mechanics.py --revert")
    print("Rollback DB: run supabase_npc_live_mechanics_ROLLBACK.sql")

if __name__=="__main__":main()
