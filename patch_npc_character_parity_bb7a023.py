#!/usr/bin/env python3
from __future__ import annotations

import argparse
import shutil
import subprocess
from pathlib import Path

ROOT = Path.cwd()
BASE = "bb7a023"
BACKUP = ROOT / ".patch_backups" / "npc_character_parity_bb7a023"

PANEL = Path("app/(portal)/game/components/NpcControlPanel.tsx")
MECH = Path("app/(portal)/game/npc-mechanics-actions.ts")
FEAT_PANEL = Path("app/(portal)/game/components/MechanicalFeatPanel.tsx")
FEAT_ACTIONS = Path("app/(portal)/game/feat-mechanics-actions.ts")
ACTIONS = Path("app/(portal)/game/actions.ts")
OPPOSED = Path("app/(portal)/game/opposed-actions.ts")
ADMIN_ACTIONS = Path("app/(portal)/admin/characters/actions.ts")
ADMIN_PAGE = Path("app/(portal)/admin/characters/[id]/page.tsx")

FILES = [
    PANEL,
    MECH,
    FEAT_PANEL,
    FEAT_ACTIONS,
    ACTIONS,
    OPPOSED,
    ADMIN_ACTIONS,
    ADMIN_PAGE,
]

SQL_NAME = "supabase_npc_character_mechanics_parity.sql"
ROLLBACK_NAME = "supabase_npc_character_mechanics_parity_ROLLBACK.sql"

