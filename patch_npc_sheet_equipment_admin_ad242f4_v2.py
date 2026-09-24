#!/usr/bin/env python3
from pathlib import Path
import argparse
import shutil
import subprocess

ROOT = Path.cwd()
BASE = "ad242f4"
BACKUP = ROOT / ".patch_backups" / "npc_sheet_equipment_admin_ad242f4"

NPC_SHEET = Path("app/(portal)/npcs/[id]/page.tsx")
GAME_CONTEXT = Path("components/portal/game-context-panel.tsx")
ADMIN_ACTIONS = Path("app/(portal)/admin/characters/actions.ts")
AGE_ACTIONS = Path("app/(portal)/admin/characters/age-actions.ts")
ADMIN_FORM = Path("components/admin/admin-character-edit-form.tsx")
ADMIN_PAGE = Path("app/(portal)/admin/characters/[id]/page.tsx")
NPC_EQUIPMENT = Path("components/admin/npc-equipment-admin.tsx")

FILES = [
    NPC_SHEET,
    GAME_CONTEXT,
    ADMIN_ACTIONS,
    AGE_ACTIONS,
    ADMIN_FORM,
    ADMIN_PAGE,
]

SQL_NAME = "supabase_npc_equipment_admin.sql"
ROLLBACK_NAME = "supabase_npc_equipment_admin_ROLLBACK.sql"

