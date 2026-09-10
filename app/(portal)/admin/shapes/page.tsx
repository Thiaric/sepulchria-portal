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
import {
  shapeSchoolBorderClass,
} from "@/lib/warping/shape-school-style";
import {
  RichTextEditor,
} from "@/components/editor/rich-text-editor";

type Props={searchParams?:Promise<{success?:string;error?:string}>}; type S=Record<string,any>;
const cls="w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-0f0c09))] px-3 py-2 text-[10px] text-[rgb(var(--sep-colour-d8c29b))] outline-none";
const lab="mb-1 block text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-806b50))]";
function Sel({name,value,options,none=false}:{name:string;value?:string|null;options:readonly (readonly [string,...unknown[]])[];none?:boolean}){
  return <select name={name} defaultValue={value??""} className={[((cls)), "admin_shapes_page_select_select"].filter(Boolean).join(" ")}>{none?<option className="admin_shapes_page_option_option" value="">None</option>:null}{options.map(o=><option className="admin_shapes_page_option_option_2" key={String(o[0])} value={String(o[0])}>{String(o[1])}</option>)}</select>;
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

  return <div data-resolution-profile className="mb-4 border border-[rgb(var(--sep-colour-60482e))]/25 bg-[rgb(var(--sep-colour-15100d))] p-3 admin_shapes_page_div_container">
    <p className="mb-3 text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-806b50))] admin_shapes_page_p_text">Resolution for this effect</p>
    <div className="grid gap-3 md:grid-cols-3 admin_shapes_page_div_container_2">
      <label className="admin_shapes_page_label_label"><span className={[((lab)), "admin_shapes_page_span_text"].filter(Boolean).join(" ")}>Resolution</span><select name={`${p}_resolution_mode`} data-profile-resolution defaultValue={mode} className={[((cls)), "admin_shapes_page_select_select_2"].filter(Boolean).join(" ")}><option className="admin_shapes_page_option_automatic" value="automatic">Automatic Success</option><option className="admin_shapes_page_option_save" value="save">Save Required</option></select></label>
      <label className="admin_shapes_page_label_label_2"><span className={[((lab)), "admin_shapes_page_span_text_2"].filter(Boolean).join(" ")}>DC Attribute</span><select name={`${p}_dc_attribute`} defaultValue={s?.[`${p}_dc_attribute`]??s?.dc_attribute??""} className={[((cls)), "admin_shapes_page_select_select_3"].filter(Boolean).join(" ")}><option className="admin_shapes_page_option_option_3" value="">None</option>{ATTRIBUTES.map(o=><option className="admin_shapes_page_option_option_4" key={String(o[0])} value={String(o[0])}>{String(o[1])}</option>)}</select></label>
      <label className="admin_shapes_page_label_label_3"><span className={[((lab)), "admin_shapes_page_span_text_3"].filter(Boolean).join(" ")}>Successful Save</span><select name={`${p}_save_success_damage`} defaultValue={s?.[`${p}_save_success_damage`]??s?.save_success_damage??"none"} className={[((cls)), "admin_shapes_page_select_select_4"].filter(Boolean).join(" ")}><option className="admin_shapes_page_option_none" value="none">No effect</option><option className="admin_shapes_page_option_half" value="half">Half damage only</option></select></label>
    </div>
    <div className="mt-3 flex flex-wrap gap-3 admin_shapes_page_div_container_3">{SAVES.map(([v,l])=><label key={v} className="text-[10px] text-[rgb(var(--sep-colour-c6ae88))] admin_shapes_page_label_label_4"><input className="mr-2 admin_shapes_page_input_field" type="checkbox" name={`${p}_save_options`} value={v} defaultChecked={saves.has(v)}/>{l}</label>)}</div>
    {p==="self"?<p className="mt-2 text-[9px] text-[rgb(var(--sep-colour-766a5b))] admin_shapes_page_p_text_2">Self never opens a Counter popup. If Save is selected here, a self-targeted cast still succeeds immediately against Self.</p>:<p className="mt-2 text-[9px] text-[rgb(var(--sep-colour-766a5b))] admin_shapes_page_p_text_3">Do Nothing is always available to another Character when this effect requires a Save.</p>}
  </div>;
}

