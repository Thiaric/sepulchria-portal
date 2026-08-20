from pathlib import Path
import subprocess

EXPECTED_HEAD = 'fdff11fdadaa3795077a6e446e3609b4d7dc2111'
ROOT = Path.cwd()

def read(rel):
    p = ROOT / rel
    if not p.exists():
        raise SystemExit(f"Missing expected file: {rel}")
    return p.read_text(encoding="utf-8-sig")

def write(rel, text):
    (ROOT / rel).write_text(text, encoding="utf-8", newline="\n")
    print(f"UPDATED: {rel}")

def apply_replacements(rel, replacements):
    text = read(rel)
    for label, old, new in replacements:
        count = text.count(old)
        if count == 1:
            text = text.replace(old, new, 1)
        elif count == 0:
            # Allow already-applied damage-only fallback blocks, but never guess.
            if "blocked fallback" in label:
                print(f"SKIP (already changed or not needed): {label}")
                continue
            raise SystemExit(f"STOPPED at {label} in {rel}: patch point not found.")
        else:
            raise SystemExit(f"STOPPED at {label} in {rel}: expected 1 match, found {count}.")
    write(rel, text)

try:
    head = subprocess.check_output(["git", "rev-parse", "HEAD"], text=True).strip()
except Exception:
    head = None

if head and head != EXPECTED_HEAD:
    raise SystemExit(
        f"STOPPED: expected HEAD {EXPECTED_HEAD}, current HEAD is {head}. No files changed."
    )

