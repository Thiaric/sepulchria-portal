"use server";



import { redirect } from "next/navigation";
import {
  revalidatePath,
} from "next/cache";

import {
  requireAdminSection,
} from "@/lib/auth/require-staff";
import { createClient } from "@/lib/supabase/server";
import { wordOfPower } from "@/lib/warping/constants";

const txt=(f:FormData,n:string)=>String(f.get(n)??"").trim();
const nint=(f:FormData,n:string,d=0)=>{const v=Number.parseInt(txt(f,n),10);return Number.isFinite(v)?v:d;};
const optInt=(f:FormData,n:string)=>txt(f,n)?nint(f,n):null;
const check=(f:FormData,n:string)=>f.get(n)==="on";
const csv=(f:FormData,n:string)=>txt(f,n).split(",").map(v=>v.trim()).filter(Boolean);

function payload(f:FormData){
  const essence=txt(f,"essence_word"), action=txt(f,"action_word"), law=txt(f,"law_word");
  const targetMode=txt(f,"target_mode")||"other";
  const scope=txt(f,"target_scope")||"single";
  const resolution=txt(f,"resolution_mode")||"save";
  const instantaneous=txt(f,"is_instantaneous")==="true";
  const unit=txt(f,"duration_unit")||"minutes";
  const dispel=check(f,"is_dispel");
  const alt=check(f,"other_alternative_enabled");

  return {
    name:txt(f,"name"),description:txt(f,"description"),
    level:Math.max(1,Math.min(9,nint(f,"level",1))),
    school:txt(f,"school"),essence_word:essence,action_word:action,law_word:law,
    word_of_power:wordOfPower(essence,action,law),movement:txt(f,"movement"),
    requires_verbal:check(f,"requires_verbal"),requires_movement:check(f,"requires_movement"),

    resolution_mode:resolution,
    dc_attribute:resolution==="save"?(txt(f,"dc_attribute")||null):null,
    save_options:resolution==="save"?f.getAll("save_options").map(String):[],
    save_success_damage:resolution==="save"?(txt(f,"save_success_damage")||"none"):"none",

    target_mode:targetMode,
    target_scope:(targetMode==="self"||targetMode==="written")?"single":scope,
    max_targets:(targetMode==="self"||targetMode==="written"||scope!=="multiple")?1:Math.max(2,nint(f,"max_targets",2)),

    effect_nature:txt(f,"effect_nature")||"harmful",
    is_instantaneous:instantaneous,
    duration_unit:unit,
    duration_amount:(instantaneous||unit==="until_dispelled")?null:Math.max(1,nint(f,"duration_amount",1)),

    is_dispel:dispel,
    price_key:txt(f,"price_key")||null,
    damage_type:dispel?null:(txt(f,"damage_type")||null),

    self_damage_dice:dispel?null:(txt(f,"self_damage_dice")||null),
    self_damage_attribute:dispel?null:(txt(f,"self_damage_attribute")||null),
    self_heal_dice:dispel?null:(txt(f,"self_heal_dice")||null),
    self_heal_attribute:dispel?null:(txt(f,"self_heal_attribute")||null),
    self_max_hp_change:dispel?null:(txt(f,"self_max_hp_change")||null),
    self_conditions:dispel?[]:csv(f,"self_conditions"),

    other_damage_dice:dispel?null:(txt(f,"other_damage_dice")||null),
    other_damage_attribute:dispel?null:(txt(f,"other_damage_attribute")||null),
    other_heal_dice:dispel?null:(txt(f,"other_heal_dice")||null),
    other_heal_attribute:dispel?null:(txt(f,"other_heal_attribute")||null),
    other_max_hp_change:dispel?null:(txt(f,"other_max_hp_change")||null),
    other_conditions:dispel?[]:csv(f,"other_conditions"),

    other_alternative_enabled:!dispel&&targetMode!=="self"&&targetMode!=="written"&&alt,
    other_alt_damage_dice:(!dispel&&alt)?(txt(f,"other_alt_damage_dice")||null):null,
    other_alt_damage_attribute:(!dispel&&alt)?(txt(f,"other_alt_damage_attribute")||null):null,
    other_alt_heal_dice:(!dispel&&alt)?(txt(f,"other_alt_heal_dice")||null):null,
    other_alt_heal_attribute:(!dispel&&alt)?(txt(f,"other_alt_heal_attribute")||null):null,
    other_alt_max_hp_change:(!dispel&&alt)?(txt(f,"other_alt_max_hp_change")||null):null,
    other_alt_conditions:(!dispel&&alt)?csv(f,"other_alt_conditions"):[],

    self_muscles_modifier:dispel?0:nint(f,"self_muscles_modifier"),
    self_reflexes_modifier:dispel?0:nint(f,"self_reflexes_modifier"),
    self_vigour_modifier:dispel?0:nint(f,"self_vigour_modifier"),
    self_brains_modifier:dispel?0:nint(f,"self_brains_modifier"),
    self_shrewd_modifier:dispel?0:nint(f,"self_shrewd_modifier"),
    self_presence_modifier:dispel?0:nint(f,"self_presence_modifier"),

    other_muscles_modifier:dispel?0:nint(f,"other_muscles_modifier"),
    other_reflexes_modifier:dispel?0:nint(f,"other_reflexes_modifier"),
    other_vigour_modifier:dispel?0:nint(f,"other_vigour_modifier"),
    other_brains_modifier:dispel?0:nint(f,"other_brains_modifier"),
    other_shrewd_modifier:dispel?0:nint(f,"other_shrewd_modifier"),
    other_presence_modifier:dispel?0:nint(f,"other_presence_modifier"),

    other_alt_muscles_modifier:(!dispel&&alt)?nint(f,"other_alt_muscles_modifier"):0,
    other_alt_reflexes_modifier:(!dispel&&alt)?nint(f,"other_alt_reflexes_modifier"):0,
    other_alt_vigour_modifier:(!dispel&&alt)?nint(f,"other_alt_vigour_modifier"):0,
    other_alt_brains_modifier:(!dispel&&alt)?nint(f,"other_alt_brains_modifier"):0,
    other_alt_shrewd_modifier:(!dispel&&alt)?nint(f,"other_alt_shrewd_modifier"):0,
    other_alt_presence_modifier:(!dispel&&alt)?nint(f,"other_alt_presence_modifier"):0,

    min_muscles:optInt(f,"min_muscles"),min_reflexes:optInt(f,"min_reflexes"),
    min_vigour:optInt(f,"min_vigour"),min_brains:optInt(f,"min_brains"),
    min_shrewd:optInt(f,"min_shrewd"),min_presence:optInt(f,"min_presence"),
    is_active:check(f,"is_active"),updated_at:new Date().toISOString(),
  };
}

