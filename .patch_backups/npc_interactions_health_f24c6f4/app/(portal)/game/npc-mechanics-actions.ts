"use server";

import { revalidatePath } from "next/cache";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { getStaffSession } from "@/lib/auth/require-staff";
import { createClient } from "@/lib/supabase/server";
import { getCharacterShapeAccess } from "@/lib/warping/shape-access";
import { getEffectiveCharacterAttributes } from "@/lib/characters/get-effective-character-attributes";
import { resolveImmediateShapeCastForNpc, resolveIncomingShape, resolveIncomingDispel } from "./warping-actions";
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
  counterOpposedAction,
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
  const c=await a.from("characters").select("id,display_name,current_room_id,status,is_system,muscles,reflexes,vigor,brains,shrewd,presence_score,life_state").eq("id",q.data.character_id).maybeSingle();
  if(c.error||!c.data||!c.data.is_system)throw new Error(c.error?.message??"NPC mechanics Character not found.");
  if(c.data.life_state!=="alive"){
    throw new Error(
      c.data.life_state==="dead"
        ? "Dead Characters cannot perform normal Actions."
        : "Characters at Death's Threshold cannot perform normal Actions.",
    );
  }
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

export async function npcUseRoomGift(previous:any,formData:FormData){
  return useRoomGift(previous,formData);
}

export async function npcActivateRoomGift(previous:any,formData:FormData){
  return activateRoomGift(previous,formData);
}

export async function npcUseRoomItem(previous:any,formData:FormData){
  return useRoomItem(previous,formData);
}

export async function npcSendRoomAttributeCheck(previous:any,formData:FormData){
  return sendRoomAttributeCheck(previous,formData);
}

export async function npcStartAttributeOpposedAction(previous:any,formData:FormData){
  return startAttributeOpposedAction(previous,formData);
}

export async function npcStartUnarmedAttack(previous:any,formData:FormData){
  return startUnarmedAttack(previous,formData);
}

export async function npcStartWeaponOpposedAttack(previous:any,formData:FormData){
  return startWeaponOpposedAttack(previous,formData);
}

export async function npcCounterOpposedAction(previous:any,formData:FormData){
  return counterOpposedAction(previous,formData);
}
export async function npcResolveIncomingShape(previous:any,formData:FormData){
  return resolveIncomingShape(previous,formData);
}
export async function npcResolveIncomingDispel(previous:any,formData:FormData){
  return resolveIncomingDispel(previous,formData);
}
export async function loadNpcPendingResponses(input:{npcId:string;roomId:string}){
  try{
    const {a,character}=await requireStaffNpc(input.npcId,input.roomId);
    const attrs=await getEffectiveCharacterAttributes(character.id,{
      muscles:character.muscles,reflexes:character.reflexes,vigor:character.vigor,
      brains:character.brains,shrewd:character.shrewd,presence_score:character.presence_score,
    });
    const [opposed,shapeTargets,dispels]=await Promise.all([
      a.from("opposed_actions")
        .select(`id,action_label,attack_total,allowed_counters,expires_at,attacker:characters!opposed_actions_attacker_character_id_fkey(display_name)`)
        .eq("target_character_id",character.id).eq("status","pending")
        .gt("expires_at",new Date().toISOString()).order("created_at",{ascending:true}),
      a.from("shape_cast_targets")
        .select(`id,target_character_id,other_effect_choice,outcome,cast:shape_casts!shape_cast_targets_cast_id_fkey(id,room_id,caster:characters!shape_casts_caster_character_id_fkey(id,display_name),shape:shapes!shape_casts_shape_id_fkey(*))`)
        .eq("target_character_id",character.id).eq("outcome","pending").order("created_at",{ascending:true}),
      a.from("shape_casts")
        .select(`id,room_id,dispel_effect_id,dispel_target_character_id,caster:characters!shape_casts_caster_character_id_fkey(id,display_name),shape:shapes!shape_casts_shape_id_fkey(*)`)
        .eq("dispel_target_character_id",character.id).not("dispel_effect_id","is",null).order("created_at",{ascending:true}),
    ]);
    const error=opposed.error??shapeTargets.error??dispels.error;
    if(error)throw new Error(error.message);

    const shapes=(shapeTargets.data??[]).flatMap((row:any)=>{
      const cast=one(row.cast) as any,caster=one(cast?.caster) as any,shape=one(cast?.shape) as any;
      if(!shape||!caster||cast?.room_id!==input.roomId||caster.id===character.id)return [];
      const profile=row.target_character_id===caster.id?"self":shape.other_alternative_enabled&&row.other_effect_choice==="harmful"?"other_alt":"other";
      const mode=shape[`${profile}_resolution_mode`]??shape.resolution_mode??"save";
      if(mode!=="save")return [];
      const saves=Array.isArray(shape[`${profile}_save_options`])?shape[`${profile}_save_options`]:(Array.isArray(shape.save_options)?shape.save_options:[]);
      return [{id:row.id,kind:shape.is_feat_backing?"Feat":"Shape",name:shape.name,casterName:caster.display_name??"Someone",saveOptions:saves}];
    });

    const dispelRows=(dispels.data??[]).flatMap((row:any)=>{
      const shape=one(row.shape) as any,caster=one(row.caster) as any;
      if(!shape?.is_dispel||row.room_id!==input.roomId)return [];
      const profile=row.dispel_target_character_id===caster?.id?"self":"other";
      const saves=Array.isArray(shape[`${profile}_save_options`])?shape[`${profile}_save_options`]:(Array.isArray(shape.save_options)?shape.save_options:[]);
      return [{id:row.id,name:shape.name,casterName:caster?.display_name??"Someone",saveOptions:saves}];
    });

    return {ok:true,attributes:attrs,opposed:opposed.data??[],shapes,dispels:dispelRows};
  }catch(error){
    return {ok:false,message:error instanceof Error?error.message:"Unable to load NPC reactions.",attributes:null,opposed:[],shapes:[],dispels:[]};
  }
}


