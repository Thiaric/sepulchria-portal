from pathlib import Path
import shutil
R=Path.cwd(); H=Path(__file__).resolve().parent; B=R/".warping_effective_backup"
def backup(rel):
 p=R/rel; b=B/rel
 if p.exists() and not b.exists(): b.parent.mkdir(parents=True,exist_ok=True); shutil.copy2(p,b)
def save(rel,s):
 p=R/rel; p.parent.mkdir(parents=True,exist_ok=True); p.write_text(s,encoding="utf-8"); print("PATCHED",rel)

# Install canonical helper.
rel="lib/warping/get-effective-character-warping.ts"; backup(rel); save(rel,(H/"get-effective-character-warping.ts").read_text(encoding="utf-8"))

# Runtime Shape access.
rel="lib/warping/shape-access.ts"; backup(rel); p=R/rel; s=p.read_text(encoding="utf-8-sig")
imp='import { getEffectiveCharacterWarping } from "@/lib/warping/get-effective-character-warping";\\n'
anchor='import { createClient } from "@/lib/supabase/server";\\n'
if imp not in s:
 if anchor not in s: raise SystemExit("shape-access import anchor missing")
 s=s.replace(anchor,anchor+imp,1)
if "const effectiveWarping=await getEffectiveCharacterWarping(characterId);" not in s:
 anchor="  const character=characterResult.data;\\n"
 if anchor not in s: raise SystemExit("shape-access character anchor missing")
 s=s.replace(anchor,anchor+"  const effectiveWarping=await getEffectiveCharacterWarping(characterId);\\n",1)
s=s.replace("Number(shape.level)>Number(character.warping_affinity)","Number(shape.level)>effectiveWarping.affinity")
s=s.replace("const warpsPerDay=Number(character.warps_per_day??3);","const warpsPerDay=effectiveWarping.warpsPerDay;")
s=s.replace("affinity:Number(character.warping_affinity??1),","affinity:effectiveWarping.affinity,")
save(rel,s)

# Character sheet mechanics.
rel="components/characters/character-mechanics-display.tsx"; backup(rel); p=R/rel; s=p.read_text(encoding="utf-8-sig")
imp='import { getEffectiveCharacterWarping } from "@/lib/warping/get-effective-character-warping";\\n'
anchor='import { createClient } from "@/lib/supabase/server";\\n'
if imp not in s:
 if anchor not in s: raise SystemExit("mechanics import anchor missing")
 s=s.replace(anchor,anchor+imp,1)
if "const warping = await getEffectiveCharacterWarping(characterId);" not in s:
 anchor="  const breakdown = await getCharacterAttributeBreakdown(\\n"
 if anchor not in s: raise SystemExit("mechanics calculation anchor missing")
 s=s.replace(anchor,"  const warping = await getEffectiveCharacterWarping(characterId);\\n\\n"+anchor,1)
if "Current Affinity" not in s:
 anchor='      <section className="border border-[#60482e]/45 bg-[#15100d]/95 p-5 sm:p-6">\\n        <h2 className="mt-[-8] font-serif text-2xl text-[#dec89f]">\\n          Attributes'
 if anchor not in s: raise SystemExit("mechanics Attributes anchor missing")
 card='''      <section className="border border-[#60482e]/45 bg-[#15100d]/95 p-5 sm:p-6">
        <h2 className="font-serif text-2xl text-[#dec89f]">Warping</h2>
        <div className="mt-5 grid gap-px bg-[#4f3b28]/35 sm:grid-cols-2">
          <div className="bg-[#120e0b] px-4 py-3">
            <p className="text-[8px] uppercase tracking-[0.16em] text-[#8b7455]">Current Affinity</p>
            <p className="mt-1 font-serif text-2xl text-[#e1c28d]">{warping.affinity}</p>
            <p className="mt-1 text-[7px] uppercase tracking-[0.08em] text-[#756958]">{warping.baseAffinity} Base · {signed(warping.itemAffinity)} Items · {signed(warping.featAffinity)} Feats</p>
          </div>
          <div className="bg-[#120e0b] px-4 py-3">
            <p className="text-[8px] uppercase tracking-[0.16em] text-[#8b7455]">Shapes per day</p>
            <p className="mt-1 font-serif text-2xl text-[#e1c28d]">{warping.warpsPerDay}</p>
            <p className="mt-1 text-[7px] uppercase tracking-[0.08em] text-[#756958]">{warping.baseWarpsPerDay} Base · {signed(warping.itemWarpsPerDay)} Items · {signed(warping.featWarpsPerDay)} Feats</p>
          </div>
        </div>
      </section>

'''
 s=s.replace(anchor,card+anchor,1)
