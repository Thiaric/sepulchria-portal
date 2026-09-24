#!/usr/bin/env python3
from pathlib import Path
import shutil, subprocess

ROOT=Path.cwd()
BASE="5132a9f"
BACKUP=ROOT/".patch_backups"/"npc_age_chat_metadata_5132a9f"

PAGE=Path("app/(portal)/admin/characters/[id]/page.tsx")
ACTIONS=Path("app/(portal)/admin/characters/actions.ts")
FORM=Path("components/admin/admin-character-edit-form.tsx")
AGE_COMPONENT=Path("components/admin/npc-admin-age-field.tsx")
ROOM_LIST=Path("app/(portal)/game/components/RoomMessageList.tsx")
NPC_ACTIONS=Path("app/(portal)/game/npc-actions.ts")
GAME_TYPES=Path("types/game.ts")
FILES=[PAGE,ACTIONS,FORM,ROOM_LIST,NPC_ACTIONS,GAME_TYPES]

NPC_AGE_COMPONENT='"use client";\n\nimport {\n  useEffect,\n  useMemo,\n  useRef,\n  useState,\n} from "react";\n\ntype RaceAgeOption = {\n  id: string;\n  name: string;\n  min_age: number | null;\n  max_age: number | null;\n};\n\nexport function NpcAdminAgeField({\n  initialAge,\n  initialRaceId,\n  races,\n}: {\n  initialAge: number | null;\n  initialRaceId: string;\n  races: RaceAgeOption[];\n}) {\n  const rootRef = useRef<HTMLDivElement>(null);\n  const [raceId, setRaceId] = useState(initialRaceId);\n  const [age, setAge] = useState(\n    initialAge === null ? "" : String(initialAge),\n  );\n\n  useEffect(() => {\n    const form = rootRef.current?.closest("form");\n\n    if (!(form instanceof HTMLFormElement)) {\n      return;\n    }\n\n    const raceField = form.elements.namedItem("raceId");\n\n    if (!(raceField instanceof HTMLSelectElement)) {\n      return;\n    }\n\n    setRaceId(raceField.value);\n\n    const onChange = () => {\n      setRaceId(raceField.value);\n    };\n\n    raceField.addEventListener("change", onChange);\n\n    return () => {\n      raceField.removeEventListener("change", onChange);\n    };\n  }, []);\n\n  const selectedRace = useMemo(\n    () => races.find((race) => race.id === raceId) ?? null,\n    [raceId, races],\n  );\n\n  return (\n    <div\n      ref={rootRef}\n      data-admin-full-row="true"\n      className="mb-5 border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-100c09))] p-4"\n    >\n      <p className="text-[8px] uppercase tracking-[0.22em] text-[rgb(var(--sep-colour-806b50))]">\n        Age\n      </p>\n\n      <input\n        type="number"\n        name="age"\n        value={age}\n        onChange={(event) => setAge(event.target.value)}\n        min={selectedRace?.min_age ?? undefined}\n        max={selectedRace?.max_age ?? undefined}\n        step={1}\n        className="mt-2 w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-0d0907))] px-3 py-3 text-sm text-[rgb(var(--sep-colour-d7c4a5))] outline-none focus:border-[rgb(var(--sep-colour-a17a49))]"\n      />\n\n      <p className="mt-2 text-[10px] leading-5 text-[rgb(var(--sep-colour-8f8271))]">\n        {!selectedRace\n          ? "Choose an ancestry below."\n          : selectedRace.min_age === null\n            ? `${selectedRace.name}: no configured age range`\n            : selectedRace.max_age === null\n              ? `${selectedRace.name}: ${selectedRace.min_age}+ years`\n              : `${selectedRace.name}: ${selectedRace.min_age} - ${selectedRace.max_age} years`}\n      </p>\n    </div>\n  );\n}\n'
SQL_TEXT="begin;\n\ncreate or replace function public.snapshot_room_message_conditions()\nreturns trigger\nlanguage plpgsql\nsecurity definer\nset search_path to 'public'\nas $function$\ndeclare\n  v_subject_character_id uuid;\nbegin\n  if new.character_id is null and new.npc_id is null then\n    new.condition_snapshot := '[]'::jsonb;\n    return new;\n  end if;\n\n  if coalesce(new.speaker_type, 'character') = 'npc' then\n    select n.character_id\n    into v_subject_character_id\n    from public.npcs n\n    where n.id = new.npc_id\n    limit 1;\n  else\n    v_subject_character_id := new.character_id;\n  end if;\n\n  if v_subject_character_id is null then\n    new.condition_snapshot := '[]'::jsonb;\n    return new;\n  end if;\n\n  select\n    coalesce(\n      jsonb_agg(\n        jsonb_build_object('label', c.label)\n        order by c.created_at asc, c.id asc\n      ),\n      '[]'::jsonb\n    )\n  into new.condition_snapshot\n  from public.character_conditions c\n  where c.character_id = v_subject_character_id;\n\n  return new;\nend;\n$function$;\n\ncreate or replace function public.get_room_message_effect_conditions(\n  p_message_ids uuid[]\n)\nreturns table(message_id uuid, conditions jsonb)\nlanguage sql\nstable\nsecurity definer\nset search_path to 'public'\nas $function$\n  with selected_messages as (\n    select\n      m.id,\n      case\n        when coalesce(m.speaker_type, 'character') = 'npc'\n          then n.character_id\n        else m.character_id\n      end as subject_character_id,\n      m.created_at\n    from public.room_messages m\n    left join public.npcs n\n      on n.id = m.npc_id\n    where m.id = any(p_message_ids)\n  ),\n  effect_conditions as (\n    select\n      m.id as message_id,\n      btrim(item_condition.value) as label\n    from selected_messages m\n    join public.character_active_item_effects e\n      on e.character_id = m.subject_character_id\n     and e.activated_at <= m.created_at\n     and e.expires_at > m.created_at\n    cross join lateral\n      jsonb_array_elements_text(\n        coalesce(to_jsonb(e)->'conditions', '[]'::jsonb)\n      ) as item_condition(value)\n    where m.subject_character_id is not null\n      and btrim(item_condition.value) <> ''\n\n    union\n\n    select\n      m.id as message_id,\n      btrim(shape_condition.value) as label\n    from selected_messages m\n    join public.character_shape_effects e\n      on coalesce(\n           nullif(to_jsonb(e)->>'target_character_id',''),\n           nullif(to_jsonb(e)->>'character_id','')\n         )::uuid = m.subject_character_id\n     and coalesce(\n           nullif(to_jsonb(e)->>'starts_at','')::timestamptz,\n           nullif(to_jsonb(e)->>'created_at','')::timestamptz,\n           nullif(to_jsonb(e)->>'activated_at','')::timestamptz\n         ) <= m.created_at\n     and (\n       nullif(to_jsonb(e)->>'expires_at','') is null\n       or nullif(to_jsonb(e)->>'expires_at','')::timestamptz > m.created_at\n     )\n     and (\n       nullif(to_jsonb(e)->>'dispelled_at','') is null\n       or nullif(to_jsonb(e)->>'dispelled_at','')::timestamptz > m.created_at\n     )\n    cross join lateral\n      jsonb_array_elements_text(\n        coalesce(to_jsonb(e)->'conditions', '[]'::jsonb)\n      ) as shape_condition(value)\n    where m.subject_character_id is not null\n      and btrim(shape_condition.value) <> ''\n  )\n  select\n    m.id as message_id,\n    to_jsonb(\n      coalesce(\n        array_agg(distinct ec.label order by ec.label)\n          filter (where ec.label is not null and ec.label <> ''),\n        '{}'::text[]\n      )\n    ) as conditions\n  from selected_messages m\n  left join effect_conditions ec\n    on ec.message_id = m.id\n  group by m.id;\n$function$;\n\ncreate or replace function public.normalize_npc_mechanics_room_message()\nreturns trigger\nlanguage plpgsql\nsecurity definer\nset search_path to 'public'\nas $function$\ndeclare\n  v_npc public.npcs%rowtype;\n  v_staff_character_id uuid;\n  v_staff_role text;\n  v_race jsonb;\nbegin\n  select n.*\n  into v_npc\n  from public.npcs n\n  join public.characters c on c.id = n.character_id\n  where c.id = new.character_id\n    and c.is_system = true\n    and n.is_active = true\n  limit 1;\n\n  if not found then\n    return new;\n  end if;\n\n  if auth.uid() is null then\n    raise exception 'Authentication required.';\n  end if;\n\n  select sm.role\n  into v_staff_role\n  from public.staff_members sm\n  where sm.user_id = auth.uid();\n\n  if v_staff_role is null\n     or v_staff_role not in ('owner','admin','master') then\n    raise exception 'NPC mechanics require Master/Admin/Owner access.';\n  end if;\n\n  if v_npc.current_room_id is distinct from new.room_id then\n    raise exception 'NPC is not in this Location.';\n  end if;\n\n  select c.id\n  into v_staff_character_id\n  from public.characters c\n  where c.user_id = auth.uid()\n    and c.is_system = false\n    and c.status = 'approved'\n    and c.current_room_id = new.room_id\n  limit 1;\n\n  if v_staff_character_id is null then\n    raise exception 'Your staff Character must be in this Location to control an NPC.';\n  end if;\n\n  select case\n    when r.id is null then null\n    else jsonb_build_object(\n      'id', r.id,\n      'name', r.name,\n      'icon_url', r.icon_url\n    )\n  end\n  into v_race\n  from public.characters c\n  left join public.races r on r.id = c.race_id\n  where c.id = v_npc.character_id;\n\n  new.character_id := v_staff_character_id;\n  new.speaker_type := 'npc';\n  new.npc_id := v_npc.id;\n  new.sent_by_user_id := auth.uid();\n  new.npc_snapshot := jsonb_build_object(\n    'id', v_npc.id,\n    'character_id', v_npc.character_id,\n    'name', v_npc.name,\n    'pronouns', v_npc.pronouns,\n    'portrait_url', v_npc.portrait_url,\n    'description', v_npc.description,\n    'race', v_race\n  );\n\n  return new;\nend;\n$function$;\n\ncommit;\n"