SQL_TEXT = "begin;\n\ncreate or replace function public.normalize_npc_mechanics_room_message()\nreturns trigger\nlanguage plpgsql\nsecurity definer\nset search_path to 'public'\nas $function$\ndeclare\n  v_npc public.npcs%rowtype;\n  v_staff_character_id uuid;\n  v_staff_role text;\n  v_race jsonb;\nbegin\n  select n.*\n  into v_npc\n  from public.npcs n\n  join public.characters c on c.id = n.character_id\n  where c.id = new.character_id\n    and c.is_system = true\n    and n.is_active = true\n  limit 1;\n\n  if not found then\n    return new;\n  end if;\n\n  if auth.uid() is null then\n    raise exception 'Authentication required.';\n  end if;\n\n  select sm.role\n  into v_staff_role\n  from public.staff_members sm\n  where sm.user_id = auth.uid();\n\n  if v_staff_role is null\n     or v_staff_role not in ('owner','admin','master') then\n    raise exception 'NPC mechanics require Master/Admin/Owner access.';\n  end if;\n\n  if v_npc.current_room_id is distinct from new.room_id then\n    raise exception 'NPC is not in this Location.';\n  end if;\n\n  select c.id\n  into v_staff_character_id\n  from public.characters c\n  where c.user_id = auth.uid()\n    and c.is_system = false\n    and c.status = 'approved'\n    and c.current_room_id = new.room_id\n  limit 1;\n\n  if v_staff_character_id is null then\n    raise exception 'Your staff Character must be in this Location to control an NPC.';\n  end if;\n\n  select case\n    when r.id is null then null\n    else jsonb_build_object(\n      'id', r.id,\n      'name', r.name,\n      'icon_url', r.icon_url\n    )\n  end\n  into v_race\n  from public.characters c\n  left join public.races r on r.id = c.race_id\n  where c.id = v_npc.character_id;\n\n  new.character_id := v_staff_character_id;\n  new.speaker_type := 'npc';\n  new.npc_id := v_npc.id;\n  new.sent_by_user_id := auth.uid();\n  new.npc_snapshot := jsonb_build_object(\n    'id', v_npc.id,\n    'name', v_npc.name,\n    'pronouns', v_npc.pronouns,\n    'portrait_url', v_npc.portrait_url,\n    'description', v_npc.description,\n    'race', v_race\n  );\n\n  return new;\nend;\n$function$;\n\ndrop trigger if exists aaa_normalize_npc_mechanics_room_message\non public.room_messages;\n\ncreate trigger aaa_normalize_npc_mechanics_room_message\nbefore insert on public.room_messages\nfor each row\nexecute function public.normalize_npc_mechanics_room_message();\n\ncommit;\n"
ROLLBACK_TEXT = 'begin;\n\ndrop trigger if exists aaa_normalize_npc_mechanics_room_message\non public.room_messages;\n\ndrop function if exists public.normalize_npc_mechanics_room_message();\n\ncommit;\n'
SIMPLE_WRAPPERS = 'export async function npcUseRoomGift(previous:any,formData:FormData){\n  return useRoomGift(previous,formData);\n}\n\nexport async function npcActivateRoomGift(previous:any,formData:FormData){\n  return activateRoomGift(previous,formData);\n}\n\nexport async function npcUseRoomItem(previous:any,formData:FormData){\n  return useRoomItem(previous,formData);\n}\n\nexport async function npcSendRoomAttributeCheck(previous:any,formData:FormData){\n  return sendRoomAttributeCheck(previous,formData);\n}\n\nexport async function npcStartAttributeOpposedAction(previous:any,formData:FormData){\n  return startAttributeOpposedAction(previous,formData);\n}\n\nexport async function npcStartUnarmedAttack(previous:any,formData:FormData){\n  return startUnarmedAttack(previous,formData);\n}\n\nexport async function npcStartWeaponOpposedAttack(previous:any,formData:FormData){\n  return startWeaponOpposedAttack(previous,formData);\n}\n\n'
SHAPE_BUILDER = 'const NPC_ATTR_LABEL:Record<string,string>={\n  muscles:"Muscles",\n  reflexes:"Reflexes",\n  vigor:"Vigour",\n  vigour:"Vigour",\n  brains:"Brains",\n  shrewd:"Shrewd",\n  presence:"Presence",\n  presence_score:"Presence",\n};\n\nfunction capitaliseNpcWarp(value:unknown){\n  const text=String(value??"").trim();\n  return text?text.charAt(0).toUpperCase()+text.slice(1):"";\n}\n\nasync function buildFullNpcWarpMessage({\n  a,\n  shape,\n  character,\n  targetIds,\n  written,\n  isWritten,\n  isSelf,\n  resolved,\n}:{\n  a:any;\n  shape:any;\n  character:any;\n  targetIds:string[];\n  written:string;\n  isWritten:boolean;\n  isSelf:boolean;\n  resolved:string;\n}){\n  const targetRows=targetIds.length\n    ? (await a.from("characters").select("id,display_name").in("id",targetIds)).data??[]\n    : [];\n\n  const targetNames=isWritten\n    ? written\n    : isSelf\n      ? "Self"\n      : targetIds\n          .map(id=>targetRows.find((row:any)=>row.id===id)?.display_name??"Unknown")\n          .join(" / ");\n\n  const effective=await getEffectiveCharacterAttributes(character.id,{\n    muscles:character.muscles,\n    reflexes:character.reflexes,\n    vigor:character.vigor,\n    brains:character.brains,\n    shrewd:character.shrewd,\n    presence_score:character.presence_score,\n  });\n\n  const activeProfiles:Array<"self"|"other">=isWritten\n    ? []\n    : isSelf\n      ? ["self"]\n      : ["other"];\n\n  const resolutionForProfile=(profile:"self"|"other")=>\n    String(shape[`${profile}_resolution_mode`]??shape.resolution_mode??"save");\n\n  const attributeLabel=(value:unknown)=>{\n    const key=String(value??"").trim();\n    return key?(NPC_ATTR_LABEL[key]??key):"";\n  };\n\n  const parts:string[]=[];\n  parts.push(`◆ Warp [${shape.name}]`);\n\n  const wordAndMovement=[\n    shape.word_of_power\n      ? `Word of Power: [${capitaliseNpcWarp(shape.word_of_power)}]`\n      : "",\n    shape.movement\n      ? `Movement: [${capitaliseNpcWarp(shape.movement)}]`\n      : "",\n  ].filter(Boolean).join(" - ");\n\n  if(wordAndMovement)parts.push(wordAndMovement);\n\n  if(shape.level!==null&&shape.level!==undefined){\n    parts.push(`Level: [${shape.level}]`);\n  }\n\n  if(shape.school){\n    parts.push(`School [${capitaliseNpcWarp(shape.school)}]`);\n  }\n\n  parts.push(\n    `${!isWritten&&!isSelf&&targetIds.length>1?"Targets":"Target"} [${targetNames}]`,\n  );\n\n  if(shape.effect_nature){\n    const nature=capitaliseNpcWarp(shape.effect_nature);\n    if(nature)parts.push(`Nature [${nature}]`);\n  }\n\n  if(isWritten){\n    parts.push("Save Required [Fate]");\n  }else{\n    const saveProfiles=activeProfiles.filter(\n      profile=>resolutionForProfile(profile)==="save",\n    );\n\n    if(saveProfiles.length){\n      const dcAttributes=[\n        ...new Set(\n          saveProfiles\n            .map(profile=>shape[`${profile}_dc_attribute`]??shape.dc_attribute)\n            .filter(Boolean)\n            .map(String),\n        ),\n      ];\n\n      const dcParts=dcAttributes.map(attribute=>{\n        const runtimeKey=\n          attribute==="vigour"\n            ? "vigor"\n            : attribute==="presence"\n              ? "presence_score"\n              : attribute;\n\n        const casterValue=Number((effective as any)[runtimeKey]);\n\n        return Number.isFinite(casterValue)\n          ? String(11+casterValue)\n          : `11 + ${attributeLabel(attribute)}`;\n      });\n\n      const saveOptions=[\n        ...new Set(\n          saveProfiles.flatMap(profile=>{\n            const profileOptions=shape[`${profile}_save_options`];\n            return Array.isArray(profileOptions)\n              ? profileOptions\n              : Array.isArray(shape.save_options)\n                ? shape.save_options\n                : [];\n          }),\n        ),\n      ];\n\n      const saveAttributes=[\n        ...new Set(\n          saveOptions\n            .map(option=>{\n              switch(String(option)){\n                case "dodge": return "Reflexes";\n                case "defend": return "Vigour";\n                case "resist_vigour":\n                case "resist_vigor": return "Vigour";\n                case "resist_shrewd": return "Shrewd";\n                case "resist_brains": return "Brains";\n                case "resist_presence": return "Presence";\n                default: return "";\n              }\n            })\n            .filter(Boolean),\n        ),\n      ];\n\n      const dcText=dcParts.length?dcParts.join(" / "):"—";\n      const saveAttributeText=saveAttributes.length\n        ? saveAttributes.join(" / ")\n        : "—";\n\n      parts.push(`Save Required [DC ${dcText} - ${saveAttributeText}]`);\n    }else{\n      parts.push("Save Required [None]");\n    }\n  }\n\n  const components=[\n    shape.requires_verbal?"Verbal":"",\n    shape.requires_movement?"Movement":"",\n  ].filter(Boolean).join(" + ");\n\n  parts.push(`Components [${components||"None"}]`);\n\n  if(shape.description){\n    const effect=String(shape.description).replace(/\\s+/g," ").trim();\n    if(effect)parts.push(`Effect: [${effect}]`);\n  }\n\n  const uniqueValues=(values:string[])=>[\n    ...new Set(values.filter(Boolean)),\n  ];\n\n  const damageValues=uniqueValues(\n    activeProfiles.map(profile=>{\n      const dice=String(shape[`${profile}_damage_dice`]??"").trim();\n      const attribute=String(shape[`${profile}_damage_attribute`]??"").trim();\n      if(!dice&&!attribute)return "";\n      const damageBase=[\n        dice,\n        attribute?`+ ${attributeLabel(attribute)}`:"",\n      ].filter(Boolean).join(" ");\n      return [\n        damageBase,\n        shape.damage_type?String(shape.damage_type):"",\n      ].filter(Boolean).join(" - ");\n    }),\n  );\n\n  if(damageValues.length){\n    parts.push(`Damage [${damageValues.join(" / ")}]`);\n  }\n\n  const healingValues=uniqueValues(\n    activeProfiles.map(profile=>{\n      const dice=String(shape[`${profile}_heal_dice`]??"").trim();\n      const attribute=String(shape[`${profile}_heal_attribute`]??"").trim();\n      if(!dice&&!attribute)return "";\n      return [\n        dice,\n        attribute?`+ ${attributeLabel(attribute)}`:"",\n      ].filter(Boolean).join(" ");\n    }),\n  );\n\n  if(healingValues.length){\n    parts.push(`Healing [${healingValues.join(" / ")}]`);\n  }\n\n  const maxHealthValues=uniqueValues(\n    activeProfiles.map(profile=>{\n      const raw=String(shape[`${profile}_max_hp_change`]??"").trim();\n      if(!raw||raw==="0")return "";\n      const numeric=Number(raw);\n      return Number.isFinite(numeric)&&numeric>0&&!raw.startsWith("+")\n        ? `+${raw}`\n        : raw;\n    }),\n  );\n\n  if(maxHealthValues.length){\n    parts.push(`Max Health [${maxHealthValues.join(" / ")}]`);\n  }\n\n  const conditions=uniqueValues(\n    activeProfiles.flatMap(profile=>{\n      const value=shape[`${profile}_conditions`];\n      return Array.isArray(value)?value.map(String):[];\n    }),\n  );\n\n  if(conditions.length){\n    parts.push(`Applies [${conditions.join(" / ")}]`);\n  }\n\n  let duration="";\n  if(shape.is_instantaneous){\n    duration="Instantaneous";\n  }else if(shape.duration_unit==="until_dispelled"){\n    duration="Until Dispelled";\n  }else if(shape.duration_amount&&shape.duration_unit){\n    duration=`${shape.duration_amount} ${shape.duration_unit}`;\n  }\n\n  if(duration){\n    parts.push(`Duration [${duration}]`);\n  }\n\n  const prerequisites=[\n    ["muscles","Muscles"],\n    ["reflexes","Reflexes"],\n    ["vigour","Vigour"],\n    ["brains","Brains"],\n    ["shrewd","Shrewd"],\n    ["presence","Presence"],\n  ].map(([key,label])=>{\n    const minimum=shape[`min_${key}`];\n    if(\n      minimum===null||\n      minimum===undefined||\n      minimum===""||\n      Number(minimum)===0\n    ){\n      return "";\n    }\n    return `${label} ${minimum}+`;\n  }).filter(Boolean);\n\n  if(prerequisites.length){\n    parts.push(`Prerequisites [${prerequisites.join(" / ")}]`);\n  }\n\n  if(shape.price_key){\n    const priceResult=await a\n      .from("warping_prices")\n      .select("name")\n      .eq("key",String(shape.price_key))\n      .maybeSingle();\n\n    parts.push(\n      `Price [${priceResult.data?.name??String(shape.price_key)}]`,\n    );\n  }\n\n  if(resolved){\n    parts.push(resolved);\n  }\n\n  return parts.filter(Boolean).join(" · ");\n}\n\n'
NEW_FEAT_PANEL = '      {mechanicsMode==="feat"&&<div className="mt-3">\n        <select value={selectedGift} onChange={e=>{setSelectedGift(e.target.value);setMechanicsTarget("");}} className={inputClass}>\n          <option value="">{mechanics.gifts?.length?"Choose Feat":"No Feats assigned"}</option>\n          {mechanics.gifts?.map((g:any)=><option key={g.characterGiftId} value={g.characterGiftId}>{g.name} · {g.effectMode??g.effect_mode}</option>)}\n        </select>\n\n        {(()=>{\n          const g=mechanics.gifts?.find((x:any)=>x.characterGiftId===selectedGift);\n          if(!g)return null;\n\n          if(g.mechanicsShape && (g.effectMode??g.effect_mode)!=="passive"){\n            return <form className="mt-2">\n              <input type="hidden" name="character_gift_id" value={g.characterGiftId}/>\n              <input type="hidden" name="npc_actor_character_id" value={selected.character_id??""}/>\n              <MechanicalFeatPanel\n                gift={g}\n                viewerCharacterId={selected.character_id??""}\n                presentCharacters={mechanics.targets??[]}\n                actorCharacterId={selected.character_id??""}\n                onResolved={loadMechanics}\n              />\n            </form>;\n          }\n\n          const targetMode=g.targetMode??g.target_mode??"self";\n\n          return <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_auto]">\n            {targetMode==="self"\n              ? <p className="mt-2 text-[9px] text-[rgb(var(--sep-colour-9e8b70))]">Target: Self</p>\n              : <NpcTargetButtons\n                  targets={mechanics.targets??[]}\n                  selected={mechanicsTarget}\n                  onSelect={setMechanicsTarget}\n                  allowSelf={targetMode==="either"}\n                  selfId={selected.character_id??""}\n                />}\n\n            <form action={(g.effectMode??g.effect_mode)==="temporary"?activateFeatAction:featAction}>\n              <input type="hidden" name="npc_actor_character_id" value={selected.character_id??""}/>\n              <input type="hidden" name="character_gift_id" value={g.characterGiftId}/>\n              <input type="hidden" name="gift_target_character_id" value={mechanicsTarget}/>\n              <button\n                disabled={targetMode==="other"&&!mechanicsTarget}\n                className="mt-1 border border-[rgb(var(--sep-colour-8d6d3e))]/70 px-3 py-2 text-[8px] uppercase disabled:opacity-40"\n              >\n                {(g.effectMode??g.effect_mode)==="passive"\n                  ?"Show Feat"\n                  :(g.effectMode??g.effect_mode)==="temporary"\n                    ?"Activate Feat"\n                    :"Use Feat"}\n              </button>\n            </form>\n          </div>;\n        })()}\n      </div>}\n\n'
NPC_ADMIN_ACTIONS = 'export async function assignNpcFeatAdministration(\n  formData: FormData,\n) {\n  const staff =\n    await requireStaffCapability(\n      "character_edit",\n    );\n\n  const characterId =\n    readRequiredUuid(\n      formData.get("characterId"),\n    );\n\n  const giftId =\n    readRequiredUuid(\n      formData.get("giftId"),\n    );\n\n  const admin =\n    createPrivilegedClient();\n\n  const [\n    characterResult,\n    npcResult,\n    giftResult,\n  ] = await Promise.all([\n    admin\n      .from("characters")\n      .select("id,is_system,status")\n      .eq("id", characterId)\n      .maybeSingle(),\n\n    admin\n      .from("npcs")\n      .select("id")\n      .eq("character_id", characterId)\n      .maybeSingle(),\n\n    admin\n      .from("gifts")\n      .select("id,is_active")\n      .eq("id", giftId)\n      .maybeSingle(),\n  ]);\n\n  if (\n    characterResult.error ||\n    !characterResult.data ||\n    characterResult.data.is_system !== true ||\n    npcResult.error ||\n    !npcResult.data\n  ) {\n    throw new Error(\n      characterResult.error?.message ??\n        npcResult.error?.message ??\n        "NPC Character not found.",\n    );\n  }\n\n  if (\n    giftResult.error ||\n    !giftResult.data ||\n    giftResult.data.is_active !== true\n  ) {\n    throw new Error(\n      giftResult.error?.message ??\n        "That Feat is not active.",\n    );\n  }\n\n  const existing =\n    await admin\n      .from("character_gifts")\n      .select("id")\n      .eq("character_id", characterId)\n      .eq("gift_id", giftId)\n      .maybeSingle();\n\n  if (existing.error) {\n    throw new Error(existing.error.message);\n  }\n\n  if (existing.data) {\n    throw new Error(\n      "This NPC already owns that Feat.",\n    );\n  }\n\n  const assignment =\n    await admin\n      .from("character_gifts")\n      .insert({\n        character_id: characterId,\n        gift_id: giftId,\n        acquisition_source: "staff",\n        assigned_by: staff.userId,\n        expires_at: null,\n      })\n      .select("id")\n      .single();\n\n  if (\n    assignment.error ||\n    !assignment.data\n  ) {\n    throw new Error(\n      assignment.error?.message ??\n        "Unable to assign Feat.",\n    );\n  }\n\n  try {\n    await applyGiftOwnershipHealthEffects(\n      assignment.data.id,\n    );\n  } catch (error) {\n    await admin\n      .from("character_gifts")\n      .delete()\n      .eq("id", assignment.data.id);\n\n    throw error;\n  }\n\n  revalidatePath(\n    `/admin/characters/${characterId}`,\n  );\n  revalidatePath("/game");\n  revalidatePath("/character");\n  revalidatePath("/characters");\n}\n\nexport async function removeNpcFeatAdministration(\n  formData: FormData,\n) {\n  await requireStaffCapability(\n    "character_edit",\n  );\n\n  const characterId =\n    readRequiredUuid(\n      formData.get("characterId"),\n    );\n\n  const assignmentId =\n    readRequiredUuid(\n      formData.get("assignmentId"),\n    );\n\n  const admin =\n    createPrivilegedClient();\n\n  const assignment =\n    await admin\n      .from("character_gifts")\n      .select(\n        "id,character_id,acquisition_source",\n      )\n      .eq("id", assignmentId)\n      .eq("character_id", characterId)\n      .maybeSingle();\n\n  if (\n    assignment.error ||\n    !assignment.data\n  ) {\n    throw new Error(\n      assignment.error?.message ??\n        "Feat assignment not found.",\n    );\n  }\n\n  const npc =\n    await admin\n      .from("npcs")\n      .select("id")\n      .eq("character_id", characterId)\n      .maybeSingle();\n\n  if (npc.error || !npc.data) {\n    throw new Error(\n      npc.error?.message ??\n        "NPC Character not found.",\n    );\n  }\n\n  if (\n    assignment.data.acquisition_source !==\n      "staff"\n  ) {\n    throw new Error(\n      "Only staff-assigned NPC Feats can be removed here.",\n    );\n  }\n\n  await removeGiftOwnershipHealthEffects(\n    assignmentId,\n  );\n\n  const removed =\n    await admin\n      .from("character_gifts")\n      .delete()\n      .eq("id", assignmentId)\n      .eq("character_id", characterId);\n\n  if (removed.error) {\n    throw new Error(\n      removed.error.message,\n    );\n  }\n\n  revalidatePath(\n    `/admin/characters/${characterId}`,\n  );\n  revalidatePath("/game");\n  revalidatePath("/character");\n  revalidatePath("/characters");\n}\n'
NPC_FEAT_ADMIN_UI = '\n                {character.is_system ? (\n                  <div className="mt-4 border border-[rgb(var(--sep-colour-765937))]/45 bg-[rgb(var(--sep-colour-100c09))] p-4">\n                    <p className="text-[8px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-806b50))]">\n                      NPC direct Feat assignment\n                    </p>\n\n                    <p className="mt-2 text-xs leading-5 text-[rgb(var(--sep-colour-8f8271))]">\n                      Assign any active Feat directly to this NPC, including General Feats and Feats linked to another Ancestry.\n                    </p>\n\n                    <div className="mt-3 flex flex-wrap gap-2">\n                      <input type="hidden" name="characterId" value={character.id}/>\n                      <select\n                        name="giftId"\n                        defaultValue=""\n                        className="min-w-[240px] flex-1 border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-15100d))] px-3 py-2.5 text-xs text-[rgb(var(--sep-colour-d7c4a5))]"\n                      >\n                        <option value="" disabled>Select any active Feat</option>\n                        {npcAssignableGifts.map((gift) => (\n                          <option key={gift.id} value={gift.id}>\n                            {gift.name}\n                            {gift.isGeneral\n                              ? " · General"\n                              : gift.raceNames.length\n                                ? ` · ${gift.raceNames.join(" / ")}`\n                                : ""}\n                          </option>\n                        ))}\n                      </select>\n\n                      <button\n                        type="submit"\n                        formAction={assignNpcFeatAdministration}\n                        className="border border-[rgb(var(--sep-colour-987344))] bg-[rgb(var(--sep-colour-3b2919))] px-4 py-2.5 text-[8px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-efd6a8))]"\n                      >\n                        Assign Feat\n                      </button>\n                    </div>\n\n                    {npcStaffFeatAssignments.length ? (\n                      <div className="mt-4 space-y-2">\n                        {npcStaffFeatAssignments.map((assignment) => (\n                          <div key={assignment.id} className="flex items-center justify-between gap-3 border border-[rgb(var(--sep-colour-59432c))]/35 px-3 py-2">\n                            <span className="text-xs text-[rgb(var(--sep-colour-cab28a))]">\n                              {assignment.name}\n                            </span>\n\n                            <button\n                              type="submit"\n                              name="assignmentId"\n                              value={assignment.id}\n                              formAction={removeNpcFeatAdministration}\n                              className="border border-red-900/60 px-3 py-1.5 text-[8px] uppercase tracking-[0.12em] text-red-400"\n                            >\n                              Remove\n                            </button>\n                          </div>\n                        ))}\n                      </div>\n                    ) : null}\n                  </div>\n                ) : null}\n'


