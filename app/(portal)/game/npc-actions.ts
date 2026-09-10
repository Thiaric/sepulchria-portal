"use server";

import { createClient as createAdminClient } from "@supabase/supabase-js";
import { getStaffSession } from "@/lib/auth/require-staff";
import { createClient } from "@/lib/supabase/server";

export type NpcRace = { id:string; name:string; icon_url:string|null };
export type StaffNpc = {
  id:string; name:string; pronouns:string|null; portrait_url:string|null;
  description:string|null; current_room_id:string|null; current_room_name:string|null;
  is_active:boolean; race_id:string|null; race:NpcRace|null;
};
export type NpcControlData = { npcs:StaffNpc[]; races:NpcRace[] };

function adminClient(): any {
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret=process.env.SUPABASE_SECRET_KEY;
  if(!url||!secret) throw new Error("Missing Supabase privileged credentials.");
  return createAdminClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false}});
}

async function requireNpcStaff(){
  const staff=await getStaffSession();
  if(!staff||!["owner","admin","master"].includes(staff.role))
    throw new Error("Only Masters, Admins and the Owner may control NPCs.");
  const supabase=await createClient();
  const {data:{user},error}=await supabase.auth.getUser();
  if(error||!user) throw new Error("Authentication required.");
  const admin=adminClient();
  const result=await admin.from("characters").select("id,current_room_id,status,is_system").eq("user_id",user.id).maybeSingle();
  if(result.error||!result.data) throw new Error(result.error?.message??"Staff Character not found.");
  if(result.data.status!=="approved"||result.data.is_system) throw new Error("An approved staff Character is required.");
  return {staff,user,character:result.data,admin};
}

function clean(value:unknown,max:number){
  const s=String(value??"").trim().replace(/\s+/g," ");
  return s?s.slice(0,max):null;
}
function cleanName(value:unknown){
  const s=String(value??"").trim().replace(/\s+/g," ");
  if(s.length<2||s.length>80) throw new Error("NPC name must be between 2 and 80 characters.");
  return s;
}
async function assertRoom(admin:any,roomId:string){
  const r=await admin.from("rooms").select("id").eq("id",roomId).eq("is_active",true).maybeSingle();
  if(r.error||!r.data) throw new Error(r.error?.message??"Location not found.");
}

export async function loadNpcControlData(roomId:string):Promise<NpcControlData>{
  const {admin}=await requireNpcStaff();
  await assertRoom(admin,roomId);
  const [npcs,races]=await Promise.all([
    admin.from("npcs").select(`id,name,pronouns,portrait_url,description,current_room_id,is_active,race_id,race:races(id,name,icon_url),room:rooms(id,name)`).order("name",{ascending:true}),
    admin.from("races").select("id,name,icon_url").eq("is_active",true).order("name",{ascending:true}),
  ]);
  if(npcs.error) throw new Error(`Unable to load NPCs: ${npcs.error.message}`);
  if(races.error) throw new Error(`Unable to load Ancestries: ${races.error.message}`);
  return {
    npcs:(npcs.data??[]).map((row:any)=>{
      const race=Array.isArray(row.race)?row.race[0]??null:row.race??null;
      const room=Array.isArray(row.room)?row.room[0]??null:row.room??null;
      return {id:row.id,name:row.name,pronouns:row.pronouns??null,portrait_url:row.portrait_url??null,description:row.description??null,current_room_id:row.current_room_id??null,current_room_name:room?.name??null,is_active:row.is_active===true,race_id:row.race_id??null,race};
    }),
    races:(races.data??[]) as NpcRace[],
  };
}

export async function createNpc(input:{roomId:string;name:string;pronouns?:string;portraitUrl?:string;description?:string;raceId?:string}){
  try{
    const {admin,user}=await requireNpcStaff();
    await assertRoom(admin,input.roomId);
    const name=cleanName(input.name);
    const result=await admin.from("npcs").insert({
      name, pronouns:clean(input.pronouns,80), portrait_url:clean(input.portraitUrl,800),
      description:clean(input.description,2000), race_id:clean(input.raceId,64),
      current_room_id:input.roomId,is_active:true,created_by_user_id:user.id,updated_by_user_id:user.id,
    });
    return result.error?{ok:false,message:`Unable to create NPC: ${result.error.message}`}:{ok:true,message:`${name} created in this Location.`};
  }catch(error){return {ok:false,message:error instanceof Error?error.message:"Unable to create NPC."};}
}

export async function updateNpc(input:{npcId:string;roomId:string;name:string;pronouns?:string;portraitUrl?:string;description?:string;raceId?:string;isActive:boolean;moveHere:boolean}){
  try{
    const {admin,user}=await requireNpcStaff();
    await assertRoom(admin,input.roomId);
    const name=cleanName(input.name);
    const update:any={name,pronouns:clean(input.pronouns,80),portrait_url:clean(input.portraitUrl,800),description:clean(input.description,2000),race_id:clean(input.raceId,64),is_active:input.isActive,updated_by_user_id:user.id,updated_at:new Date().toISOString()};
    if(input.moveHere) update.current_room_id=input.roomId;
    const result=await admin.from("npcs").update(update).eq("id",input.npcId);
    return result.error?{ok:false,message:`Unable to update NPC: ${result.error.message}`}:{ok:true,message:`${name} updated.`};
  }catch(error){return {ok:false,message:error instanceof Error?error.message:"Unable to update NPC."};}
}

export async function sendNpcMessage(input:{roomId:string;npcId:string;message:string}){
  try{
    const {admin,user,character}=await requireNpcStaff();
    if(character.current_room_id!==input.roomId) return {ok:false,message:"You must be in this Location to post as an NPC."};
    const message=String(input.message??"").trim();
    if(!message||message.length>4000) return {ok:false,message:"NPC message must contain 1–4000 characters."};
    const r=await admin.from("npcs").select(`id,name,pronouns,portrait_url,description,current_room_id,is_active,race:races(id,name,icon_url)`).eq("id",input.npcId).maybeSingle();
    if(r.error||!r.data) return {ok:false,message:r.error?.message??"NPC not found."};
    const npc=r.data;
    if(!npc.is_active) return {ok:false,message:"This NPC is inactive."};
    if(npc.current_room_id!==input.roomId) return {ok:false,message:"This NPC is not currently in this Location."};
    const race=Array.isArray(npc.race)?npc.race[0]??null:npc.race??null;
    const snapshot={id:npc.id,name:npc.name,pronouns:npc.pronouns??null,portrait_url:npc.portrait_url??null,description:npc.description??null,race:race?{id:race.id,name:race.name,icon_url:race.icon_url??null}:null};
    const result=await admin.from("room_messages").insert({
      room_id:input.roomId,character_id:character.id,message,message_type:"action",speaker_type:"npc",npc_id:npc.id,npc_snapshot:snapshot,sent_by_user_id:user.id,client_nonce:crypto.randomUUID(),
    });
    return result.error?{ok:false,message:`Unable to post as NPC: ${result.error.message}`}:{ok:true,message:`Posted as ${npc.name}.`};
  }catch(error){return {ok:false,message:error instanceof Error?error.message:"Unable to post as NPC."};}
}
