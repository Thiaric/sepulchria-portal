"use server";

import { revalidatePath } from "next/cache";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { getStaffSession } from "@/lib/auth/require-staff";
import { createClient } from "@/lib/supabase/server";
import { getCharacterShapeAccess } from "@/lib/warping/shape-access";
import { resolveImmediateShapeCastForNpc } from "./warping-actions";
import {
  activateRoomGift,
  useRoomGift,
  useRoomItem,
  sendRoomAttributeCheck,
} from "./actions";
import {
  startAttributeOpposedAction,
  startUnarmedAttack,
  startWeaponOpposedAttack,
} from "./opposed-actions";

function admin(){
  const u=process.env.NEXT_PUBLIC_SUPABASE_URL;
  const k=process.env.SUPABASE_SECRET_KEY;
  if(!u||!k)throw new Error("Missing Supabase server credentials.");
  return createAdminClient(u,k,{auth:{persistSession:false,autoRefreshToken:false}});
}
function one<T>(v:T|T[]|null):T|null{return Array.isArray(v)?v[0]??null:v}
async function requireStaffNpc(npcId:string,roomId:string){
  const staff=await getStaffSession();
  if(!staff||!["owner","admin","master"].includes(staff.role))throw new Error("NPC mechanics require Master/Admin/Owner access.");
  const db=await createClient();
  const au=await db.auth.getUser();
  if(!au.data.user)throw new Error("Authentication required.");
  const a=admin();
  const speaker=await a
    .from("characters")
    .select("id")
    .eq("user_id",au.data.user.id)
    .eq("is_system",false)
    .maybeSingle();
  if(speaker.error||!speaker.data)throw new Error(speaker.error?.message??"Staff Character not found.");
  const q=await a.from("npcs").select("id,name,pronouns,portrait_url,description,current_room_id,is_active,character_id,race:races(id,name,icon_url)").eq("id",npcId).maybeSingle();
  if(q.error||!q.data)throw new Error(q.error?.message??"NPC not found.");
  if(!q.data.is_active)throw new Error("This NPC is inactive.");
  if(q.data.current_room_id!==roomId)throw new Error("Bring this NPC to this Location first.");
  if(!q.data.character_id)throw new Error("This NPC has no mechanics Character record.");
  const c=await a.from("characters").select("id,display_name,current_room_id,status,is_system").eq("id",q.data.character_id).maybeSingle();
  if(c.error||!c.data||!c.data.is_system)throw new Error(c.error?.message??"NPC mechanics Character not found.");
  return {a,userId:au.data.user.id,speakerCharacterId:speaker.data.id,npc:q.data,character:c.data};
}
function snapshot(n:any){
  const race=one(n.race);
  return {id:n.id,name:n.name,pronouns:n.pronouns??null,portrait_url:n.portrait_url??null,description:n.description??null,race:race?{id:race.id,name:race.name,icon_url:race.icon_url??null}:null};
}
async function npcMessage(a:any,npc:any,userId:string,speakerCharacterId:string,roomId:string,message:string){
  const r=await a.from("room_messages").insert({
    room_id:roomId,character_id:speakerCharacterId,message,message_type:"action",
    speaker_type:"npc",npc_id:npc.id,npc_snapshot:snapshot(npc),
    sent_by_user_id:userId,client_nonce:crypto.randomUUID(),
  });
  if(r.error)throw new Error(r.error.message);
}

async function publishNpcActionMessages(actorCharacterId:string,since:string){
  const staff=await getStaffSession();
  if(!staff||!["owner","admin","master"].includes(staff.role))throw new Error("NPC mechanics require Master/Admin/Owner access.");

  const session=await createClient();
  const au=await session.auth.getUser();
  if(!au.data.user)throw new Error("Authentication required.");

  const a=admin();
  const [npcResult,speakerResult]=await Promise.all([
    a.from("npcs").select("id,name,pronouns,portrait_url,description,character_id,race:races(id,name,icon_url)").eq("character_id",actorCharacterId).maybeSingle(),
    a.from("characters").select("id").eq("user_id",au.data.user.id).eq("is_system",false).maybeSingle(),
  ]);

  if(npcResult.error||!npcResult.data)throw new Error(npcResult.error?.message??"NPC not found.");
  if(speakerResult.error||!speakerResult.data)throw new Error(speakerResult.error?.message??"Staff Character not found.");

  const update=await a.from("room_messages").update({
    character_id:speakerResult.data.id,
    speaker_type:"npc",
    npc_id:npcResult.data.id,
    npc_snapshot:snapshot(npcResult.data),
    sent_by_user_id:au.data.user.id,
  }).eq("character_id",actorCharacterId).gte("created_at",since);

  if(update.error)throw new Error(update.error.message);
}