NPC_SHEET_TEXT = 'import Image from "next/image";\nimport { notFound } from "next/navigation";\n\nimport { CharacterConditionsDisplay } from "@/components/characters/character-conditions-display";\nimport { CharacterGiftsDisplay } from "@/components/characters/character-gifts-display";\nimport { CharacterInventoryDisplay } from "@/components/characters/character-inventory-display";\nimport { CharacterLifeStateBadge } from "@/components/characters/character-life-state";\nimport {\n  CharacterHealthDisplay,\n  CharacterMechanicsDisplay,\n} from "@/components/characters/character-mechanics-display";\nimport { CharacterShapesDisplay } from "@/components/characters/character-shapes-display";\nimport { createAdminClient } from "@/lib/supabase/admin";\nimport { createClient } from "@/lib/supabase/server";\n\nfunction one<T>(value: T | T[] | null): T | null {\n  return Array.isArray(value) ? value[0] ?? null : value;\n}\n\nfunction formatGender(value: string | null) {\n  if (value === "male") return "Male";\n  if (value === "female") return "Female";\n  if (value === "non_binary") return "Non-binary";\n  return null;\n}\n\nfunction Detail({\n  label,\n  value,\n}: {\n  label: string;\n  value: string | null | undefined;\n}) {\n  return (\n    <div className="min-w-0 bg-[rgb(var(--sep-colour-17110d))] px-3 py-2">\n      <p className="text-[7px] uppercase tracking-[0.19em] text-[rgb(var(--sep-colour-796448))]">\n        {label}\n      </p>\n      <p className="mt-1 break-words text-[11px] leading-5 text-[rgb(var(--sep-colour-cab89b))]">\n        {value?.trim() || "Not recorded"}\n      </p>\n    </div>\n  );\n}\n\nfunction TextSection({\n  title,\n  content,\n}: {\n  title: string;\n  content: string | null;\n}) {\n  if (!content?.trim()) return null;\n\n  return (\n    <section className="h-full border border-[rgb(var(--sep-colour-6b5032))]/50 bg-[rgb(var(--sep-colour-17110d))] p-4 sm:p-5">\n      <h2 className="font-serif text-xl text-[rgb(var(--sep-skin-c1,var(--sep-colour-dfc79c)))] sm:text-2xl">\n        {title}\n      </h2>\n      <p className="mt-3 whitespace-pre-line break-words text-sm leading-7 text-[rgb(var(--sep-skin-c2,var(--sep-colour-b0a18d)))]">\n        {content}\n      </p>\n    </section>\n  );\n}\n\nexport default async function NpcSheetPage({\n  params,\n}: {\n  params: Promise<{ id: string }>;\n}) {\n  const { id } = await params;\n\n  const session = await createClient();\n  const auth = await session.auth.getUser();\n\n  if (!auth.data.user) {\n    notFound();\n  }\n\n  const db = createAdminClient();\n\n  const { data: npc, error } = await db\n    .from("npcs")\n    .select(`\n      id,\n      name,\n      pronouns,\n      portrait_url,\n      description,\n      is_active,\n      is_location_active,\n      current_room_id,\n      order:orders(id,name),\n      character:characters!npcs_character_id_fkey(\n        id,\n        first_name,\n        surname,\n        display_name,\n        pronouns,\n        gender,\n        sexual_orientation,\n        birthplace,\n        origin,\n        physical_description,\n        personality,\n        biography,\n        public_notes,\n        title,\n        current_health,\n        life_state,\n        status,\n        race:races(\n          id,\n          name,\n          slug,\n          icon_url,\n          colour\n        )\n      )\n    `)\n    .eq("id", id)\n    .eq("is_active", true)\n    .eq("is_location_active", true)\n    .maybeSingle();\n\n  if (error || !npc) {\n    notFound();\n  }\n\n  const character = one(npc.character) as any;\n\n  if (!character || character.status !== "approved") {\n    notFound();\n  }\n\n  const race = one(character.race) as any;\n  const order = one(npc.order) as any;\n\n  const fullName =\n    [character.first_name, character.surname]\n      .map((value) => String(value ?? "").trim())\n      .filter(Boolean)\n      .join(" ") ||\n    character.display_name?.trim() ||\n    npc.name;\n\n  const portrait =\n    character.portrait_url ||\n    npc.portrait_url ||\n    null;\n\n  return (\n    <main className="mx-auto w-full max-w-7xl p-4 sm:p-6">\n      <article className="space-y-6">\n        <section>\n          <div className="mb-3">\n            <p className="text-[8px] uppercase tracking-[0.24em] text-[rgb(var(--sep-colour-876a46))]">\n              NPC profile\n            </p>\n            <h1 className="mt-1 font-serif text-2xl text-[rgb(var(--sep-colour-ecd9b2))] sm:text-3xl">\n              {fullName}\n            </h1>\n          </div>\n\n          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(360px,0.9fr)]">\n            <section className="grid gap-4 border border-[rgb(var(--sep-colour-654b2e))]/50 bg-[rgb(var(--sep-colour-17110d))] p-4 sm:p-5 lg:grid-cols-[180px_minmax(0,1fr)]">\n              <div className="mx-auto w-full max-w-[180px] lg:mx-0">\n                <div className="relative aspect-[3/4] w-full overflow-hidden border border-[rgb(var(--sep-colour-60482e))]/50 bg-[rgb(var(--sep-colour-0d0a08))]">\n                  {portrait ? (\n                    <Image\n                      src={portrait}\n                      alt={`Portrait of ${fullName}`}\n                      fill\n                      sizes="180px"\n                      className="object-cover"\n                      priority\n                    />\n                  ) : (\n                    <div className="flex h-full items-center justify-center font-serif text-5xl text-[rgb(var(--sep-colour-5f503f))]">\n                      {fullName.charAt(0).toUpperCase()}\n                    </div>\n                  )}\n                </div>\n\n                <div className="mt-2 border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2.5">\n                  <p className="text-[7px] uppercase tracking-[0.19em] text-[rgb(var(--sep-colour-796448))]">\n                    Type\n                  </p>\n                  <p className="mt-1 text-[11px] leading-5 text-[rgb(var(--sep-colour-cab89b))]">\n                    NPC\n                  </p>\n                </div>\n              </div>\n\n              <div className="min-w-0">\n                <div className="border-b border-[rgb(var(--sep-colour-5d452d))]/35 pb-3">\n                  <p className="text-[8px] uppercase tracking-[0.26em] text-[rgb(var(--sep-colour-876a46))]">\n                    In short\n                  </p>\n                  <h2 className="mt-1 font-serif text-xl text-[rgb(var(--sep-colour-ecd9b2))]">\n                    {fullName}\n                  </h2>\n\n                  <CharacterConditionsDisplay characterId={character.id} />\n                  <CharacterLifeStateBadge characterId={character.id} />\n                </div>\n\n                <div className="mt-3 grid gap-px bg-[rgb(var(--sep-colour-4f3b28))]/35 sm:grid-cols-2 lg:grid-cols-3">\n                  <Detail label="Gender" value={formatGender(character.gender)} />\n                  <Detail label="Pronouns" value={character.pronouns || npc.pronouns} />\n                  <Detail label="Sexual orientation" value={character.sexual_orientation} />\n                  <Detail label="Birthplace" value={character.birthplace} />\n                  <Detail label="Origin" value={character.origin} />\n                  <Detail label="Title" value={character.title || "NPC"} />\n                  <Detail label="Ancestry" value={race?.name} />\n                  <Detail label="Order" value={order?.name} />\n                  <Detail label="Location status" value="Active in Location" />\n                </div>\n              </div>\n\n              <div className="lg:col-span-2">\n                <CharacterHealthDisplay characterId={character.id} />\n              </div>\n            </section>\n\n            <CharacterMechanicsDisplay characterId={character.id} />\n          </div>\n\n          <div className="mt-4 grid gap-4 md:grid-cols-2">\n            <TextSection\n              title="Physical Description"\n              content={character.physical_description || npc.description}\n            />\n            <TextSection title="Personality" content={character.personality} />\n            <TextSection title="Biography" content={character.biography} />\n            <TextSection title="Public Notes" content={character.public_notes} />\n          </div>\n        </section>\n\n        <section className="border-t border-[rgb(var(--sep-colour-60482e))]/45 pt-6">\n          <CharacterShapesDisplay characterId={character.id} />\n        </section>\n\n        <section className="border-t border-[rgb(var(--sep-colour-60482e))]/45 pt-6">\n          <CharacterGiftsDisplay characterId={character.id} twoColumns />\n        </section>\n\n        <section className="border-t border-[rgb(var(--sep-colour-60482e))]/45 pt-6">\n          <div className="mb-4">\n            <p className="text-[8px] uppercase tracking-[0.22em] text-[rgb(var(--sep-colour-806b50))]">\n              Possessions\n            </p>\n            <h2 className="mt-1 font-serif text-xl text-[rgb(var(--sep-colour-dec89f))]">\n              Equipment & Items\n            </h2>\n          </div>\n\n          <CharacterInventoryDisplay\n            characterId={character.id}\n            own={false}\n            showInventoryItems\n          />\n        </section>\n      </article>\n    </main>\n  );\n}\n'
NPC_EQUIPMENT_TEXT = 'import "server-only";\n\nimport {\n  equipNpcInventoryItemAdministration,\n  unequipNpcInventoryItemAdministration,\n} from "@/app/(portal)/admin/characters/actions";\nimport { createClient } from "@/lib/supabase/server";\n\ntype InventoryRow = {\n  record_kind: "standard" | "unique";\n  record_id: string;\n  item_id: string;\n  name: string;\n  quantity: number;\n  is_equippable: boolean;\n  is_equipped: boolean;\n  equipped_slot: string | null;\n  equipped_layer: string | null;\n};\n\nfunction titleCase(value: string | null) {\n  return value\n    ? value\n        .replace(/_/g, " ")\n        .replace(/\\b\\w/g, (letter) => letter.toUpperCase())\n    : "—";\n}\n\nexport async function NpcEquipmentAdmin({\n  characterId,\n}: {\n  characterId: string;\n}) {\n  const supabase = await createClient();\n\n  const inventory = await supabase.rpc(\n    "get_public_character_inventory",\n    {\n      p_character_id: characterId,\n    },\n  );\n\n  if (inventory.error) {\n    throw new Error(\n      `Unable to load NPC Equipment: ${inventory.error.message}`,\n    );\n  }\n\n  const rows =\n    ((inventory.data ?? []) as unknown as InventoryRow[])\n      .filter((row) => row.is_equippable);\n\n  const eligibility = await Promise.all(\n    rows.map(async (row) => {\n      const result = await (supabase as any).rpc(\n        "character_can_equip_item",\n        {\n          p_character_id: characterId,\n          p_item_id: row.item_id,\n        },\n      );\n\n      if (result.error) {\n        throw new Error(result.error.message);\n      }\n\n      return [\n        `${row.record_kind}:${row.record_id}`,\n        result.data === true,\n      ] as const;\n    }),\n  );\n\n  const canEquip = new Map(eligibility);\n  const equipped = rows.filter((row) => row.is_equipped);\n  const available = rows.filter((row) => !row.is_equipped);\n\n  const buttonClass =\n    "border border-[rgb(var(--sep-colour-765937))]/60 bg-[rgb(var(--sep-colour-21170f))] px-3 py-2 text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-d7bd91))] transition hover:border-[rgb(var(--sep-colour-a17a49))] disabled:cursor-not-allowed disabled:opacity-35";\n\n  return (\n    <section\n      data-admin-full-row="true"\n      className="mt-5 border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-100c09))] p-4"\n    >\n      <p className="text-[8px] uppercase tracking-[0.22em] text-[rgb(var(--sep-colour-806b50))]">\n        NPC Equipment\n      </p>\n      <h3 className="mt-1 font-serif text-xl text-[rgb(var(--sep-colour-dfc99f))]">\n        Equipped Items\n      </h3>\n      <p className="mt-2 text-[10px] leading-5 text-[rgb(var(--sep-colour-8f8271))]">\n        This uses the same Equipment slots, requirements, two-handed rules and passive bonuses as Character Equipment. Equipped weapons become available in this NPC&apos;s Combat panel.\n      </p>\n\n      {equipped.length ? (\n        <div className="mt-4 grid gap-2 md:grid-cols-2">\n          {equipped.map((row) => (\n            <div\n              key={`${row.record_kind}:${row.record_id}`}\n              className="flex items-center justify-between gap-3 border border-[rgb(var(--sep-colour-59432c))]/40 bg-[rgb(var(--sep-colour-15100d))] p-3"\n            >\n              <div className="min-w-0">\n                <p className="truncate font-serif text-sm text-[rgb(var(--sep-colour-d8bf91))]">\n                  {row.name}\n                  {row.quantity > 1 ? ` ×${row.quantity}` : ""}\n                </p>\n                <p className="mt-1 text-[7px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-756958))]">\n                  {titleCase(row.equipped_slot)} · {titleCase(row.equipped_layer)}\n                </p>\n              </div>\n\n              <form action={unequipNpcInventoryItemAdministration}>\n                <input type="hidden" name="characterId" value={characterId} />\n                <input type="hidden" name="recordKind" value={row.record_kind} />\n                <input type="hidden" name="recordId" value={row.record_id} />\n                <button type="submit" className={buttonClass}>\n                  Unequip\n                </button>\n              </form>\n            </div>\n          ))}\n        </div>\n      ) : (\n        <p className="mt-4 text-xs italic text-[rgb(var(--sep-colour-756958))]">\n          No Items equipped.\n        </p>\n      )}\n\n      <div className="mt-5 border-t border-[rgb(var(--sep-colour-59432c))]/35 pt-4">\n        <p className="text-[8px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-806b50))]">\n          Available Equipment\n        </p>\n\n        {available.length ? (\n          <div className="mt-3 grid gap-2 md:grid-cols-2">\n            {available.map((row) => {\n              const eligible =\n                canEquip.get(`${row.record_kind}:${row.record_id}`) === true;\n\n              return (\n                <div\n                  key={`${row.record_kind}:${row.record_id}`}\n                  className="flex items-center justify-between gap-3 border border-[rgb(var(--sep-colour-59432c))]/40 bg-[rgb(var(--sep-colour-15100d))] p-3"\n                >\n                  <div className="min-w-0">\n                    <p className="truncate font-serif text-sm text-[rgb(var(--sep-colour-d8bf91))]">\n                      {row.name}\n                      {row.quantity > 1 ? ` ×${row.quantity}` : ""}\n                    </p>\n                    <p\n                      className={`mt-1 text-[7px] uppercase tracking-[0.12em] ${\n                        eligible ? "text-emerald-500" : "text-red-400"\n                      }`}\n                    >\n                      {eligible ? "Requirements met" : "Requirements not met"}\n                    </p>\n                  </div>\n\n                  <form action={equipNpcInventoryItemAdministration}>\n                    <input type="hidden" name="characterId" value={characterId} />\n                    <input type="hidden" name="recordKind" value={row.record_kind} />\n                    <input type="hidden" name="recordId" value={row.record_id} />\n                    <button\n                      type="submit"\n                      disabled={!eligible}\n                      className={buttonClass}\n                    >\n                      Equip\n                    </button>\n                  </form>\n                </div>\n              );\n            })}\n          </div>\n        ) : (\n          <p className="mt-3 text-xs italic text-[rgb(var(--sep-colour-756958))]">\n            No unequipped equippable Items in this NPC&apos;s Inventory.\n          </p>\n        )}\n      </div>\n    </section>\n  );\n}\n'
EQUIPMENT_ACTIONS = 'function readNpcEquipmentRecordKind(\n  value: FormDataEntryValue | null,\n): "standard" | "unique" {\n  const raw =\n    typeof value === "string"\n      ? value.trim()\n      : "";\n\n  if (raw !== "standard" && raw !== "unique") {\n    throw new Error("Invalid Inventory record type.");\n  }\n\n  return raw;\n}\n\nasync function revalidateNpcEquipment(\n  admin: any,\n  characterId: string,\n) {\n  const npc = await admin\n    .from("npcs")\n    .select("id")\n    .eq("character_id", characterId)\n    .maybeSingle();\n\n  revalidatePath(`/admin/characters/${characterId}`);\n  revalidatePath(`/admin/characters/${characterId}/inventory`);\n  revalidatePath("/game");\n\n  if (npc.data?.id) {\n    revalidatePath(`/npcs/${npc.data.id}`);\n  }\n}\n\nexport async function equipNpcInventoryItemAdministration(\n  formData: FormData,\n) {\n  await requireStaffCapability("character_economy");\n\n  const characterId =\n    readRequiredUuid(formData.get("characterId"));\n\n  const recordId =\n    readRequiredUuid(formData.get("recordId"));\n\n  const recordKind =\n    readNpcEquipmentRecordKind(formData.get("recordKind"));\n\n  const admin = createPrivilegedClient();\n\n  const npc = await admin\n    .from("npcs")\n    .select("id")\n    .eq("character_id", characterId)\n    .maybeSingle();\n\n  if (npc.error || !npc.data) {\n    throw new Error(\n      npc.error?.message ?? "NPC Character not found.",\n    );\n  }\n\n  const supabase = await createClient();\n\n  const { error } = await (supabase as any).rpc(\n    "equip_npc_inventory_record_as_staff",\n    {\n      p_character_id: characterId,\n      p_record_kind: recordKind,\n      p_record_id: recordId,\n    },\n  );\n\n  if (error) {\n    throw new Error(error.message);\n  }\n\n  await revalidateNpcEquipment(admin, characterId);\n}\n\nexport async function unequipNpcInventoryItemAdministration(\n  formData: FormData,\n) {\n  await requireStaffCapability("character_economy");\n\n  const characterId =\n    readRequiredUuid(formData.get("characterId"));\n\n  const recordId =\n    readRequiredUuid(formData.get("recordId"));\n\n  const recordKind =\n    readNpcEquipmentRecordKind(formData.get("recordKind"));\n\n  const admin = createPrivilegedClient();\n\n  const npc = await admin\n    .from("npcs")\n    .select("id")\n    .eq("character_id", characterId)\n    .maybeSingle();\n\n  if (npc.error || !npc.data) {\n    throw new Error(\n      npc.error?.message ?? "NPC Character not found.",\n    );\n  }\n\n  const supabase = await createClient();\n\n  const { error } = await (supabase as any).rpc(\n    "unequip_npc_inventory_record_as_staff",\n    {\n      p_character_id: characterId,\n      p_record_kind: recordKind,\n      p_record_id: recordId,\n    },\n  );\n\n  if (error) {\n    throw new Error(error.message);\n  }\n\n  await revalidateNpcEquipment(admin, characterId);\n}\n\n'
SQL_TEXT = "begin;\n\ncreate or replace function public.equip_npc_inventory_record_as_staff(\n  p_character_id uuid,\n  p_record_kind text,\n  p_record_id uuid\n)\nreturns void\nlanguage plpgsql\nsecurity definer\nset search_path to 'public'\nas $function$\ndeclare\n  v_item_id uuid;\n  v_slot text;\n  v_layer text;\n  v_hands smallint;\nbegin\n  if auth.uid() is null then\n    raise exception 'Authentication required.';\n  end if;\n\n  if not public.is_staff_user() then\n    raise exception 'Staff access required.';\n  end if;\n\n  if not exists (\n    select 1\n    from public.characters c\n    join public.npcs n on n.character_id = c.id\n    where c.id = p_character_id\n      and c.is_system = true\n  ) then\n    raise exception 'NPC Character not found.';\n  end if;\n\n  if p_record_kind = 'standard' then\n    select ci.item_id\n    into v_item_id\n    from public.character_items ci\n    where ci.id = p_record_id\n      and ci.character_id = p_character_id;\n  elsif p_record_kind = 'unique' then\n    select inst.item_id\n    into v_item_id\n    from public.character_item_instances inst\n    where inst.id = p_record_id\n      and inst.owner_character_id = p_character_id\n      and inst.vault_status = 'owned';\n  else\n    raise exception 'Invalid inventory record type.';\n  end if;\n\n  if v_item_id is null then\n    raise exception 'NPC does not own this Item.';\n  end if;\n\n  select equip_slot, equip_layer, hands_required\n  into v_slot, v_layer, v_hands\n  from public.items\n  where id = v_item_id\n    and is_equippable = true\n    and is_active = true;\n\n  if v_slot is null or v_layer is null then\n    raise exception 'This Item cannot be equipped.';\n  end if;\n\n  if not public.character_can_equip_item(\n    p_character_id,\n    v_item_id\n  ) then\n    raise exception 'This character does not meet the requirements to equip this Item.';\n  end if;\n\n  if p_record_kind = 'standard' then\n    update public.character_items\n    set container_instance_id = null,\n        updated_at = now()\n    where id = p_record_id\n      and character_id = p_character_id;\n  else\n    update public.character_item_instances\n    set container_instance_id = null,\n        updated_at = now()\n    where id = p_record_id\n      and owner_character_id = p_character_id;\n  end if;\n\n  if v_hands = 2 then\n    delete from public.character_equipment\n    where character_id = p_character_id\n      and slot_key in ('main_hand', 'off_hand');\n\n  elsif v_slot in ('main_hand', 'off_hand') then\n    delete from public.character_equipment ce\n    using public.character_items ci\n    join public.items i on i.id = ci.item_id\n    where ce.character_id = p_character_id\n      and ce.character_item_id = ci.id\n      and i.hands_required = 2;\n\n    delete from public.character_equipment ce\n    using public.character_item_instances inst\n    join public.items i on i.id = inst.item_id\n    where ce.character_id = p_character_id\n      and ce.item_instance_id = inst.id\n      and i.hands_required = 2;\n  end if;\n\n  delete from public.character_equipment\n  where character_id = p_character_id\n    and slot_key = v_slot\n    and layer_key = v_layer;\n\n  if p_record_kind = 'standard' then\n    insert into public.character_equipment(\n      character_id,\n      slot_key,\n      layer_key,\n      character_item_id\n    )\n    values(\n      p_character_id,\n      v_slot,\n      v_layer,\n      p_record_id\n    );\n  else\n    insert into public.character_equipment(\n      character_id,\n      slot_key,\n      layer_key,\n      item_instance_id\n    )\n    values(\n      p_character_id,\n      v_slot,\n      v_layer,\n      p_record_id\n    );\n  end if;\nend;\n$function$;\n\ncreate or replace function public.unequip_npc_inventory_record_as_staff(\n  p_character_id uuid,\n  p_record_kind text,\n  p_record_id uuid\n)\nreturns void\nlanguage plpgsql\nsecurity definer\nset search_path to 'public'\nas $function$\nbegin\n  if auth.uid() is null then\n    raise exception 'Authentication required.';\n  end if;\n\n  if not public.is_staff_user() then\n    raise exception 'Staff access required.';\n  end if;\n\n  if not exists (\n    select 1\n    from public.characters c\n    join public.npcs n on n.character_id = c.id\n    where c.id = p_character_id\n      and c.is_system = true\n  ) then\n    raise exception 'NPC Character not found.';\n  end if;\n\n  if p_record_kind = 'standard' then\n    if not exists (\n      select 1\n      from public.character_items\n      where id = p_record_id\n        and character_id = p_character_id\n    ) then\n      raise exception 'NPC does not own this Item.';\n    end if;\n\n    delete from public.character_equipment\n    where character_id = p_character_id\n      and character_item_id = p_record_id;\n\n  elsif p_record_kind = 'unique' then\n    if not exists (\n      select 1\n      from public.character_item_instances\n      where id = p_record_id\n        and owner_character_id = p_character_id\n        and vault_status = 'owned'\n    ) then\n      raise exception 'NPC does not own this Item.';\n    end if;\n\n    delete from public.character_equipment\n    where character_id = p_character_id\n      and item_instance_id = p_record_id;\n  else\n    raise exception 'Invalid inventory record type.';\n  end if;\nend;\n$function$;\n\nrevoke all on function public.equip_npc_inventory_record_as_staff(\n  uuid, text, uuid\n) from public, anon;\n\nrevoke all on function public.unequip_npc_inventory_record_as_staff(\n  uuid, text, uuid\n) from public, anon;\n\ngrant execute on function public.equip_npc_inventory_record_as_staff(\n  uuid, text, uuid\n) to authenticated;\n\ngrant execute on function public.unequip_npc_inventory_record_as_staff(\n  uuid, text, uuid\n) to authenticated;\n\ngrant execute on function public.equip_npc_inventory_record_as_staff(\n  uuid, text, uuid\n) to service_role;\n\ngrant execute on function public.unequip_npc_inventory_record_as_staff(\n  uuid, text, uuid\n) to service_role;\n\ncommit;\n"
ROLLBACK_TEXT = 'begin;\n\ndrop function if exists public.equip_npc_inventory_record_as_staff(\n  uuid, text, uuid\n);\n\ndrop function if exists public.unequip_npc_inventory_record_as_staff(\n  uuid, text, uuid\n);\n\ncommit;\n'

