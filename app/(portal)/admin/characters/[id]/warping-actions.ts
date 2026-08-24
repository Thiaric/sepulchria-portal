"use server";

import {
  revalidatePath,
} from "next/cache";

import {
  requireStaffCapability,
} from "@/lib/auth/require-staff";
import { createClient } from "@/lib/supabase/server";
export async function updateCharacterWarping(formData:FormData){
 await requireStaffCapability("character_warping");const id=String(formData.get("character_id")??"");
 const affinity=Math.max(1,Math.min(9,Number.parseInt(String(formData.get("warping_affinity")??"1"),10)||1));
 const warps=Math.max(0,Math.min(100,Number.parseInt(String(formData.get("warps_per_day")??"3"),10)||0));
 const db=await createClient();const q=await db.from("characters").update({warping_affinity:affinity,warps_per_day:warps}).eq("id",id);
 if(q.error)throw Error(q.error.message);
 revalidatePath(`/admin/characters/${id}`);revalidatePath("/game");revalidatePath("/character");
}
