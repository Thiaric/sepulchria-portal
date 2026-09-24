#!/usr/bin/env python3
from __future__ import annotations

import argparse
import shutil
import subprocess
from pathlib import Path

ROOT = Path.cwd()
BASE = "83e76bc"
BACKUP = ROOT / ".patch_backups" / "npc_mechanics_same_as_characters_83e76bc"

PANEL = Path("app/(portal)/game/components/NpcControlPanel.tsx")
MECH = Path("app/(portal)/game/npc-mechanics-actions.ts")
GIFTS = Path("app/(portal)/admin/gifts/page.tsx")
FILES = [PANEL, MECH, GIFTS]


def die(message: str):
    raise SystemExit(f"\nERROR: {message}\n")


def head() -> str:
    try:
        return subprocess.check_output(
            ["git", "rev-parse", "--short", "HEAD"],
            cwd=ROOT,
            text=True,
            stderr=subprocess.DEVNULL,
        ).strip()
    except Exception:
        return "unknown"


def read(rel: Path) -> str:
    path = ROOT / rel
    if not path.exists():
        die(f"Missing expected file: {rel}")
    return path.read_text(encoding="utf-8")


def rep(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        die(f"{label}: expected exactly 1 match, found {count}")
    return text.replace(old, new, 1)


def backup():
    if BACKUP.exists():
        print(f"Backup already exists: {BACKUP}")
        return

    for rel in FILES:
        src = ROOT / rel
        if not src.exists():
            die(f"Missing expected file: {rel}")
        dst = BACKUP / rel
        dst.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(src, dst)

    print(f"Backup created: {BACKUP}")


def revert():
    if not BACKUP.exists():
        die(f"No backup found at {BACKUP}")

    for rel in FILES:
        src = BACKUP / rel
        if src.exists():
            dst = ROOT / rel
            dst.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(src, dst)
            print(f"Restored {rel}")

    print("\nReverted. Nothing committed or pushed.")


def fix_symbols(text: str) -> str:
    for bad, good in {
        "â€”": "—",
        "Â·": "·",
        "â—†": "◆",
        "â‰¥": "≥",
    }.items():
        text = text.replace(bad, good)
    return text


def patch_panel(source: str) -> str:
    s = fix_symbols(source)

    s = rep(
        s,
        'import { loadNpcMechanicsData,npcWarpShape } from "../npc-mechanics-actions";',
        '''import {
  loadNpcMechanicsData,
  npcWarpShape,
  npcActivateRoomGift,
  npcUseRoomGift,
  npcUseRoomItem,
  npcSendRoomAttributeCheck,
  npcStartAttributeOpposedAction,
  npcStartUnarmedAttack,
  npcStartWeaponOpposedAttack,
} from "../npc-mechanics-actions";''',
        "NPC mechanics imports",
    )

    replacements = [
        ('useActionState(useRoomGift,{ok:false,message:""})', 'useActionState(npcUseRoomGift,{ok:false,message:""})', "Feat action"),
        ('useActionState(activateRoomGift,{ok:false,message:""})', 'useActionState(npcActivateRoomGift,{ok:false,message:""})', "temporary Feat action"),
        ('useActionState(useRoomItem,{ok:false,message:""})', 'useActionState(npcUseRoomItem,{ok:false,message:""})', "Item action"),
        ('useActionState(sendRoomAttributeCheck,{ok:false,message:""})', 'useActionState(npcSendRoomAttributeCheck,{ok:false,message:""})', "Attribute action"),
        ('useActionState(startAttributeOpposedAction,{ok:false,message:""})', 'useActionState(npcStartAttributeOpposedAction,{ok:false,message:""})', "opposed action"),
        ('useActionState(startUnarmedAttack,{ok:false,message:""})', 'useActionState(npcStartUnarmedAttack,{ok:false,message:""})', "unarmed action"),
        ('useActionState(startWeaponOpposedAttack,{ok:false,message:""})', 'useActionState(npcStartWeaponOpposedAttack,{ok:false,message:""})', "weapon action"),
    ]
    for old, new, label in replacements:
        s = rep(s, old, new, label)

    if "function NpcMultiTargetButtons" not in s:
        helper = r'''
function NpcMultiTargetButtons({targets,selected,onChange,maxTargets,allowSelf=false,selfId=""}:{targets:any[];selected:string[];onChange:(ids:string[])=>void;maxTargets:number;allowSelf?:boolean;selfId?:string}){
  const cls=(active:boolean)=>[
    "border px-3 py-2 text-[9px] transition",
    active
      ? "border-[rgb(var(--sep-skin-c1))] bg-[rgb(var(--sep-skin-c1))]/25 text-[rgb(var(--sep-skin-c2))] shadow-[inset_0_0_0_2px_rgb(var(--sep-skin-c1)),0_0_10px_rgb(var(--sep-skin-c1)/0.25)]"
      : "border-[rgb(var(--sep-colour-60482e))]/55",
  ].join(" ");

  const toggle=(id:string)=>{
    if(selected.includes(id)){
      onChange(selected.filter(x=>x!==id));
      return;
    }
    onChange([...selected,id].slice(-Math.max(1,maxTargets)));
  };

  return <div className="mt-2 flex flex-wrap gap-2">
    {allowSelf&&selfId?<button type="button" aria-pressed={selected.includes(selfId)} onClick={()=>toggle(selfId)} className={cls(selected.includes(selfId))}>{selected.includes(selfId)?"✓ ":""}Self</button>:null}
    {targets.map((t:any)=><button key={t.id} type="button" aria-pressed={selected.includes(t.id)} onClick={()=>toggle(t.id)} className={cls(selected.includes(t.id))}>{selected.includes(t.id)?"✓ ":""}{t.display_name}</button>)}
  </div>;
}
'''
        s = rep(s, "\n\nexport function NpcControlPanel", helper + "\n\nexport function NpcControlPanel", "multi-target helper")

    s = rep(
        s,
        '  const [mechanicsTarget,setMechanicsTarget]=useState("");\n  const [shapeWritten,setShapeWritten]=useState("");',
        '  const [mechanicsTarget,setMechanicsTarget]=useState("");\n  const [shapeTargets,setShapeTargets]=useState<string[]>([]);\n  const [shapeWritten,setShapeWritten]=useState("");',
        "shape target state",
    )

    s = rep(
        s,
        '      setMechanicsTarget("");\n      setMechanicsStatus("");',
        '      setMechanicsTarget("");\n      setShapeTargets([]);\n      setMechanicsStatus("");',
        "shape target reset",
    )

    s = rep(
        s,
        '<select value={selectedShape} onChange={e=>setSelectedShape(e.target.value)} className={inputClass}>',
        '<select value={selectedShape} onChange={e=>{setSelectedShape(e.target.value);setMechanicsTarget("");setShapeTargets([]);setShapeWritten("");}} className={inputClass}>',
        "shape select reset",
    )

    old_shape = '{(()=>{const sh=mechanics.shapes?.find((x:any)=>x.id===selectedShape);if(!sh)return null;if(sh.target_mode==="written")return <input value={shapeWritten} onChange={e=>setShapeWritten(e.target.value)} placeholder="Written / Fate target" className={inputClass}/>;if(sh.target_mode==="self")return <p className="mt-2 text-[9px] text-[rgb(var(--sep-colour-9e8b70))]">Target: Self · automatic</p>;return <NpcTargetButtons targets={mechanics.targets??[]} selected={mechanicsTarget} onSelect={setMechanicsTarget} allowSelf={sh.target_mode==="either"||sh.allow_self===true} selfId={selected.character_id??""}/>;})()}'
    new_shape = r'''{(()=>{
          const sh=mechanics.shapes?.find((x:any)=>x.id===selectedShape);
          if(!sh)return null;
          if(sh.target_mode==="written")return <input value={shapeWritten} onChange={e=>setShapeWritten(e.target.value)} placeholder="Written / Fate target" className={inputClass}/>;
          if(sh.target_mode==="self")return <p className="mt-2 text-[9px] text-[rgb(var(--sep-colour-9e8b70))]">Target: Self · automatic</p>;

          const allowSelf=sh.target_mode==="either"||sh.allow_self===true;
          const multiple=sh.target_scope==="multiple";
          const maxTargets=multiple?Math.max(1,Number(sh.max_targets??1)):1;

          return multiple
            ? <NpcMultiTargetButtons targets={mechanics.targets??[]} selected={shapeTargets} onChange={setShapeTargets} maxTargets={maxTargets} allowSelf={allowSelf} selfId={selected.character_id??""}/>
            : <NpcTargetButtons targets={mechanics.targets??[]} selected={mechanicsTarget} onSelect={setMechanicsTarget} allowSelf={allowSelf} selfId={selected.character_id??""}/>;
        })()}'''
    s = rep(s, old_shape, new_shape, "Shape target UI")

    s = rep(
        s,
        'targetIds:mechanicsTarget?[mechanicsTarget]:[]',
        'targetIds:(mechanics.shapes?.find((x:any)=>x.id===selectedShape)?.target_scope==="multiple")?shapeTargets:(mechanicsTarget?[mechanicsTarget]:[])',
        "Shape multi-target submit",
    )

    return s


def patch_mechanics(source: str) -> str:
    s = fix_symbols(source)

    s = rep(
        s,
        'import { resolveImmediateShapeCastForNpc } from "./warping-actions";',
        '''import { resolveImmediateShapeCastForNpc } from "./warping-actions";
import {
  activateRoomGift,
  useRoomGift,
  useRoomItem,
  sendRoomAttributeCheck,
} from "./actions";
import {
  startAttributeOpposedAction,
  startUnarmedAttack,
  startWeaponOpposedAttack,
} from "./opposed-actions";''',
        "NPC action imports",
    )

    s = rep(
        s,
        '  const a=admin();\n  const q=await a.from("npcs")',
        '''  const a=admin();
  const speaker=await a
    .from("characters")
    .select("id")
    .eq("user_id",au.data.user.id)
    .eq("is_system",false)
    .maybeSingle();
  if(speaker.error||!speaker.data)throw new Error(speaker.error?.message??"Staff Character not found.");
  const q=await a.from("npcs")''',
        "staff speaker lookup",
    )

    s = rep(
        s,
        '  return {a,userId:au.data.user.id,npc:q.data,character:c.data};',
        '  return {a,userId:au.data.user.id,speakerCharacterId:speaker.data.id,npc:q.data,character:c.data};',
        "staff speaker return",
    )

    s = rep(
        s,
        'async function npcMessage(a:any,npc:any,userId:string,roomId:string,message:string){',
        'async function npcMessage(a:any,npc:any,userId:string,speakerCharacterId:string,roomId:string,message:string){',
        "npcMessage signature",
    )

    s = rep(
        s,
        '    room_id:roomId,character_id:npc.character_id,message,message_type:"action",',
        '    room_id:roomId,character_id:speakerCharacterId,message,message_type:"action",',
        "visible NPC speaker",
    )

    if "export async function npcUseRoomGift" not in s:
        wrappers = r'''
async function publishNpcActionMessages(actorCharacterId:string,since:string){
  const staff=await getStaffSession();
  if(!staff||!["owner","admin","master"].includes(staff.role))throw new Error("NPC mechanics require Master/Admin/Owner access.");

  const session=await createClient();
  const au=await session.auth.getUser();
  if(!au.data.user)throw new Error("Authentication required.");

  const a=admin();
  const [npcResult,speakerResult]=await Promise.all([
    a.from("npcs").select("id,name,pronouns,portrait_url,description,character_id,race:races(id,name,icon_url)").eq("character_id",actorCharacterId).maybeSingle(),
    a.from("characters").select("id").eq("user_id",au.data.user.id).eq("is_system",false).maybeSingle(),
  ]);

  if(npcResult.error||!npcResult.data)throw new Error(npcResult.error?.message??"NPC not found.");
  if(speakerResult.error||!speakerResult.data)throw new Error(speakerResult.error?.message??"Staff Character not found.");

  const update=await a.from("room_messages").update({
    character_id:speakerResult.data.id,
    speaker_type:"npc",
    npc_id:npcResult.data.id,
    npc_snapshot:snapshot(npcResult.data),
    sent_by_user_id:au.data.user.id,
  }).eq("character_id",actorCharacterId).gte("created_at",since);

  if(update.error)throw new Error(update.error.message);
}

async function wrapNpcRoomAction(action:(previous:any,formData:FormData)=>Promise<any>,previous:any,formData:FormData){
  const actorCharacterId=String(formData.get("npc_actor_character_id")??"").trim();
  const since=new Date(Date.now()-2000).toISOString();
  const result=await action(previous,formData);

  if(result?.ok&&actorCharacterId){
    await publishNpcActionMessages(actorCharacterId,since);
    revalidatePath("/game");
  }

  return result;
}

export async function npcUseRoomGift(previous:any,formData:FormData){return wrapNpcRoomAction(useRoomGift,previous,formData);}
export async function npcActivateRoomGift(previous:any,formData:FormData){return wrapNpcRoomAction(activateRoomGift,previous,formData);}
export async function npcUseRoomItem(previous:any,formData:FormData){return wrapNpcRoomAction(useRoomItem,previous,formData);}
export async function npcSendRoomAttributeCheck(previous:any,formData:FormData){return wrapNpcRoomAction(sendRoomAttributeCheck,previous,formData);}
export async function npcStartAttributeOpposedAction(previous:any,formData:FormData){return wrapNpcRoomAction(startAttributeOpposedAction,previous,formData);}
export async function npcStartUnarmedAttack(previous:any,formData:FormData){return wrapNpcRoomAction(startUnarmedAttack,previous,formData);}
export async function npcStartWeaponOpposedAttack(previous:any,formData:FormData){return wrapNpcRoomAction(startWeaponOpposedAttack,previous,formData);}
'''
        s = rep(s, "\nexport async function loadNpcMechanicsData", wrappers + "\nexport async function loadNpcMechanicsData", "action wrappers")

    s = rep(
        s,
        '    const {a,userId,npc,character}=await requireStaffNpc(input.npcId,input.roomId);',
        '    const {a,userId,speakerCharacterId,npc,character}=await requireStaffNpc(input.npcId,input.roomId);',
        "shape speaker destructure",
    )

    s = rep(
        s,
        '    await npcMessage(a,npc,userId,input.roomId,`◆ ${s.name} · Shape Level ${s.level} · Target: ${targetText}${resolved?` · ${resolved}`:""}`);',
        '    await npcMessage(a,npc,userId,speakerCharacterId,input.roomId,`◆ Warp [${s.name}] · Level [${s.level}] · ${targetIds.length>1?"Targets":"Target"} [${targetText}]${resolved?` · ${resolved}`:""}`);',
        "shape room message",
    )

    return s


def patch_gifts(source: str) -> str:
    s = source

    s = rep(
        s,
        'type Character = { id: string; display_name: string };',
        'type Character = { id: string; display_name: string; is_system: boolean };',
        "gift admin Character type",
    )

    s = rep(
        s,
        '.select("id, display_name")\n        .eq("status", "approved")\n      .eq("is_system", false)\n        .order("display_name", { ascending: true }),',
        '.select("id, display_name, is_system")\n        .eq("status", "approved")\n        .order("display_name", { ascending: true }),',
        "include NPCs in Feat assignment",
    )

    s = rep(
        s,
        '{character.display_name}\n                      </option>',
        '{character.display_name}{character.is_system ? " (NPC)" : ""}\n                      </option>',
        "NPC Feat assignment label",
    )

    return s


def apply():
    current = head()
    print(f"Current HEAD: {current}")
    if current != BASE:
        print(f"WARNING: this patch was built against {BASE}; current HEAD is {current}.")

    # Validate all changes in memory first so a failed match cannot leave a partial patch.
    panel_new = patch_panel(read(PANEL))
    mech_new = patch_mechanics(read(MECH))
    gifts_new = patch_gifts(read(GIFTS))

    backup()

    (ROOT / PANEL).write_text(panel_new, encoding="utf-8")
    (ROOT / MECH).write_text(mech_new, encoding="utf-8")
    (ROOT / GIFTS).write_text(gifts_new, encoding="utf-8")

    print("\nPATCH APPLIED LOCALLY ONLY.")
    print("Nothing committed or pushed.")
    print("No SQL changes required.")
    print("\nNow run: npm run build")
    print("Revert: python patch_npc_mechanics_same_as_characters_83e76bc.py --revert")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--revert", action="store_true")
    args = parser.parse_args()
    revert() if args.revert else apply()


if __name__ == "__main__":
    main()
