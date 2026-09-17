from pathlib import Path
import subprocess
import sys

EXPECTED_HEAD = "56e500c28bc595b64af4384e11abd1ef5db987dd"
ROOT = Path.cwd()

PATHS = {
    "admin": ROOT / "app/(portal)/admin/shapes/actions.ts",
    "panel": ROOT / "app/(portal)/game/components/WarpingPanel.tsx",
    "server": ROOT / "app/(portal)/game/warping-actions.ts",
    "pending": ROOT / "app/(portal)/game/components/PendingShapeResponses.tsx",
}


def git(*args: str) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        ["git", *args],
        cwd=ROOT,
        text=True,
        capture_output=True,
    )


def die(message: str) -> None:
    print(f"\nSTOP: {message}\nNo source files were changed.")
    sys.exit(1)


def replace_exact(text: str, old: str, new: str, label: str, expected: int = 1) -> str:
    count = text.count(old)
    if count != expected:
        raise RuntimeError(f"{label}: expected {expected} match(es), found {count}")
    return text.replace(old, new, expected)


def remove_balanced_if(text: str, start_search: int, needle: str, label: str) -> str:
    start = text.find(needle, start_search)
    if start < 0:
        raise RuntimeError(f"{label}: start not found")
    brace = text.find("{", start)
    if brace < 0:
        raise RuntimeError(f"{label}: opening brace not found")
    depth = 0
    end = None
    for i in range(brace, len(text)):
        ch = text[i]
        if ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0:
                end = i + 1
                break
    if end is None:
        raise RuntimeError(f"{label}: closing brace not found")
    while end < len(text) and text[end] in " \t":
        end += 1
    if end < len(text) and text[end] == "\r":
        end += 1
    if end < len(text) and text[end] == "\n":
        end += 1
    return text[:start] + text[end:]


# ---------------------------------------------------------------------------
# Safety checks
# ---------------------------------------------------------------------------
for path in PATHS.values():
    if not path.exists():
        die(f"Missing {path.relative_to(ROOT)}. Run this from the sepulchria-portal repository root.")

head = git("rev-parse", "HEAD")
if head.returncode != 0:
    die(head.stderr.strip() or "Unable to read Git HEAD.")
head_sha = head.stdout.strip()
if head_sha != EXPECTED_HEAD:
    die(f"Current HEAD is {head_sha}, but this patch was built for {EXPECTED_HEAD}.")

# Refuse to overwrite local edits in the four files being patched.
for path in PATHS.values():
    rel = str(path.relative_to(ROOT)).replace("\\", "/")
    diff = git("diff", "--quiet", "--", rel)
    if diff.returncode == 1:
        die(f"{rel} has local uncommitted edits. Commit/stash/revert that file first.")
    if diff.returncode not in (0, 1):
        die(diff.stderr.strip() or f"Unable to inspect {rel}.")

original = {key: path.read_text(encoding="utf-8") for key, path in PATHS.items()}
new = dict(original)

