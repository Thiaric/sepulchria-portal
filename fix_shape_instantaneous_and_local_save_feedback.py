from pathlib import Path

ROOT = Path.cwd()

ACTIONS = ROOT / "app/(portal)/admin/shapes/actions.ts"
PAGE = ROOT / "app/(portal)/admin/shapes/page.tsx"
LOCAL_FORM = ROOT / "app/(portal)/admin/shapes/ShapeActionForm.tsx"

def fail(message: str) -> None:
    raise SystemExit(f"ERROR: {message}\nNo changes were applied.")

for path in (ACTIONS, PAGE):
    if not path.exists():
        fail(f"Missing expected file: {path.relative_to(ROOT)}")

actions = ACTIONS.read_text(encoding="utf-8")
page = PAGE.read_text(encoding="utf-8")

old_duration_setup = '''  const instantaneous=txt(f,"is_instantaneous")==="true";
  const unit=txt(f,"duration_unit")||"minutes";
'''

new_duration_setup = '''  const durationMode=
    txt(f,"duration_mode")||
    txt(f,"duration_unit")||
    "minutes";

  const instantaneous=
    durationMode==="instantaneous";

  const unit=
    instantaneous
      ?"minutes"
      :durationMode;
'''

if old_duration_setup not in actions:
    fail("Could not find current Shape duration parsing block.")

actions = actions.replace(old_duration_setup, new_duration_setup, 1)

type_anchor = '''const csv=(f:FormData,n:string)=>txt(f,n).split(",").map(v=>v.trim()).filter(Boolean);

function payload(f:FormData){
'''

type_replacement = '''const csv=(f:FormData,n:string)=>txt(f,n).split(",").map(v=>v.trim()).filter(Boolean);

export type ShapeActionState={
  ok:boolean;
  message:string;
  submittedAt?:number;
};

function payload(f:FormData){
'''

if "export type ShapeActionState=" not in actions:
    if type_anchor not in actions:
        fail("Could not find Shape action type insertion anchor.")
    actions = actions.replace(type_anchor, type_replacement, 1)

create_start = actions.find("export async function createShape(")
delete_start = actions.find("export async function deleteShape(", create_start)

if create_start < 0 or delete_start < 0:
    fail("Could not find Shape create/update action range.")

