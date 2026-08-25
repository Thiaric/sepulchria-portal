from pathlib import Path

ROOT = Path.cwd()

def read(path):
    p = ROOT / path
    if not p.exists():
        raise FileNotFoundError(f"Missing expected file: {path}")
    return p.read_text(encoding="utf-8")

def write(path, text):
    p = ROOT / path
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(text, encoding="utf-8", newline="\n")
    print(f"Updated {path}")

def replace_once(text, old, new, path):
    count = text.count(old)
    if count != 1:
        raise RuntimeError(
            f"{path}: expected exactly 1 occurrence, found {count}.\n"
            f"Search text:\n{old}"
        )
    return text.replace(old, new, 1)

helper_path = "lib/warping/shape-school-style.ts"
helper = '''export function shapeSchoolBorderClass(
  school: string | null | undefined,
) {
  switch (
    String(school ?? "")
      .trim()
      .toLowerCase()
  ) {
    case "embercraft":
      return "border-[#b75f35]/75 shadow-[inset_0_0_0_1px_rgba(239,158,102,0.10),0_0_10px_rgba(183,95,53,0.10)] hover:border-[#d17a4d]/90 hover:shadow-[inset_0_0_0_1px_rgba(239,158,102,0.18),0_0_14px_rgba(183,95,53,0.18)]";
    case "vitalcraft":
      return "border-[#6f8f4f]/75 shadow-[inset_0_0_0_1px_rgba(178,201,128,0.10),0_0_10px_rgba(111,143,79,0.10)] hover:border-[#91ad68]/90 hover:shadow-[inset_0_0_0_1px_rgba(178,201,128,0.18),0_0_14px_rgba(111,143,79,0.18)]";
    case "mindcraft":
      return "border-[#7663a0]/75 shadow-[inset_0_0_0_1px_rgba(178,157,216,0.10),0_0_10px_rgba(118,99,160,0.10)] hover:border-[#9984c0]/90 hover:shadow-[inset_0_0_0_1px_rgba(178,157,216,0.18),0_0_14px_rgba(118,99,160,0.18)]";
    case "veilcraft":
      return "border-[#665275]/75 shadow-[inset_0_0_0_1px_rgba(168,137,185,0.10),0_0_10px_rgba(102,82,117,0.12)] hover:border-[#876d96]/90 hover:shadow-[inset_0_0_0_1px_rgba(168,137,185,0.18),0_0_14px_rgba(102,82,117,0.20)]";
    case "waycraft":
      return "border-[#4d8588]/75 shadow-[inset_0_0_0_1px_rgba(128,192,194,0.10),0_0_10px_rgba(77,133,136,0.10)] hover:border-[#69a8aa]/90 hover:shadow-[inset_0_0_0_1px_rgba(128,192,194,0.18),0_0_14px_rgba(77,133,136,0.18)]";
    case "bondcraft":
      return "border-[#667e96]/75 shadow-[inset_0_0_0_1px_rgba(163,189,211,0.10),0_0_10px_rgba(102,126,150,0.10)] hover:border-[#869fb6]/90 hover:shadow-[inset_0_0_0_1px_rgba(163,189,211,0.18),0_0_14px_rgba(102,126,150,0.18)]";
    case "runecraft":
      return "border-[#a17f3d]/80 shadow-[inset_0_0_0_1px_rgba(217,187,111,0.12),0_0_10px_rgba(161,127,61,0.11)] hover:border-[#c09c53]/95 hover:shadow-[inset_0_0_0_1px_rgba(217,187,111,0.22),0_0_14px_rgba(161,127,61,0.20)]";
    default:
      return "border-[rgb(var(--sep-colour-8d6d3e))]/65 shadow-[inset_0_0_0_1px_rgba(178,145,94,0.06)] hover:border-[rgb(var(--sep-colour-a7834d))]/80";
  }
}
'''
write(helper_path, helper)

path = "components/warping/shapes-catalogue.tsx"
text = read(path)
text = replace_once(
    text,
    '''import {
  useEffect,
  useMemo,
  useState,
} from "react";
''',
    '''import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  shapeSchoolBorderClass,
} from "@/lib/warping/shape-school-style";
''',
    path,
)
text = replace_once(
    text,
    'className="min-h-[430px] scroll-mt-4 border border-[rgb(var(--sep-colour-8d6d3e))]/65 bg-[rgb(var(--sep-colour-18110c))] p-4"',
    '''className={`min-h-[430px] scroll-mt-4 border bg-[rgb(var(--sep-colour-18110c))] p-4 transition-[border-color,box-shadow] duration-200 ${shapeSchoolBorderClass(
    shape.school,
  )}`}''',
    path,
)
write(path, text)