OLD_CODEX='type CodexOption = {\n  id: string;\n  name: string;\n};'
NEW_CODEX='type CodexOption = {\n  id: string;\n  name: string;\n  min_age: number | null;\n  max_age: number | null;\n};'
OLD_RACES='.from("races")\n      .select("id, name")\n      .order("name"),'
NEW_RACES='.from("races")\n      .select("id, name, min_age, max_age")\n      .order("name"),'
AGE_ANCHOR='              <input className="admin_characters_id_page_input_return"\n                type="hidden"\n                name="returnTo"\n                value={`/admin/characters/${character.id}`}\n              />\n\n'
AGE_INSERT='              {isNpc ? (\n                <NpcAdminAgeField\n                  initialAge={character.age}\n                  initialRaceId={character.race_id ?? ""}\n                  races={races}\n                />\n              ) : null}\n\n'
OLD_REMOVE_BUTTON='                            <button\n                              type="submit"\n                              name="assignmentId"\n                              value={assignment.id}\n                              formAction={removeNpcFeatAdministration}\n                              className="border border-red-900/60 px-3 py-1.5 text-[8px] uppercase tracking-[0.12em] text-red-400"\n                            >'
NEW_REMOVE_BUTTON='                            <button\n                              type="submit"\n                              formAction={removeNpcFeatAdministration.bind(\n                                null,\n                                assignment.id,\n                              )}\n                              className="border border-red-900/60 px-3 py-1.5 text-[8px] uppercase tracking-[0.12em] text-red-400"\n                            >'
OLD_REMOVE_SIG='export async function removeNpcFeatAdministration(\n  formData: FormData,\n) {\n  await requireStaffCapability(\n    "character_edit",\n  );\n\n  const characterId =\n    readRequiredUuid(\n      formData.get("characterId"),\n    );\n\n  const assignmentId =\n    readRequiredUuid(\n      formData.get("assignmentId"),\n    );\n'
NEW_REMOVE_SIG='export async function removeNpcFeatAdministration(\n  assignmentIdInput: string,\n  formData: FormData,\n) {\n  await requireStaffCapability(\n    "character_edit",\n  );\n\n  const characterId =\n    readRequiredUuid(\n      formData.get("characterId"),\n    );\n\n  const assignmentId =\n    readRequiredUuid(\n      assignmentIdInput,\n    );\n'
OLD_NPC_TYPE='export type NpcMessageSnapshot = {\n  id: string;\n  name: string;'
NEW_NPC_TYPE='export type NpcMessageSnapshot = {\n  id: string;\n  character_id?: string | null;\n  name: string;'
OLD_INSERTED_TYPE='  npc_snapshot: {\n    id: string;\n    name: string;'
NEW_INSERTED_TYPE='  npc_snapshot: {\n    id: string;\n    character_id?: string | null;\n    name: string;'
OLD_KEY='const chatCharacterIdsKey =\n  Array.from(\n    new Set(\n      liveMessages\n        .map(\n          (message) =>\n            message.character_id,\n        )\n        .filter(Boolean),\n    ),\n  )\n    .sort()\n    .join(",");'
NEW_KEY='const chatCharacterIdsKey =\n  Array.from(\n    new Set(\n      liveMessages\n        .map(roomMessageSubjectCharacterId)\n        .filter(\n          (value): value is string =>\n            Boolean(value),\n        ),\n    ),\n  )\n    .sort()\n    .join(",");'
OLD_SHAPE_IDS='      const ids=Array.from(new Set(liveMessages.map(message=>message.character_id).filter(Boolean)));'
NEW_SHAPE_IDS='      const ids=Array.from(\n        new Set(\n          liveMessages\n            .map(roomMessageSubjectCharacterId)\n            .filter(\n              (value): value is string =>\n                Boolean(value),\n            ),\n        ),\n      );'
AUTHOR_ANCHOR='                const author: CharacterSummary | null =\n                  npcSnapshot\n                    ? {\n                        id: npcSnapshot.id,\n                        first_name: npcSnapshot.name,\n                        display_name: npcSnapshot.name,\n                        portrait_url: npcSnapshot.portrait_url,\n                        public_slug: null,\n                        race: npcSnapshot.race,\n                        association: null,\n                      }\n                    : controllerAuthor;\n\n'
METADATA_BLOCK='                const metadataCharacterId =\n                  isNpcMessage\n                    ? (\n                        npcSnapshot?.character_id ??\n                        npcSnapshot?.id ??\n                        item.npc_id ??\n                        null\n                      )\n                    : (\n                        author?.id ??\n                        item.character_id\n                      );\n\n'
OLD_OFFGAME='                          {!isNpcMessage && author\n                            ? shapeTagHeaderText(\n                                author.id,\n                                privateLocationTheme\n                                  ? privateLocationTheme.offgameTextColour\n                                  : "rgb(var(--sep-colour-d3c2aa))",\n                              )\n                            : null}\n\n                          {!isNpcMessage && author\n                            ? resurrectionMalusHeaderText(\n                                author.id,\n                                privateLocationTheme\n                                  ? privateLocationTheme.offgameTextColour\n                                  : "rgb(var(--sep-colour-d3c2aa))",\n                              )\n                            : null}'
NEW_OFFGAME='                          {metadataCharacterId\n                            ? shapeTagHeaderText(\n                                metadataCharacterId,\n                                privateLocationTheme\n                                  ? privateLocationTheme.offgameTextColour\n                                  : "rgb(var(--sep-colour-d3c2aa))",\n                              )\n                            : null}\n\n                          {metadataCharacterId\n                            ? resurrectionMalusHeaderText(\n                                metadataCharacterId,\n                                privateLocationTheme\n                                  ? privateLocationTheme.offgameTextColour\n                                  : "rgb(var(--sep-colour-d3c2aa))",\n                              )\n                            : null}'
OLD_NORMAL='                      {!isNpcMessage && author\n                        ? shapeTagHeaderText(author.id)\n                        : null}\n\n                      {!isNpcMessage && author\n                        ? resurrectionMalusHeaderText(author.id)\n                        : null}\n\n                      {!isNpcMessage\n  ? conditionSnapshotHeaderText(\n      [\n        ...(item.condition_snapshot ?? []),\n        ...(messageEffectConditions[item.id] ?? []).map(\n          (label) => ({ label }),\n        ),\n      ],\n      undefined,\n      author\n        ? activeShapeTags[author.id]?.conditions ?? []\n        : [],\n    )\n  : null}'
NEW_NORMAL='                      {metadataCharacterId\n                        ? shapeTagHeaderText(metadataCharacterId)\n                        : null}\n\n                      {metadataCharacterId\n                        ? resurrectionMalusHeaderText(\n                            metadataCharacterId,\n                          )\n                        : null}\n\n                      {conditionSnapshotHeaderText(\n                        [\n                          ...(item.condition_snapshot ?? []),\n                          ...(messageEffectConditions[item.id] ?? []).map(\n                            (label) => ({ label }),\n                          ),\n                        ],\n                        undefined,\n                        metadataCharacterId\n                          ? activeShapeTags[metadataCharacterId]?.conditions ?? []\n                          : [],\n                      )}'
OLD_NPC_QUERY='const r=await admin.from("npcs").select(`id,name,pronouns,portrait_url,description,current_room_id,is_active,race:races(id,name,icon_url)`).eq("id",input.npcId).maybeSingle();'
NEW_NPC_QUERY='const r=await admin.from("npcs").select(`id,character_id,name,pronouns,portrait_url,description,current_room_id,is_active,race:races(id,name,icon_url)`).eq("id",input.npcId).maybeSingle();'
OLD_SNAPSHOT='const snapshot={id:npc.id,name:npc.name,pronouns:npc.pronouns??null,portrait_url:npc.portrait_url??null,description:npc.description??null,race:race?{id:race.id,name:race.name,icon_url:race.icon_url??null}:null};'
NEW_SNAPSHOT='const snapshot={id:npc.id,character_id:npc.character_id??npc.id,name:npc.name,pronouns:npc.pronouns??null,portrait_url:npc.portrait_url??null,description:npc.description??null,race:race?{id:race.id,name:race.name,icon_url:race.icon_url??null}:null};'

