"use client";
import {useActionState,useEffect,useMemo,useState} from "react";
import {useFormStatus} from "react-dom";
import {createClient} from "@/lib/supabase/client";
import type {CharacterAttributes} from "@/types/game";
import {loadMyEffectiveAttributes} from "../deferred-actions";
import {resolveIncomingDispel,resolveIncomingShape,type WarpingActionState} from "../warping-actions";

const initial:WarpingActionState={ok:false,message:""};
const L:Record<string,string>={dodge:"Dodge — Reflexes",defend:"Defend — Vigour",resist_vigour:"Resist — Vigour",resist_vigor:"Resist — Vigour",resist_shrewd:"Resist — Shrewd",resist_brains:"Resist — Brains",resist_presence:"Resist — Presence"};
const A:Record<string,keyof CharacterAttributes>={dodge:"reflexes",defend:"vigor",resist_vigour:"vigor",resist_vigor:"vigor",resist_shrewd:"shrewd",resist_brains:"brains",resist_presence:"presence_score"};
const sign=(n:number)=>n>=0?`+${n}`:String(n);
function PendingShapeResponseButton({label,name,value,className}:{label:string;name:string;value:string;className:string}){const {pending,data}=useFormStatus();const mine=pending&&data?.get(name)===value;return <button type="submit" name={name} value={value} disabled={pending} className={className}>{mine?"Responding...":label}</button>}

function one(v:any){return Array.isArray(v)?v[0]:v}
function profileFor(row:any,s:any,caster:any){
 if(row.target_character_id===caster?.id)return"self";
 if(s?.other_alternative_enabled&&row.other_effect_choice==="harmful")return"other_alt";
 return"other";
}
function resolutionFor(row:any,s:any,caster:any){
 const p=profileFor(row,s,caster);
 return{
  mode:s?.[`${p}_resolution_mode`]??s?.resolution_mode??"save",
  saves:Array.isArray(s?.[`${p}_save_options`])?s[`${p}_save_options`]:(Array.isArray(s?.save_options)?s.save_options:[]),
 };
}