save(rel,s)

# Admin Manage Warping effective summary.
rel="app/(portal)/admin/characters/[id]/warping/page.tsx"; backup(rel); p=R/rel; s=p.read_text(encoding="utf-8-sig")
imp='import {getEffectiveCharacterWarping} from "@/lib/warping/get-effective-character-warping";\\n'
anchor='import {createClient} from "@/lib/supabase/server";\\n'
if imp not in s:
 if anchor not in s: raise SystemExit("admin import anchor missing")
 s=s.replace(anchor,anchor+imp,1)
if "effectiveWarping=await getEffectiveCharacterWarping(id)" not in s:
 old="const c=cq.data,a=aq.data??[]"
 if old not in s: raise SystemExit("admin data anchor missing")
 s=s.replace(old,"const c=cq.data,effectiveWarping=await getEffectiveCharacterWarping(id),a=aq.data??[]",1)
if "Current Effective Warping" not in s:
 anchor='<section className="mt-7 border border-[#60482e]/45 bg-[#15100d] p-5"><p className="text-[8px] uppercase tracking-[0.22em] text-[#806b50]">Base Warping</p>'
 if anchor not in s: raise SystemExit("admin Base Warping anchor missing")
 card='''<section className="mt-7 border border-[#60482e]/45 bg-[#15100d] p-5">
<p className="text-[8px] uppercase tracking-[0.22em] text-[#806b50]">Current Effective Warping</p>
<h2 className="mt-1 font-serif text-2xl text-[#dec69a]">Effective Capability</h2>
<div className="mt-4 grid gap-3 sm:grid-cols-2">
<div className="border border-[#59432c]/35 bg-[#100c09] p-4"><p className="text-[7px] uppercase tracking-[0.18em] text-[#756958]">Current Affinity</p><p className="mt-1 font-serif text-3xl text-[#e1c28d]">{effectiveWarping.affinity}</p><p className="mt-1 text-[8px] text-[#8f8271]">{effectiveWarping.baseAffinity} Base · {effectiveWarping.itemAffinity >= 0 ? "+" : ""}{effectiveWarping.itemAffinity} Items · {effectiveWarping.featAffinity >= 0 ? "+" : ""}{effectiveWarping.featAffinity} Feats</p></div>
<div className="border border-[#59432c]/35 bg-[#100c09] p-4"><p className="text-[7px] uppercase tracking-[0.18em] text-[#756958]">Shapes per day</p><p className="mt-1 font-serif text-3xl text-[#e1c28d]">{effectiveWarping.warpsPerDay}</p><p className="mt-1 text-[8px] text-[#8f8271]">{effectiveWarping.baseWarpsPerDay} Base · {effectiveWarping.itemWarpsPerDay >= 0 ? "+" : ""}{effectiveWarping.itemWarpsPerDay} Items · {effectiveWarping.featWarpsPerDay >= 0 ? "+" : ""}{effectiveWarping.featWarpsPerDay} Feats</p></div>
</div></section>
'''
 s=s.replace(anchor,card+anchor,1)
save(rel,s)
print("PATCH COMPLETE - now run npm run build")