def fail(msg):
    raise SystemExit("\nERROR: "+msg+"\n")

def read(rel):
    p=ROOT/rel
    if not p.exists(): fail(f"Missing expected file: {rel}")
    return p.read_text(encoding="utf-8-sig")

def rep(text,old,new,label,count=1):
    found=text.count(old)
    if found!=count:
        fail(f"{label}: expected {count} match(es), found {found}. No source files were changed.")
    return text.replace(old,new,count)

def patch_page(text):
    if 'import { NpcAdminAgeField } from "@/components/admin/npc-admin-age-field";' not in text:
        text=rep(
            text,
            'import { NpcEquipmentAdmin } from "@/components/admin/npc-equipment-admin";',
            'import { NpcEquipmentAdmin } from "@/components/admin/npc-equipment-admin";\nimport { NpcAdminAgeField } from "@/components/admin/npc-admin-age-field";',
            "NPC age component import"
        )
    text=rep(text,OLD_CODEX,NEW_CODEX,"CodexOption age range")
    text=rep(text,OLD_RACES,NEW_RACES,"load ancestry age ranges")
    if "initialAge={character.age}" not in text:
        text=rep(text,AGE_ANCHOR,AGE_ANCHOR+AGE_INSERT,"NPC dedicated Age field")
    text=rep(text,OLD_REMOVE_BUTTON,NEW_REMOVE_BUTTON,"bound NPC Feat removal action")
    return text