apply_replacements(
    "lib/items/use-actions.ts",
    [('inventory equipped-only weapon check', '  const record = await loadAttemptRecord(\n      recordKind,\n      recordId,\n      character.id,\n    );\n\n    const targetMode =\n      record.item.target_mode ?? "self";\n', '    const record = await loadAttemptRecord(\n      recordKind,\n      recordId,\n      character.id,\n    );\n\n    const categorySlug =\n      one(record.item.category)?.slug ?? null;\n\n    if (categorySlug === "weapon") {\n      const { data: inventoryRows, error: inventoryError } =\n        await supabase.rpc(\n          "get_public_character_inventory",\n          { p_character_id: character.id },\n        );\n\n      if (inventoryError) {\n        return {\n          ok: false,\n          message:\n            `Unable to verify equipped Weapon: ${inventoryError.message}`,\n        };\n      }\n\n      const equipped = ((inventoryRows ?? []) as Array<{\n        record_kind?: string;\n        record_id?: string;\n        is_equipped?: boolean;\n        equipped_slot?: string | null;\n      }>).find(\n        (row) =>\n          row.record_kind === recordKind &&\n          row.record_id === recordId,\n      );\n\n      if (\n        !equipped?.is_equipped ||\n        !["main_hand", "off_hand"].includes(\n          String(equipped.equipped_slot ?? ""),\n        )\n      ) {\n        return {\n          ok: false,\n          message:\n            "Weapons can only be used while equipped in Main Hand or Off Hand.",\n        };\n      }\n    }\n\n    const targetMode =\n      record.item.target_mode ?? "self";\n'), ('remove duplicate categorySlug', '    const categorySlug =\n      one(record.item.category)?.slug ?? null;\n\n    const baseDamage =\n      rollDamage(record.item.damage_dice);\n', '    const baseDamage =\n      rollDamage(record.item.damage_dice);\n'), ('damage-only blocked fallback', '    const result = (data ?? {}) as {\n      ok?: boolean;\n      blocked?: boolean;\n      block_reason?: string;\n      item_name?: string;\n      target_name?: string;\n      health_delta?: number;\n      temporary_effects?: number;\n    };\n\n    if (result.blocked) {\n      return {\n        ok: false,\n        message:\n          result.block_reason ??\n          "This Item cannot be used right now.",\n      };\n    }\n', '    let result = (data ?? {}) as {\n      ok?: boolean;\n      blocked?: boolean;\n      block_reason?: string;\n      item_name?: string;\n      target_name?: string;\n      health_delta?: number;\n      temporary_effects?: number;\n    };\n\n    if (\n      result.blocked &&\n      Boolean(record.item.damage_dice) &&\n      result.block_reason?.includes("no configured Use effect")\n    ) {\n      result = await resolveDamageOnlySuccessfulUse({\n        record,\n        characterId: character.id,\n      });\n    }\n\n    if (result.blocked) {\n      return {\n        ok: false,\n        message:\n          result.block_reason ??\n          "This Item cannot be used right now.",\n      };\n    }\n')],
)
apply_replacements(
    "app/(portal)/game/actions.ts",
    [('chat equipped-only weapon check', '    if (itemError || !item) {\n      return { ok: false, message: "Unable to load that Item." };\n    }\n\n    if (item.target_mode === "self" && targetCharacterId) {\n', '    if (itemError || !item) {\n      return { ok: false, message: "Unable to load that Item." };\n    }\n\n    const category =\n      oneItemRelation(item.category);\n\n    if (category?.slug === "weapon") {\n      const { data: inventoryRows, error: inventoryError } =\n        await supabase.rpc(\n          "get_public_character_inventory",\n          { p_character_id: character.id },\n        );\n\n      if (inventoryError) {\n        return {\n          ok: false,\n          message:\n            `Unable to verify equipped Weapon: ${inventoryError.message}`,\n        };\n      }\n\n      const equipped = ((inventoryRows ?? []) as Array<{\n        record_kind?: string;\n        record_id?: string;\n        is_equipped?: boolean;\n        equipped_slot?: string | null;\n      }>).find(\n        (row) =>\n          row.record_kind === recordKind &&\n          row.record_id === recordId,\n      );\n\n      if (\n        !equipped?.is_equipped ||\n        !["main_hand", "off_hand"].includes(\n          String(equipped.equipped_slot ?? ""),\n        )\n      ) {\n        return {\n          ok: false,\n          message:\n            "Weapons can only be used while equipped in Main Hand or Off Hand.",\n        };\n      }\n    }\n\n    if (item.target_mode === "self" && targetCharacterId) {\n'), ('remove duplicate category relation', '    const category =\n      oneItemRelation(item.category);\n\n    const baseDamage =\n      rollRoomItemDamage(\n        item.damage_dice ?? null,\n      );\n', '    const baseDamage =\n      rollRoomItemDamage(\n        item.damage_dice ?? null,\n      );\n'), ('chat damage-only blocked fallback', '    const outcome = (result ?? {}) as {\n      blocked?: boolean;\n      block_reason?: string;\n      item_name?: string;\n      target_name?: string;\n    };\n\n    if (outcome.blocked) {\n      return {\n        ok: false,\n        message:\n          outcome.block_reason ??\n          "This Item cannot be used right now.",\n      };\n    }\n', '    let outcome = (result ?? {}) as {\n      blocked?: boolean;\n      block_reason?: string;\n      item_name?: string;\n      target_name?: string;\n    };\n\n    if (\n      outcome.blocked &&\n      Boolean(item.damage_dice) &&\n      outcome.block_reason?.includes("no configured Use effect")\n    ) {\n      await resolveRoomDamageOnlyUse({\n        supabase,\n        characterId: character.id,\n        recordKind,\n        recordId,\n        itemId,\n        useBehaviour:\n          (item.use_behaviour ?? null) as\n            | "reusable"\n            | "consumable"\n            | "limited_charges"\n            | null,\n        cooldownMinutes:\n          item.cooldown_minutes ?? null,\n      });\n\n      outcome = {\n        blocked: false,\n        item_name: item.name,\n        target_name: null,\n      };\n    }\n\n    if (outcome.blocked) {\n      return {\n        ok: false,\n        message:\n          outcome.block_reason ??\n          "This Item cannot be used right now.",\n      };\n    }\n')],
)
apply_replacements(
    "app/(portal)/game/page.tsx",
    [('chat inventory equipment fields', '      quantity: number;\n      is_usable: boolean;\n    }[];\n', '      quantity: number;\n      is_usable: boolean;\n      is_equipped: boolean;\n      equipped_slot: string | null;\n    }[];\n'), ('chat item master mechanics fields', '            description,\n            target_mode,\n            max_charges,\n            effects:item_effects(\n', '            description,\n            target_mode,\n            max_charges,\n            success_die,\n            success_threshold,\n            success_attribute,\n            damage_dice,\n            damage_type,\n            cooldown_minutes,\n            category:item_categories(slug),\n            effects:item_effects(\n'), ('hide unequipped weapons from chat list', '      return {\n        recordKind: row.record_kind,\n', '      const categoryRelation = master.category ?? null;\n      const category = Array.isArray(categoryRelation)\n        ? categoryRelation[0] ?? null\n        : categoryRelation;\n\n      if (\n        category?.slug === "weapon" &&\n        (\n          !row.is_equipped ||\n          !["main_hand", "off_hand"].includes(\n            String(row.equipped_slot ?? ""),\n          )\n        )\n      ) {\n        return null;\n      }\n\n      return {\n        recordKind: row.record_kind,\n'), ('map mechanics into chat item', '        cooldownReadyAt:\n          cooldownByKey.get(sourceKey) ?? null,\n        effects: Array.isArray(master.effects)\n', '        cooldownReadyAt:\n          cooldownByKey.get(sourceKey) ?? null,\n        successDie: master.success_die ?? null,\n        successThreshold: master.success_threshold ?? null,\n        successAttribute: master.success_attribute ?? null,\n        damageDice: master.damage_dice ?? null,\n        damageType: master.damage_type ?? null,\n        categorySlug: category?.slug ?? null,\n        isEquipped: row.is_equipped ?? false,\n        equippedSlot: row.equipped_slot ?? null,\n        effects: Array.isArray(master.effects)\n')],
)

print("\nPASS 1 COMPLETE: runtime unified + equipped-only weapons.")
print("Now run PASS 2, then npm run build.")