OLD_SYSTEM_CLIENT = '  const supabase =\n    await createClient();\n\n  const {\n    data: character,\n    error: readError,\n  } = await supabase'
NEW_SYSTEM_CLIENT = '  const supabase =\n    isSystemCharacter\n      ? admin\n      : await createClient();\n\n  const {\n    data: character,\n    error: readError,\n  } = await supabase'
SYNC_ANCHOR = '  revalidatePath("/admin"); \n  revalidatePath(\n    "/admin/characters",\n  );'
SYNC_BLOCK = '  if (isSystemCharacter) {\n    const npcDisplayName =\n      [firstName, surname]\n        .filter(Boolean)\n        .join(" ")\n        .trim() ||\n      firstName;\n\n    const {\n      error: displayNameSyncError,\n    } = await admin\n      .from("characters")\n      .update({\n        display_name: npcDisplayName,\n      })\n      .eq("id", characterId)\n      .eq("is_system", true);\n\n    if (displayNameSyncError) {\n      throw new Error(\n        `NPC Character saved, but its display name could not be synchronised: ${displayNameSyncError.message}`,\n      );\n    }\n\n    const {\n      error: npcSyncError,\n    } = await admin\n      .from("npcs")\n      .update({\n        name: npcDisplayName,\n        pronouns,\n        portrait_url: portraitUrl,\n        description: physicalDescription,\n        race_id: raceId,\n        updated_by_user_id: staff.userId,\n        updated_at: now,\n      })\n      .eq("character_id", characterId);\n\n    if (npcSyncError) {\n      throw new Error(\n        `NPC Character saved, but its NPC identity could not be synchronised: ${npcSyncError.message}`,\n      );\n    }\n  }\n\n'