def patch_actions(text):
    return rep(text,OLD_REMOVE_SIG,NEW_REMOVE_SIG,"NPC Feat removal action signature")

def patch_form(text):
    start_marker='      <section className="mb-5 border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-100c09))] p-4 components_admin_admin_character_edit_form_section_section">'
    start=text.find(start_marker)
    if start<0: fail("Character Age section start not found.")
    end_marker="\n      {children}"
    end=text.find(end_marker,start)
    if end<0: fail("Character Age section end not found.")
    section=text[start:end]
    wrapped="      {!allowMissingAge ? (\n"+section+"\n      ) : null}"
    text=text[:start]+wrapped+text[end:]
    return text

def patch_types(text):
    return rep(text,OLD_NPC_TYPE,NEW_NPC_TYPE,"NPC snapshot backing Character type")

def patch_npc_actions(text):
    text=rep(text,OLD_NPC_QUERY,NEW_NPC_QUERY,"NPC message backing Character query")
    text=rep(text,OLD_SNAPSHOT,NEW_SNAPSHOT,"NPC message snapshot backing Character")
    return text

def patch_room_list(text):
    text=rep(text,OLD_INSERTED_TYPE,NEW_INSERTED_TYPE,"realtime NPC snapshot backing Character type")
    helper_anchor="function normaliseRelation<T>(\n"
    helper='function roomMessageSubjectCharacterId(\n  message: RoomMessage,\n): string | null {\n  if (message.speaker_type === "npc") {\n    return (\n      message.npc_snapshot?.character_id ??\n      message.npc_snapshot?.id ??\n      message.npc_id ??\n      null\n    );\n  }\n\n  return message.character_id;\n}\n\n'
    if "function roomMessageSubjectCharacterId(" not in text:
        text=rep(text,helper_anchor,helper+helper_anchor,"room-message subject helper")
    text=rep(text,OLD_KEY,NEW_KEY,"chat subject IDs")
    text=rep(text,OLD_SHAPE_IDS,NEW_SHAPE_IDS,"effect/Price subject IDs")
    if "const metadataCharacterId =" not in text:
        text=rep(text,AUTHOR_ANCHOR,AUTHOR_ANCHOR+METADATA_BLOCK,"message metadata Character ID")
    text=rep(text,OLD_OFFGAME,NEW_OFFGAME,"NPC metadata in whisper/offgame headers")
    old_cond='''  author
    ? activeShapeTags[author.id]?.conditions ?? []
    : [],
)}'''
    new_cond='''  metadataCharacterId
    ? activeShapeTags[metadataCharacterId]?.conditions ?? []
    : [],
)}'''
    text=rep(text,old_cond,new_cond,"whisper/offgame condition subject",1)
    text=rep(text,OLD_NORMAL,NEW_NORMAL,"NPC Conditions/Prices/Echo normal header")
    return text