def die(message: str):
    raise SystemExit(f"\nERROR: {message}\n")


def current_head() -> str:
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


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        die(f"{label}: expected exactly 1 match, found {count}")
    return text.replace(old, new, 1)


def replace_between(text, start_marker, end_marker, replacement, label):
    start = text.find(start_marker)
    if start < 0:
        die(f"{label}: start marker not found")
    end = text.find(end_marker, start)
    if end < 0:
        die(f"{label}: end marker not found")
    return text[:start] + replacement + text[end:]


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

    for name in (SQL_NAME, ROLLBACK_NAME):
        path = ROOT / name
        if path.exists():
            path.unlink()
            print(f"Removed {name}")

    print("\nCode reverted. Nothing committed or pushed.")
    print(
        "If you already ran the Supabase SQL, run "
        f"{ROLLBACK_NAME} before deleting it."
    )


def patch_panel(text: str) -> str:
    if 'MechanicalFeatPanel' not in text:
        text = replace_once(
            text,
            'import { openPortalModal } from "@/components/portal/portal-modal-button";',
            'import { openPortalModal } from "@/components/portal/portal-modal-button";\n'
            'import { MechanicalFeatPanel } from "./MechanicalFeatPanel";',
            "MechanicalFeatPanel import",
        )

    start = '      {mechanicsMode==="feat"&&<div'
    end = '      {mechanicsMode==="item"&&<div'
    a = text.find(start)
    b = text.find(end, a)

    if a < 0 or b < 0:
        die("NPC Feat panel markers not found")

    return text[:a] + NEW_FEAT_PANEL + text[b:]


