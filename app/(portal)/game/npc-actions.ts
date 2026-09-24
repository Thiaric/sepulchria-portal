"use server";

import { createClient as createAdminClient } from "@supabase/supabase-js";
import { getStaffSession } from "@/lib/auth/require-staff";
import { createClient } from "@/lib/supabase/server";

export type NpcRace = { id:string; name:string; icon_url:string|null };
export type NpcOrder = { id:string; name:string };
export type StaffNpc = {
  id:string; name:string; first_name:string; surname:string; pronouns:string|null; portrait_url:string|null;
  description:string|null; current_room_id:string|null; current_room_name:string|null;
  is_active:boolean; is_location_active:boolean; race_id:string|null; race:NpcRace|null;
  order_id:string|null; order:NpcOrder|null; character_id:string|null;
};
export type NpcControlData = { npcs:StaffNpc[]; races:NpcRace[]; orders:NpcOrder[] };

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
  const [npcs,races,orders]=await Promise.all([
    admin.from("npcs").select(`id,name,pronouns,portrait_url,description,current_room_id,is_active,is_location_active,race_id,order_id,character_id,race:races(id,name,icon_url),order:orders(id,name),room:rooms(id,name)`).order("name",{ascending:true}),
    admin.from("races").select("id,name,icon_url").eq("is_active",true).order("name",{ascending:true}),
    admin.from("orders").select("id,name").eq("is_active",true).order("name",{ascending:true}),
  ]);
  if(npcs.error) throw new Error(`Unable to load NPCs: ${npcs.error.message}`);
  if(races.error) throw new Error(`Unable to load Ancestries: ${races.error.message}`);
  if(orders.error) throw new Error(`Unable to load Orders: ${orders.error.message}`);

  const npcCharacterIds=(npcs.data??[])
    .map((row:any)=>row.character_id)
    .filter((id:any):id is string=>typeof id==="string"&&id.length>0);

  const characterNames=npcCharacterIds.length
    ? await admin.from("characters").select("id,first_name,surname").in("id",npcCharacterIds)
    : {data:[],error:null};

  if(characterNames.error)
    throw new Error(`Unable to load NPC Character names: ${characterNames.error.message}`);

  const namesByCharacterId=new Map<string,{first_name:string;surname:string}>(
    (characterNames.data??[]).map((row:any)=>[
      String(row.id),
      {
        first_name:String(row.first_name??""),
        surname:String(row.surname??""),
      },
    ]),
  );

  return {
    npcs:(npcs.data??[]).map((row:any)=>{
      const race=Array.isArray(row.race)?row.race[0]??null:row.race??null;
      const order=Array.isArray(row.order)?row.order[0]??null:row.order??null;
      const room=Array.isArray(row.room)?row.room[0]??null:row.room??null;
      const identity=namesByCharacterId.get(row.character_id)??{first_name:row.name??"",surname:""};
      return {id:row.id,name:row.name,first_name:identity.first_name,surname:identity.surname,pronouns:row.pronouns??null,portrait_url:row.portrait_url??null,description:row.description??null,current_room_id:row.current_room_id??null,current_room_name:room?.name??null,is_active:row.is_active===true,is_location_active:row.is_location_active===true,race_id:row.race_id??null,race,order_id:row.order_id??null,order,character_id:row.character_id??null};
    }),
    races:(races.data??[]) as NpcRace[], orders:(orders.data??[]) as NpcOrder[],
  };
}

export async function createNpc(input:{roomId:string;firstName:string;surname?:string;pronouns?:string;portraitUrl?:string;raceId?:string;orderId?:string}){
  try{
    const {admin,user}=await requireNpcStaff(); await assertRoom(admin,input.roomId);
    const firstName=cleanName(input.firstName);
    const surname=clean(input.surname,80)??"";
    const name=cleanName([firstName,surname].filter(Boolean).join(" "));
    const npcId=crypto.randomUUID();
    const raceId=clean(input.raceId,64), orderId=clean(input.orderId,64), portraitUrl=clean(input.portraitUrl,800), pronouns=clean(input.pronouns,80);
    const cr=await admin.from("characters").insert({id:npcId,user_id:null,first_name:firstName,surname,pronouns,portrait_url:portraitUrl,physical_description:"NPC",personality:"Staff-controlled NPC.",biography:"Staff-controlled NPC.",public_slug:`npc-${npcId.replace(/-/g,"")}`,status:"approved",approved_at:new Date().toISOString(),current_room_id:input.roomId,race_id:raceId,title:"NPC",is_system:true,muscles:3,reflexes:3,vigor:3,brains:3,shrewd:3,presence_score:3,current_health:30});
    if(cr.error) return {ok:false,message:`Unable to create NPC mechanics record: ${cr.error.message}`};
    const result=await admin.from("npcs").insert({id:npcId,character_id:npcId,name,pronouns,portrait_url:portraitUrl,description:null,race_id:raceId,order_id:orderId,current_room_id:input.roomId,is_active:true,is_location_active:true,created_by_user_id:user.id,updated_by_user_id:user.id});
    if(result.error){await admin.from("characters").delete().eq("id",npcId).eq("is_system",true);return {ok:false,message:`Unable to create NPC: ${result.error.message}`};}
    return {ok:true,message:`${name} created in this Location.`};
  }catch(error){return {ok:false,message:error instanceof Error?error.message:"Unable to create NPC."};}
}

