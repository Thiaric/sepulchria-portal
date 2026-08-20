from pathlib import Path
import subprocess

EXPECTED_HEAD = "767ae7525db094d7642e336e0aed1353cc5a5e00"

ROOT = Path.cwd()
LIB = ROOT / "lib/items/use-actions.ts"
GAME = ROOT / "app/(portal)/game/actions.ts"

for path in (LIB, GAME):
    if not path.exists():
        raise SystemExit(f"Missing expected file: {path}")

head = subprocess.check_output(["git", "rev-parse", "HEAD"], text=True).strip()
if head != EXPECTED_HEAD:
    raise SystemExit(
        f"STOPPED: patch expects HEAD {EXPECTED_HEAD}, current HEAD is {head}. No files were changed."
    )

def read(path):
    return path.read_text(encoding="utf-8-sig")

def write(path, text):
    path.write_text(text, encoding="utf-8", newline="\n")

def rep(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"STOPPED at {label}: expected 1 match, found {count}.")
    return text.replace(old, new, 1)

# ---------------- lib/items/use-actions.ts ----------------
s = read(LIB)

s = rep(
    s,
    '''  damage_dice: string | null;
  damage_type: string | null;
  category: { slug: string } | { slug: string }[] | null;
''',
    '''  damage_dice: string | null;
  damage_type: string | null;
  cooldown_minutes: number | null;
  category: { slug: string } | { slug: string }[] | null;
''',
    "lib ItemMechanics cooldown field",
)

s = rep(
    s,
    '''    damage_dice,
    damage_type,
    category:item_categories(slug)
''',
    '''    damage_dice,
    damage_type,
    cooldown_minutes,
    category:item_categories(slug)
''',
    "lib Item mechanics select",
)

anchor = '''async function applyItemDamage(
  targetCharacterId: string,
  amount: number,
) {
'''

helper = r'''async function resolveDamageOnlySuccessfulUse({
  record,
  characterId,
}: {
  record: AttemptRecord;
  characterId: string;
}) {
  const admin = createPrivilegedClient();
  const sourceKey =
    record.recordKind === "unique"
      ? `unique:${record.recordId}`
      : `standard:${record.itemId}`;

  const now = Date.now();
  const cooldownMinutes = Math.max(
    0,
    Number(record.item.cooldown_minutes ?? 0),
  );

  if (cooldownMinutes > 0) {
    const { data: cooldown, error: cooldownError } = await admin
      .from("character_item_use_cooldowns")
      .select("ready_at")
      .eq("character_id", characterId)
      .eq("source_key", sourceKey)
      .maybeSingle();

    if (cooldownError) throw new Error(cooldownError.message);

    if (cooldown?.ready_at && Date.parse(cooldown.ready_at) > now) {
      throw new Error("This Item is still on cooldown.");
    }
  }

  const behaviour = record.item.use_behaviour;

  if (behaviour === "consumable") {
    if (record.recordKind === "standard") {
      const quantity = Number(record.quantity ?? 0);
      if (quantity <= 0) throw new Error("This Item has no uses remaining.");

      if (quantity === 1) {
        const { error } = await admin
          .from("character_items")
          .delete()
          .eq("id", record.recordId)
          .eq("character_id", characterId);
        if (error) throw new Error(error.message);
      } else {
        const { error } = await admin
          .from("character_items")
          .update({ quantity: quantity - 1 })
          .eq("id", record.recordId)
          .eq("character_id", characterId);
        if (error) throw new Error(error.message);
      }
    } else {
      const { error } = await admin
        .from("character_item_instances")
        .delete()
        .eq("id", record.recordId)
        .eq("owner_character_id", characterId)
        .eq("vault_status", "owned");
      if (error) throw new Error(error.message);
    }
  } else if (behaviour === "limited_charges") {
    if (record.recordKind !== "unique") {
      throw new Error("Limited-charge Items require an individual Item instance.");
    }

    const remaining = Number(record.chargesRemaining ?? 0);
    if (remaining <= 0) throw new Error("This Item has no charges remaining.");

    const { error } = await admin
      .from("character_item_instances")
      .update({ charges_remaining: remaining - 1 })
      .eq("id", record.recordId)
      .eq("owner_character_id", characterId)
      .eq("vault_status", "owned");
    if (error) throw new Error(error.message);
  }

  if (cooldownMinutes > 0) {
    const { error } = await admin
      .from("character_item_use_cooldowns")
      .upsert(
        {
          character_id: characterId,
          source_key: sourceKey,
          ready_at: new Date(
            now + cooldownMinutes * 60_000,
          ).toISOString(),
        },
        { onConflict: "character_id,source_key" },
      );

    if (error) throw new Error(error.message);
  }

  return {
    ok: true,
    blocked: false,
    item_name: record.item.name,
    target_name: null,
    health_delta: 0,
    temporary_effects: 0,
  };
}

''' + anchor