new_create_update = '''export async function createShape(
  _previous:ShapeActionState,
  f:FormData,
):Promise<ShapeActionState>{
  await requireAdminSection("shapes");

  const db=await createClient();
  const p=payload(f);

  if(!p.name||!p.description){
    return{
      ok:false,
      message:"Name and description are required.",
      submittedAt:Date.now(),
    };
  }

  if(
    p.resolution_mode==="save"&&
    p.target_mode!=="self"&&
    p.target_mode!=="written"&&
    p.save_options.length===0
  ){
    return{
      ok:false,
      message:"Save-based Shapes that target another Character need a Save.",
      submittedAt:Date.now(),
    };
  }

  const persistent=
    p.self_conditions.length||
    p.other_conditions.length||
    p.other_alt_conditions.length||
    [
      p.self_max_hp_change,
      p.other_max_hp_change,
      p.other_alt_max_hp_change,
      p.self_muscles_modifier,
      p.self_reflexes_modifier,
      p.self_vigour_modifier,
      p.self_brains_modifier,
      p.self_shrewd_modifier,
      p.self_presence_modifier,
      p.other_muscles_modifier,
      p.other_reflexes_modifier,
      p.other_vigour_modifier,
      p.other_brains_modifier,
      p.other_shrewd_modifier,
      p.other_presence_modifier,
      p.other_alt_muscles_modifier,
      p.other_alt_reflexes_modifier,
      p.other_alt_vigour_modifier,
      p.other_alt_brains_modifier,
      p.other_alt_shrewd_modifier,
      p.other_alt_presence_modifier,
    ].some(v=>typeof v==="number"?v!==0:Boolean(v));

  if(
    p.is_instantaneous&&
    !p.is_dispel&&
    persistent
  ){
    return{
      ok:false,
      message:"Instantaneous Shapes cannot apply Conditions, Attribute modifiers or Max Health changes.",
      submittedAt:Date.now(),
    };
  }

  const {error}=await db.from("shapes").insert(p);

  if(error){
    return{
      ok:false,
      message:error.message,
      submittedAt:Date.now(),
    };
  }

  revalidatePath("/admin/shapes");
  revalidatePath("/game");

  return{
    ok:true,
    message:"Shape created.",
    submittedAt:Date.now(),
  };
}

export async function updateShape(
  _previous:ShapeActionState,
  f:FormData,
):Promise<ShapeActionState>{
  await requireAdminSection("shapes");

  const db=await createClient();
  const id=txt(f,"shape_id");
  const p=payload(f);

  if(!id){
    return{
      ok:false,
      message:"Shape id is missing.",
      submittedAt:Date.now(),
    };
  }

  if(!p.name||!p.description){
    return{
      ok:false,
      message:"Name and description are required.",
      submittedAt:Date.now(),
    };
  }

  if(
    p.resolution_mode==="save"&&
    p.target_mode!=="self"&&
    p.target_mode!=="written"&&
    p.save_options.length===0
  ){
    return{
      ok:false,
      message:"Save-based Shapes that target another Character need a Save.",
      submittedAt:Date.now(),
    };
  }

  const persistent=
    p.self_conditions.length||
    p.other_conditions.length||
    p.other_alt_conditions.length||
    [
      p.self_max_hp_change,
      p.other_max_hp_change,
      p.other_alt_max_hp_change,
      p.self_muscles_modifier,
      p.self_reflexes_modifier,
      p.self_vigour_modifier,
      p.self_brains_modifier,
      p.self_shrewd_modifier,
      p.self_presence_modifier,
      p.other_muscles_modifier,
      p.other_reflexes_modifier,
      p.other_vigour_modifier,
      p.other_brains_modifier,
      p.other_shrewd_modifier,
      p.other_presence_modifier,
      p.other_alt_muscles_modifier,
      p.other_alt_reflexes_modifier,
      p.other_alt_vigour_modifier,
      p.other_alt_brains_modifier,
      p.other_alt_shrewd_modifier,
      p.other_alt_presence_modifier,
    ].some(v=>typeof v==="number"?v!==0:Boolean(v));

  if(
    p.is_instantaneous&&
    !p.is_dispel&&
    persistent
  ){
    return{
      ok:false,
      message:"Instantaneous Shapes cannot apply Conditions, Attribute modifiers or Max Health changes.",
      submittedAt:Date.now(),
    };
  }

  const {error}=await db
    .from("shapes")
    .update(p)
    .eq("id",id);

  if(error){
    return{
      ok:false,
      message:error.message,
      submittedAt:Date.now(),
    };
  }

  revalidatePath("/admin/shapes");
  revalidatePath("/game");
  revalidatePath("/character");

  return{
    ok:true,
    message:"Shape updated.",
    submittedAt:Date.now(),
  };
}

'''

actions = actions[:create_start] + new_create_update + actions[delete_start:]

local_form = '''"use client";

import {
  useActionState,
  useEffect,
} from "react";
import {
  useRouter,
} from "next/navigation";

import type {
  ShapeActionState,
} from "./actions";

const initialState:ShapeActionState={
  ok:false,
  message:"",
};

export function ShapeActionForm({
  action,
  children,
  submitLabel,
}:{
  action:(
    previous:ShapeActionState,
    formData:FormData,
  )=>Promise<ShapeActionState>;
  children:React.ReactNode;
  submitLabel:string;
}){
  const router=useRouter();

  const [
    state,
    formAction,
    pending,
  ]=useActionState(
    action,
    initialState,
  );

  useEffect(()=>{
    if(
      state.ok&&
      state.submittedAt
    ){
      router.refresh();
    }
  },[
    router,
    state.ok,
    state.submittedAt,
  ]);

  return(
    <form
      action={formAction}
      className="mt-4"
      data-shape-form
    >
      {children}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          disabled={pending}
          className="border border-[rgb(var(--sep-colour-9b7446))] bg-[rgb(var(--sep-colour-2a1d12))] px-4 py-2 text-[9px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-ead1a3))] disabled:opacity-40"
        >
          {pending
            ?"Saving..."
            :submitLabel}
        </button>

        {state.message?(
          <span
            className={
              state.ok
                ?"text-[10px] text-emerald-400"
                :"text-[10px] text-red-400"
            }
          >
            {state.message}
          </span>
        ):null}
      </div>
    </form>
  );
}
'''

