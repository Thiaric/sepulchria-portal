#!/usr/bin/env python3
from __future__ import annotations
import argparse, shutil, subprocess
from pathlib import Path

ROOT = Path.cwd()
BASE = "8f1d0eb"
BACKUP = ROOT / ".patch_backups" / "npc_assignment_targets_v3_8f1d0eb"
MECH = Path("app/(portal)/game/npc-mechanics-actions.ts")
PANEL = Path("app/(portal)/game/components/NpcControlPanel.tsx")
INV = Path("lib/items/admin-inventory-actions.ts")
FILES = [MECH, PANEL, INV]
SQL = ROOT / "supabase_allow_npc_item_assignment.sql"
ROLLBACK_SQL = ROOT / "supabase_allow_npc_item_assignment_ROLLBACK.sql"

def die(msg: str):
    raise SystemExit(f"\nERROR: {msg}\n")

def head() -> str:
    try:
        return subprocess.check_output(["git","rev-parse","--short","HEAD"], cwd=ROOT, text=True, stderr=subprocess.DEVNULL).strip()
    except Exception:
        return "unknown"

def git_show(rel: Path) -> str:
    spec = f"{BASE}:{rel.as_posix()}"
    try:
        return subprocess.check_output(["git","show",spec], cwd=ROOT, text=True)
    except subprocess.CalledProcessError:
        die(f"Could not read {rel} from commit {BASE}")

def backup():
    if BACKUP.exists():
        print(f"Backup already exists: {BACKUP}")
        return
    for rel in FILES:
        src = ROOT / rel
        if not src.exists():
            die(f"Missing {rel}")
        dst = BACKUP / rel
        dst.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(src, dst)
    print(f"Backup created: {BACKUP}")

def revert():
    if not BACKUP.exists():
        die("No backup found")
    for rel in FILES:
        src = BACKUP / rel
        if src.exists():
            dst = ROOT / rel
            dst.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(src, dst)
            print(f"Restored {rel}")
    print("\nCode reverted. Nothing committed or pushed.")
    print(f"If you ran the DB SQL, also run {ROLLBACK_SQL.name}.")

def replace_once(text: str, old: str, new: str, label: str) -> str:
    n = text.count(old)
    if n != 1:
        die(f"{label}: expected 1 match, found {n}")
    return text.replace(old, new, 1)