export async function createShape(f:FormData){
  await requireAdminSection("shapes"); const db=await createClient(); const p=payload(f);
  if(!p.name||!p.description) redirect("/admin/shapes?error=Name%20and%20description%20are%20required");
  if(p.resolution_mode==="save"&&p.target_mode!=="self"&&p.target_mode!=="written"&&p.save_options.length===0) redirect("/admin/shapes?error=Save-based%20Shapes%20that%20target%20another%20Character%20need%20a%20Save");
  const persistent=p.self_conditions.length||p.other_conditions.length||p.other_alt_conditions.length||
    [p.self_max_hp_change,p.other_max_hp_change,p.other_alt_max_hp_change,
     p.self_muscles_modifier,p.self_reflexes_modifier,p.self_vigour_modifier,p.self_brains_modifier,p.self_shrewd_modifier,p.self_presence_modifier,
     p.other_muscles_modifier,p.other_reflexes_modifier,p.other_vigour_modifier,p.other_brains_modifier,p.other_shrewd_modifier,p.other_presence_modifier,
     p.other_alt_muscles_modifier,p.other_alt_reflexes_modifier,p.other_alt_vigour_modifier,p.other_alt_brains_modifier,p.other_alt_shrewd_modifier,p.other_alt_presence_modifier]
      .some(v=>typeof v==="number"?v!==0:Boolean(v));
  if(p.is_instantaneous&&!p.is_dispel&&persistent) redirect("/admin/shapes?error=Instantaneous%20Shapes%20cannot%20apply%20Conditions%2C%20Attribute%20modifiers%20or%20Max%20Health%20changes");
  const {error}=await db.from("shapes").insert(p);
  if(error) redirect(`/admin/shapes?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/admin/shapes"); redirect("/admin/shapes?success=Shape%20created");
}
export async function updateShape(f:FormData){
  await requireAdminSection("shapes"); const db=await createClient(); const id=txt(f,"shape_id"); const p=payload(f);
  if(p.resolution_mode==="save"&&p.target_mode!=="self"&&p.target_mode!=="written"&&p.save_options.length===0) redirect(`/admin/shapes?error=${encodeURIComponent("Save-based Shapes that target another Character need a Save")}#shape-${id}`);
  const persistent=p.self_conditions.length||p.other_conditions.length||p.other_alt_conditions.length||
    [p.self_max_hp_change,p.other_max_hp_change,p.other_alt_max_hp_change,
     p.self_muscles_modifier,p.self_reflexes_modifier,p.self_vigour_modifier,p.self_brains_modifier,p.self_shrewd_modifier,p.self_presence_modifier,
     p.other_muscles_modifier,p.other_reflexes_modifier,p.other_vigour_modifier,p.other_brains_modifier,p.other_shrewd_modifier,p.other_presence_modifier,
     p.other_alt_muscles_modifier,p.other_alt_reflexes_modifier,p.other_alt_vigour_modifier,p.other_alt_brains_modifier,p.other_alt_shrewd_modifier,p.other_alt_presence_modifier]
      .some(v=>typeof v==="number"?v!==0:Boolean(v));
  if(p.is_instantaneous&&!p.is_dispel&&persistent) redirect(`/admin/shapes?error=${encodeURIComponent("Instantaneous Shapes cannot apply Conditions, Attribute modifiers or Max Health changes")}#shape-${id}`);
  const {error}=await db.from("shapes").update(p).eq("id",id);
  if(error) redirect(`/admin/shapes?error=${encodeURIComponent(error.message)}#shape-${id}`);
  revalidatePath("/admin/shapes"); redirect(`/admin/shapes?success=Shape%20updated#shape-${id}`);
}
export async function deleteShape(f:FormData){
  await requireAdminSection("shapes"); const db=await createClient(); const id=txt(f,"shape_id");

  const {count:effectCount,error:effectError}=await db
    .from("character_shape_effects")
    .select("id",{count:"exact",head:true})
    .eq("shape_id",id);

  if(effectError){
    redirect(`/admin/shapes?error=${encodeURIComponent(`Unable to inspect Shape effects: ${effectError.message}`)}`);
  }

  if((effectCount??0)>0){
    redirect(`/admin/shapes?error=${encodeURIComponent(`This Shape cannot be deleted because ${effectCount} active or preserved character effect${effectCount===1?"":"s"} still refer to it. Remove those effects first.`)}`);
  }

  const {error}=await db.from("shapes").delete().eq("id",id);
  if(error) redirect(`/admin/shapes?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/admin/shapes"); redirect("/admin/shapes?success=Shape%20deleted");
}
export async function assignShape(f:FormData){
  await requireAdminSection("shapes");
  const db=await createClient();
  const shapeId=txt(f,"shape_id");
  const {error}=await db.rpc("staff_assign_shape_to_character",{
    p_character_id:txt(f,"character_id"),
    p_shape_id:shapeId,
    p_override_level:check(f,"override_level"),
  });
  if(error){ throw new Error(error.message); }
  revalidatePath("/admin/shapes");
  revalidatePath("/game");
}

export async function removeAssignment(f:FormData){
  await requireAdminSection("shapes");
  const db=await createClient();
  const {error}=await db.from("character_shapes").delete().eq("id",txt(f,"assignment_id"));
  if(error){ throw new Error(error.message); }
  revalidatePath("/admin/shapes");
  revalidatePath("/game");
}

export async function linkOrderLevel(f:FormData){
  await requireAdminSection("shapes");
  const db=await createClient();
  const shapeId=txt(f,"shape_id");

  const {error}=await db.rpc("staff_link_shape_to_order_level",{
    p_shape_id:shapeId,
    p_order_level_id:txt(f,"order_level_id"),
  });

  if(error)throw new Error(error.message);

  const {data:members,error:membersError}=await db
    .from("order_memberships")
    .select("character_id");

  if(membersError)throw new Error(membersError.message);

  for(const member of members??[]){
    const sync=await db.rpc(
      "sync_character_order_shapes",
      {p_character_id:member.character_id},
    );
    if(sync.error){
      await db.rpc("staff_unlink_shape_from_order_level",{
        p_shape_id:shapeId,
        p_order_level_id:txt(f,"order_level_id"),
      });

      for(const rollbackMember of members??[]){
        await db.rpc(
          "sync_character_order_shapes",
          {p_character_id:rollbackMember.character_id},
        );
      }

      throw new Error(
        `Shape link was rolled back because character synchronisation failed: ${sync.error.message}`,
      );
    }
  }

  revalidatePath("/admin/shapes");
  revalidatePath("/game");
}

export async function unlinkOrderLevel(f:FormData){
  await requireAdminSection("shapes");
  const db=await createClient();
  const shapeId=txt(f,"shape_id");

  const {error}=await db.rpc("staff_unlink_shape_from_order_level",{
    p_shape_id:shapeId,
    p_order_level_id:txt(f,"order_level_id"),
  });

  if(error)throw new Error(error.message);

  const {data:members,error:membersError}=await db
    .from("order_memberships")
    .select("character_id");

  if(membersError)throw new Error(membersError.message);

  for(const member of members??[]){
    const sync=await db.rpc(
      "sync_character_order_shapes",
      {p_character_id:member.character_id},
    );
    if(sync.error){
      await db.rpc("staff_link_shape_to_order_level",{
        p_shape_id:shapeId,
        p_order_level_id:txt(f,"order_level_id"),
      });

      for(const rollbackMember of members??[]){
        await db.rpc(
          "sync_character_order_shapes",
          {p_character_id:rollbackMember.character_id},
        );
      }

      throw new Error(
        `Shape unlink was rolled back because character synchronisation failed: ${sync.error.message}`,
      );
    }
  }

  revalidatePath("/admin/shapes");
  revalidatePath("/game");
}