s = rep(s, anchor, helper, "lib damage-only success helper")

old_rpc = '''    const { data, error } = await supabase.rpc(
      "use_own_inventory_record_targeted",
      {
        p_record_kind: recordKind,
        p_record_id: recordId,
        p_target_character_id:
          targetCharacterId,
      },
    );

    if (error) {
      return {
        ok: false,
        message: error.message,
      };
    }

    const result = (data ?? {}) as {
'''

new_rpc = '''    const rpcResult = await supabase.rpc(
      "use_own_inventory_record_targeted",
      {
        p_record_kind: recordKind,
        p_record_id: recordId,
        p_target_character_id:
          targetCharacterId,
      },
    );

    let data = rpcResult.data;

    if (rpcResult.error) {
      const damageOnlyFallback =
        Boolean(record.item.damage_dice) &&
        rpcResult.error.message.includes(
          "no configured Use effect",
        );

      if (!damageOnlyFallback) {
        return {
          ok: false,
          message: rpcResult.error.message,
        };
      }

      data = await resolveDamageOnlySuccessfulUse({
        record,
        characterId: character.id,
      });
    }

    const result = (data ?? {}) as {
'''

s = rep(s, old_rpc, new_rpc, "lib damage-only RPC fallback")
write(LIB, s)

# ---------------- app/(portal)/game/actions.ts ----------------
s = read(GAME)

s = rep(
    s,
    '''        success_die,
        success_threshold,
        success_attribute,
        effects:item_effects(
''',
    '''        success_die,
        success_threshold,
        success_attribute,
        damage_dice,
        damage_type,
        cooldown_minutes,
        use_behaviour,
        category:item_categories(slug),
        effects:item_effects(
''',
    "chat Item damage mechanics select",
)

s = rep(
    s,
    '''    return {
      success: true,
      summary: "Success Roll: Automatic - SUCCESS",
    };
''',
    '''    return {
      success: true,
      modifier: 0,
      summary: "Success Roll: Automatic - SUCCESS",
    };
''',
    "automatic roll modifier",
)

s = rep(
    s,
    '''  return {
    success,
    summary:
      `Success Roll: d${successDie} -> ${rolled}${modifierText}` +
''',
    '''  return {
    success,
    modifier,
    summary:
      `Success Roll: d${successDie} -> ${rolled}${modifierText}` +
''',
    "rolled modifier return",
)

anchor = '''export async function useRoomItem(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
'''