export async function updateNpc(input:{npcId:string;roomId:string;firstName:string;surname?:string;pronouns?:string;portraitUrl?:string;raceId?:string;orderId?:string;isActive:boolean;isLocationActive:boolean;moveHere:boolean}){
  try{
    const {admin,user}=await requireNpcStaff(); await assertRoom(admin,input.roomId);
    const firstName=cleanName(input.firstName);
    const surname=clean(input.surname,80)??"";
    const name=cleanName([firstName,surname].filter(Boolean).join(" "));
    const raceId=clean(input.raceId,64),orderId=clean(input.orderId,64),portraitUrl=clean(input.portraitUrl,800),pronouns=clean(input.pronouns,80);
    const cur=await admin.from("npcs").select("character_id").eq("id",input.npcId).maybeSingle();
    if(cur.error||!cur.data) return {ok:false,message:cur.error?.message??"NPC not found."};
    const update:any={name,pronouns,portrait_url:portraitUrl,race_id:raceId,order_id:orderId,is_active:input.isActive,is_location_active:input.isLocationActive,updated_by_user_id:user.id,updated_at:new Date().toISOString()};
    if(input.moveHere) update.current_room_id=input.roomId;
    const result=await admin.from("npcs").update(update).eq("id",input.npcId); if(result.error) return {ok:false,message:`Unable to update NPC: ${result.error.message}`};
    const cu:any={first_name:firstName,surname,pronouns,portrait_url:portraitUrl,race_id:raceId,updated_at:new Date().toISOString()}; if(input.moveHere) cu.current_room_id=input.roomId;
    const linked=await admin.from("characters").update(cu).eq("id",cur.data.character_id??input.npcId).eq("is_system",true);
    if(linked.error) return {ok:false,message:`NPC saved, but mechanics sync failed: ${linked.error.message}`};
    return {ok:true,message:`${name} updated.`};
  }catch(error){return {ok:false,message:error instanceof Error?error.message:"Unable to update NPC."};}
}

export async function sendNpcMessage(input:{roomId:string;npcId:string;message:string}){
  try{
    const {admin,user,character}=await requireNpcStaff();
    if(character.current_room_id!==input.roomId) return {ok:false,message:"You must be in this Location to post as an NPC."};
    const rawMessage=String(input.message??"").trim();
    if(!rawMessage||rawMessage.length>4000) return {ok:false,message:"NPC message must contain 1–4000 characters."};

    const r=await admin.from("npcs").select(`id,character_id,name,pronouns,portrait_url,description,current_room_id,is_active,is_location_active,race:races(id,name,icon_url)`).eq("id",input.npcId).maybeSingle();
    if(r.error||!r.data) return {ok:false,message:r.error?.message??"NPC not found."};

    const npc=r.data;

    if(!npc.is_active) return {ok:false,message:"This NPC is inactive."};
    if(!npc.is_location_active) return {ok:false,message:"This NPC is not Active in Locations."};
    if(npc.current_room_id!==input.roomId) return {ok:false,message:"This NPC is not currently in this Location."};

    let storedMessage=rawMessage;
    let messageType:"action"|"whisper"="action";
    let whisperRecipientId:string|null=null;

    const typedWhisperMatch=
      rawMessage.match(
        /^@([^@\r\n]+)@\s*/,
      );

    if(typedWhisperMatch){
      const typedCharacterName=
        typedWhisperMatch[1].trim();

      const targetResult=await admin
        .from("characters")
        .select("id,display_name,current_room_id,status,is_system")
        .ilike("display_name",typedCharacterName)
        .eq("status","approved")
        .eq("is_system",false)
        .eq("current_room_id",input.roomId)
        .limit(1)
        .maybeSingle();

      if(targetResult.error){
        return {
          ok:false,
          message:`Unable to verify whisper recipient: ${targetResult.error.message}`,
        };
      }

      if(!targetResult.data){
        return {
          ok:false,
          message:"Character not at this Location",
        };
      }

      storedMessage=
        rawMessage
          .slice(
            typedWhisperMatch[0]
              .length,
          )
          .trim();

      if(!storedMessage){
        return {
          ok:false,
          message:"Write the whisper after the character marker.",
        };
      }

      messageType="whisper";
      whisperRecipientId=
        targetResult.data.id;
    }

    const race=Array.isArray(npc.race)?npc.race[0]??null:npc.race??null;
    const snapshot={id:npc.id,character_id:npc.character_id??npc.id,name:npc.name,pronouns:npc.pronouns??null,portrait_url:npc.portrait_url??null,description:npc.description??null,race:race?{id:race.id,name:race.name,icon_url:race.icon_url??null}:null};

    const result=await admin.from("room_messages").insert({
      room_id:input.roomId,
      character_id:character.id,
      message:storedMessage,
      message_type:messageType,
      whisper_recipient_character_id:whisperRecipientId,
      speaker_type:"npc",
      npc_id:npc.id,
      npc_snapshot:snapshot,
      sent_by_user_id:user.id,
      client_nonce:crypto.randomUUID(),
    });

    return result.error
      ? {ok:false,message:`Unable to post as NPC: ${result.error.message}`}
      : {
          ok:true,
          message:
            messageType==="whisper"
              ? `Whisper sent as ${npc.name}.`
              : `Posted as ${npc.name}.`,
        };
  }catch(error){return {ok:false,message:error instanceof Error?error.message:"Unable to post as NPC."};}
}