def patch_mechanics():
    s = git_show(MECH)

    # Read full assigned Feat/Shape records, inventory directly, and live presence targets.
    start = s.find("export async function loadNpcMechanicsData")
    end = s.find("export async function npcWarpShape", start)
    if start < 0 or end < 0:
        die("Could not locate loadNpcMechanicsData")

    loader = r'''export async function loadNpcMechanicsData(input:{npcId:string;roomId:string}){
  try{
    const {a,character}=await requireStaffNpc(input.npcId,input.roomId);
    const activeSince=new Date(Date.now()-5*60_000).toISOString();

    const [giftsResult,shapesResult,standardResult,uniqueResult,equipmentResult,presenceResult]=await Promise.all([
      a.from("character_gifts").select(`id,gift:gifts(*)`).eq("character_id",character.id),
      a.from("character_shapes").select(`shape_id,shape:shapes(*)`).eq("character_id",character.id),
      a.from("character_items").select("id,item_id,quantity").eq("character_id",character.id),
      a.from("character_item_instances").select("id,item_id,custom_name,charges_remaining").eq("owner_character_id",character.id).eq("vault_status","owned"),
      a.from("character_equipment").select("character_item_id,item_instance_id,slot_key").eq("character_id",character.id),
      a.from("character_presence").select(`character_id,appear_offline,last_seen_at,character:characters!character_presence_character_id_fkey(id,display_name,status,is_system,life_state)`).eq("room_id",input.roomId).gte("last_seen_at",activeSince),
    ]);

    const error=giftsResult.error??shapesResult.error??standardResult.error??uniqueResult.error??equipmentResult.error??presenceResult.error;
    if(error)throw new Error(error.message);

    const standard=standardResult.data??[];
    const unique=uniqueResult.data??[];
    const itemIds=[...new Set([...standard.map((x:any)=>x.item_id),...unique.map((x:any)=>x.item_id)].filter(Boolean))];

    const masterResult=itemIds.length
      ? await a.from("items").select(`*,category:item_categories(*)`).in("id",itemIds)
      : {data:[],error:null};
    if(masterResult.error)throw new Error(masterResult.error.message);

    const masters=new Map((masterResult.data??[]).map((x:any)=>[x.id,x]));
    const equipment=equipmentResult.data??[];
    const standardSlots=new Map(equipment.filter((x:any)=>x.character_item_id).map((x:any)=>[x.character_item_id,x.slot_key]));
    const uniqueSlots=new Map(equipment.filter((x:any)=>x.item_instance_id).map((x:any)=>[x.item_instance_id,x.slot_key]));

    const items=[
      ...standard.map((row:any)=>{
        const master:any=masters.get(row.item_id);
        const category=one(master?.category??null);
        const slot=standardSlots.get(row.id)??null;
        return {
          record_kind:"standard",record_id:row.id,item_id:row.item_id,name:master?.name??"Unknown Item",quantity:Number(row.quantity??1),
          is_usable:master?.is_usable===true,is_equipped:Boolean(slot),equipped_slot:slot,target_mode:master?.target_mode??"self",
          category_slug:category?.slug??null,resolution_mode:master?.resolution_mode??"automatic",damage_dice:master?.damage_dice??null,damage_type:master?.damage_type??null,
        };
      }),
      ...unique.map((row:any)=>{
        const master:any=masters.get(row.item_id);
        const category=one(master?.category??null);
        const slot=uniqueSlots.get(row.id)??null;
        return {
          record_kind:"unique",record_id:row.id,item_id:row.item_id,name:row.custom_name?.trim()||master?.name||"Unknown Item",quantity:1,
          charges_remaining:row.charges_remaining??null,is_usable:master?.is_usable===true,is_equipped:Boolean(slot),equipped_slot:slot,
          target_mode:master?.target_mode??"self",category_slug:category?.slug??null,resolution_mode:master?.resolution_mode??"automatic",
          damage_dice:master?.damage_dice??null,damage_type:master?.damage_type??null,
        };
      }),
    ];

    const gifts=(giftsResult.data??[])
      .map((x:any)=>{const g=one(x.gift) as any;return g?{characterGiftId:x.id,...g}:null;})
      .filter((x:any)=>x&&x.is_active!==false);

    const shapes=(shapesResult.data??[])
      .map((x:any)=>one(x.shape) as any)
      .filter((x:any)=>x&&x.is_active===true);

    const targets=(presenceResult.data??[])
      .filter((x:any)=>x.appear_offline!==true)
      .map((x:any)=>one(x.character) as any)
      .filter((x:any)=>x&&x.status==="approved"&&x.is_system!==true&&x.id!==character.id)
      .map((x:any)=>({id:x.id,display_name:x.display_name,life_state:x.life_state}));

    return {ok:true,characterId:character.id,gifts,items,shapes,targets};
  }catch(e){
    return {ok:false,message:e instanceof Error?e.message:"Unable to load NPC mechanics.",gifts:[],items:[],shapes:[],targets:[]};
  }
}

'''
    s = s[:start] + loader + s[end:]
    (ROOT / MECH).write_text(s, encoding="utf-8")
    print("Patched NPC mechanics loader")