import_anchor = '''import { ShapeProgression } from "./ShapeProgression";
'''

import_replacement = '''import { ShapeProgression } from "./ShapeProgression";
import { ShapeActionForm } from "./ShapeActionForm";
import type { ShapeActionState } from "./actions";
'''

if 'import { ShapeActionForm }' not in page:
    if import_anchor not in page:
        fail("Could not find ShapeProgression import.")
    page = page.replace(import_anchor, import_replacement, 1)

old_signature = '''function ShapeForm({s,action}:{s?:S;action:(f:FormData)=>void|Promise<void>}){
'''

new_signature = '''function ShapeForm({
  s,
  action,
}:{
  s?:S;
  action:(
    previous:ShapeActionState,
    formData:FormData,
  )=>Promise<ShapeActionState>;
}){
'''

if old_signature not in page:
    fail("Could not find current ShapeForm signature.")

page = page.replace(old_signature, new_signature, 1)

old_form_open = '''  return <form action={action} className="mt-4" data-shape-form><ShapeProgression/>{s?<input type="hidden" name="shape_id" value={s.id}/>:null}
'''

new_form_open = '''  return <ShapeActionForm action={action} submitLabel={s?"Save Shape":"Create Shape"}><ShapeProgression/>{s?<input type="hidden" name="shape_id" value={s.id}/>:null}
'''

if old_form_open not in page:
    fail("Could not find current Shape form opening.")

page = page.replace(old_form_open, new_form_open, 1)

old_form_close = '''    <button className="mt-4 border border-[rgb(var(--sep-colour-9b7446))] bg-[rgb(var(--sep-colour-2a1d12))] px-4 py-2 text-[9px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-ead1a3))]">{s?"Save Shape":"Create Shape"}</button>
  </form>;
}
'''

new_form_close = '''  </ShapeActionForm>;
}
'''

if old_form_close not in page:
    fail("Could not find current Shape form closing/save button.")

page = page.replace(old_form_close, new_form_close, 1)

banner = '''    {params.success?<div className="mt-5 border border-emerald-800/50 p-3 text-sm text-emerald-400">{params.success}</div>:null}{params.error?<div className="mt-5 border border-red-900/60 p-3 text-sm text-red-400">{params.error}</div>:null}
'''

if banner in page:
    page = page.replace(banner, "", 1)

for marker in [
    'const durationMode=',
    'durationMode==="instantaneous"',
    'export type ShapeActionState=',
    'message:"Shape updated."',
]:
    if marker not in actions:
        fail(f"actions.ts validation failed: missing {marker!r}")

for marker in [
    'import { ShapeActionForm }',
    '<ShapeActionForm action={action}',
    '</ShapeActionForm>',
]:
    if marker not in page:
        fail(f"page.tsx validation failed: missing {marker!r}")

if '?success=Shape%20updated' in actions:
    fail("Old updateShape success redirect still exists.")

if '?success=Shape%20created' in actions:
    fail("Old createShape success redirect still exists.")

ACTIONS.write_text(actions, encoding="utf-8", newline="\n")
PAGE.write_text(page, encoding="utf-8", newline="\n")
LOCAL_FORM.write_text(local_form, encoding="utf-8", newline="\n")

print("WROTE  app/(portal)/admin/shapes/actions.ts")
print("WROTE  app/(portal)/admin/shapes/page.tsx")
print("WROTE  app/(portal)/admin/shapes/ShapeActionForm.tsx")
print()
print("SHAPE DURATION + LOCAL SAVE FEEDBACK FIX APPLIED")
print("- Instantaneous is now read directly from duration_mode on the server.")
print("- Save/Create no longer redirect the page.")
print("- Success/error appears beside the Save/Create button.")
print("- Successful save refreshes server data without a full navigation.")
print("- Existing Shape runtime and accordion helper are untouched.")
print()
print("Next: npm run build")