path = "app/(portal)/admin/shapes/page.tsx"
text = read(path)
text = replace_once(
    text,
    '''import { ShapeActionForm } from "./ShapeActionForm";
import type { ShapeActionState } from "./actions";
''',
    '''import { ShapeActionForm } from "./ShapeActionForm";
import type { ShapeActionState } from "./actions";
import {
  shapeSchoolBorderClass,
} from "@/lib/warping/shape-school-style";
''',
    path,
)
text = replace_once(
    text,
    'className="scroll-mt-6 border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))]"',
    '''className={`scroll-mt-6 border bg-[rgb(var(--sep-colour-15100d))] transition-[border-color,box-shadow] duration-200 ${shapeSchoolBorderClass(
        s.school,
      )}`}''',
    path,
)
write(path, text)

path = "app/(portal)/admin/characters/[id]/warping/page.tsx"
text = read(path)
text = replace_once(
    text,
    'import {assignManualShape,removeManualShape,updateWarpingBase} from "./actions";\n',
    'import {assignManualShape,removeManualShape,updateWarpingBase} from "./actions";\nimport {shapeSchoolBorderClass} from "@/lib/warping/shape-school-style";\n',
    path,
)
text = replace_once(
    text,
    'className="flex items-center justify-between border border-[rgb(var(--sep-colour-59432c))]/35 bg-[rgb(var(--sep-colour-100c09))] p-3"',
    'className={`flex items-center justify-between border bg-[rgb(var(--sep-colour-100c09))] p-3 transition-[border-color,box-shadow] duration-200 ${shapeSchoolBorderClass(s?.school)}`}',
    path,
)
text = replace_once(
    text,
    'className="flex justify-between border border-[rgb(var(--sep-colour-59432c))]/35 bg-[rgb(var(--sep-colour-100c09))] p-3"',
    'className={`flex justify-between border bg-[rgb(var(--sep-colour-100c09))] p-3 transition-[border-color,box-shadow] duration-200 ${shapeSchoolBorderClass(s?.school)}`}',
    path,
)
write(path, text)

path = "components/portal/portal-context-panel.tsx"
text = read(path)
text = replace_once(
    text,
    'import { SanctionContextPanel } from "@/components/sanctions/sanction-context-panel";\n',
    'import { SanctionContextPanel } from "@/components/sanctions/sanction-context-panel";\nimport {\n  shapeSchoolBorderClass,\n} from "@/lib/warping/shape-school-style";\n',
    path,
)
text = replace_once(
    text,
    'type PublicShapeContextEntry={id:string;name:string};',
    '''type PublicShapeContextEntry={
  id:string;
  name:string;
  school:string;
};''',
    path,
)
text = replace_once(
    text,
    '.from("shapes").select("id,name").eq("is_active",true)',
    '.from("shapes").select("id,name,school").eq("is_active",true)',
    path,
)
text = replace_once(
    text,
    'setEntries((data??[]).map(x=>({id:String(x.id),name:String(x.name)})))',
    '''setEntries((data??[]).map(x=>({
  id:String(x.id),
  name:String(x.name),
  school:String(x.school??""),
})))''',
    path,
)
text = replace_once(
    text,
    'className="flex w-full items-center justify-between border border-[rgb(var(--sep-colour-59432c))]/35 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2.5 text-left"',
    'className={`flex w-full items-center justify-between border bg-[rgb(var(--sep-colour-100c09))] px-3 py-2.5 text-left transition-[border-color,box-shadow] duration-200 ${shapeSchoolBorderClass(x.school)}`}',
    path,
)
write(path, text)

print()
print("Done.")
print("Applied school borders to:")
print("- /warping Shape catalogue")
print("- /warping right context sidebar")
print("- /character and public character Shape cards via ShapesCatalogue")
print("- /admin/shapes existing Shape boxes")
print("- /admin/characters/[id]/warping manual/order Shape rows")
