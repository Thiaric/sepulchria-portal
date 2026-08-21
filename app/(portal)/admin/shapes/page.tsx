import { requireStaff } from "@/lib/auth/require-staff";
import { createClient } from "@/lib/supabase/server";
import { ACTION_WORDS,ATTRIBUTES,ESSENCE_WORDS,LAW_WORDS,MOVEMENTS,PRICES,SAVES,WARPING_SCHOOLS } from "@/lib/warping/constants";
import { assignShape,createShape,deleteShape,linkOrderLevel,unlinkOrderLevel,removeAssignment,updateShape } from "./actions";
import { ShapeDeleteSubmit } from "@/components/admin/shape-delete-submit";
import { WarpingReference } from "@/components/admin/warping-reference";

type Props={searchParams?:Promise<{success?:string;error?:string}>}; type S=Record<string,any>;
const cls="w-full border border-[#60482e]/55 bg-[#0f0c09] px-3 py-2 text-[10px] text-[#d8c29b] outline-none";
const lab="mb-1 block text-[8px] uppercase tracking-[0.14em] text-[#806b50]";
function Sel({name,value,options,none=false}:{name:string;value?:string|null;options:readonly (readonly [string,...unknown[]])[];none?:boolean}){
  return <select name={name} defaultValue={value??""} className={cls}>{none?<option value="">None</option>:null}{options.map(o=><option key={String(o[0])} value={String(o[0])}>{String(o[1])}</option>)}</select>;
}
function Profile({s,p,title}:{s?:S;p:"self"|"other";title:string}){
  const mods=[["muscles","Muscles"],["reflexes","Reflexes"],["vigour","Vigour"],["brains","Brains"],["shrewd","Shrewd"],["presence","Presence"]] as const;
  return <section className="mt-4 border border-[#60482e]/35 bg-[#100c09] p-4"><h4 className="font-serif text-lg text-[#d8c29b]">{title}</h4>
    <div className="mt-3 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
      <label><span className={lab}>Damage</span><input name={`${p}_damage_dice`} defaultValue={s?.[`${p}_damage_dice`]??""} placeholder="2d6 or 5" className={cls}/></label>
      <label><span className={lab}>Damage Attribute</span><Sel name={`${p}_damage_attribute`} value={s?.[`${p}_damage_attribute`]} options={ATTRIBUTES} none/></label>
      <label><span className={lab}>Healing</span><input name={`${p}_heal_dice`} defaultValue={s?.[`${p}_heal_dice`]??""} placeholder="1d8 or 4" className={cls}/></label>
      <label><span className={lab}>Healing Attribute</span><Sel name={`${p}_heal_attribute`} value={s?.[`${p}_heal_attribute`]} options={ATTRIBUTES} none/></label>
      <label><span className={lab}>Max HP change</span><input name={`${p}_max_hp_change`} defaultValue={s?.[`${p}_max_hp_change`]??""} placeholder="+5 or -2d6" className={cls}/></label>
      <label className="md:col-span-2 lg:col-span-3"><span className={lab}>Conditions</span><input name={`${p}_conditions`} defaultValue={(s?.[`${p}_conditions`]??[]).join(", ")} placeholder="Blinded, Poisoned" className={cls}/></label>
    </div><div className="mt-3 grid gap-2 sm:grid-cols-3 lg:grid-cols-6">{mods.map(([k,l])=><label key={k}><span className={lab}>{l} +/-</span><input type="number" name={`${p}_${k}_modifier`} defaultValue={s?.[`${p}_${k}_modifier`]??0} className={cls}/></label>)}</div>
  </section>;
}
function ShapeForm({s,action}:{s?:S;action:(f:FormData)=>void|Promise<void>}){
  const saves=new Set<string>(s?.save_options??[]); const req=[["muscles","Muscles"],["reflexes","Reflexes"],["vigour","Vigour"],["brains","Brains"],["shrewd","Shrewd"],["presence","Presence"]] as const;
  return <form action={action} className="mt-4">{s?<input type="hidden" name="shape_id" value={s.id}/>:null}
    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
      <label className="lg:col-span-2"><span className={lab}>Name</span><input required name="name" defaultValue={s?.name??""} className={cls}/></label>
      <label><span className={lab}>Level</span><select name="level" defaultValue={s?.level??1} className={cls}>{Array.from({length:9},(_,i)=>i+1).map(v=><option key={v} value={v}>Level {v}</option>)}</select></label>
      <label><span className={lab}>School</span><Sel name="school" value={s?.school??"embercraft"} options={WARPING_SCHOOLS}/></label>
      <label><span className={lab}>Essence</span><Sel name="essence_word" value={s?.essence_word??"Pyr"} options={ESSENCE_WORDS}/></label>
      <label><span className={lab}>Action</span><Sel name="action_word" value={s?.action_word??"Creo"} options={ACTION_WORDS}/></label>
      <label><span className={lab}>Law</span><Sel name="law_word" value={s?.law_word??"Eos"} options={LAW_WORDS}/></label>
      <label><span className={lab}>Movement</span><Sel name="movement" value={s?.movement??"projection"} options={MOVEMENTS}/></label>
      <label className="lg:col-span-4"><span className={lab}>Description / exact specification</span><textarea required rows={4} name="description" defaultValue={s?.description??""} className={cls}/></label>
    </div>
    <section className="mt-4 border border-[#60482e]/35 bg-[#100c09] p-4"><h4 className="font-serif text-lg text-[#d8c29b]">Casting & Resolution</h4>
      <div className="mt-3 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        <label><span className={lab}>Resolution</span><select name="resolution_mode" defaultValue={s?.resolution_mode??"save"} className={cls}><option value="automatic">Automatic Success</option><option value="save">Save</option></select></label>
        <label><span className={lab}>DC Attribute</span><Sel name="dc_attribute" value={s?.dc_attribute} options={ATTRIBUTES} none/></label>
        <label><span className={lab}>Successful Save</span><select name="save_success_damage" defaultValue={s?.save_success_damage??"none"} className={cls}><option value="none">No damage</option><option value="half">Half damage</option></select></label>
        <label><span className={lab}>Effect Nature</span><select name="effect_nature" defaultValue={s?.effect_nature??"harmful"} className={cls}><option value="beneficial">Beneficial</option><option value="harmful">Harmful</option><option value="mixed">Mixed</option></select></label>
      </div><div className="mt-3 flex flex-wrap gap-3">{SAVES.map(([v,l])=><label key={v} className="text-[10px] text-[#c6ae88]"><input className="mr-2" type="checkbox" name="save_options" value={v} defaultChecked={saves.has(v)}/>{l}</label>)}</div>
      <p className="mt-2 text-[9px] text-[#766a5b]">Do nothing is always available in Play.</p>
      <div className="mt-3 flex flex-wrap gap-5 text-[10px] text-[#c6ae88]"><label><input className="mr-2" type="checkbox" name="requires_verbal" defaultChecked={s?s.requires_verbal:true}/>Requires Verbal</label><label><input className="mr-2" type="checkbox" name="requires_movement" defaultChecked={s?s.requires_movement:true}/>Requires Movement</label><label><input className="mr-2" type="checkbox" name="is_dispel" defaultChecked={s?.is_dispel??false}/>Dispel Shape</label><label><input className="mr-2" type="checkbox" name="is_active" defaultChecked={s?s.is_active:true}/>Active</label></div>
    </section>
    <section className="mt-4 border border-[#60482e]/35 bg-[#100c09] p-4"><h4 className="font-serif text-lg text-[#d8c29b]">Targeting / Duration / Price</h4>
      <div className="mt-3 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        <label><span className={lab}>Target</span><select name="target_mode" defaultValue={s?.target_mode??"other"} className={cls}><option value="self">Self</option><option value="other">Other</option><option value="either">Either</option><option value="written">Written / Fate</option></select></label>
        <label><span className={lab}>Count</span><select name="target_scope" defaultValue={s?.target_scope??"single"} className={cls}><option value="single">Single</option><option value="multiple">Multiple</option></select></label>
        <label><span className={lab}>Maximum targets</span><input type="number" min={1} name="max_targets" defaultValue={s?.max_targets??1} className={cls}/></label>
        <label><span className={lab}>Damage Type</span><input name="damage_type" defaultValue={s?.damage_type??""} placeholder="free text" className={cls}/></label>
        <label><span className={lab}>Duration</span><select name="duration_unit" defaultValue={s?.duration_unit??"minutes"} className={cls}><option value="minutes">Minutes</option><option value="hours">Hours</option><option value="days">Days</option><option value="until_dispelled">Until Dispelled</option></select></label>
        <label><span className={lab}>How many</span><input type="number" min={1} name="duration_amount" defaultValue={s?.duration_amount??1} className={cls}/></label>
        <label className="md:col-span-2"><span className={lab}>Price</span><Sel name="price_key" value={s?.price_key} options={PRICES} none/></label>
      </div>
    </section>
    <Profile s={s} p="self" title="Self Effect Profile"/><Profile s={s} p="other" title="Other Effect Profile"/>
    <section className="mt-4 border border-[#60482e]/35 bg-[#100c09] p-4"><h4 className="font-serif text-lg text-[#d8c29b]">Optional Attribute Prerequisites</h4><div className="mt-3 grid gap-2 sm:grid-cols-3 lg:grid-cols-6">{req.map(([k,l])=><label key={k}><span className={lab}>{l} minimum</span><input type="number" min={1} name={`min_${k}`} defaultValue={s?.[`min_${k}`]??""} placeholder="None" className={cls}/></label>)}</div></section>
    <button className="mt-4 border border-[#9b7446] bg-[#2a1d12] px-4 py-2 text-[9px] uppercase tracking-[0.16em] text-[#ead1a3]">{s?"Save Shape":"Create Shape"}</button>
  </form>;
}
export default async function AdminShapesPage({searchParams}:Props){
  await requireStaff(); const params=(await searchParams)??{}; const db=await createClient();
  const [sr,cr,lr]=await Promise.all([
    db.from("shapes").select("*,assignments:character_shapes(id,character_id,acquisition_source,level_override),order_links:order_level_shapes(id,order_level_id)").order("level").order("name"),
    db.from("characters").select("id,display_name").eq("status","approved").eq("is_system",false).order("display_name"),
    db.from("order_levels").select("id,level,order:orders(id,name)").order("level",{ascending:true}),
  ]);
  const err=sr.error??cr.error??lr.error;if(err)throw new Error(`Unable to load Shapes: ${err.message}`);
  const shapes=(sr.data??[]) as S[];const chars=(cr.data??[]) as {id:string;display_name:string}[];const charMap=new Map(chars.map(c=>[c.id,c.display_name]));
  const levels=(lr.data??[]).map((r:any)=>{const o=Array.isArray(r.order)?r.order[0]:r.order;return{id:r.id,level:r.level,orderName:o?.name??"Unknown"};});
  return <main className="p-5 sm:p-7 lg:p-9"><div className="mx-auto max-w-7xl"><p className="text-[9px] uppercase tracking-[0.28em] text-[#8c704b]">Administration</p><h1 className="mt-2 font-serif text-4xl text-[#ead5ac]">Warping — Shapes</h1>
    {params.success?<div className="mt-5 border border-emerald-800/50 p-3 text-sm text-emerald-400">{params.success}</div>:null}{params.error?<div className="mt-5 border border-red-900/60 p-3 text-sm text-red-400">{params.error}</div>:null}
    <section id="shape-new" className="mt-8 border border-[#60482e]/45 bg-[#15100d] p-5"><h2 className="font-serif text-2xl text-[#dfc99f]">Create a Shape</h2><WarpingReference/><ShapeForm action={createShape}/></section>
    <div className="mt-8 space-y-4">{shapes.map(s=><details key={s.id} id={`shape-${s.id}`} className="scroll-mt-6 border border-[#60482e]/45 bg-[#15100d]">
      <summary className="cursor-pointer list-none px-5 py-4 transition hover:bg-[#1c140e]"><div className="flex items-center justify-between gap-3"><div className="min-w-0"><p className="text-[8px] uppercase tracking-[0.16em] text-[#8c704b]">Level {s.level} · {s.school} · {s.word_of_power}</p><h2 className="mt-1 truncate font-serif text-2xl text-[#dfc99f]">{s.name}</h2></div><span className="text-[9px] uppercase tracking-[0.14em] text-[#8c704b]">Open / Close</span></div></summary>
      <div className="border-t border-[#60482e]/35 p-5"><div className="flex justify-end"><form action={deleteShape}><input type="hidden" name="shape_id" value={s.id}/><ShapeDeleteSubmit shapeName={s.name}/></form></div>
      <ShapeForm s={s} action={updateShape}/>
      <div className="mt-5 grid gap-4 lg:grid-cols-2"><div className="border border-[#60482e]/35 p-4"><h3 className="font-serif text-lg text-[#d8c29b]">Direct Assignment</h3><form action={assignShape} className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto_auto]"><input type="hidden" name="shape_id" value={s.id}/><select required name="character_id" className={cls}><option value="">Character...</option>{chars.map(c=><option key={c.id} value={c.id}>{c.display_name}</option>)}</select><label className="flex items-center gap-2 text-[9px] text-[#c6ae88]"><input type="checkbox" name="override_level"/>Level override</label><button className="border border-[#765937] px-3 py-2 text-[8px] uppercase text-[#d6bb8d]">Assign</button></form><div className="mt-3 space-y-1">{(s.assignments??[]).filter((a:any)=>a.acquisition_source==="staff").map((a:any)=><form key={a.id} action={removeAssignment} className="flex justify-between border-t border-[#60482e]/25 pt-2"><input type="hidden" name="assignment_id" value={a.id}/><span className="text-[10px] text-[#a99b89]">{charMap.get(a.character_id)??a.character_id}{a.level_override?" · override":""}</span><button className="text-[8px] uppercase text-red-400">Remove</button></form>)}</div></div>
      <div className="border border-[#60482e]/35 p-4"><h3 className="font-serif text-lg text-[#d8c29b]">Order Role Shape</h3><form action={linkOrderLevel} className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]"><input type="hidden" name="shape_id" value={s.id}/><select required name="order_level_id" className={cls}><option value="">Order Level...</option>{levels.filter((l:any)=>!(s.order_links??[]).some((x:any)=>x.order_level_id===l.id)).map((l:any)=><option key={l.id} value={l.id}>{l.orderName} - Level {l.level}</option>)}</select><button className="border border-[#765937] px-3 py-2 text-[8px] uppercase text-[#d6bb8d]">Link</button></form></div></div>
      </div>
    </details>)}</div>
  </div></main>;
}
