#!/usr/bin/env python3
# Sepulchria NPC parity fixes for repository state 396a15b.
#
# Fixes:
# 1. Character -> NPC targeted Feats, including Shape-backed Feats.
# 2. NPC editor no longer overwrites Biography / Physical Description.
# 3. NPC editor is authoritative for NPC name; backing Character surname is cleared.
# 4. Stats & Feats no longer edits NPC First name / Surname.
# 5. Admin save preserves NPC identity even if those fields are absent/spoofed.
#
# This script ONLY edits local source files.
# It does NOT commit, push, or contact Supabase.
#
# Run from the repository root:
#     python patch_npc_parity_fixes_396a15b.py
#
# Then:
#     npm run build
#
# Database fixes are in the separate SQL file supplied alongside this patch.

from pathlib import Path
import subprocess

EXPECTED_HEAD = "396a15b"
ROOT = Path.cwd()


def die(message: str) -> None:
    raise SystemExit(f"\nERROR: {message}\n")


def read(path: str) -> str:
    p = ROOT / path
    if not p.exists():
        die(f"Missing expected file: {path}")
    return p.read_text(encoding="utf-8")


def write(path: str, content: str) -> None:
    (ROOT / path).write_text(content, encoding="utf-8")


def replace_exact(content: str, old: str, new: str, label: str, expected: int = 1) -> str:
    count = content.count(old)
    if count != expected:
        die(f"{label}: expected {expected} match(es), found {count}.")
    return content.replace(old, new)


def check_head() -> None:
    try:
        head = subprocess.check_output(
            ["git", "rev-parse", "--short=7", "HEAD"],
            cwd=ROOT,
            text=True,
            stderr=subprocess.DEVNULL,
        ).strip()
    except Exception:
        die("Run this script from the sepulchria-portal Git repository root.")

    if head != EXPECTED_HEAD:
        die(
            f"This patch was built against {EXPECTED_HEAD}, but local HEAD is {head}. "
            "Checkout/pull the intended commit first, or regenerate the patch for the newer state."
        )


check_head()
changes: dict[str, str] = {}

# ---------------------------------------------------------------------
# 1A. Ordinary targeted Feats:
# Allow a system Character only when it is a real active/location-active
# NPC in the same Location.
# ---------------------------------------------------------------------
path = "app/(portal)/game/actions.ts"
src = read(path)

old = '''  if (
    targetError ||
    !target ||
    target.status !== "approved" ||
    target.is_system ||
    target.current_room_id !== roomId
  ) {
    throw new Error(
      targetError?.message ??
        "That character cannot currently be targeted.",
    );
  }

  return {
'''
new = '''  if (
    targetError ||
    !target ||
    target.status !== "approved" ||
    target.current_room_id !== roomId
  ) {
    throw new Error(
      targetError?.message ??
        "That character cannot currently be targeted.",
    );
  }

  if (target.is_system) {
    const admin = createPrivilegedClient();

    const {
      data: npcTarget,
      error: npcTargetError,
    } = await admin
      .from("npcs")
      .select("id")
      .eq("character_id", target.id)
      .eq("is_active", true)
      .eq("is_location_active", true)
      .eq("current_room_id", roomId)
      .maybeSingle();

    if (npcTargetError || !npcTarget) {
      throw new Error(
        npcTargetError?.message ??
          "That character cannot currently be targeted.",
      );
    }
  }

  return {
'''
src = replace_exact(src, old, new, f"{path}: ordinary Feat NPC target")
changes[path] = src

# ---------------------------------------------------------------------
# 1B. Shape-backed / advanced Feats:
# Apply the same active-NPC rule to multi-target validation.
# ---------------------------------------------------------------------
path = "app/(portal)/game/feat-mechanics-actions.ts"
src = read(path)