AGE_OLD_VALIDATION = '    if (\n      selectedGiftIds.length >\n      2\n    ) {\n      return {\n        ok: false,\n        error:\n          "Choose no more than 2 Ancestry Feats.",\n      };\n    }\n\n    if (\n      !ageRaw ||\n      !Number.isInteger(age) ||\n      age < 0\n    ) {\n      return {\n        ok: false,\n        error:\n          "Age must be a whole number.",\n      };\n    }\n\n    const supabase =\n      await createClient();\n'
AGE_NEW_VALIDATION = '    const supabase =\n      createAdminClient();\n\n    const {\n      data: targetCharacter,\n      error: targetCharacterError,\n    } = await supabase\n      .from("characters")\n      .select("is_system")\n      .eq("id", characterId)\n      .maybeSingle();\n\n    if (\n      targetCharacterError ||\n      !targetCharacter\n    ) {\n      return {\n        ok: false,\n        error:\n          targetCharacterError?.message ??\n          "Character not found.",\n      };\n    }\n\n    const isSystemCharacter =\n      targetCharacter.is_system === true;\n\n    if (\n      selectedGiftIds.length >\n      2\n    ) {\n      return {\n        ok: false,\n        error:\n          "Choose no more than 2 Ancestry Feats.",\n      };\n    }\n\n    if (\n      (\n        !ageRaw &&\n        !isSystemCharacter\n      ) ||\n      (\n        ageRaw &&\n        (\n          !Number.isInteger(age) ||\n          age < 0\n        )\n      )\n    ) {\n      return {\n        ok: false,\n        error:\n          "Age must be a whole number.",\n      };\n    }\n\n'
AGE_OLD_RANGE = '    if (\n      race.min_age === null\n    ) {\n      return {\n        ok: false,\n        error:\n          `The playable age range for ${race.name} is not configured.`,\n      };\n    }\n\n    if (\n      age <\n      race.min_age\n    ) {\n      return {\n        ok: false,\n        error:\n          `${race.name} characters must be at least ${race.min_age} years old.`,\n      };\n    }\n\n    if (\n      race.max_age !== null &&\n      age >\n        race.max_age\n    ) {\n      return {\n        ok: false,\n        error:\n          `${race.name} characters may be no older than ${race.max_age} years.`,\n      };\n    }\n'
AGE_NEW_RANGE = '    if (\n      race.min_age === null &&\n      !isSystemCharacter\n    ) {\n      return {\n        ok: false,\n        error:\n          `The playable age range for ${race.name} is not configured.`,\n      };\n    }\n\n    if (\n      ageRaw &&\n      race.min_age !== null &&\n      age <\n        race.min_age\n    ) {\n      return {\n        ok: false,\n        error:\n          `${race.name} characters must be at least ${race.min_age} years old.`,\n      };\n    }\n\n    if (\n      ageRaw &&\n      race.max_age !== null &&\n      age >\n        race.max_age\n    ) {\n      return {\n        ok: false,\n        error:\n          `${race.name} characters may be no older than ${race.max_age} years.`,\n      };\n    }\n'
AGE_OLD_UPDATE = '      .update({\n        age,\n        race_id:\n          raceId,'
AGE_NEW_UPDATE = '      .update({\n        age:\n          ageRaw\n            ? age\n            : null,\n        race_id:\n          raceId,'