def patch_mechanics(text: str) -> str:
    if 'getEffectiveCharacterAttributes' not in text:
        text = replace_once(
            text,
            'import { getCharacterShapeAccess } from "@/lib/warping/shape-access";',
            'import { getCharacterShapeAccess } from "@/lib/warping/shape-access";\n'
            'import { getEffectiveCharacterAttributes } from "@/lib/characters/get-effective-character-attributes";',
            "effective attributes import",
        )

    text = replace_once(
        text,
        '.select("id,display_name,current_room_id,status,is_system")',
        '.select("id,display_name,current_room_id,status,is_system,muscles,reflexes,vigor,brains,shrewd,presence_score,life_state")',
        "NPC Character mechanics fields",
    )

    old_life = '''  if(c.error||!c.data||!c.data.is_system)throw new Error(c.error?.message??"NPC mechanics Character not found.");
  return {a,userId:au.data.user.id,speakerCharacterId:speaker.data.id,npc:q.data,character:c.data};
}'''

    new_life = '''  if(c.error||!c.data||!c.data.is_system)throw new Error(c.error?.message??"NPC mechanics Character not found.");
  if(c.data.life_state!=="alive"){
    throw new Error(
      c.data.life_state==="dead"
        ? "Dead Characters cannot perform normal Actions."
        : "Characters at Death's Threshold cannot perform normal Actions.",
    );
  }
  return {a,userId:au.data.user.id,speakerCharacterId:speaker.data.id,npc:q.data,character:c.data};
}'''

    text = replace_once(
        text,
        old_life,
        new_life,
        "NPC life-state parity",
    )

    if "async function publishNpcActionMessages(" in text:
        text = replace_between(
            text,
            "async function publishNpcActionMessages(",
            "export async function loadNpcMechanicsData",
            SIMPLE_WRAPPERS,
            "NPC action wrappers",
        )

    old_query = (
        'a.from("character_gifts").select(`id,gift:gifts(*)`)'
        '.eq("character_id",character.id),'
    )

    new_query = '''a.from("character_gifts").select(`
        id,
        gift:gifts(
          *,
          mechanics:shapes!shapes_feat_id_fkey(*)
        ),
        activations:gift_activations(
          activated_at,
          expires_at,
          ended_at,
          health_reverted_at
        )
      `).eq("character_id",character.id),'''

    text = replace_once(
        text,
        old_query,
        new_query,
        "NPC canonical Feat query",
    )

    old_map = '''    const gifts=(giftsResult.data??[])
      .map((x:any)=>{const g=one(x.gift) as any;return g?{characterGiftId:x.id,...g}:null;})
      .filter((x:any)=>x&&x.is_active!==false);'''

    new_map = '''    const now=Date.now();
    const gifts=(giftsResult.data??[])
      .map((x:any)=>{
        const g=one(x.gift) as any;
        if(!g||g.is_active===false)return null;

        const activations=x.activations??[];

        const activeActivation=
          activations.find((entry:any)=>
            entry.ended_at===null &&
            Date.parse(entry.activated_at)<=now &&
            Date.parse(entry.expires_at)>now
          )??null;

        const latestActivation=
          [...activations].sort(
            (first:any,second:any)=>
              Date.parse(second.activated_at)-Date.parse(first.activated_at)
          )[0]??null;

        const cooldownUntil=
          g.effect_mode==="temporary"&&latestActivation
            ? new Date(
                Date.parse(latestActivation.activated_at)+
                Number(g.cooldown_minutes??0)*60_000
              ).toISOString()
            : null;

        return {
          characterGiftId:x.id,
          giftId:g.id,
          name:g.name,
          description:g.description??"",
          effectMode:g.effect_mode,
          targetMode:g.target_mode??"self",
          damageDice:g.damage_dice??null,
          damageType:g.damage_type??null,
          successDie:g.success_die??null,
          successThreshold:g.success_threshold??null,
          successAttribute:g.success_attribute??null,
          durationMinutes:g.duration_minutes??null,
          cooldownMinutes:g.cooldown_minutes??0,
          healthDelta:g.health_delta??0,
          healthDice:g.health_dice??null,
          mechanicsShape:Array.isArray(g.mechanics)?g.mechanics[0]??null:g.mechanics??null,
          maxHealthModifier:g.max_health_modifier??0,
          musclesModifier:g.muscles_modifier??0,
          reflexesModifier:g.reflexes_modifier??0,
          vigourModifier:g.vigour_modifier??0,
          shrewdModifier:g.shrewd_modifier??0,
          brainsModifier:g.brains_modifier??0,
          presenceModifier:g.presence_modifier??0,
          warpingAffinityModifier:g.warping_affinity_modifier??0,
          warpsPerDayModifier:g.warps_per_day_modifier??0,
          activeUntil:activeActivation?.expires_at??null,
          cooldownUntil:
            cooldownUntil&&Date.parse(cooldownUntil)>now
              ? cooldownUntil
              : null,
          effect_mode:g.effect_mode,
          target_mode:g.target_mode??"self",
        };
      })
      .filter(Boolean);'''

    text = replace_once(
        text,
        old_map,
        new_map,
        "NPC canonical Feat mapping",
    )

    if "async function buildFullNpcWarpMessage" not in text:
        text = replace_once(
            text,
            "export async function npcWarpShape",
            SHAPE_BUILDER + "\nexport async function npcWarpShape",
            "full NPC Warp builder",
        )

    old_tail = '''    await a.from("shape_casts").update({status:"resolved"}).eq("id",castId);
    const names=(await a.from("characters").select("id,display_name").in("id",targetIds)).data??[];
    const targetText=isWritten?written:(self?"Self":names.map((x:any)=>x.display_name).join(", "));
    await npcMessage(a,npc,userId,speakerCharacterId,input.roomId,`◆ Warp [${s.name}] · Level [${s.level}] · ${targetIds.length>1?"Targets":"Target"} [${targetText}]${resolved?` · ${resolved}`:""}`);
    revalidatePath("/game");'''

    new_tail = '''    await a.from("shape_casts").update({status:"resolved"}).eq("id",castId);

    const castText=await buildFullNpcWarpMessage({
      a,
      shape:s,
      character,
      targetIds,
      written,
      isWritten,
      isSelf:self,
      resolved,
    });

    await npcMessage(
      a,
      npc,
      userId,
      speakerCharacterId,
      input.roomId,
      castText,
    );

    revalidatePath("/game");'''

    text = replace_once(
        text,
        old_tail,
        new_tail,
        "full NPC Warp room message",
    )

    return text