async function wrapNpcRoomAction(action:(previous:any,formData:FormData)=>Promise<any>,previous:any,formData:FormData){
  const actorCharacterId=String(formData.get("npc_actor_character_id")??"").trim();
  const since=new Date(Date.now()-2000).toISOString();
  const result=await action(previous,formData);

  if(result?.ok&&actorCharacterId){
    await publishNpcActionMessages(actorCharacterId,since);
    revalidatePath("/game");
  }

  return result;
}

export async function npcUseRoomGift(previous:any,formData:FormData){return wrapNpcRoomAction(useRoomGift,previous,formData);}
export async function npcActivateRoomGift(previous:any,formData:FormData){return wrapNpcRoomAction(activateRoomGift,previous,formData);}
export async function npcUseRoomItem(previous:any,formData:FormData){return wrapNpcRoomAction(useRoomItem,previous,formData);}
export async function npcSendRoomAttributeCheck(previous:any,formData:FormData){return wrapNpcRoomAction(sendRoomAttributeCheck,previous,formData);}
export async function npcStartAttributeOpposedAction(previous:any,formData:FormData){return wrapNpcRoomAction(startAttributeOpposedAction,previous,formData);}
export async function npcStartUnarmedAttack(previous:any,formData:FormData){return wrapNpcRoomAction(startUnarmedAttack,previous,formData);}
export async function npcStartWeaponOpposedAttack(previous:any,formData:FormData){return wrapNpcRoomAction(startWeaponOpposedAttack,previous,formData);}

export async function loadNpcMechanicsData(input:{npcId:string;roomId:string}){
  try{
    const {a,character}=await requireStaffNpc(input.npcId,input.roomId);
    const activeSince=new Date(Date.now()-5*60_000).toISOString();

    const [giftsResult,shapesResult,standardResult,uniqueResult,equipmentResult,presenceResult]=await Promise.all([
      a.from("character_gifts").select(`id,gift:gifts(*)`).eq("character_id",character.id),
      a.from("character_shapes").select(`shape_id,shape:shapes(*)`).eq("character_id",character.id),
      a.from("character_items").select("id,item_id,quantity").eq("character_id",character.id),
      a.from("character_item_instances").select("id,item_id,custom_name,charges_remaining").eq("owner_character_id",character.id).eq("vault_status","owned"),
      a.from("character_equipment").select("character_item_id,item_instance_id,slot_key").eq("character_id",character.id),
      a.from("character_presence").select(`character_id,appear_offline,last_seen_at,character:characters!character_presence_character_id_fkey(id,display_name,status,is_system,life_state)`).eq("room_id",input.roomId).gte("last_seen_at",activeSince),
    ]);

    const error=giftsResult.error??shapesResult.error??standardResult.error??uniqueResult.error??equipmentResult.error??presenceResult.error;
    if(error)throw new Error(error.message);

    const standard=standardResult.data??[];
    const unique=uniqueResult.data??[];
    const itemIds=[...new Set([...standard.map((x:any)=>x.item_id),...unique.map((x:any)=>x.item_id)].filter(Boolean))];

    const masterResult=itemIds.length
      ? await a.from("items").select(`*,category:item_categories(*)`).in("id",itemIds)
      : {data:[],error:null};
    if(masterResult.error)throw new Error(masterResult.error.message);

    const masters=new Map((masterResult.data??[]).map((x:any)=>[x.id,x]));
    const equipment=equipmentResult.data??[];
    const standardSlots=new Map(equipment.filter((x:any)=>x.character_item_id).map((x:any)=>[x.character_item_id,x.slot_key]));
    const uniqueSlots=new Map(equipment.filter((x:any)=>x.item_instance_id).map((x:any)=>[x.item_instance_id,x.slot_key]));

    const items=[
      ...standard.map((row:any)=>{
        const master:any=masters.get(row.item_id);
        const category=one(master?.category??null);
        const slot=standardSlots.get(row.id)??null;
        return {
          record_kind:"standard",record_id:row.id,item_id:row.item_id,name:master?.name??"Unknown Item",quantity:Number(row.quantity??1),
          is_usable:master?.is_usable===true,is_equipped:Boolean(slot),equipped_slot:slot,target_mode:master?.target_mode??"self",
          category_slug:category?.slug??null,resolution_mode:master?.resolution_mode??"automatic",damage_dice:master?.damage_dice??null,damage_type:master?.damage_type??null,
        };
      }),
      ...unique.map((row:any)=>{
        const master:any=masters.get(row.item_id);
        const category=one(master?.category??null);
        const slot=uniqueSlots.get(row.id)??null;
        return {
          record_kind:"unique",record_id:row.id,item_id:row.item_id,name:row.custom_name?.trim()||master?.name||"Unknown Item",quantity:1,
          charges_remaining:row.charges_remaining??null,is_usable:master?.is_usable===true,is_equipped:Boolean(slot),equipped_slot:slot,
          target_mode:master?.target_mode??"self",category_slug:category?.slug??null,resolution_mode:master?.resolution_mode??"automatic",
          damage_dice:master?.damage_dice??null,damage_type:master?.damage_type??null,
        };
      }),
    ];

    const gifts=(giftsResult.data??[])
      .map((x:any)=>{const g=one(x.gift) as any;return g?{characterGiftId:x.id,...g}:null;})
      .filter((x:any)=>x&&x.is_active!==false);

    const shapes=(shapesResult.data??[])
      .map((x:any)=>one(x.shape) as any)
      .filter((x:any)=>x&&x.is_active===true);

    const targets=(presenceResult.data??[])
      .filter((x:any)=>x.appear_offline!==true)
      .map((x:any)=>one(x.character) as any)
      .filter((x:any)=>x&&x.status==="approved"&&x.is_system!==true&&x.id!==character.id)
      .map((x:any)=>({id:x.id,display_name:x.display_name,life_state:x.life_state}));

    return {ok:true,characterId:character.id,gifts,items,shapes,targets};
  }catch(e){
    return {ok:false,message:e instanceof Error?e.message:"Unable to load NPC mechanics.",gifts:[],items:[],shapes:[],targets:[]};
  }
}