FORM_OLD_TYPE = '  className?: string;\n  children: ReactNode;\n};'
FORM_NEW_TYPE = '  className?: string;\n  children: ReactNode;\n  allowMissingAge?: boolean;\n};'
FORM_OLD_ARGS = '  action,\n  className,\n  children,\n}: AdminCharacterEditFormProps) {'
FORM_NEW_ARGS = '  action,\n  className,\n  children,\n  allowMissingAge = false,\n}: AdminCharacterEditFormProps) {'
FORM_AGE_INSERT_OLD = '    const numericAge =\n      Number(age);\n\n    if (\n      !age.trim() ||\n      !Number.isInteger(\n        numericAge,\n      )\n    ) {'
FORM_AGE_INSERT_NEW = '    if (\n      allowMissingAge &&\n      !age.trim()\n    ) {\n      setAgeError(null);\n      return true;\n    }\n\n    const numericAge =\n      Number(age);\n\n    if (\n      !age.trim() ||\n      !Number.isInteger(\n        numericAge,\n      )\n    ) {'
FORM_OLD_MIN = '    if (\n      selectedRace.min_age ===\n      null\n    ) {'
FORM_NEW_MIN = '    if (\n      selectedRace.min_age ===\n      null &&\n      !allowMissingAge\n    ) {'

