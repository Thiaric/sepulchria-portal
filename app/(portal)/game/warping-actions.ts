"use server";

import { randomInt } from "node:crypto";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { getEffectiveCharacterAttributes } from "@/lib/characters/get-effective-character-attributes";
import { applyGiftCurrentHealthDelta } from "@/lib/gifts/gift-health-effects";
import { createClient } from "@/lib/supabase/server";

export type WarpingActionState={ok:boolean;message:string;submittedAt?:number};
const ATTR:Record<string,string>={muscles:"muscles",reflexes:"reflexes",vigor:"vigor",vigour:"vigor",brains:"brains",shrewd:"shrewd",presence:"presence_score",presence_score:"presence_score"};
const SAVE:Record<string,string>={dodge:"reflexes",defend:"vigor",resist_vigour:"vigor",resist_vigor:"vigor",resist_shrewd:"shrewd",resist_brains:"brains",resist_presence:"presence_score"};
const LABEL:Record<string,string>={reflexes:"Reflexes",vigor:"Vigour",muscles:"Muscles",brains:"Brains",shrewd:"Shrewd",presence_score:"Presence"};
function admin(){const u=process.env.NEXT_PUBLIC_SUPABASE_URL,k=process.env.SUPABASE_SECRET_KEY;if(!u||!k)throw Error("Missing Supabase server credentials.");return createAdminClient(u,k,{auth:{persistSession:false,autoRefreshToken:false}})}
function field(f:FormData,n:string){const v=f.get(n);return typeof v==="string"?v.trim():""}
function one<T>(v:T|T[]|null):T|null{return Array.isArray(v)?v[0]??null:v}
function dice(x:string|null){if(!x)return 0;const m=/^([1-9][0-9]*)d(4|6|8|10|12|20|100)$/.exec(x);if(!m)throw Error(`Invalid Shape dice: ${x}`);const n=Number(m[1]),d=Number(m[2]);if(n>20)throw Error("Too many Shape dice.");let t=0;for(let i=0;i<n;i++)t+=randomInt(1,d+1);return t}
function expiry(s:any){if(s.duration_unit==="until_dispelled")return null;const n=Math.max(1,Number(s.duration_amount??1));const m=s.duration_unit==="minutes"?60000:s.duration_unit==="hours"?3600000:86400000;return new Date(Date.now()+n*m).toISOString()}
async function mine(){const db=await createClient(),au=await db.auth.getUser();if(!au.data.user)throw Error("Authentication required.");const q=await db.from("characters").select("id,display_name,current_room_id,muscles,reflexes,vigor,brains,shrewd,presence_score").eq("user_id",au.data.user.id).maybeSingle();if(q.error||!q.data)throw Error("Character not found.");return q.data}
async function eff(c:any,k:string){const key=ATTR[k]??k;const e=await getEffectiveCharacterAttributes(c.id,{muscles:c.muscles,reflexes:c.reflexes,vigor:c.vigor,brains:c.brains,shrewd:c.shrewd,presence_score:c.presence_score});return Number((e as any)[key]??0)}
async function message(room:string,cid:string,text:string){const db=await createClient();const q=await db.from("room_messages").insert({room_id:room,character_id:cid,message:text,message_type:"action",client_nonce:crypto.randomUUID()});if(q.error)throw Error(q.error.message)}
async function target(id:string,cid:string){const q=await admin().from("shape_cast_targets").select(`id,cast_id,target_character_id,target_kind,outcome,cast:shape_casts!shape_cast_targets_cast_id_fkey(id,room_id,caster_character_id,caster:characters!shape_casts_caster_character_id_fkey(id,display_name,muscles,reflexes,vigor,brains,shrewd,presence_score),shape:shapes!shape_casts_shape_id_fkey(*))`).eq("id",id).eq("target_character_id",cid).maybeSingle();if(q.error||!q.data)throw Error(q.error?.message??"Incoming Shape not found.");if(q.data.outcome!=="pending")throw Error("This Shape is already resolved.");return q.data as any}
async function apply(t:any,half=false){const cast=one(t.cast),s=one(cast?.shape),caster=one(cast?.caster);if(!cast||!s||!caster)throw Error("Shape data unavailable.");const self=t.target_character_id===caster.id,p=self?"self":"other";
 let dmg=dice(s[`${p}_damage_dice`])+ (s[`${p}_damage_attribute`]?await eff(caster,s[`${p}_damage_attribute`]):0);if(half)dmg=Math.floor(dmg/2);
 const heal=dice(s[`${p}_heal_dice`])+(s[`${p}_heal_attribute`]?await eff(caster,s[`${p}_heal_attribute`]):0);if(heal-dmg)await applyGiftCurrentHealthDelta({characterId:t.target_character_id,healthDelta:heal-dmg});
 const conditions=Array.isArray(s[`${p}_conditions`])?s[`${p}_conditions`]:[];
 const mods={muscles:Number(s[`${p}_muscles_modifier`]??0),reflexes:Number(s[`${p}_reflexes_modifier`]??0),vigour:Number(s[`${p}_vigour_modifier`]??0),brains:Number(s[`${p}_brains_modifier`]??0),shrewd:Number(s[`${p}_shrewd_modifier`]??0),presence:Number(s[`${p}_presence_modifier`]??0)};
 const raw=String(s[`${p}_max_hp_change`]??"").trim(),maxhp=raw?dice(raw):0;
 if(conditions.length||Object.values(mods).some(Boolean)||maxhp){const q=await admin().from("character_shape_effects").insert({cast_id:cast.id,shape_id:s.id,source_character_id:caster.id,target_character_id:t.target_character_id,shape_level:s.level,effect_nature:s.effect_nature,self_profile:self,conditions,muscles_modifier:mods.muscles,reflexes_modifier:mods.reflexes,vigour_modifier:mods.vigour,brains_modifier:mods.brains,shrewd_modifier:mods.shrewd,presence_modifier:mods.presence,max_hp_modifier:maxhp,expires_at:expiry(s)});if(q.error)throw Error(q.error.message)}
 return {dmg,heal};
}
export async function resolveIncomingShape(_p:WarpingActionState,f:FormData):Promise<WarpingActionState>{try{
 const c=await mine(),id=field(f,"shape_cast_target_id"),choice=field(f,"save_choice"),t=await target(id,c.id),cast=one(t.cast),s=one(cast?.shape),caster=one(cast?.caster);if(!cast||!s||!caster)throw Error("Shape data unavailable.");
 if(choice==="__do_nothing__"){const r=await apply(t);await admin().from("shape_cast_targets").update({response:"do_nothing",outcome:"success",resolved_at:new Date().toISOString()}).eq("id",id);await message(cast.room_id,c.id,`◆ ${c.display_name} does nothing against ${s.name} · Shape succeeds${r.dmg?` · Damage ${r.dmg}`:""}${r.heal?` · Healing ${r.heal}`:""}`);revalidatePath("/game");return{ok:true,message:"Shape resolved.",submittedAt:Date.now()}}
 const allowed=Array.isArray(s.save_options)?s.save_options:[];if(!allowed.includes(choice))throw Error("That Save is unavailable.");const a=SAVE[choice];if(!a)throw Error("Invalid Save.");const mod=await eff(c,a),r=randomInt(1,21),total=r+mod,dc=11+(s.dc_attribute?await eff(caster,s.dc_attribute):0),saved=total>=dc;
 let result:any=null;if(!saved)result=await apply(t);else if(s.save_success_damage==="half")result=await apply(t,true);
 await admin().from("shape_cast_targets").update({response:choice,save_roll:r,save_attribute:a,save_attribute_value:mod,save_total:total,dc,outcome:saved?"saved":"success",resolved_at:new Date().toISOString()}).eq("id",id);
 let end=saved?"SUCCESS — no effect":"FAILED — Shape succeeds";if(saved&&s.save_success_damage==="half"&&result?.dmg)end=`SUCCESS — half damage ${result.dmg}`;if(!saved&&result?.dmg)end+=` · Damage ${result.dmg}`;if(!saved&&result?.heal)end+=` · Healing ${result.heal}`;
 await message(cast.room_id,c.id,`◆ ${c.display_name} uses ${choice.replaceAll("_"," ")} against ${s.name} · d20 -> ${r} + ${LABEL[a]??a} (${mod>=0?"+":""}${mod}) = ${total} vs DC ${dc} · ${end}`);revalidatePath("/game");return{ok:true,message:"Shape resolved.",submittedAt:Date.now()}
 }catch(e){return{ok:false,message:e instanceof Error?e.message:"Unable to resolve Shape."}}}
