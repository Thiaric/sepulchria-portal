"use client";
import {useEffect,useMemo,useState} from "react";
import {createClient} from "@/lib/supabase/client";
import { sendRoomMessage } from "../actions";
import { DispelPicker } from "./DispelPicker";
type C={id:string;display_name?:string;displayName?:string}; type S=Record<string,any>;
const PM:Record<string,[number,number,string]>={
cinder_eyes:[1,2,"Cinder Eyes"],luminous_veins:[1,2,"Luminous Veins"],cinderblood:[1,2,"Cinderblood"],dreamtouched:[1,2,"Dreamtouched"],beastmarked:[1,2,"Beastmarked"],
bloomwake:[2,5,"Bloomwake"],witherwake:[2,5,"Witherwake"],upstream:[2,5,"Upstream"],unbound_shadow:[2,5,"Unbound Shadow"],starbound:[2,5,"Starbound"],false_remembrance:[2,5,"False Remembrance"],
current_sighted:[3,10,"Current-Sighted"],godwhispered:[3,10,"Godwhispered"],realitys_misstep:[3,10,"Reality's Misstep"],unmoored:[3,10,"Unmoored"]};

const SAVE_LABEL:Record<string,string>={dodge:"Dodge",defend:"Defend",resist_vigour:"Resist Vigour",resist_vigor:"Resist Vigour",resist_shrewd:"Resist Shrewd",resist_brains:"Resist Brains",resist_presence:"Resist Presence"};
const ATTR_LABEL:Record<string,string>={muscles:"Muscles",reflexes:"Reflexes",vigor:"Vigour",vigour:"Vigour",brains:"Brains",shrewd:"Shrewd",presence:"Presence",presence_score:"Presence"};
const signed=(n:number)=>n>0?`+${n}`:String(n);
function profileBits(s:S,p:"self"|"other"){const bits:string[]=[];const d=[s[`${p}_damage_dice`],s[`${p}_damage_attribute`]?`+ ${ATTR_LABEL[s[`${p}_damage_attribute`]]??s[`${p}_damage_attribute`]}`:""].filter(Boolean).join(" ");if(d)bits.push(`Damage ${d}${s.damage_type?` ${s.damage_type}`:""}`);const h=[s[`${p}_heal_dice`],s[`${p}_heal_attribute`]?`+ ${ATTR_LABEL[s[`${p}_heal_attribute`]]??s[`${p}_heal_attribute`]}`:""].filter(Boolean).join(" ");if(h)bits.push(`Healing ${h}`);const c=Array.isArray(s[`${p}_conditions`])?s[`${p}_conditions`]:[];if(c.length)bits.push(`Conditions: ${c.join(", ")}`);for(const [k,l] of [["muscles","Muscles"],["reflexes","Reflexes"],["vigour","Vigour"],["brains","Brains"],["shrewd","Shrewd"],["presence","Presence"]]){const v=Number(s[`${p}_${k}_modifier`]??0);if(v)bits.push(`${l} ${signed(v)}`)}if(s[`${p}_max_hp_change`])bits.push(`Max HP ${s[`${p}_max_hp_change`]}`);return bits}
function ShapeInformation({shape}:{shape:S}){const target=shape.target_mode==="self"?"Self":shape.target_mode==="other"?"Other":shape.target_mode==="either"?"Self or Other":"Written / Fate";const count=shape.target_scope==="multiple"?`Multiple, max ${shape.max_targets}`:"Single";const saves=(shape.save_options??[]).map((x:string)=>SAVE_LABEL[x]??x).join(", ");const prereq=[["muscles","Muscles"],["reflexes","Reflexes"],["vigour","Vigour"],["brains","Brains"],["shrewd","Shrewd"],["presence","Presence"]].map(([k,l])=>shape[`min_${k}`]?`${l} ${shape[`min_${k}`]}+`:"").filter(Boolean);const duration=shape.duration_unit==="until_dispelled"?"Until Dispelled":`${shape.duration_amount??1} ${shape.duration_unit??"minutes"}`;const price=shape.price_key&&PM[shape.price_key]?PM[shape.price_key][2]:"None";const selfBits=profileBits(shape,"self"),otherBits=profileBits(shape,"other");return <div className="mt-3 border border-[#60482e]/30 bg-[#120d09] p-4"><p className="text-[8px] uppercase tracking-[.13em] text-[#9a7c54]">Level {shape.level} · {shape.school} · {shape.word_of_power} · {shape.movement}</p><p className="mt-2 text-[11px] leading-5 text-[#c0ae92]">{shape.description}</p><div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4 text-[9px] text-[#9e8b70]"><span><b className="text-[#cdb48d]">Components:</b> {[shape.requires_verbal?"Verbal":"",shape.requires_movement?"Movement":""].filter(Boolean).join(" + ")||"None"}</span><span><b className="text-[#cdb48d]">Target:</b> {target} · {count}</span><span><b className="text-[#cdb48d]">Resolution:</b> {shape.resolution_mode==="automatic"?"Automatic Success":"Save"}</span><span><b className="text-[#cdb48d]">Nature:</b> {shape.effect_nature}</span>{shape.resolution_mode!=="automatic"?<><span><b className="text-[#cdb48d]">DC:</b> 11 + {ATTR_LABEL[shape.dc_attribute]??shape.dc_attribute??"—"}</span><span><b className="text-[#cdb48d]">Saves:</b> {saves||"None"}</span><span><b className="text-[#cdb48d]">On Save:</b> {shape.save_success_damage==="half"?"Half damage, no conditions/effects":"No effect"}</span></>:null}<span><b className="text-[#cdb48d]">Duration:</b> {duration}</span><span><b className="text-[#cdb48d]">Price:</b> {price}</span>{shape.is_dispel?<span><b className="text-[#cdb48d]">Dispel:</b> Level {shape.level}, equal or lower effects</span>:null}{prereq.length?<span className="sm:col-span-2"><b className="text-[#cdb48d]">Requirements:</b> {prereq.join(", ")}</span>:null}</div>{selfBits.length?<p className="mt-3 text-[9px] leading-5 text-[#a99577]"><b className="text-[#d7bd91]">Self profile:</b> {selfBits.join(" · ")}</p>:null}{otherBits.length?<p className="mt-1 text-[9px] leading-5 text-[#a99577]"><b className="text-[#d7bd91]">Other profile:</b> {otherBits.join(" · ")}</p>:null}</div>}
export function WarpingPanel({presentCharacters,onBack}:{presentCharacters:C[];onBack:()=>void}){
 const db=useMemo(()=>createClient(),[]),[r,setR]=useState<any>(null),[sid,setSid]=useState(""),[targets,setTargets]=useState<string[]>([]),[written,setWritten]=useState(""),[msg,setMsg]=useState(""),[busy,setBusy]=useState(false),[dispelCast,setDispelCast]=useState<string|null>(null),[dispelTarget,setDispelTarget]=useState<{id:string;name:string}|null>(null);
 async function load(){const x=await db.rpc("get_my_warping_runtime");if(x.error){setMsg(x.error.message);return}setR(x.data);if(!sid&&x.data?.shapes?.[0])setSid(x.data.shapes[0].id)}
 useEffect(()=>{void load()},[]);
 const s:S|null=r?.shapes?.find((x:S)=>x.id===sid)??r?.shapes?.[0]??null;
 function toggle(id:string){const m=s?.target_scope==="multiple"?Number(s.max_targets??1):1;setTargets(a=>a.includes(id)?a.filter(x=>x!==id):[...a,id].slice(-m))}
 async function warp(){if(!s||busy)return;setBusy(true);setMsg("");try{
  const au=await db.auth.getUser();if(!au.data.user)throw Error("Not signed in.");
  const me=await db.from("characters").select("id,current_room_id").eq("user_id",au.data.user.id).single();if(me.error||!me.data)throw Error(me.error?.message??"Character not found.");
  if(Number(r.warps_remaining)<=0)throw Error("No Warps remain before the next 08:00 UK reset.");
  const wt=s.target_mode==="written",self=s.target_mode==="self";if(wt&&!written.trim())throw Error("Write the Fate target.");if(!wt&&!self&&!targets.length)throw Error("Choose a target.");
  const cr=await db.from("shape_casts").insert({caster_character_id:me.data.id,shape_id:s.id,room_id:me.data.current_room_id,written_target:wt?written.trim():null}).select("id").single();if(cr.error||!cr.data)throw Error(cr.error?.message??"Cast failed.");
  if(s.price_key&&PM[s.price_key]){const [stage,days]=PM[s.price_key];const pe=await db.from("character_price_effects").insert({cast_id:cr.data.id,character_id:me.data.id,price_key:s.price_key,stage,expires_at:new Date(Date.now()+days*86400000).toISOString()});if(pe.error)throw Error(pe.error.message)}
  const rows=wt?[{cast_id:cr.data.id,target_kind:"written",outcome:"manual"}]:self?[{cast_id:cr.data.id,target_character_id:me.data.id,target_kind:"self",outcome:"success",resolved_at:new Date().toISOString()}]:targets.map(id=>({cast_id:cr.data.id,target_character_id:id,target_kind:id===me.data.id?"self":"character",outcome:id===me.data.id||s.resolution_mode==="automatic"?"success":"pending",resolved_at:id===me.data.id||s.resolution_mode==="automatic"?new Date().toISOString():null}));
  const tr=await db.from("shape_cast_targets").insert(rows);if(tr.error)throw Error(tr.error.message);

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
  if (s.is_dispel) parts.push(`Dispel Level ${s.level}`);
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
  if(s.is_dispel){const did=self?me.data.id:targets[0];const dn=self?"Self":(presentCharacters.find(c=>c.id===did)?.display_name??presentCharacters.find(c=>c.id===did)?.displayName??"Target");setDispelCast(cr.data.id);setDispelTarget({id:did,name:dn});}else{setDispelCast(null);setDispelTarget(null);}

  setTargets([]);setWritten("");setMsg(wt?"Warp recorded. Fate resolves it manually.":"Shape warped.");await load()
 }catch(e){setMsg(e instanceof Error?e.message:"Warp failed.")}finally{setBusy(false)}}
 if(!r)return <div className="border border-[#60482e]/45 bg-[#100c09] p-4"><button type="button" onClick={onBack} className="text-[9px] uppercase text-[#d6b37d]">Back to Chat</button><p className="mt-3 text-xs text-[#8f8271]">{msg||"Loading Warping..."}</p></div>;
 return <div className="border border-[#60482e]/45 bg-[#100c09] p-4">
  <div className="flex justify-between gap-3"><div><p className="text-[8px] uppercase tracking-[.2em] text-[#806b50]">The Current</p><h3 className="font-serif text-xl text-[#dfc99f]">Warping</h3></div><div className="text-[10px] text-[#a99577]">Warps <b className="text-[#ead1a3]">{r.warps_remaining} / {r.warps_per_day}</b> <button type="button" onClick={onBack} className="ml-3 border border-[#60482e]/55 px-3 py-2 text-[8px] uppercase">Back to Chat</button></div></div>
  {!r.shapes?.length?<p className="mt-4 text-xs text-[#8f8271]">You have no Shapes assigned.</p>:<>
   <select value={s?.id??""} onChange={e=>{setSid(e.target.value);setTargets([]);setDispelCast(null);setDispelTarget(null)}} className="mt-4 w-full border border-[#60482e]/55 bg-[#0f0c09] px-3 py-2 text-[10px] text-[#d8c29b]">{r.shapes.map((x:S)=><option key={x.id} value={x.id}>L{x.level} · {x.name} · {x.word_of_power}</option>)}</select>
   {s?<ShapeInformation shape={s}/>:null}
   {s?.target_mode==="written"?<input value={written} onChange={e=>setWritten(e.target.value)} placeholder="Written / Fate target..." className="mt-3 w-full border border-[#60482e]/55 bg-[#0f0c09] px-3 py-2 text-[10px]"/>:s?.target_mode!=="self"?<div className="mt-3 flex flex-wrap gap-2">{s?.target_mode==="either"?<button type="button" onClick={()=>toggle(r.character_id)} className="border border-[#60482e]/55 px-3 py-2 text-[9px]">Self</button>:null}{presentCharacters.filter(c=>c.id!==r.character_id).map(c=><button key={c.id} type="button" onClick={()=>toggle(c.id)} className={"border px-3 py-2 text-[9px] "+(targets.includes(c.id)?"border-[#b88b50] bg-[#2a1d12]":"border-[#60482e]/55")}>{c.display_name??c.displayName}</button>)}</div>:<p className="mt-3 text-[10px] text-[#9e8b70]">Target: Self · automatic success.</p>}
   <button type="button" disabled={busy||r.warps_remaining<=0} onClick={()=>void warp()} className="mt-4 border border-[#9b7446] bg-[#2a1d12] px-5 py-2 text-[9px] uppercase text-[#ead1a3] disabled:opacity-40">{busy?"Warping...":`Warp ${s?.word_of_power??""}`}</button>
  </>}
  {dispelCast&&dispelTarget?<DispelPicker key={dispelCast} castId={dispelCast} targetCharacterId={dispelTarget.id} targetName={dispelTarget.name} onDone={()=>{setDispelCast(null);setDispelTarget(null)}}/>:null}
  {msg?<p className="mt-3 text-[10px] text-[#c9b18a]">{msg}</p>:null}
 </div>
}