export async function loadNpcMechanicsData(input:{npcId:string;roomId:string}){
  try{
    const {a,character}=await requireStaffNpc(input.npcId,input.roomId);
    const activeSince=new Date(Date.now()-5*60_000).toISOString();

    const [giftsResult,shapesResult,standardResult,uniqueResult,equipmentResult,presenceResult]=await Promise.all([
      a.from("character_gifts").select(`
        id,
        gift:gifts(
          *,
          mechanics:shapes!shapes_feat_id_fkey(*)
        ),
        activations:gift_activations(
          activated_at,
          expires_at,
          ended_at,
          health_reverted_at
        )
      `).eq("character_id",character.id),
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

    const now=Date.now();
    const gifts=(giftsResult.data??[])
      .map((x:any)=>{
        const g=one(x.gift) as any;
        if(!g||g.is_active===false)return null;

        const activations=x.activations??[];

        const activeActivation=
          activations.find((entry:any)=>
            entry.ended_at===null &&
            Date.parse(entry.activated_at)<=now &&
            Date.parse(entry.expires_at)>now
          )??null;

        const latestActivation=
          [...activations].sort(
            (first:any,second:any)=>
              Date.parse(second.activated_at)-Date.parse(first.activated_at)
          )[0]??null;

        const cooldownUntil=
          g.effect_mode==="temporary"&&latestActivation
            ? new Date(
                Date.parse(latestActivation.activated_at)+
                Number(g.cooldown_minutes??0)*60_000
              ).toISOString()
            : null;

        return {
          characterGiftId:x.id,
          giftId:g.id,
          name:g.name,
          description:g.description??"",
          effectMode:g.effect_mode,
          targetMode:g.target_mode??"self",
          damageDice:g.damage_dice??null,
          damageType:g.damage_type??null,
          successDie:g.success_die??null,
          successThreshold:g.success_threshold??null,
          successAttribute:g.success_attribute??null,
          durationMinutes:g.duration_minutes??null,
          cooldownMinutes:g.cooldown_minutes??0,
          healthDelta:g.health_delta??0,
          healthDice:g.health_dice??null,
          mechanicsShape:Array.isArray(g.mechanics)?g.mechanics[0]??null:g.mechanics??null,
          maxHealthModifier:g.max_health_modifier??0,
          musclesModifier:g.muscles_modifier??0,
          reflexesModifier:g.reflexes_modifier??0,
          vigourModifier:g.vigour_modifier??0,
          shrewdModifier:g.shrewd_modifier??0,
          brainsModifier:g.brains_modifier??0,
          presenceModifier:g.presence_modifier??0,
          warpingAffinityModifier:g.warping_affinity_modifier??0,
          warpsPerDayModifier:g.warps_per_day_modifier??0,
          activeUntil:activeActivation?.expires_at??null,
          cooldownUntil:
            cooldownUntil&&Date.parse(cooldownUntil)>now
              ? cooldownUntil
              : null,
          effect_mode:g.effect_mode,
          target_mode:g.target_mode??"self",
        };
      })
      .filter(Boolean);

    const shapes=(shapesResult.data??[])
      .map((x:any)=>one(x.shape) as any)
      .filter((x:any)=>x&&x.is_active===true);

    const targets=(presenceResult.data??[])
      .filter((x:any)=>x.appear_offline!==true)
      .map((x:any)=>one(x.character) as any)
      .filter((x:any)=>x&&x.status==="approved"&&x.id!==character.id)
      .map((x:any)=>({id:x.id,display_name:x.display_name,life_state:x.life_state}));

    return {ok:true,characterId:character.id,gifts,items,shapes,targets};
  }catch(e){
    return {ok:false,message:e instanceof Error?e.message:"Unable to load NPC mechanics.",gifts:[],items:[],shapes:[],targets:[]};
  }
}

const NPC_ATTR_LABEL:Record<string,string>={
  muscles:"Muscles",
  reflexes:"Reflexes",
  vigor:"Vigour",
  vigour:"Vigour",
  brains:"Brains",
  shrewd:"Shrewd",
  presence:"Presence",
  presence_score:"Presence",
};

function capitaliseNpcWarp(value:unknown){
  const text=String(value??"").trim();
  return text?text.charAt(0).toUpperCase()+text.slice(1):"";
}

async function buildFullNpcWarpMessage({
  a,
  shape,
  character,
  targetIds,
  written,
  isWritten,
  isSelf,
  resolved,
}:{
  a:any;
  shape:any;
  character:any;
  targetIds:string[];
  written:string;
  isWritten:boolean;
  isSelf:boolean;
  resolved:string;
}){
  const targetRows=targetIds.length
    ? (await a.from("characters").select("id,display_name").in("id",targetIds)).data??[]
    : [];

  const targetNames=isWritten
    ? written
    : isSelf
      ? "Self"
      : targetIds
          .map(id=>targetRows.find((row:any)=>row.id===id)?.display_name??"Unknown")
          .join(" / ");

  const effective=await getEffectiveCharacterAttributes(character.id,{
    muscles:character.muscles,
    reflexes:character.reflexes,
    vigor:character.vigor,
    brains:character.brains,
    shrewd:character.shrewd,
    presence_score:character.presence_score,
  });

  const activeProfiles:Array<"self"|"other">=isWritten
    ? []
    : isSelf
      ? ["self"]
      : ["other"];

  const resolutionForProfile=(profile:"self"|"other")=>
    String(shape[`${profile}_resolution_mode`]??shape.resolution_mode??"save");

  const attributeLabel=(value:unknown)=>{
    const key=String(value??"").trim();
    return key?(NPC_ATTR_LABEL[key]??key):"";
  };

  const parts:string[]=[];
  parts.push(`◆ Warp [${shape.name}]`);

  const wordAndMovement=[
    shape.word_of_power
      ? `Word of Power: [${capitaliseNpcWarp(shape.word_of_power)}]`
      : "",
    shape.movement
      ? `Movement: [${capitaliseNpcWarp(shape.movement)}]`
      : "",
  ].filter(Boolean).join(" - ");

  if(wordAndMovement)parts.push(wordAndMovement);

  if(shape.level!==null&&shape.level!==undefined){
    parts.push(`Level: [${shape.level}]`);
  }

  if(shape.school){
    parts.push(`School [${capitaliseNpcWarp(shape.school)}]`);
  }

  parts.push(
    `${!isWritten&&!isSelf&&targetIds.length>1?"Targets":"Target"} [${targetNames}]`,
  );

  if(shape.effect_nature){
    const nature=capitaliseNpcWarp(shape.effect_nature);
    if(nature)parts.push(`Nature [${nature}]`);
  }

  if(isWritten){
    parts.push("Save Required [Fate]");
  }else{
    const saveProfiles=activeProfiles.filter(
      profile=>resolutionForProfile(profile)==="save",
    );

    if(saveProfiles.length){
      const dcAttributes=[
        ...new Set(
          saveProfiles
            .map(profile=>shape[`${profile}_dc_attribute`]??shape.dc_attribute)
            .filter(Boolean)
            .map(String),
        ),
      ];

      const dcParts=dcAttributes.map(attribute=>{
        const runtimeKey=
          attribute==="vigour"
            ? "vigor"
            : attribute==="presence"
              ? "presence_score"
              : attribute;

        const casterValue=Number((effective as any)[runtimeKey]);

        return Number.isFinite(casterValue)
          ? String(11+casterValue)
          : `11 + ${attributeLabel(attribute)}`;
      });

      const saveOptions=[
        ...new Set(
          saveProfiles.flatMap(profile=>{
            const profileOptions=shape[`${profile}_save_options`];
            return Array.isArray(profileOptions)
              ? profileOptions
              : Array.isArray(shape.save_options)
                ? shape.save_options
                : [];
          }),
        ),
      ];

      const saveAttributes=[
        ...new Set(
          saveOptions
            .map(option=>{
              switch(String(option)){
                case "dodge": return "Reflexes";
                case "defend": return "Vigour";
                case "resist_vigour":
                case "resist_vigor": return "Vigour";
                case "resist_shrewd": return "Shrewd";
                case "resist_brains": return "Brains";
                case "resist_presence": return "Presence";
                default: return "";
              }
            })
            .filter(Boolean),
        ),
      ];

      const dcText=dcParts.length?dcParts.join(" / "):"—";
      const saveAttributeText=saveAttributes.length
        ? saveAttributes.join(" / ")
        : "—";

      parts.push(`Save Required [DC ${dcText} - ${saveAttributeText}]`);
    }else{
      parts.push("Save Required [None]");
    }
  }

  const components=[
    shape.requires_verbal?"Verbal":"",
    shape.requires_movement?"Movement":"",
  ].filter(Boolean).join(" + ");

  parts.push(`Components [${components||"None"}]`);

  if(shape.description){
    const effect=String(shape.description).replace(/\s+/g," ").trim();
    if(effect)parts.push(`Effect: [${effect}]`);
  }

  const uniqueValues=(values:string[])=>[
    ...new Set(values.filter(Boolean)),
  ];

  const damageValues=uniqueValues(
    activeProfiles.map(profile=>{
      const dice=String(shape[`${profile}_damage_dice`]??"").trim();
      const attribute=String(shape[`${profile}_damage_attribute`]??"").trim();
      if(!dice&&!attribute)return "";
      const damageBase=[
        dice,
        attribute?`+ ${attributeLabel(attribute)}`:"",
      ].filter(Boolean).join(" ");
      return [
        damageBase,
        shape.damage_type?String(shape.damage_type):"",
      ].filter(Boolean).join(" - ");
    }),
  );

  if(damageValues.length){
    parts.push(`Damage [${damageValues.join(" / ")}]`);
  }

  const healingValues=uniqueValues(
    activeProfiles.map(profile=>{
      const dice=String(shape[`${profile}_heal_dice`]??"").trim();
      const attribute=String(shape[`${profile}_heal_attribute`]??"").trim();
      if(!dice&&!attribute)return "";
      return [
        dice,
        attribute?`+ ${attributeLabel(attribute)}`:"",
      ].filter(Boolean).join(" ");
    }),
  );

  if(healingValues.length){
    parts.push(`Healing [${healingValues.join(" / ")}]`);
  }

  const maxHealthValues=uniqueValues(
    activeProfiles.map(profile=>{
      const raw=String(shape[`${profile}_max_hp_change`]??"").trim();
      if(!raw||raw==="0")return "";
      const numeric=Number(raw);
      return Number.isFinite(numeric)&&numeric>0&&!raw.startsWith("+")
        ? `+${raw}`
        : raw;
    }),
  );

  if(maxHealthValues.length){
    parts.push(`Max Health [${maxHealthValues.join(" / ")}]`);
  }

  const conditions=uniqueValues(
    activeProfiles.flatMap(profile=>{
      const value=shape[`${profile}_conditions`];
      return Array.isArray(value)?value.map(String):[];
    }),
  );

  if(conditions.length){
    parts.push(`Applies [${conditions.join(" / ")}]`);
  }

  let duration="";
  if(shape.is_instantaneous){
    duration="Instantaneous";
  }else if(shape.duration_unit==="until_dispelled"){
    duration="Until Dispelled";
  }else if(shape.duration_amount&&shape.duration_unit){
    duration=`${shape.duration_amount} ${shape.duration_unit}`;
  }

  if(duration){
    parts.push(`Duration [${duration}]`);
  }

  const prerequisites=[
    ["muscles","Muscles"],
    ["reflexes","Reflexes"],
    ["vigour","Vigour"],
    ["brains","Brains"],
    ["shrewd","Shrewd"],
    ["presence","Presence"],
  ].map(([key,label])=>{
    const minimum=shape[`min_${key}`];
    if(
      minimum===null||
      minimum===undefined||
      minimum===""||
      Number(minimum)===0
    ){
      return "";
    }
    return `${label} ${minimum}+`;
  }).filter(Boolean);

  if(prerequisites.length){
    parts.push(`Prerequisites [${prerequisites.join(" / ")}]`);
  }

  if(shape.price_key){
    const priceResult=await a
      .from("warping_prices")
      .select("name")
      .eq("key",String(shape.price_key))
      .maybeSingle();

    parts.push(
      `Price [${priceResult.data?.name??String(shape.price_key)}]`,
    );
  }

  if(resolved){
    parts.push(resolved);
  }

  return parts.filter(Boolean).join(" · ");
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

    const castText=await buildFullNpcWarpMessage({
      a,
      shape:s,
      character,
      targetIds,
      written,
      isWritten,
      isSelf:self,
      resolved,
    });

    await npcMessage(
      a,
      npc,
      userId,
      speakerCharacterId,
      input.roomId,
      castText,
    );

    revalidatePath("/game");
    return {ok:true,message:`${s.name} warped.`};
  }catch(e){
    return {ok:false,message:e instanceof Error?e.message:"Unable to Warp Shape."};
  }
}