helpers = r'''function oneItemRelation<T>(
  value: T | T[] | null,
): T | null {
  return Array.isArray(value)
    ? value[0] ?? null
    : value;
}

function rollRoomItemDamage(
  damageDice: string | null,
): number {
  if (!damageDice) return 0;

  const match =
    /^([1-9][0-9]*)d(4|6|8|10|12|20|100)$/.exec(
      damageDice,
    );

  if (!match) {
    throw new Error("This Item has invalid Damage Dice.");
  }

  const count = Number.parseInt(match[1], 10);
  const sides = Number.parseInt(match[2], 10);

  if (count < 1 || count > 20) {
    throw new Error("This Item has invalid Damage Dice.");
  }

  let total = 0;
  for (let index = 0; index < count; index += 1) {
    total += randomInt(1, sides + 1);
  }

  return total;
}

async function applyRoomItemDamage(
  targetCharacterId: string,
  damage: number,
) {
  if (damage <= 0) return;

  const admin = createPrivilegedClient();

  const [targetResult, maxResult] = await Promise.all([
    admin
      .from("characters")
      .select("current_health")
      .eq("id", targetCharacterId)
      .maybeSingle(),
    admin.rpc("get_character_current_max_health", {
      p_character_id: targetCharacterId,
    }),
  ]);

  const readError = targetResult.error ?? maxResult.error;

  if (readError || !targetResult.data) {
    throw new Error(
      `Unable to apply Item damage: ${
        readError?.message ?? "target not found"
      }`,
    );
  }

  const maxHealth = Math.max(1, Number(maxResult.data ?? 1));
  const currentHealth = Math.max(
    0,
    Math.min(
      Number(targetResult.data.current_health ?? maxHealth),
      maxHealth,
    ),
  );

  const { error } = await admin
    .from("characters")
    .update({
      current_health: Math.max(0, currentHealth - damage),
      updated_at: new Date().toISOString(),
    })
    .eq("id", targetCharacterId);

  if (error) {
    throw new Error(`Unable to apply Item damage: ${error.message}`);
  }
}

async function resolveRoomDamageOnlyUse({
  supabase,
  characterId,
  recordKind,
  recordId,
  itemId,
  useBehaviour,
  cooldownMinutes,
}: {
  supabase: SupabaseClient;
  characterId: string;
  recordKind: string;
  recordId: string;
  itemId: string;
  useBehaviour:
    | "reusable"
    | "consumable"
    | "limited_charges"
    | null;
  cooldownMinutes: number | null;
}) {
  const sourceKey =
    recordKind === "unique"
      ? `unique:${recordId}`
      : `standard:${itemId}`;

  const cooldown = Math.max(0, Number(cooldownMinutes ?? 0));

  if (cooldown > 0) {
    const { data, error } = await supabase
      .from("character_item_use_cooldowns")
      .select("ready_at")
      .eq("character_id", characterId)
      .eq("source_key", sourceKey)
      .maybeSingle();

    if (error) throw new Error(error.message);

    if (data?.ready_at && Date.parse(data.ready_at) > Date.now()) {
      throw new Error("This Item is still on cooldown.");
    }
  }

  if (recordKind === "standard") {
    if (useBehaviour === "consumable") {
      const { data, error } = await supabase
        .from("character_items")
        .select("quantity")
        .eq("id", recordId)
        .eq("character_id", characterId)
        .maybeSingle();

      if (error || !data) {
        throw new Error(
          error?.message ?? "That Item is no longer in your Inventory.",
        );
      }

      const quantity = Number(data.quantity ?? 0);
      if (quantity <= 0) throw new Error("This Item has no uses remaining.");

      if (quantity === 1) {
        const { error: spendError } = await supabase
          .from("character_items")
          .delete()
          .eq("id", recordId)
          .eq("character_id", characterId);
        if (spendError) throw new Error(spendError.message);
      } else {
        const { error: spendError } = await supabase
          .from("character_items")
          .update({ quantity: quantity - 1 })
          .eq("id", recordId)
          .eq("character_id", characterId);
        if (spendError) throw new Error(spendError.message);
      }
    }
  } else {
    const { data, error } = await supabase
      .from("character_item_instances")
      .select("charges_remaining")
      .eq("id", recordId)
      .eq("owner_character_id", characterId)
      .eq("vault_status", "owned")
      .maybeSingle();

    if (error || !data) {
      throw new Error(
        error?.message ?? "That Item is no longer in your Inventory.",
      );
    }

    if (useBehaviour === "limited_charges") {
      const remaining = Number(data.charges_remaining ?? 0);
      if (remaining <= 0) {
        throw new Error("This Item has no charges remaining.");
      }

      const { error: spendError } = await supabase
        .from("character_item_instances")
        .update({ charges_remaining: remaining - 1 })
        .eq("id", recordId)
        .eq("owner_character_id", characterId)
        .eq("vault_status", "owned");

      if (spendError) throw new Error(spendError.message);
    } else if (useBehaviour === "consumable") {
      const { error: spendError } = await supabase
        .from("character_item_instances")
        .delete()
        .eq("id", recordId)
        .eq("owner_character_id", characterId)
        .eq("vault_status", "owned");

      if (spendError) throw new Error(spendError.message);
    }
  }

  if (cooldown > 0) {
    const { error } = await supabase
      .from("character_item_use_cooldowns")
      .upsert(
        {
          character_id: characterId,
          source_key: sourceKey,
          ready_at: new Date(
            Date.now() + cooldown * 60_000,
          ).toISOString(),
        },
        { onConflict: "character_id,source_key" },
      );

    if (error) throw new Error(error.message);
  }
}

''' + anchor