def patch_panel():
    s = git_show(PANEL)

    # Same modal system as the cog beside Present Characters.
    import_line = 'import { createNpc,loadNpcControlData,sendNpcMessage,type NpcControlData,updateNpc } from "../npc-actions";'
    modal_import = 'import { openPortalModal } from "@/components/portal/portal-modal-button";\n'
    if modal_import not in s:
        s = replace_once(s, import_line, modal_import + import_line, "modal import")

    marker = 'const EMPTY:NpcControlData={npcs:[],races:[],orders:[]};'
    helper = r'''
function NpcTargetButtons({targets,selected,onSelect,allowSelf=false,selfId=""}:{targets:any[];selected:string;onSelect:(id:string)=>void;allowSelf?:boolean;selfId?:string}){
  const cls=(active:boolean)=>[
    "border px-3 py-2 text-[9px] transition",
    active
      ? "border-[rgb(var(--sep-skin-c1))] bg-[rgb(var(--sep-skin-c1))]/25 text-[rgb(var(--sep-skin-c2))] shadow-[inset_0_0_0_2px_rgb(var(--sep-skin-c1)),0_0_10px_rgb(var(--sep-skin-c1)/0.25)]"
      : "border-[rgb(var(--sep-colour-60482e))]/55",
  ].join(" ");
  return <div className="mt-2 flex flex-wrap gap-2">
    {allowSelf&&selfId?<button type="button" aria-pressed={selected===selfId} onClick={()=>onSelect(selected===selfId?"":selfId)} className={cls(selected===selfId)}>{selected===selfId?"✓ ":""}Self</button>:null}
    {targets.map((t:any)=><button key={t.id} type="button" aria-pressed={selected===t.id} onClick={()=>onSelect(selected===t.id?"":t.id)} className={cls(selected===t.id)}>{selected===t.id?"✓ ":""}{t.display_name}</button>)}
  </div>;
}
'''
    s = replace_once(s, marker, marker + helper, "target helper")

    # Attribute target dropdown -> Character-style buttons.
    old = '''        <select value={mechanicsTarget} onChange={e=>setMechanicsTarget(e.target.value)} className={inputClass}>
          <option value="">No target / Fate</option>
          {mechanics.targets?.map((t:any)=><option key={t.id} value={t.id}>{t.display_name}</option>)}
        </select>'''
    new = '''        <NpcTargetButtons targets={mechanics.targets??[]} selected={mechanicsTarget} onSelect={setMechanicsTarget}/>'''
    s = replace_once(s, old, new, "attribute target buttons")

    # Feat target dropdown -> obey target_mode and use thick selected buttons.
    old = '''        <select value={mechanicsTarget} onChange={e=>setMechanicsTarget(e.target.value)} className={inputClass}>
          <option value="">Self / automatic</option>
          {mechanics.targets?.map((t:any)=><option key={t.id} value={t.id}>{t.display_name}</option>)}
        </select>'''
    new = '''        {(()=>{const g=mechanics.gifts?.find((x:any)=>x.characterGiftId===selectedGift);if(!g||g.target_mode==="self")return <p className="mt-2 text-[9px] text-[rgb(var(--sep-colour-9e8b70))]">Target: Self</p>;return <NpcTargetButtons targets={mechanics.targets??[]} selected={mechanicsTarget} onSelect={setMechanicsTarget} allowSelf={g.target_mode==="either"} selfId={selected.character_id??""}/>;})()}'''
    s = replace_once(s, old, new, "feat target buttons")

    # Item target dropdown -> obey target_mode and use thick selected buttons.
    old = '''        <select value={mechanicsTarget} onChange={e=>setMechanicsTarget(e.target.value)} className={inputClass}>
          <option value="">Self / automatic</option>
          {mechanics.targets?.map((t:any)=><option key={t.id} value={t.id}>{t.display_name}</option>)}
        </select>'''
    new = '''        {(()=>{const i=mechanics.items?.find((x:any)=>x.record_id===selectedItem);if(!i||i.target_mode==="self")return <p className="mt-2 text-[9px] text-[rgb(var(--sep-colour-9e8b70))]">Target: Self</p>;return <NpcTargetButtons targets={mechanics.targets??[]} selected={mechanicsTarget} onSelect={setMechanicsTarget} allowSelf={i.target_mode==="either"} selfId={selected.character_id??""}/>;})()}'''
    s = replace_once(s, old, new, "item target buttons")

    # Shape target dropdown -> obey the Shape target mode.
    old = '''        <select value={mechanicsTarget} onChange={e=>setMechanicsTarget(e.target.value)} className={inputClass}>
          <option value="">Choose target</option>
          {mechanics.targets?.map((t:any)=><option key={t.id} value={t.id}>{t.display_name}</option>)}
        </select>
        <input value={shapeWritten} onChange={e=>setShapeWritten(e.target.value)} placeholder="Written/Fate target, when required" className={inputClass}/>'''
    new = '''        {(()=>{const sh=mechanics.shapes?.find((x:any)=>x.id===selectedShape);if(!sh)return null;if(sh.target_mode==="written")return <input value={shapeWritten} onChange={e=>setShapeWritten(e.target.value)} placeholder="Written / Fate target" className={inputClass}/>;if(sh.target_mode==="self")return <p className="mt-2 text-[9px] text-[rgb(var(--sep-colour-9e8b70))]">Target: Self · automatic</p>;return <NpcTargetButtons targets={mechanics.targets??[]} selected={mechanicsTarget} onSelect={setMechanicsTarget} allowSelf={sh.target_mode==="either"||sh.allow_self===true} selfId={selected.character_id??""}/>;})()}'''
    s = replace_once(s, old, new, "shape target buttons")

    # Keep combat as-is, but use the same target button visual instead of dropdown.
    old = '''        <select value={mechanicsTarget} onChange={e=>setMechanicsTarget(e.target.value)} className={inputClass}>
          <option value="">Choose target</option>
          {mechanics.targets?.map((t:any)=><option key={t.id} value={t.id}>{t.display_name}</option>)}
        </select>'''
    new = '''        <NpcTargetButtons targets={mechanics.targets??[]} selected={mechanicsTarget} onSelect={setMechanicsTarget}/>'''
    s = replace_once(s, old, new, "combat target buttons")

    # Stats/Items/Shapes should open with the portal modal, not navigate the main page.
    old = '''        {!creating&&selected?.character_id?<div className="mt-4 flex flex-wrap gap-2 border-t border-[rgb(var(--sep-colour-60482e))]/30 pt-3">
          <a href={`/admin/characters/${selected.character_id}`} className={buttonClass}>Stats & Feats</a>
          <a href={`/admin/characters/${selected.character_id}/inventory`} className={buttonClass}>Items</a>
          <a href={`/admin/characters/${selected.character_id}/warping`} className={buttonClass}>Shapes</a>
        </div>:null}'''
    new = '''        {!creating&&selected?.character_id?<div className="mt-4 flex flex-wrap gap-2 border-t border-[rgb(var(--sep-colour-60482e))]/30 pt-3">
          <button type="button" onClick={()=>openPortalModal({label:`Manage ${selected.name}`,title:`Manage ${selected.name}`,icon:selected.portrait_url??"/icons/characters.png",href:`/admin/characters/${selected.character_id}`})} className={buttonClass}>Stats & Feats</button>
          <button type="button" onClick={()=>openPortalModal({label:`${selected.name} · Items`,title:`${selected.name} · Items`,icon:selected.portrait_url??"/icons/characters.png",href:`/admin/characters/${selected.character_id}/inventory`})} className={buttonClass}>Items</button>
          <button type="button" onClick={()=>openPortalModal({label:`${selected.name} · Shapes`,title:`${selected.name} · Shapes`,icon:selected.portrait_url??"/icons/characters.png",href:`/admin/characters/${selected.character_id}/warping`})} className={buttonClass}>Shapes</button>
        </div>:null}'''
    s = replace_once(s, old, new, "admin modal buttons")

    (ROOT / PANEL).write_text(s, encoding="utf-8")
    print("Patched NPC target UI and admin modal links")

