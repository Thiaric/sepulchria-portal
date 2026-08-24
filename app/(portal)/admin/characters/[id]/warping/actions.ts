"use server";

import {
  revalidatePath,
} from "next/cache";

import {
  requireStaffCapability,
} from "@/lib/auth/require-staff";
import {createClient} from "@/lib/supabase/server";
const v=(f:FormData,n:string)=>String(f.get(n)??"").trim();
function refresh(id:string){revalidatePath(`/admin/characters/${id}`);revalidatePath(`/admin/characters/${id}/warping`);revalidatePath("/admin/shapes");revalidatePath("/game");}
export async function updateWarpingBase(f:FormData){await requireStaffCapability("character_warping");const db=await createClient(),id=v(f,"character_id");const affinity=Math.max(1,Math.min(9,Number(v(f,"warping_affinity"))||1)),warps=Math.max(0,Math.min(100,Number(v(f,"warps_per_day"))||0));const{error}=await db.from("characters").update({warping_affinity:affinity,warps_per_day:warps}).eq("id",id);if(error)throw Error(error.message);refresh(id);}
export async function assignManualShape(f:FormData){await requireStaffCapability("character_warping");const db=await createClient(),id=v(f,"character_id");const{error}=await db.rpc("staff_assign_shape_to_character",{p_character_id:id,p_shape_id:v(f,"shape_id"),p_override_level:f.get("override_level")==="on"});if(error)throw Error(error.message);refresh(id);}
export async function removeManualShape(f:FormData){await requireStaffCapability("character_warping");const db=await createClient(),id=v(f,"character_id");const{error}=await db.from("character_shapes").delete().eq("character_id",id).eq("shape_id",v(f,"shape_id")).eq("acquisition_source","staff");if(error)throw Error(error.message);refresh(id);}
