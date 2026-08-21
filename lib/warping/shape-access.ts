import "server-only";
import { getEffectiveCharacterAttributes } from "@/lib/characters/get-effective-character-attributes";
import { createClient } from "@/lib/supabase/server";
export async function getCharacterShapeAccess(characterId:string,shapeId:string){
 const db=await createClient();const[cr,sr,ar]=await Promise.all([
 db.from("characters").select("id,muscles,reflexes,vigor,brains,shrewd,presence_score,warping_affinity,warps_per_day").eq("id",characterId).single(),
 db.from("shapes").select("id,level,min_muscles,min_reflexes,min_vigour,min_brains,min_shrewd,min_presence,is_active").eq("id",shapeId).single(),
 db.from("character_shapes").select("level_override,acquisition_source").eq("character_id",characterId).eq("shape_id",shapeId)]);
 if(cr.error||!cr.data)throw Error(cr.error?.message??"Character not found.");if(sr.error||!sr.data)throw Error(sr.error?.message??"Shape not found.");
 const c=cr.data,s=sr.data,a=ar.data??[],order=a.some(x=>x.acquisition_source==="order"),override=a.some(x=>x.level_override===true),reasons:string[]=[];
 if(!s.is_active)reasons.push("Shape is inactive");if(!a.length)reasons.push("Shape is not assigned");
 if(!order&&!override&&Number(s.level)>Number(c.warping_affinity))reasons.push(`Requires Affinity ${s.level}`);
 if(!order){const e=await getEffectiveCharacterAttributes(characterId,{muscles:c.muscles,reflexes:c.reflexes,vigor:c.vigor,brains:c.brains,shrewd:c.shrewd,presence_score:c.presence_score});
 const req=[["min_muscles","Muscles","muscles"],["min_reflexes","Reflexes","reflexes"],["min_vigour","Vigour","vigor"],["min_brains","Brains","brains"],["min_shrewd","Shrewd","shrewd"],["min_presence","Presence","presence_score"]];
 for(const[field,label,key]of req){const m=Number((s as any)[field]??0);if(m&&Number((e as any)[key]??0)<m)reasons.push(`Requires ${label} ${m}`)}}
 const br=await db.rpc("warping_reset_boundary");if(br.error)throw Error(br.error.message);
 const co=await db.from("shape_casts").select("id",{count:"exact",head:true}).eq("caster_character_id",characterId).gte("created_at",br.data);if(co.error)throw Error(co.error.message);
 const used=co.count??0,per=Number(c.warps_per_day??3),remaining=Math.max(0,per-used);if(remaining<=0)reasons.push("No Warps remaining");
 return{allowed:!reasons.length,reasons,affinity:Number(c.warping_affinity??1),warpsPerDay:per,warpsUsed:used,warpsRemaining:remaining,orderGranted:order,override};
}