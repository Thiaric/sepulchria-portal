import {
  requireAdminSection,
} from "@/lib/auth/require-staff";
import { createClient } from "@/lib/supabase/server";
import { ACTION_WORDS,ATTRIBUTES,ESSENCE_WORDS,LAW_WORDS,MOVEMENTS,PRICES,SAVES,WARPING_SCHOOLS } from "@/lib/warping/constants";
import { assignShape,createShape,deleteShape,linkOrderLevel,unlinkOrderLevel,removeAssignment,updateShape } from "./actions";
import { ShapeDeleteSubmit } from "@/components/admin/shape-delete-submit";
import { WarpingReference } from "@/components/admin/warping-reference";
import { ShapeProgression } from "./ShapeProgression";
import { ShapeActionForm } from "./ShapeActionForm";
import type { ShapeActionState } from "./actions";

type Props={searchParams?:Promise<{success?:string;error?:string}>}; type S=Record<string,any>;
const cls="w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-0f0c09))] px-3 py-2 text-[10px] text-[rgb(var(--sep-colour-d8c29b))] outline-none";
const lab="mb-1 block text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-806b50))]";
function Sel({name,value,options,none=false}:{name:string;value?:string|null;options:readonly (readonly [string,...unknown[]])[];none?:boolean}){
  return <select name={name} defaultValue={value??""} className={cls}>{none?<option value="">None</option>:null}{options.map(o=><option key={String(o[0])} value={String(o[0])}>{String(o[1])}</option>)}</select>;
}
function ProfileResolution({
  s,
  p,
}:{
  s?:S;
  p:"self"|"other"|"other_alt";
}){
  const defaultMode=
    p==="other_alt"
      ?"save"
      :"automatic";

  const mode=
    s?.[`${p}_resolution_mode`]??
    (
      s?.resolution_mode??
      defaultMode
    );

  const saves=
    new Set<string>(
      s?.[`${p}_save_options`]??
      s?.save_options??
      [],
    );

  return <div data-resolution-profile className="mb-4 border border-[rgb(var(--sep-colour-60482e))]/25 bg-[rgb(var(--sep-colour-15100d))] p-3">
    <p className="mb-3 text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-806b50))]">Resolution for this effect</p>
    <div className="grid gap-3 md:grid-cols-3">
      <label><span className={lab}>Resolution</span><select name={`${p}_resolution_mode`} data-profile-resolution defaultValue={mode} className={cls}><option value="automatic">Automatic Success</option><option value="save">Save Required</option></select></label>
      <label><span className={lab}>DC Attribute</span><select name={`${p}_dc_attribute`} defaultValue={s?.[`${p}_dc_attribute`]??s?.dc_attribute??""} className={cls}><option value="">None</option>{ATTRIBUTES.map(o=><option key={String(o[0])} value={String(o[0])}>{String(o[1])}</option>)}</select></label>
      <label><span className={lab}>Successful Save</span><select name={`${p}_save_success_damage`} defaultValue={s?.[`${p}_save_success_damage`]??s?.save_success_damage??"none"} className={cls}><option value="none">No effect</option><option value="half">Half damage only</option></select></label>
    </div>
    <div className="mt-3 flex flex-wrap gap-3">{SAVES.map(([v,l])=><label key={v} className="text-[10px] text-[rgb(var(--sep-colour-c6ae88))]"><input className="mr-2" type="checkbox" name={`${p}_save_options`} value={v} defaultChecked={saves.has(v)}/>{l}</label>)}</div>
    {p==="self"?<p className="mt-2 text-[9px] text-[rgb(var(--sep-colour-766a5b))]">Self never opens a Counter popup. If Save is selected here, a self-targeted cast still succeeds immediately against Self.</p>:<p className="mt-2 text-[9px] text-[rgb(var(--sep-colour-766a5b))]">Do Nothing is always available to another Character when this effect requires a Save.</p>}
  </div>;
}