def patch_inventory_action():
    s = git_show(INV)
    old = '''    const {
      data: targetCharacter,
      error: targetCharacterError,
    } = await supabase
      .from("characters")
      .select("id")
      .eq("id", characterId)
      .eq("is_system", false)
      .maybeSingle();

    if (targetCharacterError || !targetCharacter) {
      throw new Error("System characters cannot receive Vault Items.");
    }
'''
    new = '''    const {
      data: targetCharacter,
      error: targetCharacterError,
    } = await supabase
      .from("characters")
      .select("id, is_system")
      .eq("id", characterId)
      .maybeSingle();

    if (targetCharacterError || !targetCharacter) {
      throw new Error("Character not found.");
    }

    if (targetCharacter.is_system) {
      const { data: linkedNpc, error: linkedNpcError } = await supabase
        .from("npcs")
        .select("id")
        .eq("character_id", characterId)
        .maybeSingle();

      if (linkedNpcError || !linkedNpc) {
        throw new Error(
          "System characters cannot receive Vault Items unless they belong to an NPC.",
        );
      }
    }
'''
    s = replace_once(s, old, new, "vault assignment guard")
    (ROOT / INV).write_text(s, encoding="utf-8")
    print("Patched Vault Item assignment guard")

def write_sql():
    SQL.write_text(r'''begin;

-- Preserve the current function bodies and only widen the target-character guard
-- from non-system Characters to normal Characters OR system Characters linked to an NPC.
DO $$
DECLARE
  fn text;
BEGIN
  SELECT pg_get_functiondef(p.oid)
  INTO fn
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid=p.pronamespace
  WHERE n.nspname='public'
    AND p.proname='staff_grant_inventory_item'
  LIMIT 1;

  IF fn IS NULL THEN
    RAISE EXCEPTION 'staff_grant_inventory_item not found';
  END IF;

  fn := replace(
    fn,
    'where id=p_character_id and coalesce(is_system,false)=false',
    'where id=p_character_id and (coalesce(is_system,false)=false or exists (select 1 from public.npcs n where n.character_id=public.characters.id))'
  );

  EXECUTE fn;
END $$;

DO $$
DECLARE
  fn text;
BEGIN
  SELECT pg_get_functiondef(p.oid)
  INTO fn
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid=p.pronamespace
  WHERE n.nspname='public'
    AND p.proname='staff_create_unique_item_for_character'
  LIMIT 1;

  IF fn IS NULL THEN
    RAISE EXCEPTION 'staff_create_unique_item_for_character not found';
  END IF;

  fn := replace(
    fn,
    'where id=p_character_id and coalesce(is_system,false)=false',
    'where id=p_character_id and (coalesce(is_system,false)=false or exists (select 1 from public.npcs n where n.character_id=public.characters.id))'
  );

  EXECUTE fn;
END $$;

commit;
''', encoding="utf-8")

    ROLLBACK_SQL.write_text(r'''begin;

DO $$
DECLARE
  fn text;
BEGIN
  SELECT pg_get_functiondef(p.oid)
  INTO fn
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid=p.pronamespace
  WHERE n.nspname='public'
    AND p.proname='staff_grant_inventory_item'
  LIMIT 1;

  fn := replace(
    fn,
    'where id=p_character_id and (coalesce(is_system,false)=false or exists (select 1 from public.npcs n where n.character_id=public.characters.id))',
    'where id=p_character_id and coalesce(is_system,false)=false'
  );

  EXECUTE fn;
END $$;

DO $$
DECLARE
  fn text;
BEGIN
  SELECT pg_get_functiondef(p.oid)
  INTO fn
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid=p.pronamespace
  WHERE n.nspname='public'
    AND p.proname='staff_create_unique_item_for_character'
  LIMIT 1;

  fn := replace(
    fn,
    'where id=p_character_id and (coalesce(is_system,false)=false or exists (select 1 from public.npcs n where n.character_id=public.characters.id))',
    'where id=p_character_id and coalesce(is_system,false)=false'
  );

  EXECUTE fn;
END $$;

commit;
''', encoding="utf-8")
    print("Created", SQL.name)
    print("Created", ROLLBACK_SQL.name)

def apply():
    h = head()
    print(f"Current HEAD: {h}")
    if h != BASE:
        print(f"WARNING: patch is built from commit {BASE}; current HEAD is {h}.")
    backup()
    patch_mechanics()
    patch_panel()
    patch_inventory_action()
    write_sql()
    print("\nPATCH APPLIED LOCALLY ONLY. Nothing committed or pushed.")
    print("Next:")
    print(f"1) Run {SQL.name} in Supabase SQL Editor")
    print("2) Run: npm run build")
    print("Revert code: python patch_npc_assignment_targets_v3_8f1d0eb.py --revert")
    print(f"If SQL was applied, also run {ROLLBACK_SQL.name}")

def main():
    p=argparse.ArgumentParser()
    p.add_argument("--revert",action="store_true")
    args=p.parse_args()
    revert() if args.revert else apply()

if __name__ == "__main__":
    main()
