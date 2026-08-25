"use server";

import { randomInt } from "node:crypto";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { getCharacterAttributeBreakdown, getEffectiveCharacterAttributes } from "@/lib/characters/get-effective-character-attributes";
import { applyGiftCurrentHealthDelta } from "@/lib/gifts/gift-health-effects";
import { createClient } from "@/lib/supabase/server";

export type WarpingActionState={ok:boolean;message:string;submittedAt?:number};
const ATTR:Record<string,string>={muscles:"muscles",reflexes:"reflexes",vigor:"vigor",vigour:"vigor",brains:"brains",shrewd:"shrewd",presence:"presence_score",presence_score:"presence_score"};
const SAVE:Record<string,string>={dodge:"reflexes",defend:"vigor",resist_vigour:"vigor",resist_vigor:"vigor",resist_shrewd:"shrewd",resist_brains:"brains",resist_presence:"presence_score"};
const LABEL:Record<string,string>={reflexes:"Reflexes",vigor:"Vigour",muscles:"Muscles",brains:"Brains",shrewd:"Shrewd",presence_score:"Presence"};
function admin(){const u=process.env.NEXT_PUBLIC_SUPABASE_URL,k=process.env.SUPABASE_SECRET_KEY;if(!u||!k)throw Error("Missing Supabase server credentials.");return createAdminClient(u,k,{auth:{persistSession:false,autoRefreshToken:false}})}
function field(f:FormData,n:string){const v=f.get(n);return typeof v==="string"?v.trim():""}
function one<T>(v:T|T[]|null):T|null{return Array.isArray(v)?v[0]??null:v}
function dice(x:string|null){
 if(!x)return 0;const value=String(x).trim();
 if(/^[+-]?[0-9]+$/.test(value))return Number(value);
 const m=/^([+-]?)([1-9][0-9]*)d(4|6|8|10|12|20|100)$/.exec(value);
 if(!m)throw Error(`Invalid Shape dice/value: ${x}`);
 const sign=m[1]==="-"?-1:1,n=Number(m[2]),d=Number(m[3]);
 if(n>20)throw Error("Too many Shape dice.");
 let t=0;for(let i=0;i<n;i++)t+=randomInt(1,d+1);return t*sign
}
function expiry(s:any){if(s.is_instantaneous)return new Date().toISOString();if(s.duration_unit==="until_dispelled")return null;const n=Math.max(1,Number(s.duration_amount??1));const m=s.duration_unit==="minutes"?60000:s.duration_unit==="hours"?3600000:86400000;return new Date(Date.now()+n*m).toISOString()}
async function mine(){const db=await createClient(),au=await db.auth.getUser();if(!au.data.user)throw Error("Authentication required.");const q=await db.from("characters").select("id,display_name,current_room_id,muscles,reflexes,vigor,brains,shrewd,presence_score").eq("user_id",au.data.user.id).maybeSingle();if(q.error||!q.data)throw Error("Character not found.");return q.data}
async function eff(c:any,k:string){const key=ATTR[k]??k;const e=await getEffectiveCharacterAttributes(c.id,{muscles:c.muscles,reflexes:c.reflexes,vigor:c.vigor,brains:c.brains,shrewd:c.shrewd,presence_score:c.presence_score});return Number((e as any)[key]??0)}
async function message(room:string,cid:string,text:string){const db=await createClient();const q=await db.from("room_messages").insert({room_id:room,character_id:cid,message:text,message_type:"action",client_nonce:crypto.randomUUID()});if(q.error)throw Error(q.error.message)}
async function healthSnapshot(characterId:string){
 const a=admin();const q=await a.from("characters").select("muscles,reflexes,vigor,brains,shrewd,presence_score,current_health").eq("id",characterId).single();
 if(q.error||!q.data)throw Error(q.error?.message??"Unable to load Health.");
 const b=await getCharacterAttributeBreakdown(characterId,{muscles:q.data.muscles,reflexes:q.data.reflexes,vigor:q.data.vigor,brains:q.data.brains,shrewd:q.data.shrewd,presence_score:q.data.presence_score});
 const max=b.vigor.effective===null?0:Math.max(0,b.vigor.effective*10+b.giftMaxHealth+b.itemMaxHealth+b.activeItemMaxHealth+b.shapeMaxHealth);
 return {current:Number(q.data.current_health??max),max};
}
function durationLabel(s:any){if(s.is_instantaneous)return"Instantaneous";if(s.duration_unit==="until_dispelled")return"Until Dispelled";return `${Number(s.duration_amount??1)} ${String(s.duration_unit??"minutes")}`}
async function target(id:string,cid:string){const q=await admin().from("shape_cast_targets").select(`id,cast_id,target_character_id,target_kind,outcome,dispel_effect_id,other_effect_choice,cast:shape_casts!shape_cast_targets_cast_id_fkey(id,room_id,caster_character_id,caster:characters!shape_casts_caster_character_id_fkey(id,display_name,muscles,reflexes,vigor,brains,shrewd,presence_score),shape:shapes!shape_casts_shape_id_fkey(*))`).eq("id",id).eq("target_character_id",cid).maybeSingle();if(q.error||!q.data)throw Error(q.error?.message??"Incoming Shape not found.");if(q.data.outcome!=="pending")throw Error("This Shape is already resolved.");return q.data as any}
async function apply(t:any,half=false){
 const cast=one(t.cast),s=one(cast?.shape),caster=one(cast?.caster);if(!cast||!s||!caster)throw Error("Shape data unavailable.");
 const self=t.target_character_id===caster.id,p=self?"self":(s.other_alternative_enabled&&t.other_effect_choice==="harmful"?"other_alt":"other"),before=await healthSnapshot(t.target_character_id);
 let dmg=dice(s[`${p}_damage_dice`])+(s[`${p}_damage_attribute`]?await eff(caster,s[`${p}_damage_attribute`]):0);if(half)dmg=Math.floor(dmg/2);
 const heal=half?0:(dice(s[`${p}_heal_dice`])+(s[`${p}_heal_attribute`]?await eff(caster,s[`${p}_heal_attribute`]):0));if(heal-dmg)await applyGiftCurrentHealthDelta({characterId:t.target_character_id,healthDelta:heal-dmg});
 const conditions=half?[]:(Array.isArray(s[`${p}_conditions`])?s[`${p}_conditions`]:[]);
 const mods=half?{muscles:0,reflexes:0,vigour:0,brains:0,shrewd:0,presence:0}:{muscles:Number(s[`${p}_muscles_modifier`]??0),reflexes:Number(s[`${p}_reflexes_modifier`]??0),vigour:Number(s[`${p}_vigour_modifier`]??0),brains:Number(s[`${p}_brains_modifier`]??0),shrewd:Number(s[`${p}_shrewd_modifier`]??0),presence:Number(s[`${p}_presence_modifier`]??0)};
 const raw=half?"":String(s[`${p}_max_hp_change`]??"").trim(),maxhp=raw?dice(raw):0,hasPersistent=!s.is_instantaneous&&(conditions.length||Object.values(mods).some(Boolean)||maxhp!==0);
 let duplicateEffect=false;
 if(hasPersistent){
  const existing=await admin().from("character_shape_effects").select("id").eq("target_character_id",t.target_character_id).eq("shape_id",s.id).is("dispelled_at",null).or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`).limit(1);
  if(existing.error)throw Error(existing.error.message);
  duplicateEffect=Boolean(existing.data?.length);
  if(!duplicateEffect){const q=await admin().from("character_shape_effects").insert({cast_id:cast.id,shape_id:s.id,source_character_id:caster.id,target_character_id:t.target_character_id,shape_level:s.level,effect_nature:s.effect_nature,self_profile:self,conditions,muscles_modifier:mods.muscles,reflexes_modifier:mods.reflexes,vigour_modifier:mods.vigour,brains_modifier:mods.brains,shrewd_modifier:mods.shrewd,presence_modifier:mods.presence,max_hp_modifier:maxhp,expires_at:expiry(s)});if(q.error)throw Error(q.error.message)}
 }
 const after=await healthSnapshot(t.target_character_id);
 return {dmg,heal,conditions:duplicateEffect?[]:conditions,mods:duplicateEffect?{}:mods,maxhp:duplicateEffect?0:maxhp,duration:hasPersistent&&!duplicateEffect?durationLabel(s):"",duplicateEffect,hpBefore:before.current,hpAfter:after.current,maxBefore:before.max,maxAfter:after.max};
}
function effectSummary(r:any){if(!r)return "";const x:string[]=[];
 if(r.hpBefore!==r.hpAfter)x.push(`Current HP ${r.hpBefore} -> ${r.hpAfter}`);
 if(r.dmg)x.push(`Damage ${r.dmg}`);if(r.heal)x.push(`Healing ${r.heal}`);
 if(r.maxBefore!==r.maxAfter)x.push(`Max HP ${r.maxBefore} -> ${r.maxAfter}`);
 if(r.conditions?.length)x.push(`Condition: ${r.conditions.join(", ")}`);
 const m=r.mods??{};for(const [k,v] of Object.entries(m)){const n=Number(v);if(n)x.push(`${k==="vigour"?"Vigour":k[0].toUpperCase()+k.slice(1)} ${n>0?"+":""}${n}`)}
 if(r.maxhp)x.push(`Max HP effect ${r.maxhp>0?"+":""}${r.maxhp}`);
 if(r.duration)x.push(`Duration: ${r.duration}`);
 if(r.duplicateEffect)x.push("Existing effect from this Shape already active — not stacked");
 return x.length?` · ${x.join(" · ")}`:""
}
const SAVE_NAME:Record<string,string>={dodge:"Dodge",defend:"Defend",resist_vigour:"Resist Vigour",resist_vigor:"Resist Vigour",resist_shrewd:"Resist Shrewd",resist_brains:"Resist Brains",resist_presence:"Resist Presence"};

export async function resolveImmediateShapeCast(
  castId: string,
): Promise<WarpingActionState> {
  try {
    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        castId,
      )
    ) {
      throw Error("Invalid Shape cast.");
    }

    const caster =
      await mine();

    const a =
      admin();

    const {
      data: castRow,
      error: castError,
    } = await a
      .from("shape_casts")
      .select(`
        id,
        room_id,
        caster_character_id,
        caster:characters!shape_casts_caster_character_id_fkey(
          id,
          display_name,
          muscles,
          reflexes,
          vigor,
          brains,
          shrewd,
          presence_score
        ),
        shape:shapes!shape_casts_shape_id_fkey(*)
      `)
      .eq("id", castId)
      .eq(
        "caster_character_id",
        caster.id,
      )
      .maybeSingle();

    if (
      castError ||
      !castRow
    ) {
      throw Error(
        castError?.message ??
          "Shape cast not found.",
      );
    }

    const cast =
      castRow as any;

    const shape =
      one(cast.shape);

    if (!shape) {
      throw Error(
        "Shape data unavailable.",
      );
    }

    /*
     * Dispel has its own preparation / response resolver and must not
     * use the ordinary Shape payload path here.
     */
    if (shape.is_dispel) {
      return {
        ok: true,
        message: "",
        submittedAt:
          Date.now(),
      };
    }

    const {
      data: targetRows,
      error: targetError,
    } = await a
      .from("shape_cast_targets")
      .select(`
        id,
        cast_id,
        target_character_id,
        target_kind,
        outcome,
        resolved_at,
        other_effect_choice
      `)
      .eq(
        "cast_id",
        castId,
      )
      .eq(
        "outcome",
        "pending",
      );

    if (targetError) {
      throw Error(
        targetError.message,
      );
    }

    const immediateRows =
      (targetRows ?? []).filter(
        (row) =>
          Boolean(
            row.target_character_id,
          ) &&
          (
            row.target_character_id ===
              caster.id ||
            shape.resolution_mode ===
              "automatic"
          ),
      );

    if (!immediateRows.length) {
      return {
        ok: true,
        message: "",
        submittedAt:
          Date.now(),
      };
    }

    const targetIds = [
      ...new Set(
        immediateRows
          .map(
            (row) =>
              row.target_character_id,
          )
          .filter(Boolean),
      ),
    ] as string[];

    const targetNames =
      new Map<string, string>();

    if (targetIds.length) {
      const {
        data: characters,
        error: characterError,
      } = await a
        .from("characters")
        .select(
          "id, display_name",
        )
        .in(
          "id",
          targetIds,
        );

      if (characterError) {
        throw Error(
          characterError.message,
        );
      }

      for (
        const character
        of characters ?? []
      ) {
        targetNames.set(
          character.id,
          character.display_name,
        );
      }
    }

    const summaries:
      string[] = [];

    for (
      const row
      of immediateRows
    ) {
      const claimedAt =
        new Date().toISOString();

      /*
       * Claim the still-pending target before applying mechanics.
       * This makes repeated clicks/retries unable to apply damage twice.
       */
      const {
        data: claimed,
        error: claimError,
      } = await a
        .from(
          "shape_cast_targets",
        )
        .update({
          resolved_at:
            claimedAt,
        })
        .eq(
          "id",
          row.id,
        )
        .eq(
          "outcome",
          "pending",
        )
        .is(
          "resolved_at",
          null,
        )
        .select("id")
        .maybeSingle();

      if (claimError) {
        throw Error(
          claimError.message,
        );
      }

      if (!claimed) {
        continue;
      }

      try {
        const result =
          await apply({
            ...row,
            cast,
          });

        const {
          error: finishError,
        } = await a
          .from(
            "shape_cast_targets",
          )
          .update({
            response:
              "automatic",
            outcome:
              "success",
            resolved_at:
              new Date()
                .toISOString(),
          })
          .eq(
            "id",
            row.id,
          );

        if (finishError) {
          throw Error(
            finishError.message,
          );
        }

        const label =
          row.target_character_id ===
            caster.id
            ? "Self"
            : targetNames.get(
                String(
                  row.target_character_id,
                ),
              ) ??
              "Target";

        summaries.push(
          `${label}${effectSummary(
            result,
          )}`,
        );
      } catch (error) {
        /*
         * Release the claim if mechanics failed so the cast is not left
         * permanently resolved without its effects.
         */
        await a
          .from(
            "shape_cast_targets",
          )
          .update({
            resolved_at:
              null,
          })
          .eq(
            "id",
            row.id,
          )
          .eq(
            "outcome",
            "pending",
          );

        throw error;
      }
    }

    revalidatePath(
      "/game",
    );

    revalidatePath(
      "/character",
    );

    revalidatePath(
      "/characters",
    );

    return {
      ok: true,
      message:
        summaries.length
          ? `Resolved: ${summaries.join(
              " · ",
            )}`
          : "",
      submittedAt:
        Date.now(),
    };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "Unable to resolve automatic Shape.",
    };
  }
}

export async function resolveIncomingShape(_p:WarpingActionState,f:FormData):Promise<WarpingActionState>{try{
 const c=await mine(),id=field(f,"shape_cast_target_id"),choice=field(f,"save_choice"),t=await target(id,c.id),cast=one(t.cast),s=one(cast?.shape),caster=one(cast?.caster);if(!cast||!s||!caster)throw Error("Shape data unavailable.");
 if(s.is_dispel){
  const effectId=String(t.dispel_effect_id??"");if(!effectId)throw Error("The caster has not chosen an effect to dispel yet.");
  const a=admin();const eq=await a.from("character_shape_effects").select("id,shape_level,effect_nature,shape:shapes!character_shape_effects_shape_id_fkey(name)").eq("id",effectId).eq("target_character_id",c.id).is("dispelled_at",null).maybeSingle();
  if(eq.error||!eq.data)throw Error("That effect is no longer active.");
  if(Number(s.level)<Number(eq.data.shape_level))throw Error(`Level ${s.level} cannot dispel Level ${eq.data.shape_level}.`);
  const effectShape:any=one(eq.data.shape as any);
  if(choice==="__do_nothing__"){const u=await a.from("character_shape_effects").update({dispelled_at:new Date().toISOString(),dispelled_by_cast_id:cast.id}).eq("id",effectId);if(u.error)throw Error(u.error.message);await a.from("shape_cast_targets").update({response:"do_nothing",outcome:"success",resolved_at:new Date().toISOString()}).eq("id",id);await message(cast.room_id,c.id,`◆ ${c.display_name} does nothing against ${s.name} · ${effectShape?.name??"Shape effect"} dispelled · Level ${s.level} vs Level ${eq.data.shape_level}`);revalidatePath("/game");revalidatePath("/character");return{ok:true,message:"Effect dispelled.",submittedAt:Date.now()}}
  const allowed=Array.isArray(s.save_options)?s.save_options:[];if(!allowed.includes(choice))throw Error("That Save is unavailable.");const sa=SAVE[choice];if(!sa)throw Error("Invalid Save.");const mod=await eff(c,sa),roll=randomInt(1,21),total=roll+mod,dc=11+(s.dc_attribute?await eff(caster,s.dc_attribute):0),saved=total>=dc;
  if(!saved){const u=await a.from("character_shape_effects").update({dispelled_at:new Date().toISOString(),dispelled_by_cast_id:cast.id}).eq("id",effectId);if(u.error)throw Error(u.error.message)}
  await a.from("shape_cast_targets").update({response:choice,save_roll:roll,save_attribute:sa,save_attribute_value:mod,save_total:total,dc,outcome:saved?"saved":"success",resolved_at:new Date().toISOString()}).eq("id",id);
  await message(cast.room_id,c.id,`◆ ${c.display_name} uses ${SAVE_NAME[choice]??choice} against ${s.name} · d20 -> ${roll} + ${LABEL[sa]??sa} (${mod>=0?"+":""}${mod}) = ${total} vs DC ${dc} · ${saved?`SUCCESS — ${effectShape?.name??"effect"} remains active`:`FAILED — ${effectShape?.name??"effect"} dispelled`}`);
  revalidatePath("/game");revalidatePath("/character");return{ok:true,message:saved?"Save successful. Effect remains active.":"Save failed. Effect dispelled.",submittedAt:Date.now()}
 }

 if(choice==="__do_nothing__"){const r=await apply(t);await admin().from("shape_cast_targets").update({response:"do_nothing",outcome:"success",resolved_at:new Date().toISOString()}).eq("id",id);await message(cast.room_id,c.id,`◆ ${c.display_name} does nothing against ${s.name} · Shape succeeds${effectSummary(r)}`);revalidatePath("/game");revalidatePath("/character");return{ok:true,message:"Shape resolved.",submittedAt:Date.now()}}
 const allowed=Array.isArray(s.save_options)?s.save_options:[];if(!allowed.includes(choice))throw Error("That Save is unavailable.");const a=SAVE[choice];if(!a)throw Error("Invalid Save.");const mod=await eff(c,a),r=randomInt(1,21),total=r+mod,dc=11+(s.dc_attribute?await eff(caster,s.dc_attribute):0),saved=total>=dc;
 let result:any=null;if(!saved)result=await apply(t);else if(s.save_success_damage==="half")result=await apply(t,true);
 await admin().from("shape_cast_targets").update({response:choice,save_roll:r,save_attribute:a,save_attribute_value:mod,save_total:total,dc,outcome:saved?"saved":"success",resolved_at:new Date().toISOString()}).eq("id",id);
 let end=saved?"SUCCESS — no effect":"FAILED — Shape succeeds";if(saved&&s.save_success_damage==="half"&&result?.dmg)end=`SUCCESS — half damage ${result.dmg}`;if(!saved)end+=effectSummary(result);
 await message(cast.room_id,c.id,`◆ ${c.display_name} uses ${SAVE_NAME[choice]??choice} against ${s.name} · d20 -> ${r} + ${LABEL[a]??a} (${mod>=0?"+":""}${mod}) = ${total} vs DC ${dc} · ${end}`);revalidatePath("/game");return{ok:true,message:"Shape resolved.",submittedAt:Date.now()}
 }catch(e){return{ok:false,message:e instanceof Error?e.message:"Unable to resolve Shape."}}}


export async function prepareDispelEffect(_p:WarpingActionState,f:FormData):Promise<WarpingActionState>{try{
 const caster=await mine(),castId=field(f,"cast_id"),effectId=field(f,"effect_id"),targetId=field(f,"target_character_id"),a=admin();
 const cq=await a.from("shape_casts").select("id,room_id,shape:shapes!shape_casts_shape_id_fkey(id,name,level,is_dispel)").eq("id",castId).eq("caster_character_id",caster.id).maybeSingle();
 const cast:any=cq.data,shape=one(cast?.shape);if(cq.error||!cast||!shape?.is_dispel)throw Error("Invalid Dispel cast.");
 const tq=await a.from("shape_cast_targets").select("id,outcome").eq("cast_id",castId).eq("target_character_id",targetId).maybeSingle();if(tq.error||!tq.data)throw Error("That character was not the target of this Dispel.");
 const eq=await a.from("character_shape_effects").select("id,shape_level,effect_nature,shape:shapes!character_shape_effects_shape_id_fkey(name)").eq("id",effectId).eq("target_character_id",targetId).is("dispelled_at",null).maybeSingle();if(eq.error||!eq.data)throw Error("Active effect not found.");
 if(Number(shape.level)<Number(eq.data.shape_level))throw Error(`Dispel failed: Level ${shape.level} cannot dispel Level ${eq.data.shape_level}.`);
 const effectShape:any=one(eq.data.shape as any);
 if(eq.data.effect_nature==="harmful"){const u=await a.from("character_shape_effects").update({dispelled_at:new Date().toISOString(),dispelled_by_cast_id:castId}).eq("id",effectId);if(u.error)throw Error(u.error.message);await a.from("shape_cast_targets").update({dispel_effect_id:effectId,response:"automatic_harmful_dispel",outcome:"success",resolved_at:new Date().toISOString()}).eq("id",tq.data.id);await message(cast.room_id,caster.id,`◆ Dispel ${effectShape?.name??"Shape effect"} · Level ${shape.level} vs Level ${eq.data.shape_level} · SUCCESS — effect removed`);revalidatePath("/game");revalidatePath("/character");return{ok:true,message:"Harmful effect dispelled.",submittedAt:Date.now()}}
 const q=await a.from("shape_cast_targets").update({dispel_effect_id:effectId,response:null,outcome:"pending",resolved_at:null}).eq("id",tq.data.id);if(q.error)throw Error(q.error.message);
 return{ok:true,message:"Effect selected. The target must Save or choose Do nothing.",submittedAt:Date.now()}
}catch(e){return{ok:false,message:e instanceof Error?e.message:"Unable to prepare Dispel."}}}