PAGE_FORM_OLD = '              <AdminCharacterEditForm\n                action={\n                  updateCharacterAdministration\n                }\n                className="mt-6"\n              >'
PAGE_FORM_NEW = '              <AdminCharacterEditForm\n                action={\n                  updateCharacterAdministration\n                }\n                allowMissingAge={\n                  character.is_system\n                }\n                className="mt-6"\n              >'
PAGE_IMPORT_OLD = 'import { CharacterConditionsEditor } from "@/components/characters/character-conditions-editor";'
PAGE_IMPORT_NEW = 'import { CharacterConditionsEditor } from "@/components/characters/character-conditions-editor";\nimport { NpcEquipmentAdmin } from "@/components/admin/npc-equipment-admin";'
PAGE_EQUIPMENT_ANCHOR = '                <CharacterReviewFields\n                  initialStatus={\n                    character.status\n                  }'
PAGE_EQUIPMENT_INSERT = '                {character.is_system &&\n                canManageEconomy ? (\n                  <NpcEquipmentAdmin\n                    characterId={\n                      character.id\n                    }\n                  />\n                ) : null}\n\n'


def die(message):
    raise SystemExit(f"\nERROR: {message}\n")


def head():
    try:
        return subprocess.check_output(
            ["git", "rev-parse", "--short", "HEAD"],
            cwd=ROOT,
            text=True,
            stderr=subprocess.DEVNULL,
        ).strip()
    except Exception:
        return "unknown"