try:
    # -----------------------------------------------------------------------
    # A) Admin Shape editor: Dispel no longer erases normal Shape mechanics.
    # -----------------------------------------------------------------------
    admin = new["admin"]

    line_replacements = {
        'damage_type:dispel?null:(txt(f,"damage_type")||null),':
            'damage_type:txt(f,"damage_type")||null,',
        'self_damage_dice:dispel?null:(txt(f,"self_damage_dice")||null),':
            'self_damage_dice:txt(f,"self_damage_dice")||null,',
        'self_damage_attribute:dispel?null:(txt(f,"self_damage_attribute")||null),':
            'self_damage_attribute:txt(f,"self_damage_attribute")||null,',
        'self_heal_dice:dispel?null:(txt(f,"self_heal_dice")||null),':
            'self_heal_dice:txt(f,"self_heal_dice")||null,',
        'self_heal_attribute:dispel?null:(txt(f,"self_heal_attribute")||null),':
            'self_heal_attribute:txt(f,"self_heal_attribute")||null,',
        'self_max_hp_change:dispel?null:(txt(f,"self_max_hp_change")||null),':
            'self_max_hp_change:txt(f,"self_max_hp_change")||null,',
        'self_conditions:dispel?[]:csv(f,"self_conditions"),':
            'self_conditions:csv(f,"self_conditions"),',
        'other_damage_dice:dispel?null:(txt(f,"other_damage_dice")||null),':
            'other_damage_dice:txt(f,"other_damage_dice")||null,',
        'other_damage_attribute:dispel?null:(txt(f,"other_damage_attribute")||null),':
            'other_damage_attribute:txt(f,"other_damage_attribute")||null,',
        'other_heal_dice:dispel?null:(txt(f,"other_heal_dice")||null),':
            'other_heal_dice:txt(f,"other_heal_dice")||null,',
        'other_heal_attribute:dispel?null:(txt(f,"other_heal_attribute")||null),':
            'other_heal_attribute:txt(f,"other_heal_attribute")||null,',
        'other_max_hp_change:dispel?null:(txt(f,"other_max_hp_change")||null),':
            'other_max_hp_change:txt(f,"other_max_hp_change")||null,',
        'other_conditions:dispel?[]:csv(f,"other_conditions"),':
            'other_conditions:csv(f,"other_conditions"),',
        'other_alternative_enabled:!dispel&&targetMode!=="self"&&targetMode!=="written"&&alt,':
            'other_alternative_enabled:targetMode!=="self"&&targetMode!=="written"&&alt,',
        'other_alt_damage_dice:(!dispel&&alt)?(txt(f,"other_alt_damage_dice")||null):null,':
            'other_alt_damage_dice:alt?(txt(f,"other_alt_damage_dice")||null):null,',
        'other_alt_damage_attribute:(!dispel&&alt)?(txt(f,"other_alt_damage_attribute")||null):null,':
            'other_alt_damage_attribute:alt?(txt(f,"other_alt_damage_attribute")||null):null,',
        'other_alt_heal_dice:(!dispel&&alt)?(txt(f,"other_alt_heal_dice")||null):null,':
            'other_alt_heal_dice:alt?(txt(f,"other_alt_heal_dice")||null):null,',
        'other_alt_heal_attribute:(!dispel&&alt)?(txt(f,"other_alt_heal_attribute")||null):null,':
            'other_alt_heal_attribute:alt?(txt(f,"other_alt_heal_attribute")||null):null,',
        'other_alt_max_hp_change:(!dispel&&alt)?(txt(f,"other_alt_max_hp_change")||null):null,':
            'other_alt_max_hp_change:alt?(txt(f,"other_alt_max_hp_change")||null):null,',
        'other_alt_conditions:(!dispel&&alt)?csv(f,"other_alt_conditions"):[],':
            'other_alt_conditions:alt?csv(f,"other_alt_conditions"):[],',
    }
    for old, replacement in line_replacements.items():
        admin = replace_exact(admin, old, replacement, f"admin payload: {old[:40]}")

    for stat in ("muscles", "reflexes", "vigour", "brains", "shrewd", "presence"):
        admin = replace_exact(
            admin,
            f'self_{stat}_modifier:dispel?0:nint(f,"self_{stat}_modifier"),',
            f'self_{stat}_modifier:nint(f,"self_{stat}_modifier"),',
            f"admin self {stat}",
        )
        admin = replace_exact(
            admin,
            f'other_{stat}_modifier:dispel?0:nint(f,"other_{stat}_modifier"),',
            f'other_{stat}_modifier:nint(f,"other_{stat}_modifier"),',
            f"admin other {stat}",
        )
        admin = replace_exact(
            admin,
            f'other_alt_{stat}_modifier:(!dispel&&alt)?nint(f,"other_alt_{stat}_modifier"):0,',
            f'other_alt_{stat}_modifier:alt?nint(f,"other_alt_{stat}_modifier"):0,',
            f"admin alt {stat}",
        )

    admin = replace_exact(
        admin,
        '    p.is_instantaneous&&\n    !p.is_dispel&&\n    persistent',
        '    p.is_instantaneous&&\n    persistent',
        "instantaneous persistent validation",
        expected=2,
    )
    new["admin"] = admin

    # -----------------------------------------------------------------------
    # B) WarpingPanel: independent normal target(s) and independent Dispel target.
    # -----------------------------------------------------------------------
    panel = new["panel"]

    panel = replace_exact(
        panel,
        '''  const [\n    dispelEffects,\n    setDispelEffects,\n  ] = useState<any[]>([]);'''.replace('\\n', '\n'),
        '''  const [\n    dispelTarget,\n    setDispelTarget,\n  ] = useState("");\n\n  const [\n    dispelEffects,\n    setDispelEffects,\n  ] = useState<any[]>([]);'''.replace('\\n', '\n'),
        "add dispelTarget state",
    )

    panel = replace_exact(panel, '        targets.length !== 1', '        !dispelTarget', "dispel loader condition")
    panel = replace_exact(panel, '          p_character_id:\n            targets[0],', '          p_character_id:\n            dispelTarget,', "dispel loader character")
    panel = replace_exact(panel, '    s?.level,\n    targets,\n  ]);', '    s?.level,\n    dispelTarget,\n  ]);', "dispel loader dependencies")
    panel = replace_exact(panel, '      ) &&\n      !s?.is_dispel', '      )', "normal duplicate-effect target blocking")

    panel = replace_exact(
        panel,
        '        (!targets.length ||\n          !selectedDispelEffect)',
        '        (!dispelTarget ||\n          !selectedDispelEffect)',
        "dispel cast validation",
    )
    panel = replace_exact(
        panel,
        '          "Choose an active effect to dispel before Warping.",',
        '          "Choose a Dispel target and an active effect to dispel before Warping.",',
        "dispel cast validation message",
    )

    panel = replace_exact(
        panel,
        '''      if (\n        !wt &&\n        !s.is_dispel\n      ) {'''.replace('\\n', '\n'),
        '      if (!wt) {',
        "allow normal automatic resolution for Dispel Shapes",
    )
    panel = replace_exact(panel, '          "target_character_id",\n          targets[0],', '          "target_character_id",\n          dispelTarget,', "prepare independent Dispel target")

    panel = replace_exact(
        panel,
        '''      setSelectedDispelEffect(\n        "",\n      );\n      setDispelEffects([]);'''.replace('\\n', '\n'),
        '''      setSelectedDispelEffect(\n        "",\n      );\n      setDispelEffects([]);\n      setDispelTarget("");'''.replace('\\n', '\n'),
        "reset Dispel selection after cast",
    )

    panel = replace_exact(
        panel,
        '''              setDispelEffects(\n                [],\n              );\n              setSelectedDispelEffect('''.replace('\\n', '\n'),
        '''              setDispelEffects(\n                [],\n              );\n              setDispelTarget("");\n              setSelectedDispelEffect('''.replace('\\n', '\n'),
        "reset Dispel selection when Shape changes",
    )

    # Changing the normal target mode to Written/Fate must NOT erase the independent Dispel choice.
    panel = replace_exact(
        panel,
        '''                  setTargetEffectChoices(\n                    {},\n                  );\n\n                  setDispelEffects(\n                    [],\n                  );\n\n                  setSelectedDispelEffect(\n                    "",\n                  );'''.replace('\\n', '\n'),
        '''                  setTargetEffectChoices(\n                    {},\n                  );'''.replace('\\n', '\n'),
        "preserve Dispel choice when switching normal target to Written/Fate",
    )

    panel = replace_exact(
        panel,
        '''              (!blockedTargets.includes(\n                r.character_id,\n              ) ||\n                s?.is_dispel) ? ('''.replace('\\n', '\n'),
        '''              !blockedTargets.includes(\n                r.character_id,\n              ) ? ('''.replace('\\n', '\n'),
        "normal self target availability",
    )
    panel = replace_exact(
        panel,
        '''                    (!blockedTargets.includes(\n                      c.id,\n                    ) ||\n                      s?.is_dispel),'''.replace('\\n', '\n'),
        '''                    !blockedTargets.includes(\n                      c.id,\n                    ),'''.replace('\\n', '\n'),
        "normal other target availability",
    )

    # Replace the old same-target Dispel picker with a separate character picker + effect picker.
    ui_start_needle = '''          {s?.is_dispel &&\n          targets.length ===\n            1 ? ('''.replace('\\n', '\n')
    ui_start = panel.find(ui_start_needle)
    if ui_start < 0:
        raise RuntimeError("old same-target Dispel UI start not found")
    ui_end_needle = '''          {access &&\n          !access.allowed ? ('''.replace('\\n', '\n')
    ui_end = panel.find(ui_end_needle, ui_start)
    if ui_end < 0:
        raise RuntimeError("old same-target Dispel UI end not found")

    independent_ui = '''          {s?.is_dispel ? (\n            <div className="mt-3 border border-[rgb(var(--sep-colour-60482e))]/35 bg-[rgb(var(--sep-colour-15100d))] p-3 game_components_warpingpanel_div_container_12">\n              <p className="text-[8px] uppercase tracking-[.14em] text-[rgb(var(--sep-colour-806b50))] game_components_warpingpanel_p_text_9">\n                Dispel Target\n              </p>\n\n              <div className="mt-2 flex flex-wrap gap-2">\n                <button\n                  type="button"\n                  onClick={() => {\n                    setDispelTarget(r.character_id);\n                    setSelectedDispelEffect("");\n                  }}\n                  aria-pressed={dispelTarget === r.character_id}\n                  className={[\n                    "border px-3 py-2 text-[9px] transition",\n                    dispelTarget === r.character_id\n                      ? "border-[rgb(var(--sep-skin-c1))] bg-[rgb(var(--sep-skin-c1))]/25 text-[rgb(var(--sep-skin-c2))]"\n                      : "border-[rgb(var(--sep-colour-60482e))]/55",\n                  ].join(" ")}\n                >\n                  {dispelTarget === r.character_id ? "✓ Self" : "Self"}\n                </button>\n\n                {presentCharacters\n                  .filter(c => c.id !== r.character_id)\n                  .map(c => {\n                    const selected = dispelTarget === c.id;\n\n                    return (\n                      <button\n                        key={c.id}\n                        type="button"\n                        onClick={() => {\n                          setDispelTarget(c.id);\n                          setSelectedDispelEffect("");\n                        }}\n                        aria-pressed={selected}\n                        className={[\n                          "border px-3 py-2 text-[9px] transition",\n                          selected\n                            ? "border-[rgb(var(--sep-skin-c1))] bg-[rgb(var(--sep-skin-c1))]/25 text-[rgb(var(--sep-skin-c2))]"\n                            : "border-[rgb(var(--sep-colour-60482e))]/55",\n                        ].join(" ")}\n                      >\n                        {selected ? "✓ " : ""}\n                        {c.display_name ?? c.displayName}\n                      </button>\n                    );\n                  })}\n              </div>\n\n              {dispelTarget ? (\n                <>\n                  <p className="mt-3 text-[8px] uppercase tracking-[.14em] text-[rgb(var(--sep-colour-806b50))]">\n                    Effect to Dispel\n                  </p>\n\n                  {dispelEffects.length ? (\n                    <select\n                      value={selectedDispelEffect}\n                      onChange={e => setSelectedDispelEffect(e.target.value)}\n                      className="mt-2 w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-0f0c09))] px-3 py-2 text-[10px] text-[rgb(var(--sep-colour-d8c29b))] game_components_warpingpanel_select_select_2"\n                    >\n                      <option value="">Choose active effect...</option>\n                      {dispelEffects.map((e: any) => (\n                        <option key={e.id} value={e.id}>\n                          {e.shape_name} · Level {e.shape_level} · {e.effect_nature}\n                        </option>\n                      ))}\n                    </select>\n                  ) : (\n                    <p className="mt-2 text-[9px] text-[rgb(var(--sep-colour-887865))] game_components_warpingpanel_p_text_10">\n                      This character has no active effect that this Level {s.level} Dispel can remove.\n                    </p>\n                  )}\n                </>\n              ) : (\n                <p className="mt-2 text-[9px] text-[rgb(var(--sep-colour-887865))]">\n                  Choose the character whose active Shape effect you want to dispel.\n                </p>\n              )}\n            </div>\n          ) : null}\n\n'''.replace('\\n', '\n')
    panel = panel[:ui_start] + independent_ui + panel[ui_end:]

    panel = replace_exact(
        panel,
        '''              ) &&\n                !selectedDispelEffect)'''.replace('\\n', '\n'),
        '''              ) &&\n                (!dispelTarget ||\n                  !selectedDispelEffect))'''.replace('\\n', '\n'),
        "Warp button independent Dispel validation",
    )

    # Include the independent Dispel target name in the room action text.
    old_dispel_message = '''        if (de) {\n          parts.push(\n            `Dispels [${de.shape_name} - Level ${de.shape_level}]`,\n          );\n        }'''.replace('\\n', '\n')
    new_dispel_message = '''        if (de) {\n          const dispelTargetName =\n            dispelTarget === me.data.id\n              ? "Self"\n              : presentCharacters.find(c => c.id === dispelTarget)?.display_name ??\n                presentCharacters.find(c => c.id === dispelTarget)?.displayName ??\n                "Unknown";\n\n          parts.push(\n            `Dispels [${de.shape_name} - Level ${de.shape_level} from ${dispelTargetName}]`,\n          );\n        }'''.replace('\\n', '\n')
    panel = replace_exact(panel, old_dispel_message, new_dispel_message, "Dispel room message target")

    new["panel"] = panel

    # -----------------------------------------------------------------------
    # C) Server mechanics.
    # -----------------------------------------------------------------------
    server = new["server"]

    immediate_guard = '''    /*\n     * Dispel has its own preparation / response resolver and must not\n     * use the ordinary Shape payload path here.\n     */\n    if (shape.is_dispel) {\n      return {\n        ok: true,\n        message: "",\n        submittedAt:\n          Date.now(),\n      };\n    }\n\n'''.replace('\\n', '\n')
    server = replace_exact(server, immediate_guard, "", "remove Dispel skip from immediate normal mechanics")

    # Normal incoming saves for a Dispel Shape must use the normal Shape resolver.
    resolve_start = server.find("export async function resolveIncomingShape")
    if resolve_start < 0:
        raise RuntimeError("resolveIncomingShape not found")
    server = remove_balanced_if(server, resolve_start, " if(s.is_dispel){", "remove old same-target Dispel branch from resolveIncomingShape")

    prepare_start = server.find("export async function prepareDispelEffect")
    if prepare_start < 0:
        raise RuntimeError("prepareDispelEffect not found")

    server_tail = r'''export async function prepareDispelEffect(_p:WarpingActionState,f:FormData):Promise<WarpingActionState>{try{
 const caster=await mine(),castId=field(f,"cast_id"),effectId=field(f,"effect_id"),targetId=field(f,"target_character_id"),a=admin();
 const cq=await a.from("shape_casts").select("id,room_id,shape:shapes!shape_casts_shape_id_fkey(id,name,level,is_dispel,other_resolution_mode,other_dc_attribute,other_save_options,other_save_success_damage,self_resolution_mode,self_dc_attribute,self_save_options,self_save_success_damage,resolution_mode,dc_attribute,save_options,save_success_damage)").eq("id",castId).eq("caster_character_id",caster.id).maybeSingle();
 const cast:any=cq.data,shape=one(cast?.shape);if(cq.error||!cast||!shape?.is_dispel)throw Error("Invalid Dispel cast.");
 const eq=await a.from("character_shape_effects").select("id,shape_level,effect_nature,shape:shapes!character_shape_effects_shape_id_fkey(name)").eq("id",effectId).eq("target_character_id",targetId).is("dispelled_at",null).maybeSingle();if(eq.error||!eq.data)throw Error("Active effect not found.");
 if(Number(shape.level)<Number(eq.data.shape_level))throw Error(`Dispel failed: Level ${shape.level} cannot dispel Level ${eq.data.shape_level}.`);
 const stored=await a.from("shape_casts").update({dispel_target_character_id:targetId,dispel_effect_id:effectId}).eq("id",castId).eq("caster_character_id",caster.id);if(stored.error)throw Error(stored.error.message);
 const effectShape:any=one(eq.data.shape as any);
 const fakeTarget={target_character_id:targetId,other_effect_choice:"beneficial"};
 const dispelResolution=profileResolution(shape,effectProfile(shape,fakeTarget,caster.id));
 if(eq.data.effect_nature==="harmful"||dispelResolution.mode==="automatic"){
  const u=await a.from("character_shape_effects").update({dispelled_at:new Date().toISOString(),dispelled_by_cast_id:castId}).eq("id",effectId).is("dispelled_at",null);if(u.error)throw Error(u.error.message);
  const clear=await a.from("shape_casts").update({dispel_effect_id:null}).eq("id",castId);if(clear.error)throw Error(clear.error.message);
  await message(cast.room_id,caster.id,`◆ Dispel ${effectShape?.name??"Shape effect"} · Level ${shape.level} vs Level ${eq.data.shape_level} · SUCCESS — effect removed`);
  revalidatePath("/game");revalidatePath("/character");
  return{ok:true,message:"Effect dispelled.",submittedAt:Date.now()}
 }
 if(dispelResolution.mode!=="save")throw Error("Unsupported Dispel resolution mode.");
 return{ok:true,message:"Effect selected. The Dispel target must Save or choose Do nothing.",submittedAt:Date.now()}
}catch(e){return{ok:false,message:e instanceof Error?e.message:"Unable to prepare Dispel."}}}

export async function resolveIncomingDispel(_p:WarpingActionState,f:FormData):Promise<WarpingActionState>{try{
 const c=await mine(),castId=field(f,"dispel_cast_id"),choice=field(f,"save_choice"),a=admin();
 const cq=await a.from("shape_casts").select(`id,room_id,caster_character_id,dispel_target_character_id,dispel_effect_id,caster:characters!shape_casts_caster_character_id_fkey(id,display_name,muscles,reflexes,vigor,brains,shrewd,presence_score),shape:shapes!shape_casts_shape_id_fkey(*)`).eq("id",castId).eq("dispel_target_character_id",c.id).maybeSingle();
 const cast:any=cq.data,s=one(cast?.shape),caster=one(cast?.caster);if(cq.error||!cast||!s?.is_dispel||!caster)throw Error("Incoming Dispel not found.");
 const effectId=String(cast.dispel_effect_id??"");if(!effectId)throw Error("This Dispel is already resolved.");
 const eq=await a.from("character_shape_effects").select("id,shape_level,effect_nature,shape:shapes!character_shape_effects_shape_id_fkey(name)").eq("id",effectId).eq("target_character_id",c.id).is("dispelled_at",null).maybeSingle();
 if(eq.error||!eq.data)throw Error("That effect is no longer active.");
 if(Number(s.level)<Number(eq.data.shape_level))throw Error(`Level ${s.level} cannot dispel Level ${eq.data.shape_level}.`);
 const effectShape:any=one(eq.data.shape as any);
 const fakeTarget={target_character_id:c.id,other_effect_choice:"beneficial"};
 const resolution=profileResolution(s,effectProfile(s,fakeTarget,caster.id));
 if(choice==="__do_nothing__"){
  const u=await a.from("character_shape_effects").update({dispelled_at:new Date().toISOString(),dispelled_by_cast_id:cast.id}).eq("id",effectId).is("dispelled_at",null);if(u.error)throw Error(u.error.message);
  const clear=await a.from("shape_casts").update({dispel_effect_id:null}).eq("id",cast.id).eq("dispel_effect_id",effectId);if(clear.error)throw Error(clear.error.message);
  await message(cast.room_id,c.id,`◆ ${c.display_name} does nothing against ${s.name} Dispel · ${effectShape?.name??"Shape effect"} dispelled · Level ${s.level} vs Level ${eq.data.shape_level}`);
  revalidatePath("/game");revalidatePath("/character");return{ok:true,message:"Effect dispelled.",submittedAt:Date.now()}
 }
 if(resolution.mode!=="save")throw Error("This Dispel no longer requires a Save.");
 const allowed=resolution.saveOptions;if(!allowed.includes(choice))throw Error("That Save is unavailable.");
 const sa=SAVE[choice];if(!sa)throw Error("Invalid Save.");
 const mod=await eff(c,sa),roll=randomInt(1,21),total=roll+mod,dc=11+(resolution.dcAttribute?await eff(caster,resolution.dcAttribute):0),saved=total>=dc;
 if(!saved){const u=await a.from("character_shape_effects").update({dispelled_at:new Date().toISOString(),dispelled_by_cast_id:cast.id}).eq("id",effectId).is("dispelled_at",null);if(u.error)throw Error(u.error.message)}
 const clear=await a.from("shape_casts").update({dispel_effect_id:null}).eq("id",cast.id).eq("dispel_effect_id",effectId);if(clear.error)throw Error(clear.error.message);
 await message(cast.room_id,c.id,`◆ ${c.display_name} uses ${SAVE_NAME[choice]??choice} against ${s.name} Dispel · d20 -> ${roll} + ${LABEL[sa]??sa} (${mod>=0?"+":""}${mod}) = ${total} vs DC ${dc} · ${saved?`SUCCESS — ${effectShape?.name??"effect"} remains active`:`FAILED — ${effectShape?.name??"effect"} dispelled`}`);
 revalidatePath("/game");revalidatePath("/character");return{ok:true,message:saved?"Save successful. Effect remains active.":"Save failed. Effect dispelled.",submittedAt:Date.now()}
}catch(e){return{ok:false,message:e instanceof Error?e.message:"Unable to resolve Dispel."}}}
'''
    server = server[:prepare_start] + server_tail
    new["server"] = server

    # -----------------------------------------------------------------------
    # D) Pending responses: normal Shape saves + separate Dispel saves.
    # Replace this small component as a whole for clarity and reliability.
    # -----------------------------------------------------------------------
    pending = r'''"use client";
import {useActionState,useEffect,useMemo,useState} from "react";
import {createClient} from "@/lib/supabase/client";
import type {CharacterAttributes} from "@/types/game";
import {loadMyEffectiveAttributes} from "../deferred-actions";
import {resolveIncomingDispel,resolveIncomingShape,type WarpingActionState} from "../warping-actions";

const initial:WarpingActionState={ok:false,message:""};
const L:Record<string,string>={dodge:"Dodge — Reflexes",defend:"Defend — Vigour",resist_vigour:"Resist — Vigour",resist_vigor:"Resist — Vigour",resist_shrewd:"Resist — Shrewd",resist_brains:"Resist — Brains",resist_presence:"Resist — Presence"};
const A:Record<string,keyof CharacterAttributes>={dodge:"reflexes",defend:"vigor",resist_vigour:"vigor",resist_vigor:"vigor",resist_shrewd:"shrewd",resist_brains:"brains",resist_presence:"presence_score"};
const sign=(n:number)=>n>=0?`+${n}`:String(n);

function one(v:any){return Array.isArray(v)?v[0]:v}
function profileFor(row:any,s:any,caster:any){
 if(row.target_character_id===caster?.id)return"self";
 if(s?.other_alternative_enabled&&row.other_effect_choice==="harmful")return"other_alt";
 return"other";
}
function resolutionFor(row:any,s:any,caster:any){
 const p=profileFor(row,s,caster);
 return{
  mode:s?.[`${p}_resolution_mode`]??s?.resolution_mode??"save",
  saves:Array.isArray(s?.[`${p}_save_options`])?s[`${p}_save_options`]:(Array.isArray(s?.save_options)?s.save_options:[]),
 };
}

export function PendingShapeResponses(){
 const db=useMemo(()=>createClient(),[]);
 const [rows,setRows]=useState<any[]>([]);
 const [dispelRows,setDispelRows]=useState<any[]>([]);
 const [attributes,setAttributes]=useState<CharacterAttributes|null>(null);
 const [state,action]=useActionState(resolveIncomingShape,initial);
 const [dispelState,dispelAction]=useActionState(resolveIncomingDispel,initial);

 useEffect(()=>{
  let live=true;
  async function load(){
   const me=await db.rpc("my_character_id");
   if(!live||!me.data)return;

   const q=await db.from("shape_cast_targets").select(`id,created_at,target_character_id,other_effect_choice,cast:shape_casts!shape_cast_targets_cast_id_fkey(id,caster:characters!shape_casts_caster_character_id_fkey(id,display_name),shape:shapes!shape_casts_shape_id_fkey(*))`).eq("target_character_id",me.data).eq("outcome","pending").order("created_at",{ascending:true});
   if(!live)return;
   setRows((q.data??[]).filter((row:any)=>{
    const cast=one(row.cast),caster=one(cast?.caster),s=one(cast?.shape);
    if(!s||caster?.id===me.data)return false;
    return resolutionFor(row,s,caster).mode==="save";
   }));

   const dq=await db.from("shape_casts").select(`id,created_at,dispel_effect_id,dispel_target_character_id,caster:characters!shape_casts_caster_character_id_fkey(id,display_name),shape:shapes!shape_casts_shape_id_fkey(*)`).eq("dispel_target_character_id",me.data).not("dispel_effect_id","is",null).order("created_at",{ascending:true});
   if(!live)return;
   setDispelRows((dq.data??[]).filter((row:any)=>{
    const s=one(row.shape);
    return Boolean(s?.is_dispel);
   }));
  }

  void load();
  const timer=window.setInterval(()=>void load(),2500);
  const targetChannel=db.channel(`shape-target-${crypto.randomUUID()}`).on("postgres_changes",{event:"*",schema:"public",table:"shape_cast_targets"},()=>void load()).subscribe();
  const dispelChannel=db.channel(`shape-dispel-${crypto.randomUUID()}`).on("postgres_changes",{event:"*",schema:"public",table:"shape_casts"},()=>void load()).subscribe();
  return()=>{live=false;window.clearInterval(timer);void db.removeChannel(targetChannel);void db.removeChannel(dispelChannel)};
 },[db,state.submittedAt,dispelState.submittedAt]);

 useEffect(()=>{
  if((!rows.length&&!dispelRows.length)||attributes)return;
  let active=true;
  void loadMyEffectiveAttributes()
    .then(result=>{if(active)setAttributes(result.attributes)})
    .catch(()=>{});
  return()=>{active=false};
 },[rows.length,dispelRows.length,attributes]);

 if(!rows.length&&!dispelRows.length)return null;

 return <div className="mb-2 space-y-2 game_components_pendingshaperesponses_div_container">
  {rows.map(row=>{
   const cast=one(row.cast),caster=one(cast?.caster),s=one(cast?.shape);
   if(!s)return null;
   const resolution=resolutionFor(row,s,caster);
   return <section key={row.id} className="border border-[rgb(var(--sep-colour-765937))] bg-[rgb(var(--sep-colour-20140c))] p-3 game_components_pendingshaperesponses_section_section">
    <p className="text-[7px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-b88c55))] game_components_pendingshaperesponses_p_text">Incoming Shape</p>
    <p className="mt-1 font-serif text-base text-[rgb(var(--sep-colour-efd2a0))] game_components_pendingshaperesponses_p_text_2">{caster?.display_name??"Someone"} — {s.name}</p>
    <p className="mt-1 text-[9px] text-[rgb(var(--sep-colour-a18d6e))] game_components_pendingshaperesponses_p_text_3">Level {s.level} · {s.school} · {s.word_of_power}{s.other_alternative_enabled?` · ${row.other_effect_choice==="harmful"?"Harmful":"Beneficial"} effect`:""}</p>
    <p className="mt-1 text-[10px] text-[rgb(var(--sep-colour-b6a58d))] game_components_pendingshaperesponses_p_text_4">{s.description}</p>
    <form action={action} className="mt-3 flex flex-wrap gap-2 game_components_pendingshaperesponses_form_action">
     <input className="game_components_pendingshaperesponses_input_field" type="hidden" name="shape_cast_target_id" value={row.id}/>
     {resolution.saves.map((x:string)=><button key={x} type="submit" name="save_choice" value={x} className="border border-[rgb(var(--sep-colour-765937))] bg-[rgb(var(--sep-colour-2a1c11))] px-3 py-2 text-[8px] uppercase text-[rgb(var(--sep-colour-dfc18f))] game_components_pendingshaperesponses_button_save_choice">{L[x]??x} ({sign(Number(attributes?.[A[x]]??0))})</button>)}
     <button type="submit" name="save_choice" value="__do_nothing__" className="border border-[rgb(var(--sep-colour-765937))] bg-[rgb(var(--sep-colour-2a1c11))] px-3 py-2 text-[8px] uppercase text-[rgb(var(--sep-colour-dfc18f))] game_components_pendingshaperesponses_button_do_nothing">Do nothing</button>
    </form>
   </section>
  })}

  {dispelRows.map(row=>{
   const caster=one(row.caster),s=one(row.shape);
   if(!s)return null;
   const fake={target_character_id:row.dispel_target_character_id,other_effect_choice:"beneficial"};
   const resolution=resolutionFor(fake,s,caster);
   return <section key={`dispel-${row.id}`} className="border border-[rgb(var(--sep-colour-765937))] bg-[rgb(var(--sep-colour-20140c))] p-3 game_components_pendingshaperesponses_section_section">
    <p className="text-[7px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-b88c55))]">Incoming Dispel</p>
    <p className="mt-1 font-serif text-base text-[rgb(var(--sep-colour-efd2a0))]">{caster?.display_name??"Someone"} — {s.name}</p>
    <p className="mt-1 text-[9px] text-[rgb(var(--sep-colour-a18d6e))]">Level {s.level} · choose a Save or Do nothing</p>
    <form action={dispelAction} className="mt-3 flex flex-wrap gap-2">
     <input type="hidden" name="dispel_cast_id" value={row.id}/>
     {resolution.saves.map((x:string)=><button key={x} type="submit" name="save_choice" value={x} className="border border-[rgb(var(--sep-colour-765937))] bg-[rgb(var(--sep-colour-2a1c11))] px-3 py-2 text-[8px] uppercase text-[rgb(var(--sep-colour-dfc18f))]">{L[x]??x} ({sign(Number(attributes?.[A[x]]??0))})</button>)}
     <button type="submit" name="save_choice" value="__do_nothing__" className="border border-[rgb(var(--sep-colour-765937))] bg-[rgb(var(--sep-colour-2a1c11))] px-3 py-2 text-[8px] uppercase text-[rgb(var(--sep-colour-dfc18f))]">Do nothing</button>
    </form>
   </section>
  })}

  {state.message?<p className={[((state.ok?"text-xs text-[rgb(var(--sep-colour-9bb58c))]":"text-xs text-[rgb(var(--sep-colour-d58d82))]")),"game_components_pendingshaperesponses_p_text_5"].filter(Boolean).join(" ")}>{state.message}</p>:null}
  {dispelState.message?<p className={dispelState.ok?"text-xs text-[rgb(var(--sep-colour-9bb58c))]":"text-xs text-[rgb(var(--sep-colour-d58d82))]"}>{dispelState.message}</p>:null}
 </div>
}
'''
    new["pending"] = pending

    # -----------------------------------------------------------------------
    # Final validation before writing anything.
    # -----------------------------------------------------------------------
    required_after = {
        "admin": ["damage_type:txt(f,\"damage_type\")||null", "other_alt_presence_modifier:alt?nint"],
        "panel": ["dispelTarget", "Choose the character whose active Shape effect you want to dispel", "if (!wt)"],
        "server": ["export async function resolveIncomingDispel", "dispel_target_character_id:targetId", "const profile=effectProfile(s,t,caster.id)"],
        "pending": ["resolveIncomingDispel", "Incoming Dispel", "shape-dispel-"],
    }
    for key, needles in required_after.items():
        for needle in needles:
            if needle not in new[key]:
                raise RuntimeError(f"post-patch validation failed for {key}: missing {needle}")

except Exception as exc:
    die(str(exc))

# Only now write files. If any write fails, restore all originals.
written = []
try:
    for key, path in PATHS.items():
        if new[key] != original[key]:
            path.write_text(new[key], encoding="utf-8", newline="\n")
            written.append(key)
except Exception as exc:
    for key, path in PATHS.items():
        try:
            path.write_text(original[key], encoding="utf-8", newline="\n")
        except Exception:
            pass
    die(f"Write failed and rollback was attempted: {exc}")

print("\nSUCCESS: Dispel Shapes patch applied.")
print("\nModified files:")
for key in written:
    print(" -", PATHS[key].relative_to(ROOT))

print("\nBehaviour now:")
print(" - normal Shape target(s) receive damage/healing/conditions/modifiers normally")
print(" - Dispel target is selected independently")
print(" - normal target and Dispel target may be the same or different")
print(" - harmful selected effects are dispelled automatically")
print(" - beneficial selected effects use their configured Save/Do Nothing resolution")
print("\nNext command: npm run build")