function Profile({s,p,title}:{s?:S;p:"self"|"other"|"other_alt";title:string}){
  const mods=[["muscles","Muscles"],["reflexes","Reflexes"],["vigour","Vigour"],["brains","Brains"],["shrewd","Shrewd"],["presence","Presence"]] as const;
  return <section className="mt-4 border border-[rgb(var(--sep-colour-60482e))]/35 bg-[rgb(var(--sep-colour-100c09))] p-4"><h4 data-other-main-title={p==="other"?"true":undefined} className="font-serif text-lg text-[rgb(var(--sep-colour-d8c29b))]">{title}</h4>
    <div className="mt-3"><ProfileResolution s={s} p={p}/></div>
    <div className="mt-3 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
      <label><span className={lab}>Damage</span><input name={`${p}_damage_dice`} defaultValue={s?.[`${p}_damage_dice`]??""} placeholder="2d6 or 5" className={cls}/></label>
      <label><span className={lab}>Damage Attribute</span><Sel name={`${p}_damage_attribute`} value={s?.[`${p}_damage_attribute`]} options={ATTRIBUTES} none/></label>
      <label><span className={lab}>Current Health +/-</span><input name={`${p}_heal_dice`} defaultValue={s?.[`${p}_heal_dice`]??""} placeholder="+1d8, +4, -1d6, -3" className={cls}/></label>
      <label><span className={lab}>Current Health Attribute</span><Sel name={`${p}_heal_attribute`} value={s?.[`${p}_heal_attribute`]} options={ATTRIBUTES} none/></label>
      <label data-persistent-effect><span className={lab}>Max HP change</span><input name={`${p}_max_hp_change`} defaultValue={s?.[`${p}_max_hp_change`]??""} placeholder="+5 or -2d6" className={cls}/></label>
      <label data-persistent-effect className="md:col-span-2 lg:col-span-3"><span className={lab}>Conditions</span><input name={`${p}_conditions`} defaultValue={(s?.[`${p}_conditions`]??[]).join(", ")} placeholder="Blinded, Poisoned" className={cls}/></label>
    </div><div className="mt-3 grid gap-2 sm:grid-cols-3 lg:grid-cols-6">{mods.map(([k,l])=><label data-persistent-effect key={k}><span className={lab}>{l} +/-</span><input type="number" name={`${p}_${k}_modifier`} defaultValue={s?.[`${p}_${k}_modifier`]??0} className={cls}/></label>)}</div>
  </section>;
}
function ShapeForm({
  s,
  action,
}:{
  s?:S;
  action:(
    previous:ShapeActionState,
    formData:FormData,
  )=>Promise<ShapeActionState>;
}){
  const req=[["muscles","Muscles"],["reflexes","Reflexes"],["vigour","Vigour"],["brains","Brains"],["shrewd","Shrewd"],["presence","Presence"]] as const;
  return <ShapeActionForm action={action} submitLabel={s?"Save Shape":"Create Shape"}><ShapeProgression/>{s?<input type="hidden" name="shape_id" value={s.id}/>:null}
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
    <section className="mt-4 border border-[rgb(var(--sep-colour-60482e))]/35 bg-[rgb(var(--sep-colour-100c09))] p-4"><h4 className="font-serif text-lg text-[rgb(var(--sep-colour-d8c29b))]">Casting</h4>
      <div className="mt-3 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        <label><span className={lab}>Effect Nature</span><select name="effect_nature" data-effect-nature defaultValue={s?.effect_nature??"harmful"} className={cls}><option value="beneficial">Beneficial</option><option value="harmful">Harmful</option><option value="mixed">Mixed</option></select></label>
      </div>
      <div className="mt-3 flex flex-wrap gap-5 text-[10px] text-[rgb(var(--sep-colour-c6ae88))]"><label><input className="mr-2" type="checkbox" name="requires_verbal" defaultChecked={s?s.requires_verbal:true}/>Requires Verbal</label><label><input className="mr-2" type="checkbox" name="requires_movement" defaultChecked={s?s.requires_movement:true}/>Requires Movement</label><label><input className="mr-2" type="checkbox" name="is_dispel" defaultChecked={s?.is_dispel??false}/>Dispel Shape</label><label><input className="mr-2" type="checkbox" name="is_active" defaultChecked={s?s.is_active:true}/>Active</label></div>
    </section>
    <section className="mt-4 border border-[rgb(var(--sep-colour-60482e))]/35 bg-[rgb(var(--sep-colour-100c09))] p-4"><h4 className="font-serif text-lg text-[rgb(var(--sep-colour-d8c29b))]">Targeting / Duration / Price</h4>
      <div className="mt-3 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        <label><span className={lab}>Target</span><select name="target_mode" defaultValue={s?.target_mode??"other"} className={cls}><option value="self">Self</option><option value="other">Other</option><option value="either">Either</option><option value="written">Written / Fate</option></select></label>
        <label><span className={lab}>Count</span><select name="target_scope" defaultValue={s?.target_scope??"single"} className={cls}><option value="single">Single</option><option value="multiple">Multiple</option></select></label>
        <label><span className={lab}>Maximum targets</span><input type="number" min={1} name="max_targets" defaultValue={s?.max_targets??1} className={cls}/></label>
        <label><span className={lab}>Damage Type</span><input name="damage_type" defaultValue={s?.damage_type??""} placeholder="free text" className={cls}/></label>
        <label><span className={lab}>Duration</span><select name="duration_mode" data-shape-duration defaultValue={s?.is_instantaneous?"instantaneous":(s?.duration_unit??"minutes")} className={cls}><option value="instantaneous">Instantaneous</option><option value="minutes">Minutes</option><option value="hours">Hours</option><option value="days">Days</option><option value="until_dispelled">Until Dispelled</option></select><input type="hidden" name="is_instantaneous" value={s?.is_instantaneous?"true":"false"} data-shape-instant/><input type="hidden" name="duration_unit" value={s?.duration_unit??"minutes"} data-shape-duration-unit/></label>
        <label><span className={lab}>How many</span><input type="number" min={1} name="duration_amount" defaultValue={s?.duration_amount??1} className={cls}/></label>
        <label className="md:col-span-2"><span className={lab}>Price</span><Sel name="price_key" value={s?.price_key} options={PRICES} none/></label>
      </div>
    </section>
    <Profile s={s} p="self" title="Self Effect Profile"/><Profile s={s} p="other" title={s?.other_alternative_enabled?"Beneficial Other Effect":"Other Effect Profile"}/>
    <section className="mt-4 border border-[rgb(var(--sep-colour-60482e))]/35 bg-[rgb(var(--sep-colour-100c09))] p-4">
      <label className="text-[10px] text-[rgb(var(--sep-colour-c6ae88))]"><input className="mr-2" type="checkbox" name="other_alternative_enabled" data-alt-other-toggle defaultChecked={s?.other_alternative_enabled??false}/>Separate Beneficial and Harmful effects for Other targets</label>
      <p data-alt-other-help className="mt-2 text-[9px] text-[rgb(var(--sep-colour-806b50))]">When enabled, the normal Other profile above becomes <b>Beneficial Other Effect</b> and the additional profile below is <b>Harmful Other Effect</b>. The caster chooses which branch to use when Warping.</p>
      <div className="mt-4" data-alt-other-profile><Profile s={s} p="other_alt" title="Harmful Other Effect"/></div>
    </section>
    <section className="mt-4 border border-[rgb(var(--sep-colour-60482e))]/35 bg-[rgb(var(--sep-colour-100c09))] p-4"><h4 className="font-serif text-lg text-[rgb(var(--sep-colour-d8c29b))]">Optional Attribute Prerequisites</h4><div className="mt-3 grid gap-2 sm:grid-cols-3 lg:grid-cols-6">{req.map(([k,l])=><label key={k}><span className={lab}>{l} minimum</span><input type="number" min={1} name={`min_${k}`} defaultValue={s?.[`min_${k}`]??""} placeholder="None" className={cls}/></label>)}</div></section>
  </ShapeActionForm>;
}
export default async function AdminShapesPage({searchParams}:Props){
  await requireAdminSection("shapes"); const params=(await searchParams)??{}; const db=await createClient();
  const [sr,cr,lr]=await Promise.all([
    db.from("shapes").select("*,assignments:character_shapes(id,character_id,acquisition_source,level_override),order_links:order_level_shapes(id,order_level_id)").order("level").order("name"),
    db.from("characters").select("id,display_name").eq("status","approved").eq("is_system",false).order("display_name"),
    db.from("order_levels").select("id,level,order:orders(id,name)").order("level",{ascending:true}),
  ]);
  const err=sr.error??cr.error??lr.error;if(err)throw new Error(`Unable to load Shapes: ${err.message}`);
  const shapes=(sr.data??[]) as S[];const chars=(cr.data??[]) as {id:string;display_name:string}[];const charMap=new Map(chars.map(c=>[c.id,c.display_name]));
  const levels=(lr.data??[]).map((r:any)=>{const o=Array.isArray(r.order)?r.order[0]:r.order;return{id:r.id,level:r.level,orderName:o?.name??"Unknown"};});
  return <main className="p-5 sm:p-7 lg:p-9"><div className="mx-auto max-w-7xl"><p className="text-[9px] uppercase tracking-[0.28em] text-[rgb(var(--sep-colour-8c704b))]">Administration</p><h1 className="mt-2 font-serif text-4xl text-[rgb(var(--sep-colour-ead5ac))]">Warping — Shapes</h1>
    <section id="shape-new" className="mt-8 border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))] p-5"><h2 className="font-serif text-2xl text-[rgb(var(--sep-colour-dfc99f))]">Create a Shape</h2><WarpingReference/><ShapeForm action={createShape}/></section>
    <div className="mt-8 space-y-4">{shapes.map(s=><details key={s.id} id={`shape-${s.id}`} className="scroll-mt-6 border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))]">
      <summary className="cursor-pointer list-none px-5 py-4 transition hover:bg-[rgb(var(--sep-colour-1c140e))]"><div className="flex items-center justify-between gap-3"><div className="min-w-0"><p className="text-[8px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-8c704b))]">Level {s.level} · {s.school} · {s.word_of_power}</p><h2 className="mt-1 truncate font-serif text-2xl text-[rgb(var(--sep-colour-dfc99f))]">{s.name}</h2></div><span className="text-[9px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-8c704b))]">Open / Close</span></div></summary>
      <div className="border-t border-[rgb(var(--sep-colour-60482e))]/35 p-5"><div className="flex justify-end"><form action={deleteShape}><input type="hidden" name="shape_id" value={s.id}/><ShapeDeleteSubmit shapeName={s.name}/></form></div>
      <ShapeForm s={s} action={updateShape}/>
      <div className="mt-5 grid gap-4 lg:grid-cols-2"><div className="border border-[rgb(var(--sep-colour-60482e))]/35 p-4"><h3 className="font-serif text-lg text-[rgb(var(--sep-colour-d8c29b))]">Direct Assignment</h3><form action={assignShape} className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto_auto]"><input type="hidden" name="shape_id" value={s.id}/><select required name="character_id" className={cls}><option value="">Character...</option>{chars.map(c=><option key={c.id} value={c.id}>{c.display_name}</option>)}</select><label className="flex items-center gap-2 text-[9px] text-[rgb(var(--sep-colour-c6ae88))]"><input type="checkbox" name="override_level"/>Level override</label><button className="border border-[rgb(var(--sep-colour-765937))] px-3 py-2 text-[8px] uppercase text-[rgb(var(--sep-colour-d6bb8d))]">Assign</button></form><div className="mt-3 space-y-1">{(s.assignments??[]).filter((a:any)=>a.acquisition_source==="staff").map((a:any)=><form key={a.id} action={removeAssignment} className="flex justify-between border-t border-[rgb(var(--sep-colour-60482e))]/25 pt-2"><input type="hidden" name="assignment_id" value={a.id}/><span className="text-[10px] text-[rgb(var(--sep-colour-a99b89))]">{charMap.get(a.character_id)??a.character_id}{a.level_override?" · override":""}</span><button className="text-[8px] uppercase text-red-400">Remove</button></form>)}</div></div>
      <div className="border border-[rgb(var(--sep-colour-60482e))]/35 p-4"><h3 className="font-serif text-lg text-[rgb(var(--sep-colour-d8c29b))]">Order Level Shapes</h3><p className="mt-1 text-[9px] text-[rgb(var(--sep-colour-766a5b))]">Members inherit Shapes from their current Order Level and every lower Level.</p><form action={linkOrderLevel} className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]"><input type="hidden" name="shape_id" value={s.id}/><select required name="order_level_id" className={cls}><option value="">Order Level...</option>{levels.filter((l:any)=>!(s.order_links??[]).some((x:any)=>x.order_level_id===l.id)).map((l:any)=><option key={l.id} value={l.id}>{l.orderName} - Level {l.level}</option>)}</select><button className="border border-[rgb(var(--sep-colour-765937))] px-3 py-2 text-[8px] uppercase text-[rgb(var(--sep-colour-d6bb8d))]">Link</button></form><div className="mt-3 space-y-1">{(s.order_links??[]).map((link:any)=>{const level=levels.find((entry:any)=>entry.id===link.order_level_id);return <form key={link.id??`${s.id}-${link.order_level_id}`} action={unlinkOrderLevel} className="flex items-center justify-between gap-3 border-t border-[rgb(var(--sep-colour-60482e))]/25 pt-2"><input type="hidden" name="shape_id" value={s.id}/><input type="hidden" name="order_level_id" value={link.order_level_id}/><span className="text-[9px] text-[rgb(var(--sep-colour-8f8271))]">{level?`${level.orderName} - Level ${level.level}`:"Unknown Order Level"}</span><button className="text-[8px] uppercase tracking-[0.1em] text-red-300">Unlink</button></form>})}{!(s.order_links??[]).length?<p className="text-[9px] italic text-[rgb(var(--sep-colour-746858))]">Not linked to an Order Level.</p>:null}</div></div></div>
      </div>
    </details>)}</div>
  </div></main>;
}