export async function sendNpcWhisper(input:{
  roomId:string;
  npcId:string;
  targetCharacterId:string;
  message:string;
}){
  try{
    const {admin,user,character}=await requireNpcStaff();

    if(character.current_room_id!==input.roomId){
      return {ok:false,message:"You must be in this Location to whisper as an NPC."};
    }

    const message=String(input.message??"").trim();
    const targetCharacterId=String(input.targetCharacterId??"").trim();

    if(!message||message.length>4000){
      return {ok:false,message:"NPC whisper must contain 1–4000 characters."};
    }

    if(!targetCharacterId){
      return {ok:false,message:"Choose a Character to whisper to."};
    }

    const [npcResult,targetResult]=await Promise.all([
      admin.from("npcs")
        .select(`id,character_id,name,pronouns,portrait_url,description,current_room_id,is_active,is_location_active,race:races(id,name,icon_url)`)
        .eq("id",input.npcId)
        .maybeSingle(),
      admin.from("characters")
        .select("id,display_name,current_room_id,status,is_system")
        .eq("id",targetCharacterId)
        .maybeSingle(),
    ]);

    if(npcResult.error||!npcResult.data){
      return {ok:false,message:npcResult.error?.message??"NPC not found."};
    }

    const npc=npcResult.data;

    if(!npc.is_active){
      return {ok:false,message:"This NPC is inactive."};
    }

    if(!npc.is_location_active){
      return {ok:false,message:"This NPC is not Active in Locations."};
    }

    if(npc.current_room_id!==input.roomId){
      return {ok:false,message:"This NPC is not currently in this Location."};
    }

    if(
      targetResult.error||
      !targetResult.data||
      targetResult.data.status!=="approved"||
      targetResult.data.is_system
    ){
      return {ok:false,message:targetResult.error?.message??"Choose an ordinary Character."};
    }

    if(targetResult.data.current_room_id!==input.roomId){
      return {ok:false,message:"That Character is not currently in this Location."};
    }

    const race=Array.isArray(npc.race)?npc.race[0]??null:npc.race??null;
    const snapshot={
      id:npc.id,
      character_id:npc.character_id??npc.id,
      name:npc.name,
      pronouns:npc.pronouns??null,
      portrait_url:npc.portrait_url??null,
      description:npc.description??null,
      race:race?{id:race.id,name:race.name,icon_url:race.icon_url??null}:null,
    };

    const result=await admin.from("room_messages").insert({
      room_id:input.roomId,
      character_id:character.id,
      message,
      message_type:"whisper",
      whisper_recipient_character_id:targetCharacterId,
      speaker_type:"npc",
      npc_id:npc.id,
      npc_snapshot:snapshot,
      sent_by_user_id:user.id,
      client_nonce:crypto.randomUUID(),
    });

    return result.error
      ? {ok:false,message:`Unable to whisper as NPC: ${result.error.message}`}
      : {ok:true,message:`Whispered to ${targetResult.data.display_name} as ${npc.name}.`};
  }catch(error){
    return {
      ok:false,
      message:error instanceof Error?error.message:"Unable to whisper as NPC.",
    };
  }
}

