import "server-only";
import { createClient } from "@/lib/supabase/server";
export type ShapeModifiers={muscles:number;reflexes:number;vigor:number;brains:number;shrewd:number;presence_score:number;maxHealth:number};
export async function getCharacterShapeModifiers(characterId:string):Promise<ShapeModifiers>{
 const db=await createClient();const q=await db.from("character_shape_effects")
 .select("muscles_modifier,reflexes_modifier,vigour_modifier,brains_modifier,shrewd_modifier,presence_modifier,max_hp_modifier")
 .eq("target_character_id",characterId).is("dispelled_at",null)
 .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`);
 if(q.error)throw Error(`Unable to load active Shape modifiers: ${q.error.message}`);
 return(q.data??[]).reduce((a,r)=>({muscles:a.muscles+Number(r.muscles_modifier??0),reflexes:a.reflexes+Number(r.reflexes_modifier??0),vigor:a.vigor+Number(r.vigour_modifier??0),brains:a.brains+Number(r.brains_modifier??0),shrewd:a.shrewd+Number(r.shrewd_modifier??0),presence_score:a.presence_score+Number(r.presence_modifier??0),maxHealth:a.maxHealth+Number(r.max_hp_modifier??0)}),{muscles:0,reflexes:0,vigor:0,brains:0,shrewd:0,presence_score:0,maxHealth:0});
}