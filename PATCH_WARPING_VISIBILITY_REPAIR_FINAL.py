from pathlib import Path
import shutil

R=Path.cwd()
B=R/'.warping_visibility_repair_backup'

def backup(rel):
    p=R/rel
    b=B/rel
    if p.exists() and not b.exists():
        b.parent.mkdir(parents=True,exist_ok=True)
        shutil.copy2(p,b)

def save(rel,s):
    p=R/rel
    p.write_text(s,encoding='utf-8')
    print('PATCHED',rel)

# Helper must already exist from the first partial run.
helper=R/'lib/warping/get-effective-character-warping.ts'
if not helper.exists():
    raise SystemExit('Missing lib/warping/get-effective-character-warping.ts. Stop and send me the output.')

# 1) Runtime access
rel=Path('lib/warping/shape-access.ts')
backup(rel)
p=R/rel
s=p.read_text(encoding='utf-8-sig')
imp='import { getEffectiveCharacterWarping } from "@/lib/warping/get-effective-character-warping";'
if imp not in s:
    marker='import { createClient } from "@/lib/supabase/server";'
    if marker not in s: raise SystemExit('shape-access: createClient import not found')
    s=s.replace(marker,marker+'\n'+imp,1)
call='  const effectiveWarping=await getEffectiveCharacterWarping(characterId);'
if call not in s:
    marker='  const character=characterResult.data;'
    if marker not in s: raise SystemExit('shape-access: character assignment not found')
    s=s.replace(marker,marker+'\n'+call,1)
s=s.replace('Number(shape.level)>Number(character.warping_affinity)','Number(shape.level)>effectiveWarping.affinity')
s=s.replace('const warpsPerDay=Number(character.warps_per_day??3);','const warpsPerDay=effectiveWarping.warpsPerDay;')
s=s.replace('affinity:Number(character.warping_affinity??1),','affinity:effectiveWarping.affinity,')
save(rel,s)

# 2) Character sheet mechanics
rel=Path('components/characters/character-mechanics-display.tsx')
backup(rel)
p=R/rel
s=p.read_text(encoding='utf-8-sig')
imp='import { getEffectiveCharacterWarping } from "@/lib/warping/get-effective-character-warping";'
if imp not in s:
    marker='import { createClient } from "@/lib/supabase/server";'
    if marker not in s: raise SystemExit('mechanics: createClient import not found')
    s=s.replace(marker,marker+'\n'+imp,1)
call='  const warping = await getEffectiveCharacterWarping(characterId);'
if call not in s:
    marker='  const breakdown = await getCharacterAttributeBreakdown('
    if marker not in s: raise SystemExit('mechanics: breakdown call not found')
    s=s.replace(marker,call+'\n\n'+marker,1)
card='      <section className="border border-[#60482e]/45 bg-[#15100d]/95 p-5 sm:p-6">\n        <h2 className="font-serif text-2xl text-[#dec89f]">Warping</h2>\n\n        <div className="mt-5 grid gap-px bg-[#4f3b28]/35 sm:grid-cols-2">\n          <div className="bg-[#120e0b] px-4 py-3">\n            <p className="text-[8px] uppercase tracking-[0.16em] text-[#8b7455]">\n              Current Affinity\n            </p>\n            <p className="mt-1 font-serif text-2xl text-[#e1c28d]">\n              {warping.affinity}\n            </p>\n            <p className="mt-1 text-[7px] uppercase tracking-[0.08em] text-[#756958]">\n              {warping.baseAffinity} Base · {signed(warping.itemAffinity)} Items · {signed(warping.featAffinity)} Feats\n            </p>\n          </div>\n\n          <div className="bg-[#120e0b] px-4 py-3">\n            <p className="text-[8px] uppercase tracking-[0.16em] text-[#8b7455]">\n              Shapes per day\n            </p>\n            <p className="mt-1 font-serif text-2xl text-[#e1c28d]">\n              {warping.warpsPerDay}\n            </p>\n            <p className="mt-1 text-[7px] uppercase tracking-[0.08em] text-[#756958]">\n              {warping.baseWarpsPerDay} Base · {signed(warping.itemWarpsPerDay)} Items · {signed(warping.featWarpsPerDay)} Feats\n            </p>\n          </div>\n        </div>\n      </section>\n\n'
if 'Current Affinity' not in s:
    marker='          Attributes'
    pos=s.find(marker)
    if pos<0: raise SystemExit('mechanics: Attributes heading not found')
    section=s.rfind('<section',0,pos)
    if section<0: raise SystemExit('mechanics: Attributes section start not found')
    s=s[:section]+card+s[section:]