s = rep(s, anchor, helpers, "chat damage-only helpers")

old = '''    const { data: result, error: useError } = await supabase.rpc(
      "use_own_inventory_record_targeted",
      {
        p_record_kind: recordKind,
        p_record_id: recordId,
        p_target_character_id: targetCharacterId,
      },
    );

    if (useError) {
      return { ok: false, message: useError.message };
    }

    const outcome = (result ?? {}) as {
'''

new = '''    const rpcResult = await supabase.rpc(
      "use_own_inventory_record_targeted",
      {
        p_record_kind: recordKind,
        p_record_id: recordId,
        p_target_character_id: targetCharacterId,
      },
    );

    let result = rpcResult.data;

    if (rpcResult.error) {
      const damageOnlyFallback =
        Boolean(item.damage_dice) &&
        rpcResult.error.message.includes(
          "no configured Use effect",
        );

      if (!damageOnlyFallback) {
        return {
          ok: false,
          message: rpcResult.error.message,
        };
      }

      await resolveRoomDamageOnlyUse({
        supabase,
        characterId: character.id,
        recordKind,
        recordId,
        itemId,
        useBehaviour:
          (item.use_behaviour ?? null) as
            | "reusable"
            | "consumable"
            | "limited_charges"
            | null,
        cooldownMinutes:
          item.cooldown_minutes ?? null,
      });

      result = {
        blocked: false,
        item_name: item.name,
        target_name: null,
      };
    }

    const outcome = (result ?? {}) as {
'''

s = rep(s, old, new, "chat damage-only RPC fallback")

anchor2 = '''    if (outcome.blocked) {
      return {
        ok: false,
        message:
          outcome.block_reason ??
          "This Item cannot be used right now.",
      };
    }

    const rawEffects = Array.isArray(item.effects)
'''

insert2 = '''    if (outcome.blocked) {
      return {
        ok: false,
        message:
          outcome.block_reason ??
          "This Item cannot be used right now.",
      };
    }

    const category =
      oneItemRelation(item.category);

    const baseDamage =
      rollRoomItemDamage(
        item.damage_dice ?? null,
      );

    const attributeDamage =
      category?.slug === "weapon" &&
      item.success_attribute
        ? Number(successRoll.modifier ?? 0)
        : 0;

    const damage = Math.max(
      0,
      baseDamage + attributeDamage,
    );

    const actualTargetId =
      targetCharacterId ?? character.id;

    if (damage > 0) {
      await applyRoomItemDamage(
        actualTargetId,
        damage,
      );
    }

    const rawEffects = Array.isArray(item.effects)
'''

s = rep(s, anchor2, insert2, "chat damage execution")

old_effect = '''    const targetLabel =
      targetCharacterId && outcome.target_name
        ? ` on ${outcome.target_name}`
        : "";

    const { error: messageError } = await supabase
'''

new_effect = '''    if (damage > 0) {
      const attributeText =
        category?.slug === "weapon" &&
        item.success_attribute
          ? ` + ${
              GIFT_SUCCESS_ATTRIBUTE_LABELS[
                item.success_attribute as GiftSuccessAttribute
              ]
            } (${Number(successRoll.modifier ?? 0) >= 0 ? "+" : ""}${Number(successRoll.modifier ?? 0)})`
          : "";

      effectParts.push(
        `${item.damage_dice}${attributeText} ${
          item.damage_type ?? "Damage"
        } -> ${damage} Damage`,
      );
    }

    const targetLabel =
      targetCharacterId && outcome.target_name
        ? ` on ${outcome.target_name}`
        : targetCharacterId
          ? " on the selected target"
          : "";

    const { error: messageError } = await supabase
'''

s = rep(s, old_effect, new_effect, "chat damage announcement")

write(GAME, s)

print("SUCCESS: Items B3 damage-only correction applied.")
print("Changed:")
print(" - lib/items/use-actions.ts")
print(" - app/(portal)/game/actions.ts")
print("Run: npm run build")