def patch_feat_panel(text: str) -> str:
    old_props = '''  onResolved,
}: {
  gift: Gift;
  viewerCharacterId: string;
  presentCharacters: PresentCharacter[];
  onResolved?: () => void | Promise<void>;
}) {'''

    new_props = '''  onResolved,
  actorCharacterId,
}: {
  gift: Gift;
  viewerCharacterId: string;
  presentCharacters: PresentCharacter[];
  onResolved?: () => void | Promise<void>;
  actorCharacterId?: string;
}) {'''

    text = replace_once(
        text,
        old_props,
        new_props,
        "MechanicalFeatPanel NPC actor prop",
    )

    marker = '''      <input
        type="hidden"
        name="mechanics_target_ids"'''

    actor_input = '''      {actorCharacterId ? (
        <input
          type="hidden"
          name="npc_actor_character_id"
          value={actorCharacterId}
          readOnly
        />
      ) : null}
'''

    text = replace_once(
        text,
        marker,
        actor_input + marker,
        "MechanicalFeatPanel NPC actor input",
    )

    return text


def patch_feat_actions(text: str) -> str:
    text = replace_once(
        text,
        'import { createClient } from "@/lib/supabase/server";',
        'import { createClient } from "@/lib/supabase/server";\n'
        'import { getStaffSession } from "@/lib/auth/require-staff";',
        "Mechanical Feat staff import",
    )

    text = replace_once(
        text,
        '''  prepareDispelEffect,
  resolveImmediateShapeCast,
} from "./warping-actions";''',
        '''  prepareDispelEffect,
  resolveImmediateShapeCast,
  resolveImmediateShapeCastForNpc,
} from "./warping-actions";''',
        "Mechanical Feat NPC resolver import",
    )

    old_character = '''    const {
      data: character,
      error: characterError,
    } = await admin
      .from("characters")
      .select("id,display_name,current_room_id,status,is_system,life_state")
      .eq("user_id", user.id)
      .maybeSingle();

    if (characterError || !character) {
      throw new Error(characterError?.message ?? "Character not found.");
    }

    if (character.status !== "approved" || character.is_system) {
      throw new Error("This Character cannot use Feats.");
    }'''

    new_character = '''    const npcActorId=field(formData,"npc_actor_character_id");

    let character:any=null;

    if(npcActorId){
      const staff=await getStaffSession();

      if(!staff||!["owner","admin","master"].includes(staff.role)){
        throw new Error("NPC Feats require Master/Admin/Owner access.");
      }

      const npcLink=await admin
        .from("npcs")
        .select("id,character_id,current_room_id,is_active")
        .eq("character_id",npcActorId)
        .eq("is_active",true)
        .maybeSingle();

      if(npcLink.error||!npcLink.data){
        throw new Error(npcLink.error?.message??"NPC not found.");
      }

      const npcCharacter=await admin
        .from("characters")
        .select("id,display_name,current_room_id,status,is_system,life_state")
        .eq("id",npcActorId)
        .eq("is_system",true)
        .maybeSingle();

      if(npcCharacter.error||!npcCharacter.data){
        throw new Error(npcCharacter.error?.message??"NPC Character not found.");
      }

      if(npcCharacter.data.status!=="approved"){
        throw new Error("This NPC cannot use Feats.");
      }

      if(npcCharacter.data.current_room_id!==npcLink.data.current_room_id){
        throw new Error("NPC Location is out of sync.");
      }

      character=npcCharacter.data;
    }else{
      const characterResult=await admin
        .from("characters")
        .select("id,display_name,current_room_id,status,is_system,life_state")
        .eq("user_id",user.id)
        .maybeSingle();

      if(characterResult.error||!characterResult.data){
        throw new Error(characterResult.error?.message??"Character not found.");
      }

      if(characterResult.data.status!=="approved"||characterResult.data.is_system){
        throw new Error("This Character cannot use Feats.");
      }

      character=characterResult.data;
    }'''

    text = replace_once(
        text,
        old_character,
        new_character,
        "Mechanical Feat actor resolution",
    )

    text = replace_once(
        text,
        "    const immediate = await resolveImmediateShapeCast(cast.data.id);",
        '''    const immediate = npcActorId
      ? await resolveImmediateShapeCastForNpc(cast.data.id,character.id)
      : await resolveImmediateShapeCast(cast.data.id);''',
        "Mechanical Feat NPC resolution",
    )

    return text