old = '''      if (targetError) throw new Error(targetError.message);

      for (const target of targetRows ?? []) {
        if (
          target.current_room_id !== character.current_room_id ||
          target.status !== "approved" ||
          target.is_system
        ) {
          throw new Error(
            "One or more selected targets cannot currently be targeted.",
          );
        }
        targetNames.set(target.id, target.display_name);
      }
'''
new = '''      if (targetError) throw new Error(targetError.message);

      const systemTargetIds =
        (targetRows ?? [])
          .filter((target) => target.is_system)
          .map((target) => String(target.id));

      const activeNpcTargetIds = new Set<string>();

      if (systemTargetIds.length > 0) {
        const {
          data: npcTargets,
          error: npcTargetsError,
        } = await admin
          .from("npcs")
          .select("character_id")
          .in("character_id", systemTargetIds)
          .eq("is_active", true)
          .eq("is_location_active", true)
          .eq("current_room_id", character.current_room_id);

        if (npcTargetsError) {
          throw new Error(npcTargetsError.message);
        }

        for (const npc of npcTargets ?? []) {
          if (npc.character_id) {
            activeNpcTargetIds.add(String(npc.character_id));
          }
        }
      }

      for (const target of targetRows ?? []) {
        if (
          target.current_room_id !== character.current_room_id ||
          target.status !== "approved" ||
          (
            target.is_system &&
            !activeNpcTargetIds.has(String(target.id))
          )
        ) {
          throw new Error(
            "One or more selected targets cannot currently be targeted.",
          );
        }
        targetNames.set(target.id, target.display_name);
      }
'''
src = replace_exact(src, old, new, f"{path}: Shape-backed Feat NPC targets")
changes[path] = src

# ---------------------------------------------------------------------
# 3A. NPC server actions:
# - remove Description ownership from NPC modal
# - make the one-field NPC Name authoritative
# - clear backing surname to prevent "John Little Little"
# - never overwrite Biography / Physical Description during NPC edits
# ---------------------------------------------------------------------
path = "app/(portal)/game/npc-actions.ts"
src = read(path)

src = replace_exact(
    src,
    'export async function createNpc(input:{roomId:string;name:string;pronouns?:string;portraitUrl?:string;description?:string;raceId?:string;orderId?:string}){',
    'export async function createNpc(input:{roomId:string;name:string;pronouns?:string;portraitUrl?:string;raceId?:string;orderId?:string}){',
    f"{path}: createNpc signature",
)

src = replace_exact(
    src,
    '    const raceId=clean(input.raceId,64), orderId=clean(input.orderId,64), description=clean(input.description,2000), portraitUrl=clean(input.portraitUrl,800), pronouns=clean(input.pronouns,80);',
    '    const raceId=clean(input.raceId,64), orderId=clean(input.orderId,64), portraitUrl=clean(input.portraitUrl,800), pronouns=clean(input.pronouns,80);',
    f"{path}: createNpc values",
)

src = replace_exact(
    src,
    '    const cr=await admin.from("characters").insert({id:npcId,user_id:null,first_name:name,surname:"",pronouns,portrait_url:portraitUrl,physical_description:description??"NPC",personality:"Staff-controlled NPC.",biography:description??"Staff-controlled NPC.",public_slug:`npc-${npcId.replace(/-/g,"")}`,status:"approved",approved_at:new Date().toISOString(),current_room_id:input.roomId,race_id:raceId,title:"NPC",is_system:true,muscles:3,reflexes:3,vigor:3,brains:3,shrewd:3,presence_score:3,current_health:30});',
    '    const cr=await admin.from("characters").insert({id:npcId,user_id:null,first_name:name,surname:"",pronouns,portrait_url:portraitUrl,physical_description:"NPC",personality:"Staff-controlled NPC.",biography:"Staff-controlled NPC.",public_slug:`npc-${npcId.replace(/-/g,"")}`,status:"approved",approved_at:new Date().toISOString(),current_room_id:input.roomId,race_id:raceId,title:"NPC",is_system:true,muscles:3,reflexes:3,vigor:3,brains:3,shrewd:3,presence_score:3,current_health:30});',
    f"{path}: backing Character create defaults",
)

src = replace_exact(
    src,
    '    const result=await admin.from("npcs").insert({id:npcId,character_id:npcId,name,pronouns,portrait_url:portraitUrl,description,race_id:raceId,order_id:orderId,current_room_id:input.roomId,is_active:true,is_location_active:true,created_by_user_id:user.id,updated_by_user_id:user.id});',
    '    const result=await admin.from("npcs").insert({id:npcId,character_id:npcId,name,pronouns,portrait_url:portraitUrl,description:null,race_id:raceId,order_id:orderId,current_room_id:input.roomId,is_active:true,is_location_active:true,created_by_user_id:user.id,updated_by_user_id:user.id});',
    f"{path}: NPC create description",
)

src = replace_exact(
    src,
    'export async function updateNpc(input:{npcId:string;roomId:string;name:string;pronouns?:string;portraitUrl?:string;description?:string;raceId?:string;orderId?:string;isActive:boolean;isLocationActive:boolean;moveHere:boolean}){',
    'export async function updateNpc(input:{npcId:string;roomId:string;name:string;pronouns?:string;portraitUrl?:string;raceId?:string;orderId?:string;isActive:boolean;isLocationActive:boolean;moveHere:boolean}){',
    f"{path}: updateNpc signature",
)