export function PendingShapeResponses(){
 const db=useMemo(()=>createClient(),[]);
 const [rows,setRows]=useState<any[]>([]);
 const [dispelRows,setDispelRows]=useState<any[]>([]);
 const [attributes,setAttributes]=useState<CharacterAttributes|null>(null);
 const [characterId,setCharacterId]=useState<string|null>(null);
 const [state,action]=useActionState(resolveIncomingShape,initial);
 const [dispelState,dispelAction]=useActionState(resolveIncomingDispel,initial);

 useEffect(()=>{
  let live=true;
  void db.rpc("my_character_id").then(({data})=>{
   if(live)setCharacterId(typeof data==="string"?data:null);
  });
  return()=>{live=false};
 },[db]);

 useEffect(()=>{
  if(!characterId)return;
  let live=true;

  async function load(){
   const [q,dq]=await Promise.all([
    db.from("shape_cast_targets").select(`id,created_at,target_character_id,other_effect_choice,cast:shape_casts!shape_cast_targets_cast_id_fkey(id,caster:characters!shape_casts_caster_character_id_fkey(id,display_name),shape:shapes!shape_casts_shape_id_fkey(*))`).eq("target_character_id",characterId).eq("outcome","pending").order("created_at",{ascending:true}),
    db.from("shape_casts").select(`id,created_at,dispel_effect_id,dispel_target_character_id,caster:characters!shape_casts_caster_character_id_fkey(id,display_name),shape:shapes!shape_casts_shape_id_fkey(*)`).eq("dispel_target_character_id",characterId).not("dispel_effect_id","is",null).order("created_at",{ascending:true}),
   ]);

   if(!live)return;

   setRows((q.data??[]).filter((row:any)=>{
    const cast=one(row.cast),caster=one(cast?.caster),s=one(cast?.shape);
    if(!s||caster?.id===characterId)return false;
    return resolutionFor(row,s,caster).mode==="save";
   }));

   setDispelRows((dq.data??[]).filter((row:any)=>{
    const s=one(row.shape);
    return Boolean(s?.is_dispel);
   }));
  }

  void load();
  const timer=window.setInterval(()=>void load(),10_000);

  const targetChannel=db.channel(`shape-target-${characterId}`).on(
   "postgres_changes",
   {event:"*",schema:"public",table:"shape_cast_targets",filter:`target_character_id=eq.${characterId}`},
   ()=>void load(),
  ).subscribe();

  const dispelChannel=db.channel(`shape-dispel-${characterId}`).on(
   "postgres_changes",
   {event:"*",schema:"public",table:"shape_casts",filter:`dispel_target_character_id=eq.${characterId}`},
   ()=>void load(),
  ).subscribe();

  return()=>{live=false;window.clearInterval(timer);void db.removeChannel(targetChannel);void db.removeChannel(dispelChannel)};
 },[db,characterId,state.submittedAt,dispelState.submittedAt]);

 useEffect(()=>{
  if((!rows.length&&!dispelRows.length)||attributes)return;
  let active=true;
  void loadMyEffectiveAttributes()
    .then(result=>{if(active)setAttributes(result.attributes)})
    .catch(()=>{});
  return()=>{active=false};
 },[rows.length,dispelRows.length,attributes]);

 if(!rows.length&&!dispelRows.length)return null;

 return <div className="mb-2 space-y-2 game_components_pendingshaperesponses_div_container">
  {rows.map(row=>{
   const cast=one(row.cast),caster=one(cast?.caster),s=one(cast?.shape);
   if(!s)return null;
   const resolution=resolutionFor(row,s,caster);
   return <section key={row.id} className="border border-[rgb(var(--sep-colour-765937))] bg-[rgb(var(--sep-colour-20140c))] p-3 game_components_pendingshaperesponses_section_section">
    <p className="text-[7px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-b88c55))] game_components_pendingshaperesponses_p_text">{s.is_feat_backing ? "Incoming Feat" : "Incoming Shape"}</p>
    <p className="mt-1 font-serif text-base text-[rgb(var(--sep-colour-efd2a0))] game_components_pendingshaperesponses_p_text_2">{caster?.display_name??"Someone"} — {s.name}</p>
    <p className="mt-1 text-[9px] text-[rgb(var(--sep-colour-a18d6e))] game_components_pendingshaperesponses_p_text_3">{s.is_feat_backing ? `Feat${s.other_alternative_enabled?` · ${row.other_effect_choice==="harmful"?"Harmful":"Beneficial"} effect`:""}` : `Level ${s.level} · ${s.school} · ${s.word_of_power}${s.other_alternative_enabled?` · ${row.other_effect_choice==="harmful"?"Harmful":"Beneficial"} effect`:""}`}</p>
    <p className="mt-1 text-[10px] text-[rgb(var(--sep-colour-b6a58d))] game_components_pendingshaperesponses_p_text_4">{s.description}</p>
    <form action={action} className="mt-3 flex flex-wrap gap-2 game_components_pendingshaperesponses_form_action">
     <input className="game_components_pendingshaperesponses_input_field" type="hidden" name="shape_cast_target_id" value={row.id}/>
     {resolution.saves.map((x:string)=><PendingShapeResponseButton key={x} name="save_choice" value={x} label={`${L[x]??x} (${sign(Number(attributes?.[A[x]]??0))})`} className="border border-[rgb(var(--sep-colour-765937))] bg-[rgb(var(--sep-colour-2a1c11))] px-3 py-2 text-[8px] uppercase text-[rgb(var(--sep-colour-dfc18f))] disabled:cursor-not-allowed disabled:opacity-40 game_components_pendingshaperesponses_button_save_choice" />)}
     <PendingShapeResponseButton name="save_choice" value="__do_nothing__" label="Do nothing" className="border border-[rgb(var(--sep-colour-765937))] bg-[rgb(var(--sep-colour-2a1c11))] px-3 py-2 text-[8px] uppercase text-[rgb(var(--sep-colour-dfc18f))] disabled:cursor-not-allowed disabled:opacity-40 game_components_pendingshaperesponses_button_do_nothing" />
    </form>
   </section>
  })}

  {dispelRows.map(row=>{
   const caster=one(row.caster),s=one(row.shape);
   if(!s)return null;
   const fake={target_character_id:row.dispel_target_character_id,other_effect_choice:"beneficial"};
   const resolution=resolutionFor(fake,s,caster);
   return <section key={`dispel-${row.id}`} className="border border-[rgb(var(--sep-colour-765937))] bg-[rgb(var(--sep-colour-20140c))] p-3 game_components_pendingshaperesponses_section_section">
    <p className="text-[7px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-b88c55))]">Incoming Dispel</p>
    <p className="mt-1 font-serif text-base text-[rgb(var(--sep-colour-efd2a0))]">{caster?.display_name??"Someone"} — {s.name}</p>
    <p className="mt-1 text-[9px] text-[rgb(var(--sep-colour-a18d6e))]">Level {s.level} · choose a Save or Do nothing</p>
    <form action={dispelAction} className="mt-3 flex flex-wrap gap-2">
     <input type="hidden" name="dispel_cast_id" value={row.id}/>
     {resolution.saves.map((x:string)=><PendingShapeResponseButton key={x} name="save_choice" value={x} label={`${L[x]??x} (${sign(Number(attributes?.[A[x]]??0))})`} className="border border-[rgb(var(--sep-colour-765937))] bg-[rgb(var(--sep-colour-2a1c11))] px-3 py-2 text-[8px] uppercase text-[rgb(var(--sep-colour-dfc18f))] disabled:cursor-not-allowed disabled:opacity-40" />)}
     <PendingShapeResponseButton name="save_choice" value="__do_nothing__" label="Do nothing" className="border border-[rgb(var(--sep-colour-765937))] bg-[rgb(var(--sep-colour-2a1c11))] px-3 py-2 text-[8px] uppercase text-[rgb(var(--sep-colour-dfc18f))] disabled:cursor-not-allowed disabled:opacity-40" />
    </form>
   </section>
  })}

  {state.message?<p className={[((state.ok?"text-xs text-[rgb(var(--sep-colour-9bb58c))]":"text-xs text-[rgb(var(--sep-colour-d58d82))]")),"game_components_pendingshaperesponses_p_text_5"].filter(Boolean).join(" ")}>{state.message}</p>:null}
  {dispelState.message?<p className={dispelState.ok?"text-xs text-[rgb(var(--sep-colour-9bb58c))]":"text-xs text-[rgb(var(--sep-colour-d58d82))]"}>{dispelState.message}</p>:null}
 </div>
}