export async function npcWarpShape(input:{npcId:string;roomId:string;shapeId:string;targetIds:string[];writtenTarget?:string}){
  try{
    const {a,userId,speakerCharacterId,npc,character}=await requireStaffNpc(input.npcId,input.roomId);
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
      const pe=await a.rpc("create_price_for_shape_cast_for_staff",{
        p_cast_id:castId,p_shape_id:s.id,p_character_id:character.id,
      });
      if(pe.error){
        await a.from("shape_casts").delete().eq("id",castId);
        return {ok:false,message:pe.error.message};
      }
    }

    const rows=isWritten
      ? [{cast_id:castId,target_kind:"written",outcome:"manual"}]
      : targetIds.map(id=>({cast_id:castId,target_character_id:id,target_kind:id===character.id?"self":"character",outcome:"pending",resolved_at:null}));
    const tr=await a.from("shape_cast_targets").insert(rows);
    if(tr.error){
      await a.from("shape_casts").update({status:"failed"}).eq("id",castId);
      return {ok:false,message:tr.error.message};
    }

    let resolved="";
    if(!isWritten){
      const rr=await resolveImmediateShapeCastForNpc(castId,character.id);
      if(!rr.ok)return rr;
      resolved=rr.message??"";
    }
    await a.from("shape_casts").update({status:"resolved"}).eq("id",castId);
    const names=(await a.from("characters").select("id,display_name").in("id",targetIds)).data??[];
    const targetText=isWritten?written:(self?"Self":names.map((x:any)=>x.display_name).join(", "));
    await npcMessage(a,npc,userId,speakerCharacterId,input.roomId,`◆ Warp [${s.name}] · Level [${s.level}] · ${targetIds.length>1?"Targets":"Target"} [${targetText}]${resolved?` · ${resolved}`:""}`);
    revalidatePath("/game");
    return {ok:true,message:`${s.name} warped.`};
  }catch(e){
    return {ok:false,message:e instanceof Error?e.message:"Unable to Warp Shape."};
  }
}