def patch_actions(text: str) -> str:
    old = '''    return {supabase, character: npcCharacter as unknown as OwnedCharacter};
  }'''

    new = '''    const npcOwnedCharacter=
      npcCharacter as unknown as OwnedCharacter;

    if(
      npcOwnedCharacter.life_state==="dead" &&
      !options?.allowDeadGhost
    ){
      throw new Error(
        npcOwnedCharacter.dead_until
          ? `This Character is dead until ${new Date(npcOwnedCharacter.dead_until).toLocaleString("en-GB")}.`
          : "This Character is dead.",
      );
    }

    if(npcOwnedCharacter.life_state==="death_save_pending"){
      throw new Error(
        "Your Character is at Death's Threshold. Resolve the single rescue Feat opportunity first.",
      );
    }

    return {
      supabase,
      character:npcOwnedCharacter,
    };
  }'''

    return replace_once(
        text,
        old,
        new,
        "NPC shared-action life-state parity",
    )


def patch_opposed(text: str) -> str:
    old = '''    if (row.error || !row.data) throw new Error(row.error?.message ?? "NPC Character not found.");
    if (!row.data.current_room_id) throw new Error("NPC is not at a Location.");
    return {supabase:admin as any,character:row.data as OwnedCharacter};
  }'''

    new = '''    if (row.error || !row.data) throw new Error(row.error?.message ?? "NPC Character not found.");

    if (row.data.life_state !== "alive") {
      throw new Error(
        row.data.life_state === "dead"
          ? "Dead Characters cannot attack, use Attributes, or respond to opposed Actions."
          : "Characters at Death's Threshold cannot perform normal Actions.",
      );
    }

    if (!row.data.current_room_id) throw new Error("NPC is not at a Location.");

    return {
      supabase,
      character:row.data as OwnedCharacter,
    };
  }'''

    return replace_once(
        text,
        old,
        new,
        "NPC opposed-action authenticated client",
    )


