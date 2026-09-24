"use server";

import { revalidatePath } from "next/cache";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { getStaffSession } from "@/lib/auth/require-staff";
import { createClient } from "@/lib/supabase/server";
import { getCharacterShapeAccess } from "@/lib/warping/shape-access";
import { resolveImmediateShapeCastForNpc } from "./warping-actions";
import { activateRoomGift,useRoomGift,useRoomItem,sendRoomAttributeCheck } from "./actions";
import { startAttributeOpposedAction,startUnarmedAttack,startWeaponOpposedAttack } from "./opposed-actions";

type ActionState={ok:boolean;message:string;submittedAt?:number};

function admin(){
  const u=process.env.NEXT_PUBLIC_SUPABASE_URL;
  const k=process.env.SUPABASE_SECRET_KEY;
  if(!u||!k)throw new Error("Missing Supabase server credentials.");
  return createAdminClient(u,k,{auth:{persistSession:false,autoRefreshToken:false}});
}
function one<T>(v:T|T[]|null):T|null{return Array.isArray(v)?v[0]??null:v}

async function requireStaffNpcByCharacter(characterId:string){
  const staff=await getStaffSession();
  if(!staff||!["owner","admin","master"].includes(staff.role))throw new Error("NPC actions require Master/Admin/Owner access.");
  const db=await createClient();
  const au=await db.auth.getUser();
  if(!au.data.user)throw new Error("Authentication required.");
  const a=admin();
  const q=await a.from("npcs").select("id,name,pronouns,portrait_url,description,current_room_id,is_active,character_id,race:races(id,name,icon_url)").eq("character_id",characterId).eq("is_active",true).maybeSingle();
  if(q.error||!q.data)throw new Error(q.error?.message??"NPC not found.");
  return {a,userId:au.data.user.id,npc:q.data};
}
async function requireStaffNpc(npcId:string,roomId:string){
  const staff=await getStaffSession();
  if(!staff||!["owner","admin","master"].includes(staff.role))throw new Error("NPC mechanics require Master/Admin/Owner access.");
  const db=await createClient();
  const au=await db.auth.getUser();
  if(!au.data.user)throw new Error("Authentication required.");
  const a=admin();
  const q=await a.from("npcs").select("id,name,pronouns,portrait_url,description,current_room_id,is_active,character_id,race:races(id,name,icon_url)").eq("id",npcId).maybeSingle();
  if(q.error||!q.data)throw new Error(q.error?.message??"NPC not found.");
  if(!q.data.is_active)throw new Error("This NPC is inactive.");
  if(q.data.current_room_id!==roomId)throw new Error("Bring this NPC to this Location first.");
  if(!q.data.character_id)throw new Error("This NPC has no mechanics Character record.");
  const c=await a.from("characters").select("id,display_name,current_room_id,status,is_system").eq("id",q.data.character_id).maybeSingle();
  if(c.error||!c.data||!c.data.is_system)throw new Error(c.error?.message??"NPC mechanics Character not found.");
  return {a,userId:au.data.user.id,npc:q.data,character:c.data};
}
function snapshot(n:any){
  const race=one(n.race);
  return {id:n.id,name:n.name,pronouns:n.pronouns??null,portrait_url:n.portrait_url??null,description:n.description??null,race:race?{id:race.id,name:race.name,icon_url:race.icon_url??null}:null};
}
async function markNpcMessages(characterId:string,since:string){
  const {a,userId,npc}=await requireStaffNpcByCharacter(characterId);
  const rows=await a.from("room_messages").select("id").eq("character_id",characterId).gte("created_at",since).order("created_at",{ascending:true});
  if(rows.error)throw new Error(rows.error.message);
  const ids=(rows.data??[]).map((x:any)=>x.id);
  if(!ids.length)return;
  const result=await a.from("room_messages").update({
    speaker_type:"npc",npc_id:npc.id,npc_snapshot:snapshot(npc),sent_by_user_id:userId,
  }).in("id",ids);
  if(result.error)throw new Error(result.error.message);
}
async function wrapAction(
  action:(previous:ActionState,formData:FormData)=>Promise<ActionState>,
  previous:ActionState,
  formData:FormData,
){
  const actor=String(formData.get("npc_actor_character_id")??"").trim();
  const since=new Date(Date.now()-1500).toISOString();
  const result=await action(previous,formData);
  if(result.ok&&actor)await markNpcMessages(actor,since);
  revalidatePath("/game");
  return result;
}