src = replace_exact(
    src,
    '    const name=cleanName(input.name),raceId=clean(input.raceId,64),orderId=clean(input.orderId,64),portraitUrl=clean(input.portraitUrl,800),pronouns=clean(input.pronouns,80),description=clean(input.description,2000);',
    '    const name=cleanName(input.name),raceId=clean(input.raceId,64),orderId=clean(input.orderId,64),portraitUrl=clean(input.portraitUrl,800),pronouns=clean(input.pronouns,80);',
    f"{path}: updateNpc values",
)

src = replace_exact(
    src,
    '    const update:any={name,pronouns,portrait_url:portraitUrl,description,race_id:raceId,order_id:orderId,is_active:input.isActive,is_location_active:input.isLocationActive,updated_by_user_id:user.id,updated_at:new Date().toISOString()};',
    '    const update:any={name,pronouns,portrait_url:portraitUrl,race_id:raceId,order_id:orderId,is_active:input.isActive,is_location_active:input.isLocationActive,updated_by_user_id:user.id,updated_at:new Date().toISOString()};',
    f"{path}: NPC row update",
)

src = replace_exact(
    src,
    '    const cu:any={first_name:name,pronouns,portrait_url:portraitUrl,physical_description:description??"NPC",biography:description??"Staff-controlled NPC.",race_id:raceId,updated_at:new Date().toISOString()}; if(input.moveHere) cu.current_room_id=input.roomId;',
    '    const cu:any={first_name:name,surname:"",pronouns,portrait_url:portraitUrl,race_id:raceId,updated_at:new Date().toISOString()}; if(input.moveHere) cu.current_room_id=input.roomId;',
    f"{path}: backing Character sync",
)

changes[path] = src

# ---------------------------------------------------------------------
# 3B. NPC Control modal:
# Remove Description state, synchronization, arguments and textarea.
# ---------------------------------------------------------------------
path = "app/(portal)/game/components/NpcControlPanel.tsx"
src = read(path)

src = replace_exact(
    src,
    '  const [portraitUrl,setPortraitUrl]=useState(""); const [description,setDescription]=useState("");',
    '  const [portraitUrl,setPortraitUrl]=useState("");',
    f"{path}: description state",
)

src = replace_exact(
    src,
    '    setDescription(selected.description??"");setRaceId(selected.race_id??"");setOrderId(selected.order_id??"");setActive(selected.is_active);setLocationActive(selected.is_location_active);',
    '    setRaceId(selected.race_id??"");setOrderId(selected.order_id??"");setActive(selected.is_active);setLocationActive(selected.is_location_active);',
    f"{path}: selected description synchronization",
    expected=2,
)

src = replace_exact(
    src,
    '    setDescription("");setRaceId("");setOrderId("");setActive(true);setLocationActive(true);setStatus("");',
    '    setRaceId("");setOrderId("");setActive(true);setLocationActive(true);setStatus("");',
    f"{path}: beginCreate description",
)

src = replace_exact(
    src,
    '        ? await createNpc({roomId,name,pronouns,portraitUrl,description,raceId,orderId})',
    '        ? await createNpc({roomId,name,pronouns,portraitUrl,raceId,orderId})',
    f"{path}: create call",
)

src = replace_exact(
    src,
    '          ? await updateNpc({npcId:selected.id,roomId,name,pronouns,portraitUrl,description,raceId,orderId,isActive:active,isLocationActive:locationActive,moveHere:selected.current_room_id!==roomId})',
    '          ? await updateNpc({npcId:selected.id,roomId,name,pronouns,portraitUrl,raceId,orderId,isActive:active,isLocationActive:locationActive,moveHere:selected.current_room_id!==roomId})',
    f"{path}: update call",
)

src = replace_exact(
    src,
    '''        <label className="mt-3 block text-[8px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-8f8170))]">Description<textarea value={description} onChange={e=>setDescription(e.target.value)} rows={4} className={inputClass+" resize-y"}/></label>

''',
    '',
    f"{path}: Description field",
)

changes[path] = src

# ---------------------------------------------------------------------
# 3C. Stats & Feats:
# First name / Surname remain visible/editable for ordinary Characters,
# but are not rendered for NPCs.
# ---------------------------------------------------------------------
path = "app/(portal)/admin/characters/[id]/page.tsx"
src = read(path)