function Profile({s,p,title}:{s?:S;p:"self"|"other"|"other_alt";title:string}){
  const mods=[["muscles","Muscles"],["reflexes","Reflexes"],["vigour","Vigour"],["brains","Brains"],["shrewd","Shrewd"],["presence","Presence"]] as const;
  return <section className="mt-4 border border-[rgb(var(--sep-colour-60482e))]/35 bg-[rgb(var(--sep-colour-100c09))] p-4 admin_shapes_page_section_section"><h4 data-other-main-title={p==="other"?"true":undefined} className="font-serif text-lg text-[rgb(var(--sep-colour-d8c29b))] admin_shapes_page_h4_heading">{title}</h4>
    <div className="mt-3 admin_shapes_page_div_container_4"><ProfileResolution s={s} p={p}/></div>
    <div className="mt-3 grid gap-3 md:grid-cols-2 lg:grid-cols-4 admin_shapes_page_div_container_5">
      <label className="admin_shapes_page_label_label_5"><span className={[((lab)), "admin_shapes_page_span_text_4"].filter(Boolean).join(" ")}>Damage</span><input name={`${p}_damage_dice`} defaultValue={s?.[`${p}_damage_dice`]??""} placeholder="2d6 or 5" className={[((cls)), "admin_shapes_page_input_2d6_5"].filter(Boolean).join(" ")}/></label>
      <label className="admin_shapes_page_label_label_6"><span className={[((lab)), "admin_shapes_page_span_text_5"].filter(Boolean).join(" ")}>Damage Attribute</span><Sel name={`${p}_damage_attribute`} value={s?.[`${p}_damage_attribute`]} options={ATTRIBUTES} none/></label>
      <label className="admin_shapes_page_label_label_7"><span className={[((lab)), "admin_shapes_page_span_text_6"].filter(Boolean).join(" ")}>Current Health +/-</span><input name={`${p}_heal_dice`} defaultValue={s?.[`${p}_heal_dice`]??""} placeholder="+1d8, +4, -1d6, -3" className={[((cls)), "admin_shapes_page_input_1d8_4_1d6_3"].filter(Boolean).join(" ")}/></label>
      <label className="admin_shapes_page_label_label_8"><span className={[((lab)), "admin_shapes_page_span_text_7"].filter(Boolean).join(" ")}>Current Health Attribute</span><Sel name={`${p}_heal_attribute`} value={s?.[`${p}_heal_attribute`]} options={ATTRIBUTES} none/></label>
      <label className="admin_shapes_page_label_label_9" data-persistent-effect><span className={[((lab)), "admin_shapes_page_span_text_8"].filter(Boolean).join(" ")}>Max HP change</span><input name={`${p}_max_hp_change`} defaultValue={s?.[`${p}_max_hp_change`]??""} placeholder="+5 or -2d6" className={[((cls)), "admin_shapes_page_input_5_2d6"].filter(Boolean).join(" ")}/></label>
      <label data-persistent-effect className="md:col-span-2 lg:col-span-3 admin_shapes_page_label_label_10"><span className={[((lab)), "admin_shapes_page_span_text_9"].filter(Boolean).join(" ")}>Conditions</span><input name={`${p}_conditions`} defaultValue={(s?.[`${p}_conditions`]??[]).join(", ")} placeholder="Blinded, Poisoned" className={[((cls)), "admin_shapes_page_input_blinded_poisoned"].filter(Boolean).join(" ")}/></label>
    </div><div className="mt-3 grid gap-2 sm:grid-cols-3 lg:grid-cols-6 admin_shapes_page_div_container_6">{mods.map(([k,l])=><label className="admin_shapes_page_label_label_11" data-persistent-effect key={k}><span className={[((lab)), "admin_shapes_page_span_text_10"].filter(Boolean).join(" ")}>{l} +/-</span><input type="number" name={`${p}_${k}_modifier`} defaultValue={s?.[`${p}_${k}_modifier`]??0} className={[((cls)), "admin_shapes_page_input_field_2"].filter(Boolean).join(" ")}/></label>)}</div>
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
  return <ShapeActionForm action={action} submitLabel={s?"Save Shape":"Create Shape"}><ShapeProgression/>{s?<input className="admin_shapes_page_input_shape_id" type="hidden" name="shape_id" value={s.id}/>:null}
    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4 admin_shapes_page_div_container_7">
      <label className="lg:col-span-2 admin_shapes_page_label_label_12"><span className={[((lab)), "admin_shapes_page_span_text_11"].filter(Boolean).join(" ")}>Name</span><input required name="name" defaultValue={s?.name??""} className={[((cls)), "admin_shapes_page_input_name"].filter(Boolean).join(" ")}/></label>
      <label className="admin_shapes_page_label_label_13"><span className={[((lab)), "admin_shapes_page_span_text_12"].filter(Boolean).join(" ")}>Level</span><select name="level" defaultValue={s?.level??1} className={[((cls)), "admin_shapes_page_select_level"].filter(Boolean).join(" ")}>{Array.from({length:9},(_,i)=>i+1).map(v=><option className="admin_shapes_page_option_level" key={v} value={v}>Level {v}</option>)}</select></label>
      <label className="admin_shapes_page_label_label_14"><span className={[((lab)), "admin_shapes_page_span_text_13"].filter(Boolean).join(" ")}>School</span><Sel name="school" value={s?.school??"embercraft"} options={WARPING_SCHOOLS}/></label>
      <label className="admin_shapes_page_label_label_15"><span className={[((lab)), "admin_shapes_page_span_text_14"].filter(Boolean).join(" ")}>Essence</span><Sel name="essence_word" value={s?.essence_word??"Pyr"} options={ESSENCE_WORDS}/></label>
      <label className="admin_shapes_page_label_label_16"><span className={[((lab)), "admin_shapes_page_span_text_15"].filter(Boolean).join(" ")}>Action</span><Sel name="action_word" value={s?.action_word??"Creo"} options={ACTION_WORDS}/></label>
      <label className="admin_shapes_page_label_label_17"><span className={[((lab)), "admin_shapes_page_span_text_16"].filter(Boolean).join(" ")}>Law</span><Sel name="law_word" value={s?.law_word??"Eos"} options={LAW_WORDS}/></label>
      <label className="admin_shapes_page_label_label_18"><span className={[((lab)), "admin_shapes_page_span_text_17"].filter(Boolean).join(" ")}>Movement</span><Sel name="movement" value={s?.movement??"projection"} options={MOVEMENTS}/></label>
      <label className="lg:col-span-4 admin_shapes_page_label_label_19"><span className={[((lab)), "admin_shapes_page_span_text_18"].filter(Boolean).join(" ")}>Description / exact specification</span><textarea required rows={4} name="description" defaultValue={s?.description??""} className={[((cls)), "admin_shapes_page_textarea_description"].filter(Boolean).join(" ")}/></label>

      <div className="lg:col-span-4 admin_shapes_page_div_container_8">
        <div className="mb-1 flex flex-wrap items-center justify-between gap-2 admin_shapes_page_div_container_9">
          <span className={[((lab)), "admin_shapes_page_span_text_19"].filter(Boolean).join(" ")}>Extended Description</span>
          <span className="text-[7px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-756957))] admin_shapes_page_span_text_20">Optional · not posted in chat</span>
        </div>

        <RichTextEditor
          name="extended_description"
          defaultValue={s?.extended_description??""}
          minHeight={180}
          maxTextLength={50000}
          placeholder="Optional extended lore, explanation, examples, flavour text..."
          variant="lore"
        />
      </div>
    </div>
    <section className="mt-4 border border-[rgb(var(--sep-colour-60482e))]/35 bg-[rgb(var(--sep-colour-100c09))] p-4 admin_shapes_page_section_casting"><h4 className="font-serif text-lg text-[rgb(var(--sep-colour-d8c29b))] admin_shapes_page_h4_casting">Casting</h4>
      <div className="mt-3 grid gap-3 md:grid-cols-2 lg:grid-cols-4 admin_shapes_page_div_casting">
        <label className="admin_shapes_page_label_casting"><span className={[((lab)), "admin_shapes_page_span_casting"].filter(Boolean).join(" ")}>Effect Nature</span><select name="effect_nature" data-effect-nature defaultValue={s?.effect_nature??"harmful"} className={[((cls)), "admin_shapes_page_select_effect_nature"].filter(Boolean).join(" ")}><option className="admin_shapes_page_option_beneficial" value="beneficial">Beneficial</option><option className="admin_shapes_page_option_harmful" value="harmful">Harmful</option><option className="admin_shapes_page_option_mixed" value="mixed">Mixed</option></select></label>
      </div>
      <div className="mt-3 flex flex-wrap gap-5 text-[10px] text-[rgb(var(--sep-colour-c6ae88))] admin_shapes_page_div_requires_verbal"><label className="admin_shapes_page_label_requires_verbal"><input className="mr-2 admin_shapes_page_input_requires_verbal" type="checkbox" name="requires_verbal" defaultChecked={s?s.requires_verbal:true}/>Requires Verbal</label><label className="admin_shapes_page_label_requires_verbal_2"><input className="mr-2 admin_shapes_page_input_requires_movement" type="checkbox" name="requires_movement" defaultChecked={s?s.requires_movement:true}/>Requires Movement</label><label className="admin_shapes_page_label_requires_verbal_3"><input className="mr-2 admin_shapes_page_input_dispel" type="checkbox" name="is_dispel" defaultChecked={s?.is_dispel??false}/>Dispel Shape</label><label className="admin_shapes_page_label_requires_verbal_4"><input className="mr-2 admin_shapes_page_input_active" type="checkbox" name="is_active" defaultChecked={s?s.is_active:true}/>Active</label></div>
    </section>
    <section className="mt-4 border border-[rgb(var(--sep-colour-60482e))]/35 bg-[rgb(var(--sep-colour-100c09))] p-4 admin_shapes_page_section_targeting_duration_price"><h4 className="font-serif text-lg text-[rgb(var(--sep-colour-d8c29b))] admin_shapes_page_h4_targeting_duration_price">Targeting / Duration / Price</h4>
      <div className="mt-3 grid gap-3 md:grid-cols-2 lg:grid-cols-4 admin_shapes_page_div_targeting_duration_price">
        <label className="admin_shapes_page_label_targeting_duration_price"><span className={[((lab)), "admin_shapes_page_span_targeting_duration_price"].filter(Boolean).join(" ")}>Target</span><select name="target_mode" defaultValue={s?.target_mode??"other"} className={[((cls)), "admin_shapes_page_select_targeting_duration_price"].filter(Boolean).join(" ")}><option className="admin_shapes_page_option_self" value="self">Self</option><option className="admin_shapes_page_option_other" value="other">Other</option><option className="admin_shapes_page_option_either" value="either">Either</option><option className="admin_shapes_page_option_written" value="written">Written / Fate</option></select></label>
        <label className="admin_shapes_page_label_targeting_duration_price_2"><span className={[((lab)), "admin_shapes_page_span_targeting_duration_price_2"].filter(Boolean).join(" ")}>Count</span><select name="target_scope" defaultValue={s?.target_scope??"single"} className={[((cls)), "admin_shapes_page_select_targeting_duration_price_2"].filter(Boolean).join(" ")}><option className="admin_shapes_page_option_single" value="single">Single</option><option className="admin_shapes_page_option_multiple" value="multiple">Multiple</option></select></label>
        <label className="admin_shapes_page_label_targeting_duration_price_3"><span className={[((lab)), "admin_shapes_page_span_targeting_duration_price_3"].filter(Boolean).join(" ")}>Maximum targets</span><input type="number" min={1} name="max_targets" defaultValue={s?.max_targets??1} className={[((cls)), "admin_shapes_page_input_targeting_duration_price"].filter(Boolean).join(" ")}/></label>
        <label className="admin_shapes_page_label_targeting_duration_price_4"><span className={[((lab)), "admin_shapes_page_span_targeting_duration_price_4"].filter(Boolean).join(" ")}>Damage Type</span><input name="damage_type" defaultValue={s?.damage_type??""} placeholder="free text" className={[((cls)), "admin_shapes_page_input_damage_type"].filter(Boolean).join(" ")}/></label>
        <label className="admin_shapes_page_label_targeting_duration_price_5"><span className={[((lab)), "admin_shapes_page_span_targeting_duration_price_5"].filter(Boolean).join(" ")}>Duration</span><select name="duration_mode" data-shape-duration defaultValue={s?.is_instantaneous?"instantaneous":(s?.duration_unit??"minutes")} className={[((cls)), "admin_shapes_page_select_duration_mode"].filter(Boolean).join(" ")}><option className="admin_shapes_page_option_instantaneous" value="instantaneous">Instantaneous</option><option className="admin_shapes_page_option_minutes" value="minutes">Minutes</option><option className="admin_shapes_page_option_hours" value="hours">Hours</option><option className="admin_shapes_page_option_days" value="days">Days</option><option className="admin_shapes_page_option_until_dispelled" value="until_dispelled">Until Dispelled</option></select><input className="admin_shapes_page_input_instantaneous" type="hidden" name="is_instantaneous" value={s?.is_instantaneous?"true":"false"} data-shape-instant/><input className="admin_shapes_page_input_duration_unit" type="hidden" name="duration_unit" value={s?.duration_unit??"minutes"} data-shape-duration-unit/></label>
        <label className="admin_shapes_page_label_targeting_duration_price_6"><span className={[((lab)), "admin_shapes_page_span_targeting_duration_price_6"].filter(Boolean).join(" ")}>How many</span><input type="number" min={1} name="duration_amount" defaultValue={s?.duration_amount??1} className={[((cls)), "admin_shapes_page_input_duration_amount"].filter(Boolean).join(" ")}/></label>
        <label className="md:col-span-2 admin_shapes_page_label_targeting_duration_price_7"><span className={[((lab)), "admin_shapes_page_span_targeting_duration_price_7"].filter(Boolean).join(" ")}>Price</span><Sel name="price_key" value={s?.price_key} options={PRICES} none/></label>
      </div>
    </section>
    <Profile s={s} p="self" title="Self Effect Profile"/><Profile s={s} p="other" title={s?.other_alternative_enabled?"Beneficial Other Effect":"Other Effect Profile"}/>
    <section className="mt-4 border border-[rgb(var(--sep-colour-60482e))]/35 bg-[rgb(var(--sep-colour-100c09))] p-4 admin_shapes_page_section_separate_beneficial_harmful_effects">
      <label className="text-[10px] text-[rgb(var(--sep-colour-c6ae88))] admin_shapes_page_label_separate_beneficial_harmful_effects"><input className="mr-2 admin_shapes_page_input_other_alternative_enabled" type="checkbox" name="other_alternative_enabled" data-alt-other-toggle defaultChecked={s?.other_alternative_enabled??false}/>Separate Beneficial and Harmful effects for Other targets</label>
      <p data-alt-other-help className="mt-2 text-[9px] text-[rgb(var(--sep-colour-806b50))] admin_shapes_page_p_separate_beneficial_harmful_effects">When enabled, the normal Other profile above becomes <b>Beneficial Other Effect</b> and the additional profile below is <b>Harmful Other Effect</b>. The caster chooses which branch to use when Warping.</p>
      <div className="mt-4 admin_shapes_page_div_separate_beneficial_harmful_effects" data-alt-other-profile><Profile s={s} p="other_alt" title="Harmful Other Effect"/></div>
    </section>
    <section className="mt-4 border border-[rgb(var(--sep-colour-60482e))]/35 bg-[rgb(var(--sep-colour-100c09))] p-4 admin_shapes_page_section_optional_attribute_prerequisites"><h4 className="font-serif text-lg text-[rgb(var(--sep-colour-d8c29b))] admin_shapes_page_h4_optional_attribute_prerequisites">Optional Attribute Prerequisites</h4><div className="mt-3 grid gap-2 sm:grid-cols-3 lg:grid-cols-6 admin_shapes_page_div_optional_attribute_prerequisites">{req.map(([k,l])=><label className="admin_shapes_page_label_label_20" key={k}><span className={[((lab)), "admin_shapes_page_span_text_21"].filter(Boolean).join(" ")}>{l} minimum</span><input type="number" min={1} name={`min_${k}`} defaultValue={s?.[`min_${k}`]??""} placeholder="None" className={[((cls)), "admin_shapes_page_input_none"].filter(Boolean).join(" ")}/></label>)}</div></section>
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
  return <main className="p-5 sm:p-7 lg:p-9 admin_shapes_page_main_main"><div className="mx-auto max-w-7xl admin_shapes_page_div_warping_shapes"><p className="text-[9px] uppercase tracking-[0.28em] text-[rgb(var(--sep-colour-8c704b))] admin_shapes_page_p_warping_shapes">Administration</p><h1 className="mt-2 font-serif text-4xl text-[rgb(var(--sep-colour-ead5ac))] admin_shapes_page_h1_warping_shapes">Warping — Shapes</h1>
    <section id="shape-new" className="mt-8 border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))] p-5 admin_shapes_page_section_shape_new"><h2 className="font-serif text-2xl text-[rgb(var(--sep-colour-dfc99f))] admin_shapes_page_h2_shape_new">Create a Shape</h2><WarpingReference/><ShapeForm action={createShape}/></section>
    <div className="mt-8 space-y-4 admin_shapes_page_div_warping_shapes_2">{shapes.map(s=><details key={s.id} id={`shape-${s.id}`} className={[((`scroll-mt-6 border bg-[rgb(var(--sep-colour-15100d))] transition-[border-color,box-shadow] duration-200 ${shapeSchoolBorderClass(
        s.school,
      )}`)), "admin_shapes_page_details_details"].filter(Boolean).join(" ")}>
      <summary className="cursor-pointer list-none px-5 py-4 transition hover:bg-[rgb(var(--sep-colour-1c140e))] admin_shapes_page_summary_summary"><div className="flex items-center justify-between gap-3 admin_shapes_page_div_container_10"><div className="min-w-0 admin_shapes_page_div_container_11"><p className="text-[8px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-8c704b))] admin_shapes_page_p_text_4">Level {s.level} · {s.school} · {s.word_of_power}</p><h2 className="mt-1 truncate font-serif text-2xl text-[rgb(var(--sep-colour-dfc99f))] admin_shapes_page_h2_heading">{s.name}</h2></div><span className="text-[9px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-8c704b))] admin_shapes_page_span_text_22">Open / Close</span></div></summary>
      <div className="border-t border-[rgb(var(--sep-colour-60482e))]/35 p-5 admin_shapes_page_div_container_12"><div className="flex justify-end admin_shapes_page_div_container_13"><form className="admin_shapes_page_form_delete_shape" action={deleteShape}><input className="admin_shapes_page_input_shape_id_2" type="hidden" name="shape_id" value={s.id}/><ShapeDeleteSubmit shapeName={s.name}/></form></div>
      <ShapeForm s={s} action={updateShape}/>
      <div className="mt-5 grid gap-4 lg:grid-cols-2 admin_shapes_page_div_container_14"><div className="border border-[rgb(var(--sep-colour-60482e))]/35 p-4 admin_shapes_page_div_direct_assignment"><h3 className="font-serif text-lg text-[rgb(var(--sep-colour-d8c29b))] admin_shapes_page_h3_direct_assignment">Direct Assignment</h3><form action={assignShape} className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto_auto] admin_shapes_page_form_assign_shape"><input className="admin_shapes_page_input_shape_id_3" type="hidden" name="shape_id" value={s.id}/><select required name="character_id" className={[((cls)), "admin_shapes_page_select_character_id"].filter(Boolean).join(" ")}><option className="admin_shapes_page_option_character_id" value="">Character...</option>{chars.map(c=><option className="admin_shapes_page_option_character_id_2" key={c.id} value={c.id}>{c.display_name}</option>)}</select><label className="flex items-center gap-2 text-[9px] text-[rgb(var(--sep-colour-c6ae88))] admin_shapes_page_label_level_override"><input className="admin_shapes_page_input_override_level" type="checkbox" name="override_level"/>Level override</label><button className="border border-[rgb(var(--sep-colour-765937))] px-3 py-2 text-[8px] uppercase text-[rgb(var(--sep-colour-d6bb8d))] admin_shapes_page_button_assign">Assign</button></form><div className="mt-3 space-y-1 admin_shapes_page_div_direct_assignment_2">{(s.assignments??[]).filter((a:any)=>a.acquisition_source==="staff").map((a:any)=><form key={a.id} action={removeAssignment} className="flex justify-between border-t border-[rgb(var(--sep-colour-60482e))]/25 pt-2 admin_shapes_page_form_remove_assignment"><input className="admin_shapes_page_input_assignment_id" type="hidden" name="assignment_id" value={a.id}/><span className="text-[10px] text-[rgb(var(--sep-colour-a99b89))] admin_shapes_page_span_text_23">{charMap.get(a.character_id)??a.character_id}{a.level_override?" · override":""}</span><button className="text-[8px] uppercase text-red-400 admin_shapes_page_button_remove">Remove</button></form>)}</div></div>
      <div className="border border-[rgb(var(--sep-colour-60482e))]/35 p-4 admin_shapes_page_div_order_level_shapes"><h3 className="font-serif text-lg text-[rgb(var(--sep-colour-d8c29b))] admin_shapes_page_h3_order_level_shapes">Order Level Shapes</h3><p className="mt-1 text-[9px] text-[rgb(var(--sep-colour-766a5b))] admin_shapes_page_p_order_level_shapes">Members inherit Shapes from their current Order Level and every lower Level.</p><form action={linkOrderLevel} className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto] admin_shapes_page_form_link_order_level"><input className="admin_shapes_page_input_shape_id_4" type="hidden" name="shape_id" value={s.id}/><select required name="order_level_id" className={[((cls)), "admin_shapes_page_select_order_level_id"].filter(Boolean).join(" ")}><option className="admin_shapes_page_option_order_level_id" value="">Order Level...</option>{levels.filter((l:any)=>!(s.order_links??[]).some((x:any)=>x.order_level_id===l.id)).map((l:any)=><option className="admin_shapes_page_option_order_level_id_2" key={l.id} value={l.id}>{l.orderName} - Level {l.level}</option>)}</select><button className="border border-[rgb(var(--sep-colour-765937))] px-3 py-2 text-[8px] uppercase text-[rgb(var(--sep-colour-d6bb8d))] admin_shapes_page_button_link">Link</button></form><div className="mt-3 space-y-1 admin_shapes_page_div_order_level_shapes_2">{(s.order_links??[]).map((link:any)=>{const level=levels.find((entry:any)=>entry.id===link.order_level_id);return <form key={link.id??`${s.id}-${link.order_level_id}`} action={unlinkOrderLevel} className="flex items-center justify-between gap-3 border-t border-[rgb(var(--sep-colour-60482e))]/25 pt-2 admin_shapes_page_form_unlink_order_level"><input className="admin_shapes_page_input_shape_id_5" type="hidden" name="shape_id" value={s.id}/><input className="admin_shapes_page_input_order_level_id" type="hidden" name="order_level_id" value={link.order_level_id}/><span className="text-[9px] text-[rgb(var(--sep-colour-8f8271))] admin_shapes_page_span_text_24">{level?`${level.orderName} - Level ${level.level}`:"Unknown Order Level"}</span><button className="text-[8px] uppercase tracking-[0.1em] text-red-300 admin_shapes_page_button_unlink">Unlink</button></form>})}{!(s.order_links??[]).length?<p className="text-[9px] italic text-[rgb(var(--sep-colour-746858))] admin_shapes_page_p_order_level_shapes_2">Not linked to an Order Level.</p>:null}</div></div></div>
      </div>
    </details>)}</div>
  </div></main>;
}