export async function npcUseRoomGift(prev:ActionState,fd:FormData){return wrapAction(useRoomGift,prev,fd)}
export async function npcActivateRoomGift(prev:ActionState,fd:FormData){return wrapAction(activateRoomGift,prev,fd)}
export async function npcUseRoomItem(prev:ActionState,fd:FormData){return wrapAction(useRoomItem,prev,fd)}
export async function npcSendRoomAttributeCheck(prev:ActionState,fd:FormData){return wrapAction(sendRoomAttributeCheck,prev,fd)}
export async function npcStartAttributeOpposedAction(prev:ActionState,fd:FormData){return wrapAction(startAttributeOpposedAction,prev,fd)}
export async function npcStartUnarmedAttack(prev:ActionState,fd:FormData){return wrapAction(startUnarmedAttack,prev,fd)}
export async function npcStartWeaponOpposedAttack(prev:ActionState,fd:FormData){return wrapAction(startWeaponOpposedAttack,prev,fd)}

export async function loadNpcMechanicsData(input:{npcId:string;roomId:string}){
  try{
    const {a,character}=await requireStaffNpc(input.npcId,input.roomId);
    const activeSince=new Date(Date.now()-5*60_000).toISOString();

    const [gifts,inventory,shapes,presence]=await Promise.all([
      a.from("character_gifts").select(`
        id,
        gift:gifts(
          id,name,description,is_active,effect_mode,target_mode,
          damage_dice,damage_type,success_die,success_threshold,success_attribute,
          duration_minutes,cooldown_minutes,health_delta,health_dice,
          max_health_modifier,muscles_modifier,reflexes_modifier,vigour_modifier,
          shrewd_modifier,brains_modifier,presence_modifier,
          warping_affinity_modifier,warps_per_day_modifier
        )
      `).eq("character_id",character.id),
      a.rpc("get_public_character_inventory",{p_character_id:character.id}),
      a.from("character_shapes").select(`
        shape_id,
        shape:shapes(
          id,name,description,level,school,target_mode,target_scope,max_targets,
          is_active,is_dispel,price_key,resolution_mode,counter_options,
          success_die,success_threshold,success_attribute,damage_dice,damage_type
        )
      `).eq("character_id",character.id),
      a.from("character_presence")
        .select("character_id,appear_offline,last_seen_at,character:characters!character_presence_character_id_fkey(id,display_name,life_state,status,is_system)")
        .eq("room_id",input.roomId)
        .gte("last_seen_at",activeSince),
    ]);

    const err=gifts.error??inventory.error??shapes.error??presence.error;
    if(err)throw new Error(err.message);

    const present=(presence.data??[])
      .filter((row:any)=>row.appear_offline!==true)
      .map((row:any)=>one(row.character))
      .filter((c:any)=>c&&c.status==="approved"&&c.is_system!==true&&c.id!==character.id)
      .map((c:any)=>({id:c.id,display_name:c.display_name,life_state:c.life_state}));

    return {
      ok:true,
      characterId:character.id,
      gifts:(gifts.data??[]).map((x:any)=>{
        const g:any=one(x.gift);
        return g?{
          characterGiftId:x.id,giftId:g.id,name:g.name,description:g.description??"",
          effectMode:g.effect_mode,targetMode:g.target_mode??"self",
          damageDice:g.damage_dice??null,damageType:g.damage_type??null,
          successDie:g.success_die??null,successThreshold:g.success_threshold??null,
          successAttribute:g.success_attribute??null,durationMinutes:g.duration_minutes??null,
          cooldownMinutes:g.cooldown_minutes??0,healthDelta:g.health_delta??0,
          healthDice:g.health_dice??null,maxHealthModifier:g.max_health_modifier??0,
          musclesModifier:g.muscles_modifier??0,reflexesModifier:g.reflexes_modifier??0,
          vigourModifier:g.vigour_modifier??0,shrewdModifier:g.shrewd_modifier??0,
          brainsModifier:g.brains_modifier??0,presenceModifier:g.presence_modifier??0,
          warpingAffinityModifier:g.warping_affinity_modifier??0,warpsPerDayModifier:g.warps_per_day_modifier??0,
        }:null;
      }).filter((x:any)=>x),
      items:(inventory.data??[]).map((x:any)=>({
        recordKind:x.record_kind,recordId:x.record_id,itemId:x.item_id,name:x.name,
        quantity:x.quantity,isUsable:x.is_usable===true,isEquipped:x.is_equipped===true,
        equippedSlot:x.equipped_slot??null,targetMode:x.target_mode??"self",
        categorySlug:x.category_slug??null,resolutionMode:x.resolution_mode??"automatic",
        damageDice:x.damage_dice??null,damageType:x.damage_type??null,
      })),
      shapes:(shapes.data??[]).map((x:any)=>one(x.shape)).filter((x:any)=>x?.is_active===true),
      targets:present,
    };
  }catch(e){
    return {ok:false,message:e instanceof Error?e.message:"Unable to load NPC mechanics.",gifts:[],items:[],shapes:[],targets:[]};
  }
}

