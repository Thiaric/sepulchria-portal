"use client";
import {useActionState,useEffect,useMemo,useState} from "react";
import {createClient} from "@/lib/supabase/client";
import type {CharacterAttributes} from "@/types/game";
import {resolveIncomingShape,type WarpingActionState} from "../warping-actions";

const initial:WarpingActionState={ok:false,message:""};
const L:Record<string,string>={dodge:"Dodge — Reflexes",defend:"Defend — Vigour",resist_vigour:"Resist — Vigour",resist_shrewd:"Resist — Shrewd",resist_brains:"Resist — Brains",resist_presence:"Resist — Presence"};
const A:Record<string,keyof CharacterAttributes>={dodge:"reflexes",defend:"vigor",resist_vigour:"vigor",resist_shrewd:"shrewd",resist_brains:"brains",resist_presence:"presence_score"};
const sign=(n:number)=>n>=0?`+${n}`:String(n);

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

export function PendingShapeResponses({attributes}:{attributes:CharacterAttributes}){
 const db=useMemo(()=>createClient(),[]);
 const [rows,setRows]=useState<any[]>([]);
 const [state,action]=useActionState(resolveIncomingShape,initial);

 useEffect(()=>{
  let live=true;
  async function load(){
   const me=await db.rpc("my_character_id");
   if(!live||!me.data)return;
   const q=await db.from("shape_cast_targets").select(`id,created_at,dispel_effect_id,target_character_id,other_effect_choice,cast:shape_casts!shape_cast_targets_cast_id_fkey(id,caster:characters!shape_casts_caster_character_id_fkey(id,display_name),shape:shapes!shape_casts_shape_id_fkey(*))`).eq("target_character_id",me.data).eq("outcome","pending").order("created_at",{ascending:true});
   if(!live)return;
   setRows((q.data??[]).filter((row:any)=>{
    const cast=one(row.cast),caster=one(cast?.caster),s=one(cast?.shape);
    if(!s||caster?.id===me.data)return false;
    return resolutionFor(row,s,caster).mode==="save";
   }));
  }
  void load();
  const timer=window.setInterval(()=>void load(),2500);
  const ch=db.channel(`shape-target-${crypto.randomUUID()}`).on("postgres_changes",{event:"*",schema:"public",table:"shape_cast_targets"},()=>void load()).subscribe();
  return()=>{live=false;window.clearInterval(timer);void db.removeChannel(ch)};
 },[db,state.submittedAt]);

 if(!rows.length)return null;

 return <div className="mb-2 space-y-2">{rows.map(row=>{
  const cast=one(row.cast),caster=one(cast?.caster),s=one(cast?.shape);
  if(!s)return null;
  if(s.is_dispel&&!row.dispel_effect_id)return null;
  const resolution=resolutionFor(row,s,caster);
  return <section key={row.id} className="border border-[rgb(var(--sep-colour-765937))] bg-[rgb(var(--sep-colour-20140c))] p-3">
   <p className="text-[7px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-b88c55))]">Incoming Shape</p>
   <p className="mt-1 font-serif text-base text-[rgb(var(--sep-colour-efd2a0))]">{caster?.display_name??"Someone"} — {s.name}</p>
   <p className="mt-1 text-[9px] text-[rgb(var(--sep-colour-a18d6e))]">Level {s.level} · {s.school} · {s.word_of_power}{s.other_alternative_enabled?` · ${row.other_effect_choice==="harmful"?"Harmful":"Beneficial"} effect`:""}</p>
   <p className="mt-1 text-[10px] text-[rgb(var(--sep-colour-b6a58d))]">{s.description}</p>
   <form action={action} className="mt-3 flex flex-wrap gap-2">
    <input type="hidden" name="shape_cast_target_id" value={row.id}/>
    {resolution.saves.map((x:string)=><button key={x} type="submit" name="save_choice" value={x} className="border border-[rgb(var(--sep-colour-765937))] bg-[rgb(var(--sep-colour-2a1c11))] px-3 py-2 text-[8px] uppercase text-[rgb(var(--sep-colour-dfc18f))]">{L[x]??x} ({sign(Number(attributes[A[x]]??0))})</button>)}
    <button type="submit" name="save_choice" value="__do_nothing__" className="border border-[rgb(var(--sep-colour-765937))] bg-[rgb(var(--sep-colour-2a1c11))] px-3 py-2 text-[8px] uppercase text-[rgb(var(--sep-colour-dfc18f))]">Do nothing</button>
   </form>
  </section>
 })}
 {state.message?<p className={state.ok?"text-xs text-[rgb(var(--sep-colour-9bb58c))]":"text-xs text-[rgb(var(--sep-colour-d58d82))]"}>{state.message}</p>:null}
 </div>
}