def read(rel):
    path = ROOT / rel
    if not path.exists():
        die(f"Missing expected file: {rel}")
    return path.read_text(encoding="utf-8-sig")


def rep(text, old, new, label, count=1):
    found = text.count(old)
    if found != count:
        die(
            f"{label}: expected {count} match(es), found {found}. "
            "No source files were changed."
        )
    return text.replace(old, new, count)


def backup():
    if BACKUP.exists():
        print(f"Backup already exists: {BACKUP}")
        return

    for rel in FILES:
        src = ROOT / rel
        dst = BACKUP / rel
        dst.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(src, dst)

    print(f"Backup created: {BACKUP}")


def patch_context(text):
    return rep(
        text,
        "{canManageCharacters ? (",
        "{canManageCharacters && !person.is_system ? (",
        "remove NPC cog",
    )


def patch_actions(text):
    text = rep(
        text,
        OLD_SYSTEM_CLIENT,
        NEW_SYSTEM_CLIENT,
        "NPC Stats & Feats privileged edit client",
    )

    text = rep(
        text,
        SYNC_ANCHOR,
        SYNC_BLOCK + SYNC_ANCHOR,
        "NPC identity sync",
    )

    if "export async function equipNpcInventoryItemAdministration" not in text:
        text = rep(
            text,
            "export async function assignNpcFeatAdministration",
            EQUIPMENT_ACTIONS
            + "\nexport async function assignNpcFeatAdministration",
            "NPC equipment actions insertion",
        )

    return text


