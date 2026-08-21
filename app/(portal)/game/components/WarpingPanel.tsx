"use client";
import {useEffect,useMemo,useState} from "react";
import {createClient} from "@/lib/supabase/client";
import { sendRoomMessage } from "../actions";
import { prepareDispelEffect } from "../warping-actions";
import { getShapeAccessForCurrentCharacter } from "../warping-progression-actions";
type C={id:string;display_name?:string;displayName?:string}; type S=Record<string,any>;
const PM:Record<string,[number,number,string]>={
cinder_eyes:[1,2,"Cinder Eyes"],luminous_veins:[1,2,"Luminous Veins"],cinderblood:[1,2,"Cinderblood"],dreamtouched:[1,2,"Dreamtouched"],beastmarked:[1,2,"Beastmarked"],
bloomwake:[2,5,"Bloomwake"],witherwake:[2,5,"Witherwake"],upstream:[2,5,"Upstream"],unbound_shadow:[2,5,"Unbound Shadow"],starbound:[2,5,"Starbound"],false_remembrance:[2,5,"False Remembrance"],
current_sighted:[3,10,"Current-Sighted"],godwhispered:[3,10,"Godwhispered"],realitys_misstep:[3,10,"Reality's Misstep"],unmoored:[3,10,"Unmoored"]};

