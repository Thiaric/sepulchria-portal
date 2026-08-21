"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireStaff } from "@/lib/auth/require-staff";
import { createClient } from "@/lib/supabase/server";
import { wordOfPower } from "@/lib/warping/constants";

const txt=(f:FormData,n:string)=>String(f.get(n)??"").trim();
const nint=(f:FormData,n:string,d=0)=>{const v=Number.parseInt(txt(f,n),10);return Number.isFinite(v)?v:d;};
const optInt=(f:FormData,n:string)=>txt(f,n)?nint(f,n):null;
const check=(f:FormData,n:string)=>f.get(n)==="on";
const csv=(f:FormData,n:string)=>txt(f,n).split(",").map(v=>v.trim()).filter(Boolean);

function payload(f:FormData){
  const essence=txt(f,"essence_word"), action=txt(f,"action_word"), law=txt(f,"law_word");
  const scope=txt(f,"target_scope")||"single", unit=txt(f,"duration_unit")||"minutes";
  return {
    name:txt(f,"name"),description:txt(f,"description"),level:Math.max(1,Math.min(9,nint(f,"level",1))),
    school:txt(f,"school"),essence_word:essence,action_word:action,law_word:law,
    word_of_power:wordOfPower(essence,action,law),movement:txt(f,"movement"),
    requires_verbal:check(f,"requires_verbal"),requires_movement:check(f,"requires_movement"),
    resolution_mode:txt(f,"resolution_mode")||"save",dc_attribute:txt(f,"dc_attribute")||null,
    save_options:f.getAll("save_options").map(String),save_success_damage:txt(f,"save_success_damage")||"none",
    target_mode:txt(f,"target_mode")||"other",target_scope:scope,max_targets:scope==="multiple"?Math.max(2,nint(f,"max_targets",2)):1,
    effect_nature:txt(f,"effect_nature")||"harmful",duration_unit:unit,
    duration_amount:unit==="until_dispelled"?null:Math.max(1,nint(f,"duration_amount",1)),
    is_dispel:check(f,"is_dispel"),price_key:txt(f,"price_key")||null,damage_type:txt(f,"damage_type")||null,
    self_damage_dice:txt(f,"self_damage_dice")||null,self_damage_attribute:txt(f,"self_damage_attribute")||null,
    self_heal_dice:txt(f,"self_heal_dice")||null,self_heal_attribute:txt(f,"self_heal_attribute")||null,
    self_max_hp_change:txt(f,"self_max_hp_change")||null,self_conditions:csv(f,"self_conditions"),
    other_damage_dice:txt(f,"other_damage_dice")||null,other_damage_attribute:txt(f,"other_damage_attribute")||null,
    other_heal_dice:txt(f,"other_heal_dice")||null,other_heal_attribute:txt(f,"other_heal_attribute")||null,
    other_max_hp_change:txt(f,"other_max_hp_change")||null,other_conditions:csv(f,"other_conditions"),
    self_muscles_modifier:nint(f,"self_muscles_modifier"),self_reflexes_modifier:nint(f,"self_reflexes_modifier"),
    self_vigour_modifier:nint(f,"self_vigour_modifier"),self_brains_modifier:nint(f,"self_brains_modifier"),
    self_shrewd_modifier:nint(f,"self_shrewd_modifier"),self_presence_modifier:nint(f,"self_presence_modifier"),
    other_muscles_modifier:nint(f,"other_muscles_modifier"),other_reflexes_modifier:nint(f,"other_reflexes_modifier"),
    other_vigour_modifier:nint(f,"other_vigour_modifier"),other_brains_modifier:nint(f,"other_brains_modifier"),
    other_shrewd_modifier:nint(f,"other_shrewd_modifier"),other_presence_modifier:nint(f,"other_presence_modifier"),
    min_muscles:optInt(f,"min_muscles"),min_reflexes:optInt(f,"min_reflexes"),min_vigour:optInt(f,"min_vigour"),
    min_brains:optInt(f,"min_brains"),min_shrewd:optInt(f,"min_shrewd"),min_presence:optInt(f,"min_presence"),
    is_active:check(f,"is_active"),updated_at:new Date().toISOString(),
  };
}

export async function createShape(f:FormData){
  await requireStaff(); const db=await createClient(); const p=payload(f);
  if(!p.name||!p.description) redirect("/admin/shapes?error=Name%20and%20description%20are%20required");
  if(p.resolution_mode==="save"&&p.save_options.length===0) redirect("/admin/shapes?error=Save-based%20Shapes%20need%20a%20Save");
  const {error}=await db.from("shapes").insert(p);
  if(error) redirect(`/admin/shapes?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/admin/shapes"); redirect("/admin/shapes?success=Shape%20created");
}
export async function updateShape(f:FormData){
  await requireStaff(); const db=await createClient(); const id=txt(f,"shape_id");
  const {error}=await db.from("shapes").update(payload(f)).eq("id",id);
  if(error) redirect(`/admin/shapes?error=${encodeURIComponent(error.message)}#shape-${id}`);
  revalidatePath("/admin/shapes"); redirect(`/admin/shapes?success=Shape%20updated#shape-${id}`);
}
export async function deleteShape(f:FormData){
  await requireStaff(); const db=await createClient(); const id=txt(f,"shape_id");
  const {error}=await db.from("shapes").delete().eq("id",id);
  if(error) redirect(`/admin/shapes?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/admin/shapes"); redirect("/admin/shapes?success=Shape%20deleted");
}
export async function assignShape(f:FormData){
  await requireStaff(); const db=await createClient(); const shapeId=txt(f,"shape_id");
  const {error}=await db.rpc("staff_assign_shape_to_character",{p_character_id:txt(f,"character_id"),p_shape_id:shapeId,p_override_level:check(f,"override_level")});
  if(error) redirect(`/admin/shapes?error=${encodeURIComponent(error.message)}#shape-${shapeId}`);
  revalidatePath("/admin/shapes"); redirect(`/admin/shapes?success=Shape%20assigned#shape-${shapeId}`);
}
export async function removeAssignment(f:FormData){
  await requireStaff(); const db=await createClient();
  const {error}=await db.from("character_shapes").delete().eq("id",txt(f,"assignment_id"));
  if(error) redirect(`/admin/shapes?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/admin/shapes"); redirect("/admin/shapes?success=Assignment%20removed");
}
export async function linkOrderRole(f:FormData){
  await requireStaff(); const db=await createClient(); const shapeId=txt(f,"shape_id");
  const {error}=await db.from("order_job_shapes").upsert({shape_id:shapeId,order_job_id:txt(f,"order_job_id")},{onConflict:"order_job_id,shape_id"});
  if(error) redirect(`/admin/shapes?error=${encodeURIComponent(error.message)}#shape-${shapeId}`);
  revalidatePath("/admin/shapes"); redirect(`/admin/shapes?success=Order%20Shape%20linked#shape-${shapeId}`);
}