def patch_admin_actions(text: str) -> str:
    if "applyGiftOwnershipHealthEffects" not in text:
        text = replace_once(
            text,
            'import { adjustHealthForVigourModifier } from "@/lib/characters/adjust-health-for-vigour-modifier";',
            '''import { adjustHealthForVigourModifier } from "@/lib/characters/adjust-health-for-vigour-modifier";
import {
  applyGiftOwnershipHealthEffects,
  removeGiftOwnershipHealthEffects,
} from "@/lib/gifts/gift-health-effects";''',
            "NPC Feat health helper imports",
        )

    if "export async function assignNpcFeatAdministration" not in text:
        text = text.rstrip() + "\n\n" + NPC_ADMIN_ACTIONS + "\n"

    return text


def patch_admin_page(text: str) -> str:
    text = replace_once(
        text,
        '''  deleteCharacterAdministration,
  updateCharacterAdministration,
} from "../actions";''',
        '''  assignNpcFeatAdministration,
  deleteCharacterAdministration,
  removeNpcFeatAdministration,
  updateCharacterAdministration,
} from "../actions";''',
        "NPC Feat admin action imports",
    )

    text = replace_once(
        text,
        '''        description,
        ancestry_choice_group,
        eligibility:gift_races(''',
        '''        description,
        ancestry_choice_group,
        is_general,
        eligibility:gift_races(''',
        "NPC Feat general flag",
    )

    text = replace_once(
        text,
        '''  .from("character_gifts")
  .select("gift_id")
  .eq("character_id", id),''',
        '''  .from("character_gifts")
  .select("id,gift_id,acquisition_source,expires_at")
  .eq("character_id", id),''',
        "NPC Feat assignment details",
    )

    marker = '''const selectedAncestryGiftIds =
  ancestryGiftOptions
    .filter(
      (gift) =>
        character.race_id !== null &&
        gift.raceIds.includes(
          character.race_id,
        ) &&
        ownedGiftIds.has(gift.id),
    )
    .map((gift) => gift.id);'''

    addition = '''

  const giftById=new Map(
    (ancestryGiftResult.data??[]).map((gift:any)=>[
      gift.id,
      {
        id:gift.id,
        name:gift.name,
        isGeneral:gift.is_general===true,
        raceNames:(gift.eligibility??[])
          .map((entry:any)=>{
            const race=Array.isArray(entry.race)
              ? entry.race[0]??null
              : entry.race;
            return race?.name??null;
          })
          .filter(Boolean),
      },
    ]),
  );

  const npcAssignableGifts=
    character.is_system
      ? [...giftById.values()]
          .filter((gift:any)=>!ownedGiftIds.has(gift.id))
          .sort((a:any,b:any)=>a.name.localeCompare(b.name))
      : [];

  const npcStaffFeatAssignments=
    character.is_system
      ? (selectedAncestryGiftResult.data??[])
          .filter((assignment:any)=>assignment.acquisition_source==="staff")
          .map((assignment:any)=>({
            id:assignment.id,
            name:(giftById.get(assignment.gift_id) as any)?.name??"Unknown Feat",
          }))
          .sort((a:any,b:any)=>a.name.localeCompare(b.name))
      : [];
'''

    text = replace_once(
        text,
        marker,
        marker + addition,
        "NPC arbitrary Feat data",
    )

    ui_anchor = '''  <CharacterGiftsDisplay
    characterId={id}
    compact
    twoColumns
  />
</div>'''

    text = replace_once(
        text,
        ui_anchor,
        ui_anchor + NPC_FEAT_ADMIN_UI,
        "NPC arbitrary Feat UI",
    )

    return text