save(rel,s)

# 3) Admin Manage Warping
rel=Path('app/(portal)/admin/characters/[id]/warping/page.tsx')
backup(rel)
p=R/rel
s=p.read_text(encoding='utf-8-sig')
imp='import {getEffectiveCharacterWarping} from "@/lib/warping/get-effective-character-warping";'
if imp not in s:
    marker='import {createClient} from "@/lib/supabase/server";'
    if marker not in s: raise SystemExit('admin: createClient import not found')
    s=s.replace(marker,marker+'\n'+imp,1)
call='effectiveWarping=await getEffectiveCharacterWarping(id)'
if call not in s:
    marker='const c=cq.data,a=aq.data??[]'
    if marker not in s: raise SystemExit('admin: character data anchor not found')
    s=s.replace(marker,'const c=cq.data,effectiveWarping=await getEffectiveCharacterWarping(id),a=aq.data??[]',1)
card='<section className="mt-7 border border-[#60482e]/45 bg-[#15100d] p-5">\n<p className="text-[8px] uppercase tracking-[0.22em] text-[#806b50]">Current Effective Warping</p>\n<h2 className="mt-1 font-serif text-2xl text-[#dec69a]">Effective Capability</h2>\n<div className="mt-4 grid gap-3 sm:grid-cols-2">\n<div className="border border-[#59432c]/35 bg-[#100c09] p-4">\n<p className="text-[7px] uppercase tracking-[0.18em] text-[#756958]">Current Affinity</p>\n<p className="mt-1 font-serif text-3xl text-[#e1c28d]">{effectiveWarping.affinity}</p>\n<p className="mt-1 text-[8px] text-[#8f8271]">{effectiveWarping.baseAffinity} Base · {effectiveWarping.itemAffinity >= 0 ? "+" : ""}{effectiveWarping.itemAffinity} Items · {effectiveWarping.featAffinity >= 0 ? "+" : ""}{effectiveWarping.featAffinity} Feats</p>\n</div>\n<div className="border border-[#59432c]/35 bg-[#100c09] p-4">\n<p className="text-[7px] uppercase tracking-[0.18em] text-[#756958]">Shapes per day</p>\n<p className="mt-1 font-serif text-3xl text-[#e1c28d]">{effectiveWarping.warpsPerDay}</p>\n<p className="mt-1 text-[8px] text-[#8f8271]">{effectiveWarping.baseWarpsPerDay} Base · {effectiveWarping.itemWarpsPerDay >= 0 ? "+" : ""}{effectiveWarping.itemWarpsPerDay} Items · {effectiveWarping.featWarpsPerDay >= 0 ? "+" : ""}{effectiveWarping.featWarpsPerDay} Feats</p>\n</div>\n</div>\n</section>\n'
if 'Current Effective Warping' not in s:
    marker='>Base Warping</p>'
    pos=s.find(marker)
    if pos<0: raise SystemExit('admin: Base Warping heading not found')
    section=s.rfind('<section',0,pos)
    if section<0: raise SystemExit('admin: Base Warping section start not found')
    s=s[:section]+card+s[section:]
save(rel,s)

print('REPAIR COMPLETE')
print('Now run: npm run build')