def patch_age_actions(text):
    text = rep(
        text,
        'import { createClient } from "@/lib/supabase/server";',
        'import { createAdminClient } from "@/lib/supabase/admin";',
        "admin age client import",
    )

    # Replace the save-action block first, because that exact block
    # contains one of the two original await createClient() calls.
    text = rep(
        text,
        AGE_OLD_VALIDATION,
        AGE_NEW_VALIDATION,
        "NPC optional age and privileged Ancestry Feats",
    )

    # One original await createClient() now remains: the age-config loader.
    text = rep(
        text,
        "await createClient()",
        "createAdminClient()",
        "admin age config client",
        1,
    )

    text = rep(
        text,
        AGE_OLD_RANGE,
        AGE_NEW_RANGE,
        "NPC age-range validation",
    )

    text = rep(
        text,
        AGE_OLD_UPDATE,
        AGE_NEW_UPDATE,
        "NPC nullable age save",
    )

    if "createClient()" in text:
        die(
            "age-actions still contains createClient() after transformation"
        )

    return text


def patch_admin_form(text):
    text = rep(
        text,
        FORM_OLD_TYPE,
        FORM_NEW_TYPE,
        "AdminCharacterEditForm allowMissingAge type",
    )
    text = rep(
        text,
        FORM_OLD_ARGS,
        FORM_NEW_ARGS,
        "AdminCharacterEditForm allowMissingAge prop",
    )
    text = rep(
        text,
        FORM_AGE_INSERT_OLD,
        FORM_AGE_INSERT_NEW,
        "NPC optional age client validation",
    )
    text = rep(
        text,
        FORM_OLD_MIN,
        FORM_NEW_MIN,
        "NPC missing ancestry age-range allowance",
    )
    return text


def patch_admin_page(text):
    text = rep(
        text,
        PAGE_IMPORT_OLD,
        PAGE_IMPORT_NEW,
        "NPC Equipment admin import",
    )
    text = rep(
        text,
        PAGE_FORM_OLD,
        PAGE_FORM_NEW,
        "NPC optional age form prop",
    )
    text = rep(
        text,
        PAGE_EQUIPMENT_ANCHOR,
        PAGE_EQUIPMENT_INSERT + PAGE_EQUIPMENT_ANCHOR,
        "NPC Equipment admin section",
    )
    return text


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

    created = ROOT / NPC_EQUIPMENT
    if created.exists():
        created.unlink()
        print(f"Removed {NPC_EQUIPMENT}")

    print("\nCode reverted. Nothing committed or pushed.")
    print(f"If SQL was applied, also run {ROLLBACK_NAME}.")


def apply():
    current = head()
    print(f"Current HEAD: {current}")

    if current != BASE:
        print(
            f"WARNING: built against {BASE}; current HEAD is {current}."
        )

    # Transform/validate every existing file first.
    # No source file is written if any expected ad242f4 block differs.
    transformed = {
        GAME_CONTEXT: patch_context(read(GAME_CONTEXT)),
        ADMIN_ACTIONS: patch_actions(read(ADMIN_ACTIONS)),
        AGE_ACTIONS: patch_age_actions(read(AGE_ACTIONS)),
        ADMIN_FORM: patch_admin_form(read(ADMIN_FORM)),
        ADMIN_PAGE: patch_admin_page(read(ADMIN_PAGE)),
    }

    # Ensure the existing NPC route exists before the full rewrite.
    read(NPC_SHEET)

    backup()

    for rel, content in transformed.items():
        (ROOT / rel).write_text(content, encoding="utf-8")
        print(f"Patched {rel}")

    (ROOT / NPC_SHEET).write_text(
        NPC_SHEET_TEXT,
        encoding="utf-8",
    )
    print(f"Rebuilt {NPC_SHEET}")

    equipment_path = ROOT / NPC_EQUIPMENT
    equipment_path.parent.mkdir(parents=True, exist_ok=True)
    equipment_path.write_text(
        NPC_EQUIPMENT_TEXT,
        encoding="utf-8",
    )
    print(f"Created {NPC_EQUIPMENT}")

    (ROOT / SQL_NAME).write_text(
        SQL_TEXT,
        encoding="utf-8",
    )
    (ROOT / ROLLBACK_NAME).write_text(
        ROLLBACK_TEXT,
        encoding="utf-8",
    )
    print(f"Created {SQL_NAME}")
    print(f"Created {ROLLBACK_NAME}")

    print("\nPATCH APPLIED LOCALLY ONLY.")
    print("Nothing committed or pushed.")
    print("\nNext:")
    print(f"1) Run {SQL_NAME} in Supabase SQL Editor")
    print("2) Run: npm run build")
    print("\nRevert code:")
    print("python patch_npc_sheet_equipment_admin_ad242f4.py --revert")
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