async function npcMessage(a:any,npc:any,userId:string,roomId:string,message:string){
  const r=await a.from("room_messages").insert({
    room_id:roomId,character_id:npc.character_id,message,message_type:"action",
    speaker_type:"npc",npc_id:npc.id,npc_snapshot:snapshot(npc),
    sent_by_user_id:userId,client_nonce:crypto.randomUUID(),
  });
  if(r.error)throw new Error(r.error.message);
}

export async function npcWarpShape(input:{npcId:string;roomId:string;shapeId:string;targetIds:string[];writtenTarget?:string}){
  try{
    const {a,userId,npc,character}=await requireStaffNpc(input.npcId,input.roomId);
    const access=await getCharacterShapeAccess(character.id,input.shapeId);
    if(!access.allowed)return {ok:false,message:access.reasons.join(" · ")||"This Shape cannot currently be Warped."};

    const sq=await a.from("shapes").select("*").eq("id",input.shapeId).maybeSingle();
    if(sq.error||!sq.data)return {ok:false,message:sq.error?.message??"Shape not found."};
    const s:any=sq.data;
    if(s.is_dispel)return {ok:false,message:"NPC Dispel uses are not enabled in this panel yet."};

    const written=String(input.writtenTarget??"").trim();
    const isWritten=s.target_mode==="written";
    const self=s.target_mode==="self";
    let targetIds=self?[character.id]:[...new Set(input.targetIds??[])];

    if(isWritten&&!written)return {ok:false,message:"Write the Fate target."};
    if(!isWritten&&!self&&!targetIds.length)return {ok:false,message:"Choose a target."};
    if(s.target_scope!=="multiple"&&targetIds.length>1)targetIds=targetIds.slice(0,1);
    if(s.target_scope==="multiple")targetIds=targetIds.slice(0,Math.max(1,Number(s.max_targets??1)));

    const cr=await a.from("shape_casts").insert({
      caster_character_id:character.id,shape_id:s.id,room_id:input.roomId,
      written_target:isWritten?written:null,resource_type:"character",
    }).select("id").single();
    if(cr.error||!cr.data)return {ok:false,message:cr.error?.message??"Cast failed."};
    const castId=String(cr.data.id);

    if(s.price_key){
      const pe=await a.rpc("create_price_for_shape_cast_for_staff",{p_cast_id:castId,p_shape_id:s.id,p_character_id:character.id});
      if(pe.error){await a.from("shape_casts").delete().eq("id",castId);return {ok:false,message:pe.error.message};}
    }

    const rows=isWritten
      ? [{cast_id:castId,target_kind:"written",outcome:"manual"}]
      : targetIds.map(id=>({cast_id:castId,target_character_id:id,target_kind:id===character.id?"self":"character",outcome:"pending",resolved_at:null}));
    const tr=await a.from("shape_cast_targets").insert(rows);
    if(tr.error){await a.from("shape_casts").update({status:"failed"}).eq("id",castId);return {ok:false,message:tr.error.message};}

    const since=new Date(Date.now()-1500).toISOString();
    let resolved="";
    if(!isWritten){
      const rr=await resolveImmediateShapeCastForNpc(castId,character.id);
      if(!rr.ok)return rr;
      resolved=rr.message??"";
      await markNpcMessages(character.id,since);
    }
    await a.from("shape_casts").update({status:"resolved"}).eq("id",castId);

    const recent=await a.from("room_messages").select("id").eq("character_id",character.id).gte("created_at",since).limit(1);
    if(!recent.data?.length){
      const names=targetIds.length?(await a.from("characters").select("id,display_name").in("id",targetIds)).data??[]:[];
      const targetText=isWritten?written:(self?"Self":names.map((x:any)=>x.display_name).join(", "));
      await npcMessage(a,npc,userId,input.roomId,`◆ ${s.name} · Shape Level ${s.level} · Target: ${targetText}${resolved?` · ${resolved}`:""}`);
    }

    revalidatePath("/game");
    return {ok:true,message:`${s.name} warped.`};
  }catch(e){
    return {ok:false,message:e instanceof Error?e.message:"Unable to Warp Shape."};
  }
}