old = '''                  <AdminField label="First name">
                    <input
                      type="text"
                      name="firstName"
                      required
                      maxLength={80}
                      defaultValue={
                        character.first_name
                      }
                      className="w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-3 py-3 text-sm text-[rgb(var(--sep-colour-d7c4a5))] outline-none focus:border-[rgb(var(--sep-colour-a17a49))] admin_characters_id_page_input_first_name"
                    />
                  </AdminField>

                  <AdminField label="Surname">
                    <input
                      type="text"
                      name="surname"
                      required={!isNpc}
                      maxLength={80}
                      defaultValue={
                        character.surname
                      }
                      className="w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-3 py-3 text-sm text-[rgb(var(--sep-colour-d7c4a5))] outline-none focus:border-[rgb(var(--sep-colour-a17a49))] admin_characters_id_page_input_surname"
                    />
                  </AdminField>

'''
new = '''                  {!isNpc ? (
                    <>
                      <AdminField label="First name">
                        <input
                          type="text"
                          name="firstName"
                          required
                          maxLength={80}
                          defaultValue={
                            character.first_name
                          }
                          className="w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-3 py-3 text-sm text-[rgb(var(--sep-colour-d7c4a5))] outline-none focus:border-[rgb(var(--sep-colour-a17a49))] admin_characters_id_page_input_first_name"
                        />
                      </AdminField>

                      <AdminField label="Surname">
                        <input
                          type="text"
                          name="surname"
                          required
                          maxLength={80}
                          defaultValue={
                            character.surname
                          }
                          className="w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-3 py-3 text-sm text-[rgb(var(--sep-colour-d7c4a5))] outline-none focus:border-[rgb(var(--sep-colour-a17a49))] admin_characters_id_page_input_surname"
                        />
                      </AdminField>
                    </>
                  ) : null}

'''
src = replace_exact(src, old, new, f"{path}: hide NPC names")
changes[path] = src

# ---------------------------------------------------------------------
# 3D. Stats & Feats server action:
# Preserve current NPC identity from the DB even when the fields are absent.
# This also prevents a crafted form POST from taking ownership of NPC naming.
# ---------------------------------------------------------------------
path = "app/(portal)/admin/characters/actions.ts"
src = read(path)

old = '''  if (
    !firstName ||
    (
      !surname &&
      !isNpcCharacter
    )
  ) {
    throw new Error(
      isSystemCharacter
        ? "NPC name is required."
        : "First name and surname are required.",
    );
  }
'''
new = '''  if (
    !isNpcCharacter &&
    (
      !firstName ||
      !surname
    )
  ) {
    throw new Error(
      "First name and surname are required.",
    );
  }
'''
src = replace_exact(src, old, new, f"{path}: identity validation")

old = '''  const raceIds = [
  character.race_id,
  raceId,
].filter(
'''
new = '''  const effectiveFirstName =
    isNpcCharacter
      ? character.first_name
      : firstName;

  const effectiveSurname =
    isNpcCharacter
      ? character.surname
      : surname;

  const raceIds = [
  character.race_id,
  raceId,
].filter(
'''
src = replace_exact(src, old, new, f"{path}: effective NPC identity")

old = '''    if (!firstName) {
      missingFields.push(
        "first name",
      );
    }

    if (
      !surname &&
      !isNpcCharacter
    ) {
      missingFields.push(
        "surname",
      );
    }
'''
new = '''    if (!effectiveFirstName) {
      missingFields.push(
        "first name",
      );
    }

    if (
      !effectiveSurname &&
      !isNpcCharacter
    ) {
      missingFields.push(
        "surname",
      );
    }
'''
src = replace_exact(src, old, new, f"{path}: approval identity checks")

old = '''      first_name: firstName,
      surname:
        surname ??
        (
          isNpcCharacter
            ? ""
            : surname
        ),
'''
new = '''      first_name:
        effectiveFirstName,
      surname:
        effectiveSurname,
'''
src = replace_exact(src, old, new, f"{path}: preserve NPC identity payload")

changes[path] = src

# Write only after every assertion has succeeded.
for changed_path, content in changes.items():
    write(changed_path, content)

print("Applied local source patch successfully.")
print("Changed files:")
for changed_path in changes:
    print(f"  - {changed_path}")
print()
print("No git commit was created. Nothing was pushed. Supabase was not contacted.")
print("Next: run `npm run build`, then apply the supplied SQL manually in Supabase.")
