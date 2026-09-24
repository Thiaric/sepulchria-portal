"use server";

import { revalidatePath } from "next/cache";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { getStaffSession } from "@/lib/auth/require-staff";
import { createClient } from "@/lib/supabase/server";
import { getCharacterShapeAccess } from "@/lib/warping/shape-access";
import { resolveImmediateShapeCastForNpc } from "./warping-actions";

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
async function npcMessage(a:any,npc:any,userId:string,roomId:string,message:string){
  const r=await a.from("room_messages").insert({
    room_id:roomId,character_id:npc.character_id,message,message_type:"action",
    speaker_type:"npc",npc_id:npc.id,npc_snapshot:snapshot(npc),
    sent_by_user_id:userId,client_nonce:crypto.randomUUID(),
  });
  if(r.error)throw new Error(r.error.message);
}

export async function loadNpcMechanicsData(input:{npcId:string;roomId:string}){
  try{
    const {a,character}=await requireStaffNpc(input.npcId,input.roomId);
    const activeSince=new Date(Date.now()-5*60_000).toISOString();

    const [giftsResult,standardResult,uniqueResult,equipmentResult,shapesResult,presenceResult]=await Promise.all([
      a.from("character_gifts")
        .select(`id,gift:gifts(id,name,description,effect_mode,target_mode,is_active)`)
        .eq("character_id",character.id),
      a.from("character_items")
        .select("id,item_id,quantity")
        .eq("character_id",character.id),
      a.from("character_item_instances")
        .select("id,item_id,custom_name,charges_remaining")
        .eq("owner_character_id",character.id)
        .eq("vault_status","owned"),
      a.from("character_equipment")
        .select("character_item_id,item_instance_id,slot_key")
        .eq("character_id",character.id),
      a.from("character_shapes")
        .select(`shape_id,shape:shapes(id,name,level,target_mode,target_scope,max_targets,is_active,is_dispel,price_key)`)
        .eq("character_id",character.id),
      a.from("character_presence")
        .select("character_id,appear_offline,last_seen_at")
        .eq("room_id",input.roomId)
        .gte("last_seen_at",activeSince),
    ]);

    const firstError =
      giftsResult.error ??
      standardResult.error ??
      uniqueResult.error ??
      equipmentResult.error ??
      shapesResult.error ??
      presenceResult.error;

    if(firstError)throw new Error(firstError.message);

    const standard=standardResult.data??[];
    const unique=uniqueResult.data??[];
    const itemIds=[...new Set([
      ...standard.map((x:any)=>x.item_id),
      ...unique.map((x:any)=>x.item_id),
    ].filter(Boolean))];

    const masterResult=itemIds.length
      ? await a.from("items")
          .select(`id,name,is_usable,target_mode,resolution_mode,damage_dice,damage_type,category:item_categories(slug)`)
          .in("id",itemIds)
      : {data:[],error:null};

    if(masterResult.error)throw new Error(masterResult.error.message);

    const masters=new Map((masterResult.data??[]).map((x:any)=>[x.id,x]));
    const equipment=equipmentResult.data??[];
    const standardEquipment=new Map(
      equipment.filter((x:any)=>x.character_item_id).map((x:any)=>[x.character_item_id,x.slot_key]),
    );
    const uniqueEquipment=new Map(
      equipment.filter((x:any)=>x.item_instance_id).map((x:any)=>[x.item_instance_id,x.slot_key]),
    );

    const items=[
      ...standard.map((row:any)=>{
        const master:any=masters.get(row.item_id);
        const slot=standardEquipment.get(row.id)??null;
        const category=one(master?.category??null);
        return {
          record_kind:"standard",
          record_id:row.id,
          item_id:row.item_id,
          name:master?.name??"Unknown Item",
          quantity:Number(row.quantity??0),
          is_usable:master?.is_usable===true,
          target_mode:master?.target_mode??"self",
          resolution_mode:master?.resolution_mode??"automatic",
          damage_dice:master?.damage_dice??null,
          damage_type:master?.damage_type??null,
          category_slug:category?.slug??null,
          is_equipped:Boolean(slot),
          equipped_slot:slot,
        };
      }),
      ...unique.map((row:any)=>{
        const master:any=masters.get(row.item_id);
        const slot=uniqueEquipment.get(row.id)??null;
        const category=one(master?.category??null);
        return {
          record_kind:"unique",
          record_id:row.id,
          item_id:row.item_id,
          name:row.custom_name?.trim()||master?.name||"Unknown Item",
          quantity:1,
          charges_remaining:row.charges_remaining??null,
          is_usable:master?.is_usable===true,
          target_mode:master?.target_mode??"self",
          resolution_mode:master?.resolution_mode??"automatic",
          damage_dice:master?.damage_dice??null,
          damage_type:master?.damage_type??null,
          category_slug:category?.slug??null,
          is_equipped:Boolean(slot),
          equipped_slot:slot,
        };
      }),
    ].filter((x:any)=>x.item_id);

    const presentIds=[...new Set(
      (presenceResult.data??[])
        .filter((x:any)=>x.appear_offline!==true)
        .map((x:any)=>x.character_id)
        .filter((id:string)=>id&&id!==character.id),
    )];

    const targetsResult=presentIds.length
      ? await a.from("characters")
          .select("id,display_name,life_state")
          .in("id",presentIds)
          .eq("status","approved")
          .eq("is_system",false)
          .order("display_name")
      : {data:[],error:null};

    if(targetsResult.error)throw new Error(targetsResult.error.message);

    const gifts=(giftsResult.data??[])
      .map((x:any)=>({characterGiftId:x.id,...one(x.gift)}))
      .filter((x:any)=>x?.is_active!==false&&x?.name);

    const shapes=(shapesResult.data??[])
      .map((x:any)=>one(x.shape))
      .filter((x:any)=>x?.is_active===true&&x?.id);

    return {
      ok:true,
      characterId:character.id,
      gifts,
      items,
      shapes,
      targets:targetsResult.data??[],
    };
  }catch(e){
    return {
      ok:false,
      message:e instanceof Error?e.message:"Unable to load NPC mechanics.",
      gifts:[],
      items:[],
      shapes:[],
      targets:[],
    };
  }
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
    await npcMessage(a,npc,userId,input.roomId,`◆ ${s.name} · Shape Level ${s.level} · Target: ${targetText}${resolved?` · ${resolved}`:""}`);
    revalidatePath("/game");
    return {ok:true,message:`${s.name} warped.`};
  }catch(e){
    return {ok:false,message:e instanceof Error?e.message:"Unable to Warp Shape."};
  }
}