def apply():
    head = current_head()
    print(f"Current HEAD: {head}")

    if head != BASE:
        print(
            f"WARNING: this patch was built against {BASE}; "
            f"current HEAD is {head}."
        )

    transformed = {
        PANEL: patch_panel(read(PANEL)),
        MECH: patch_mechanics(read(MECH)),
        FEAT_PANEL: patch_feat_panel(read(FEAT_PANEL)),
        FEAT_ACTIONS: patch_feat_actions(read(FEAT_ACTIONS)),
        ACTIONS: patch_actions(read(ACTIONS)),
        OPPOSED: patch_opposed(read(OPPOSED)),
        ADMIN_ACTIONS: patch_admin_actions(read(ADMIN_ACTIONS)),
        ADMIN_PAGE: patch_admin_page(read(ADMIN_PAGE)),
    }

    backup()

    for rel, content in transformed.items():
        (ROOT / rel).write_text(content, encoding="utf-8")
        print(f"Patched {rel}")

    (ROOT / SQL_NAME).write_text(SQL_TEXT, encoding="utf-8")
    (ROOT / ROLLBACK_NAME).write_text(ROLLBACK_TEXT, encoding="utf-8")

    print(f"Created {SQL_NAME}")
    print(f"Created {ROLLBACK_NAME}")

    print("\nPATCH APPLIED LOCALLY ONLY.")
    print("Nothing committed or pushed.")
    print("\nNext:")
    print(f"1) Run {SQL_NAME} in Supabase SQL Editor")
    print("2) Run: npm run build")
    print("\nRevert code:")
    print("python patch_npc_character_parity_bb7a023.py --revert")
    print(f"If SQL was applied, also run {ROLLBACK_NAME}.")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--revert", action="store_true")
    args = parser.parse_args()

    if args.revert:
        revert()
    else:
        apply()


if __name__ == "__main__":
    main()