def backup():
    if BACKUP.exists():
        print(f"Backup already exists: {BACKUP}")
        return
    for rel in FILES:
        src=ROOT/rel
        dst=BACKUP/rel
        dst.parent.mkdir(parents=True,exist_ok=True)
        shutil.copy2(src,dst)
    print(f"Backup created: {BACKUP}")

def main():
    try:
        head=subprocess.check_output(["git","rev-parse","--short","HEAD"],cwd=ROOT,text=True,stderr=subprocess.DEVNULL).strip()
    except Exception:
        head="unknown"
    print(f"Current HEAD: {head}")
    if head!=BASE:
        print(f"WARNING: built against {BASE}; current HEAD is {head}. Exact source blocks are still validated.")
    transformed={
        PAGE:patch_page(read(PAGE)),
        ACTIONS:patch_actions(read(ACTIONS)),
        FORM:patch_form(read(FORM)),
        ROOM_LIST:patch_room_list(read(ROOM_LIST)),
        NPC_ACTIONS:patch_npc_actions(read(NPC_ACTIONS)),
        GAME_TYPES:patch_types(read(GAME_TYPES)),
    }
    backup()
    for rel,content in transformed.items():
        (ROOT/rel).write_text(content,encoding="utf-8")
        print(f"Patched {rel}")
    p=ROOT/AGE_COMPONENT
    p.parent.mkdir(parents=True,exist_ok=True)
    p.write_text(NPC_AGE_COMPONENT,encoding="utf-8")
    print(f"Created {AGE_COMPONENT}")
    (ROOT/"supabase_npc_chat_metadata.sql").write_text(SQL_TEXT,encoding="utf-8")
    print("Created supabase_npc_chat_metadata.sql")
    print("\nNothing committed or pushed.")
    print("Next:")
    print("1) Run supabase_npc_chat_metadata.sql in Supabase SQL Editor")
    print("2) Run: npm run build")

if __name__=="__main__":
    main()