const SAVE_LABEL:Record<string,string>={dodge:"Dodge",defend:"Defend",resist_vigour:"Resist Vigour",resist_vigor:"Resist Vigour",resist_shrewd:"Resist Shrewd",resist_brains:"Resist Brains",resist_presence:"Resist Presence"};
const ATTR_LABEL:Record<string,string>={muscles:"Muscles",reflexes:"Reflexes",vigor:"Vigour",vigour:"Vigour",brains:"Brains",shrewd:"Shrewd",presence:"Presence",presence_score:"Presence"};
const signed=(n:number)=>n>0?`+${n}`:String(n);
function profileBits(s:S,p:"self"|"other"){const bits:string[]=[];const d=[s[`${p}_damage_dice`],s[`${p}_damage_attribute`]?`+ ${ATTR_LABEL[s[`${p}_damage_attribute`]]??s[`${p}_damage_attribute`]}`:""].filter(Boolean).join(" ");if(d)bits.push(`Damage ${d}${s.damage_type?` ${s.damage_type}`:""}`);const h=[s[`${p}_heal_dice`],s[`${p}_heal_attribute`]?`+ ${ATTR_LABEL[s[`${p}_heal_attribute`]]??s[`${p}_heal_attribute`]}`:""].filter(Boolean).join(" ");if(h)bits.push(`Healing ${h}`);const c=Array.isArray(s[`${p}_conditions`])?s[`${p}_conditions`]:[];if(c.length)bits.push(`Conditions: ${c.join(", ")}`);for(const [k,l] of [["muscles","Muscles"],["reflexes","Reflexes"],["vigour","Vigour"],["brains","Brains"],["shrewd","Shrewd"],["presence","Presence"]]){const v=Number(s[`${p}_${k}_modifier`]??0);if(v)bits.push(`${l} ${signed(v)}`)}if(s[`${p}_max_hp_change`])bits.push(`Max HP ${s[`${p}_max_hp_change`]}`);return bits}
function ShapeInformation({shape}:{shape:S}){const target=shape.target_mode==="self"?"Self":shape.target_mode==="other"?"Other":shape.target_mode==="either"?"Self or Other":"Written / Fate";const count=shape.target_scope==="multiple"?`Multiple, max ${shape.max_targets}`:"Single";const saves=(shape.save_options??[]).map((x:string)=>SAVE_LABEL[x]??x).join(", ");const prereq=[["muscles","Muscles"],["reflexes","Reflexes"],["vigour","Vigour"],["brains","Brains"],["shrewd","Shrewd"],["presence","Presence"]].map(([k,l])=>shape[`min_${k}`]?`${l} ${shape[`min_${k}`]}+`:"").filter(Boolean);const duration=shape.duration_unit==="until_dispelled"?"Until Dispelled":`${shape.duration_amount??1} ${shape.duration_unit??"minutes"}`;const price=shape.price_key&&PM[shape.price_key]?PM[shape.price_key][2]:"None";const selfBits=profileBits(shape,"self"),otherBits=profileBits(shape,"other");return <div className="mt-3 border border-[rgb(var(--sep-colour-60482e))]/30 bg-[rgb(var(--sep-colour-120d09))] p-4"><p className="text-[8px] uppercase tracking-[.13em] text-[rgb(var(--sep-colour-9a7c54))]">Level {shape.level} · {shape.school} · {shape.word_of_power} · {shape.movement}</p><p className="mt-2 text-[11px] leading-5 text-[rgb(var(--sep-colour-c0ae92))]">{shape.description}</p><div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4 text-[9px] text-[rgb(var(--sep-colour-9e8b70))]"><span><b className="text-[rgb(var(--sep-colour-cdb48d))]">Components:</b> {[shape.requires_verbal?"Verbal":"",shape.requires_movement?"Movement":""].filter(Boolean).join(" + ")||"None"}</span><span><b className="text-[rgb(var(--sep-colour-cdb48d))]">Target:</b> {target} · {count}</span><span><b className="text-[rgb(var(--sep-colour-cdb48d))]">Resolution:</b> {shape.resolution_mode==="automatic"?"Automatic Success":"Save"}</span><span><b className="text-[rgb(var(--sep-colour-cdb48d))]">Nature:</b> {shape.effect_nature}</span>{shape.resolution_mode!=="automatic"?<><span><b className="text-[rgb(var(--sep-colour-cdb48d))]">DC:</b> 11 + {ATTR_LABEL[shape.dc_attribute]??shape.dc_attribute??"—"}</span><span><b className="text-[rgb(var(--sep-colour-cdb48d))]">Saves:</b> {saves||"None"}</span><span><b className="text-[rgb(var(--sep-colour-cdb48d))]">On Save:</b> {shape.save_success_damage==="half"?"Half damage, no conditions/effects":"No effect"}</span></>:null}<span><b className="text-[rgb(var(--sep-colour-cdb48d))]">Duration:</b> {duration}</span><span><b className="text-[rgb(var(--sep-colour-cdb48d))]">Price:</b> {price}</span>{shape.is_dispel?<span><b className="text-[rgb(var(--sep-colour-cdb48d))]">Dispel:</b> Level {shape.level}, equal or lower effects</span>:null}{prereq.length?<span className="sm:col-span-2"><b className="text-[rgb(var(--sep-colour-cdb48d))]">Requirements:</b> {prereq.join(", ")}</span>:null}</div>{selfBits.length?<p className="mt-3 text-[9px] leading-5 text-[rgb(var(--sep-colour-a99577))]"><b className="text-[rgb(var(--sep-colour-d7bd91))]">Self profile:</b> {selfBits.join(" · ")}</p>:null}{otherBits.length?<p className="mt-1 text-[9px] leading-5 text-[rgb(var(--sep-colour-a99577))]"><b className="text-[rgb(var(--sep-colour-d7bd91))]">Other profile:</b> {otherBits.join(" · ")}</p>:null}</div>}
export function WarpingPanel({presentCharacters,onBack}:{presentCharacters:C[];onBack:()=>void}){
 const db=useMemo(()=>createClient(),[]),[r,setR]=useState<any>(null),[sid,setSid]=useState(""),[targets,setTargets]=useState<string[]>([]),[written,setWritten]=useState(""),[msg,setMsg]=useState(""),[busy,setBusy]=useState(false),[blockedTargets,setBlockedTargets]=useState<string[]>([]),[dispelEffects,setDispelEffects]=useState<any[]>([]),[selectedDispelEffect,setSelectedDispelEffect]=useState(""),[access,setAccess]=useState<any>(null);
 async function load(){const x=await db.rpc("get_my_warping_runtime");if(x.error){setMsg(x.error.message);return}setR(x.data);if(!sid&&x.data?.shapes?.[0])setSid(x.data.shapes[0].id)}
 useEffect(()=>{void load()},[]);
 const s:S|null=r?.shapes?.find((x:S)=>x.id===sid)??r?.shapes?.[0]??null;
 useEffect(()=>{let active=true;async function check(){if(!s?.id){setAccess(null);return}const result=await getShapeAccessForCurrentCharacter(s.id);if(active)setAccess(result)}void check();return()=>{active=false}},[s?.id,r?.warps_used,r?.warps_per_day]);
 useEffect(()=>{let active=true;async function loadBlocked(){if(!s?.id||!r?.character_id){setBlockedTargets([]);return}const ids=[r.character_id,...presentCharacters.map(c=>c.id)];const q=await db.from("character_shape_effects").select("target_character_id").eq("shape_id",s.id).in("target_character_id",ids).is("dispelled_at",null).or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`);if(active)setBlockedTargets((q.data??[]).map(x=>String(x.target_character_id)))}void loadBlocked();const ch=db.channel(`warp-blocked-${s?.id??"none"}-${crypto.randomUUID()}`).on("postgres_changes",{event:"*",schema:"public",table:"character_shape_effects"},()=>void loadBlocked()).subscribe();return()=>{active=false;void db.removeChannel(ch)}},[db,s?.id,r?.character_id,presentCharacters]);
 useEffect(()=>{let active=true;async function loadDispelEffects(){if(!s?.is_dispel||targets.length!==1){if(active){setDispelEffects([]);setSelectedDispelEffect("")}return}const q=await db.rpc("get_character_active_shape_effects",{p_character_id:targets[0]});const eligible=(q.data??[]).filter((e:any)=>Number(e.shape_level)<=Number(s.level));if(active){setDispelEffects(eligible);setSelectedDispelEffect(v=>eligible.some((e:any)=>e.id===v)?v:"")}}void loadDispelEffects();return()=>{active=false}},[db,s?.id,s?.is_dispel,s?.level,targets]);
 function toggle(id:string){if(blockedTargets.includes(id)&&!s?.is_dispel)return;const m=s?.target_scope==="multiple"?Number(s.max_targets??1):1;setTargets(a=>a.includes(id)?a.filter(x=>x!==id):[...a,id].slice(-m))}
 async function warp(){if(!s||busy)return;setBusy(true);setMsg("");try{
  const au=await db.auth.getUser();if(!au.data.user)throw Error("Not signed in.");
  const me=await db.from("characters").select("id,current_room_id").eq("user_id",au.data.user.id).single();if(me.error||!me.data)throw Error(me.error?.message??"Character not found.");
  const freshAccess=await getShapeAccessForCurrentCharacter(s.id);if(!freshAccess.allowed)throw Error(freshAccess.reasons.join(" · ")||"This Shape cannot currently be Warped.");
  const wt=s.target_mode==="written",self=s.target_mode==="self";if(wt&&!written.trim())throw Error("Write the Fate target.");if(!wt&&!self&&!targets.length)throw Error("Choose a target.");
  if(s.is_dispel&&(!targets.length||!selectedDispelEffect))throw Error("Choose an active effect to dispel before Warping.");
  const cr=await db.from("shape_casts").insert({caster_character_id:me.data.id,shape_id:s.id,room_id:me.data.current_room_id,written_target:wt?written.trim():null}).select("id").single();if(cr.error||!cr.data)throw Error(cr.error?.message??"Cast failed.");
  if(s.price_key){const pe=await db.rpc("create_price_for_shape_cast",{p_cast_id:cr.data.id,p_shape_id:s.id});if(pe.error)throw Error(pe.error.message)}
  const rows=wt?[{cast_id:cr.data.id,target_kind:"written",outcome:"manual"}]:self?[{cast_id:cr.data.id,target_character_id:me.data.id,target_kind:"self",outcome:"success",resolved_at:new Date().toISOString()}]:targets.map(id=>({cast_id:cr.data.id,target_character_id:id,target_kind:id===me.data.id?"self":"character",outcome:id===me.data.id||s.resolution_mode==="automatic"?"success":"pending",resolved_at:id===me.data.id||s.resolution_mode==="automatic"?new Date().toISOString():null}));
  const tr=await db.from("shape_cast_targets").insert(rows);if(tr.error)throw Error(tr.error.message);
  let preparedDispelMessage="";
  if(s.is_dispel){const fd=new FormData();fd.set("cast_id",cr.data.id);fd.set("target_character_id",targets[0]);fd.set("effect_id",selectedDispelEffect);const prepared=await prepareDispelEffect({ok:false,message:""},fd);if(!prepared.ok)throw Error(prepared.message||"Unable to prepare Dispel.");preparedDispelMessage=prepared.message;}

  const targetNames = wt
    ? written.trim()
    : self
      ? "Self"
      : targets.map(id => {
          if (id === me.data.id) return "Self";
          const entry = presentCharacters.find(c => c.id === id);
          return entry?.display_name ?? entry?.displayName ?? "Unknown";
        }).join(", ");

  const parts: string[] = [
    `◆ Warp ${s.name}`,
    s.word_of_power ? `${s.word_of_power}` : "",
    s.level ? `Level ${s.level}` : "",
    s.school ? `${s.school}` : "",
    `Target${!wt && !self && targets.length > 1 ? "s" : ""}: ${targetNames}`,
  ];
  if (wt) parts.push("Fate resolves the result");
  else if (self || s.resolution_mode === "automatic") parts.push("Automatic Success");
  else {
    if (s.dc_attribute) parts.push(`DC: 11 + ${ATTR_LABEL[s.dc_attribute]??s.dc_attribute}`);
    const saves = Array.isArray(s.save_options) ? s.save_options.filter(Boolean).map((x:string)=>SAVE_LABEL[x]??x).join(" / ") : "";
    if (saves) parts.push(`Save: ${saves}`);
    parts.push("Awaiting target");
  }
  if (s.movement) parts.push(`Movement: ${s.movement}`);
  const components = [s.requires_verbal ? "Verbal" : "", s.requires_movement ? "Movement" : ""].filter(Boolean).join(" + ");
  if (components) parts.push(`Components: ${components}`);
  if (s.description) parts.push(`Effect: ${String(s.description).replace(/\\s+/g, " ").trim()}`);
  const profile = self ? "self" : "other";
  const damage=[s[`${profile}_damage_dice`] ? String(s[`${profile}_damage_dice`]) : "",s[`${profile}_damage_attribute`] ? `+ ${ATTR_LABEL[s[`${profile}_damage_attribute`]]??s[`${profile}_damage_attribute`]}` : ""].filter(Boolean).join(" ");if(damage)parts.push(`Damage: ${damage}`);
  const healing=[s[`${profile}_heal_dice`] ? String(s[`${profile}_heal_dice`]) : "",s[`${profile}_heal_attribute`] ? `+ ${ATTR_LABEL[s[`${profile}_heal_attribute`]]??s[`${profile}_heal_attribute`]}` : ""].filter(Boolean).join(" ");if(healing)parts.push(`Healing: ${healing}`);
  const conditions=Array.isArray(s[`${profile}_conditions`])?s[`${profile}_conditions`]:[];if(conditions.length)parts.push(`Condition${conditions.length>1?"s":""}: ${conditions.join(", ")}`);
  const mn=[["muscles","Muscles"],["reflexes","Reflexes"],["vigour","Vigour"],["brains","Brains"],["shrewd","Shrewd"],["presence","Presence"]];const mods=mn.map(([k,l])=>[l,Number(s[`${profile}_${k}_modifier`]??0)] as const).filter(([,v])=>v!==0).map(([l,v])=>`${l} ${v>0?"+":""}${v}`);if(mods.length)parts.push(`Target: ${mods.join(", ")}`);
  if(s[`${profile}_max_hp_change`])parts.push(`Max HP: ${s[`${profile}_max_hp_change`]}`);
  if(s.duration_amount&&s.duration_unit)parts.push(`Duration: ${s.duration_amount} ${s.duration_unit}`);else if(s.duration_unit==="until_dispelled")parts.push("Duration: Until Dispelled");
  if (s.is_dispel) {const de=dispelEffects.find((e:any)=>e.id===selectedDispelEffect);parts.push(`Dispel Level ${s.level}`);if(de)parts.push(`Effect: ${de.shape_name} · Level ${de.shape_level}`);}
  if (s.price_key && PM[String(s.price_key)]) {
    const [stage, days, label] = PM[String(s.price_key)];
    parts.push(`Price: ${label} · Stage ${stage} · ${days} days`);
  }
  const castText = parts.filter(Boolean).join(" · ");

  const roomMessageData = new FormData();
  roomMessageData.set("message", castText);
  roomMessageData.set("client_nonce", crypto.randomUUID());
  roomMessageData.set("whisper_recipient_id", "");

  const posted = await sendRoomMessage(
    { ok: false, message: "" },
    roomMessageData,
  );

  if (!posted.ok) {
    throw Error(posted.message || "Shape was recorded but its room message could not be posted.");
  }
  setTargets([]);setWritten("");setSelectedDispelEffect("");setDispelEffects([]);setMsg(preparedDispelMessage||(wt?"Warp recorded. Fate resolves it manually.":"Shape warped."));await load()
 }catch(e){setMsg(e instanceof Error?e.message:"Warp failed.")}finally{setBusy(false)}}
 if(!r)return <div className="border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-100c09))] p-4"><button type="button" onClick={onBack} className="text-[9px] uppercase text-[rgb(var(--sep-colour-d6b37d))]">Back to Chat</button><p className="mt-3 text-xs text-[rgb(var(--sep-colour-8f8271))]">{msg||"Loading Warping..."}</p></div>;
 return <div className="border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-100c09))] p-4">
  <div className="flex justify-between gap-3"><div><p className="text-[8px] uppercase tracking-[.2em] text-[rgb(var(--sep-colour-806b50))]">The Current</p><h3 className="font-serif text-xl text-[rgb(var(--sep-colour-dfc99f))]">Warping</h3></div><div className="text-[10px] text-[rgb(var(--sep-colour-a99577))]"><span>Affinity <b className="text-[rgb(var(--sep-colour-ead1a3))]">{access?.affinity ?? r.affinity}</b></span><span className="ml-3">Shapes <b className="text-[rgb(var(--sep-colour-ead1a3))]">{access ? Math.max(0, access.warpsPerDay - access.warpsUsed) : r.warps_remaining} / {access?.warpsPerDay ?? r.warps_per_day}</b></span><span className="ml-3 text-[rgb(var(--sep-colour-806b50))]">Reset 08:00 UK</span> <button type="button" onClick={onBack} className="ml-3 border border-[rgb(var(--sep-colour-60482e))]/55 px-3 py-2 text-[8px] uppercase">Back to Chat</button></div></div>
  {!r.shapes?.length?<p className="mt-4 text-xs text-[rgb(var(--sep-colour-8f8271))]">You have no Shapes assigned.</p>:<>
   <select value={s?.id??""} onChange={e=>{setSid(e.target.value);setTargets([]);setDispelEffects([]);setSelectedDispelEffect("")}} className="mt-4 w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-0f0c09))] px-3 py-2 text-[10px] text-[rgb(var(--sep-colour-d8c29b))]">{r.shapes.map((x:S)=><option key={x.id} value={x.id}>L{x.level} · {x.name} · {x.word_of_power}{x.level_available?"":" · LOCKED"}</option>)}</select>
   {s?<ShapeInformation shape={s}/>:null}
   {s?.target_mode==="written"?<input value={written} onChange={e=>setWritten(e.target.value)} placeholder="Written / Fate target..." className="mt-3 w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-0f0c09))] px-3 py-2 text-[10px]"/>:s?.target_mode!=="self"?<div className="mt-3 flex flex-wrap gap-2">{s?.target_mode==="either"&&(!blockedTargets.includes(r.character_id)||s?.is_dispel)?<button type="button" onClick={()=>toggle(r.character_id)} className="border border-[rgb(var(--sep-colour-60482e))]/55 px-3 py-2 text-[9px]">Self</button>:null}{presentCharacters.filter(c=>c.id!==r.character_id&&(!blockedTargets.includes(c.id)||s?.is_dispel)).map(c=><button key={c.id} type="button" onClick={()=>toggle(c.id)} className={"border px-3 py-2 text-[9px] "+(targets.includes(c.id)?"border-[rgb(var(--sep-colour-b88b50))] bg-[rgb(var(--sep-colour-2a1d12))]":"border-[rgb(var(--sep-colour-60482e))]/55")}>{c.display_name??c.displayName}</button>)}</div>:<p className="mt-3 text-[10px] text-[rgb(var(--sep-colour-9e8b70))]">Target: Self · automatic success.</p>}
   {s?.is_dispel&&targets.length===1?<div className="mt-3 border border-[rgb(var(--sep-colour-60482e))]/35 bg-[rgb(var(--sep-colour-15100d))] p-3"><p className="text-[8px] uppercase tracking-[.14em] text-[rgb(var(--sep-colour-806b50))]">Effect to Dispel</p>{dispelEffects.length?<select value={selectedDispelEffect} onChange={e=>setSelectedDispelEffect(e.target.value)} className="mt-2 w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-0f0c09))] px-3 py-2 text-[10px] text-[rgb(var(--sep-colour-d8c29b))]"><option value="">Choose active effect...</option>{dispelEffects.map((e:any)=><option key={e.id} value={e.id}>{e.shape_name} · Level {e.shape_level} · {e.effect_nature}</option>)}</select>:<p className="mt-2 text-[9px] text-[rgb(var(--sep-colour-887865))]">This character has no active effect that this Level {s.level} Dispel can remove.</p>}</div>:null}
   {access&&!access.allowed?<div className="mt-3 border border-[rgb(var(--sep-colour-6f493f))]/60 bg-[rgb(var(--sep-colour-1b100d))] px-3 py-2 text-[9px] text-[rgb(var(--sep-colour-d58d82))]">Unavailable: {access.reasons.join(" · ")}</div>:null}
   <button type="button" disabled={busy||!access?.allowed||(Boolean(s?.is_dispel)&&!selectedDispelEffect)} onClick={()=>void warp()} className="mt-4 border border-[rgb(var(--sep-colour-9b7446))] bg-[rgb(var(--sep-colour-2a1d12))] px-5 py-2 text-[9px] uppercase text-[rgb(var(--sep-colour-ead1a3))] disabled:opacity-40">{busy?"Warping...":`Warp ${s?.word_of_power??""}`}</button>
  </>}
  {msg?<p className="mt-3 text-[10px] text-[rgb(var(--sep-colour-c9b18a))]">{msg}</p>:null}
 </div>
}
