"use server";
import { createClient } from "@/lib/supabase/server";
import { getCharacterShapeAccess } from "@/lib/warping/shape-access";
export async function getShapeAccessForCurrentCharacter(shapeId:string){
 const db=await createClient();const au=await db.auth.getUser();
 if(!au.data.user)return{allowed:false,reasons:["Authentication required"],affinity:1,warpsPerDay:0,warpsUsed:0,warpsRemaining:0};
 const c=await db.from("characters").select("id").eq("user_id",au.data.user.id).single();
 if(c.error||!c.data)return{allowed:false,reasons:["Character not found"],affinity:1,warpsPerDay:0,warpsUsed:0,warpsRemaining:0};
 return getCharacterShapeAccess(c.data.id,shapeId);
}
