from pathlib import Path
import subprocess

EXPECTED_HEAD = "a4c7e4612a5e8f79a62c096c0dac3b0087b904a8"


def head():
    return subprocess.check_output(["git", "rev-parse", "HEAD"], text=True).strip()


def once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"{label}: expected 1 match, found {count}")
    return text.replace(old, new, 1)


def many(text, old, new, expected, label):
    count = text.count(old)
    if count != expected:
        raise RuntimeError(f"{label}: expected {expected} matches, found {count}")
    return text.replace(old, new)


current_head = head()
if current_head != EXPECTED_HEAD:
    raise SystemExit(
        f"STOP: patch expects HEAD {EXPECTED_HEAD}, but found {current_head}."
    )

root = Path.cwd()
paths = [
    "app/(portal)/admin/gifts/page.tsx",
    "app/(portal)/admin/gifts/actions.ts",
    "components/admin/gift-effect-form-logic.tsx",
    "app/(portal)/feats/page.tsx",
    "components/gifts/gifts-catalogue.tsx",
    "components/characters/character-gifts-display.tsx",
    "app/(portal)/game/deferred-actions.ts",
    "app/(portal)/game/components/RoomChatForm.tsx",
    "app/(portal)/game/actions.ts",
    "app/(portal)/game/death-actions.ts",
    "app/(portal)/game/components/CharacterDeathGate.tsx",
]

data = {}
for rel in paths:
    p = root / rel
    if not p.exists():
        raise SystemExit(f"STOP: missing {rel}")
    data[rel] = p.read_text(encoding="utf-8")

# 1) Admin Feat page
rel = "app/(portal)/admin/gifts/page.tsx"
t = data[rel]
t = once(
    t,
    '  cooldown_minutes: number;\n  health_delta: number;\n  max_health_modifier: number;',
    '  cooldown_minutes: number;\n  health_delta: number;\n  health_dice: string | null;\n  max_health_modifier: number;',
    rel + " type",
)
t = once(
    t,
    '          duration_minutes, cooldown_minutes, health_delta, max_health_modifier,',
    '          duration_minutes, cooldown_minutes, health_delta, health_dice, max_health_modifier,',
    rel + " select",
)
t = once(
    t,
    '''                  } · HP ${
                    gift.health_delta !== 0
                      ? `${gift.health_delta > 0 ? "+" : ""}${gift.health_delta}`
                      : "—"
                  } · Max ${''',
    '''                  } · Healing ${
                    gift.health_dice
                      ? `${gift.health_dice}${
                          gift.health_delta !== 0
                            ? ` ${gift.health_delta > 0 ? "+" : ""}${gift.health_delta}`
                            : ""
                        }`
                      : gift.health_delta !== 0
                        ? `${gift.health_delta > 0 ? "+" : ""}${gift.health_delta}`
                        : "—"
                  } · Max ${''',
    rel + " recap",
)
t = once(
    t,
    '''        <Field label="Current Health change on use">
          <input
            type="number"
            name="healthDelta"
            defaultValue={gift?.health_delta ?? 0}
            className={[((inputClass)), "admin_gifts_page_input_health_delta"].filter(Boolean).join(" ")}
          />
        </Field>

        <Field label="Success Die">''',
    '''        <Field label="Current Health change on use (fixed)">
          <input
            type="number"
            name="healthDelta"
            defaultValue={gift?.health_delta ?? 0}
            className={[((inputClass)), "admin_gifts_page_input_health_delta"].filter(Boolean).join(" ")}
          />
        </Field>

        <Field label="Healing dice">
          <input
            type="text"
            name="healthDice"
            placeholder="e.g. 1d8 or 2d6"
            defaultValue={gift?.health_dice ?? ""}
            className={[((inputClass)), "admin_gifts_page_input_health_dice"].filter(Boolean).join(" ")}
          />
        </Field>

        <Field label="Success Die">''',
    rel + " form",
)
data[rel] = t

# 2) Admin Feat actions
rel = "app/(portal)/admin/gifts/actions.ts"
t = data[rel]
t = once(
    t,
    '''  const healthDelta =
    isPassive
      ? 0
      : integer(formData, "healthDelta", 0);

  const requestedTargetMode =''',
    '''  const healthDelta =
    isPassive
      ? 0
      : integer(formData, "healthDelta", 0);

  const healthDice =
    isPassive
      ? null
      : optionalText(formData, "healthDice");

  if (
    healthDice &&
    !/^[1-9][0-9]*d(4|6|8|10|12|20|100)$/.test(healthDice)
  ) {
    throw new Error(
      "Healing dice must use a format such as 1d4, 2d6 or 1d12.",
    );
  }

  if (healthDice) {
    const count =
      Number.parseInt(healthDice.split("d")[0] ?? "0", 10);

    if (count > 20) {
      throw new Error(
        "A Feat cannot roll more than 20 healing dice.",
      );
    }
  }

  const requestedTargetMode =''',
    rel + " parse",
)
t = once(
    t,
    '    cooldown_minutes: cooldownMinutes,\n    health_delta: healthDelta,\n    damage_dice: damageDice,',
    '    cooldown_minutes: cooldownMinutes,\n    health_delta: healthDelta,\n    health_dice: healthDice,\n    damage_dice: damageDice,',
    rel + " save",
)
data[rel] = t

# 3) Admin form behaviour
rel = "components/admin/gift-effect-form-logic.tsx"
t = data[rel]
t = once(
    t,
    '        setValue(form, "healthDelta", "0");\n        setValue(form, "damageDice", "");',
    '        setValue(form, "healthDelta", "0");\n        setValue(form, "healthDice", "");\n        setValue(form, "damageDice", "");',
    rel + " clear",
)
t = once(
    t,
    '      setControlDisabled(form, "healthDelta", passive);\n      setControlDisabled(form, "successDie", passive);',
    '      setControlDisabled(form, "healthDelta", passive);\n      setControlDisabled(form, "healthDice", passive);\n      setControlDisabled(form, "successDie", passive);',
    rel + " disable",
)
data[rel] = t

# 4) /feats
rel = "app/(portal)/feats/page.tsx"
t = data[rel]
t = once(
    t,
    '      damage_type,\n      health_delta,\n      max_health_modifier,',
    '      damage_type,\n      health_delta,\n      health_dice,\n      max_health_modifier,',
    rel + " select",
)
t = once(
    t,
    '      healthDelta:\n        gift.health_delta,\n      maxHealthModifier:',
    '      healthDelta:\n        gift.health_delta,\n      healthDice:\n        gift.health_dice ?? null,\n      maxHealthModifier:',
    rel + " map",
)
data[rel] = t

# 5) Shared Feat catalogue
rel = "components/gifts/gifts-catalogue.tsx"
t = data[rel]
t = once(
    t,
    '  damageType: string | null;\n  healthDelta: number;\n  maxHealthModifier: number;',
    '  damageType: string | null;\n  healthDelta: number;\n  healthDice: string | null;\n  maxHealthModifier: number;',
    rel + " type",
)
t = once(
    t,
    '''              {gift.healthDelta !== 0 ? (
                <span
                  className={[((`border px-2 py-1 text-[7px] uppercase tracking-[0.1em] ${
                    gift.healthDelta > 0
                      ? "border-emerald-900/65 bg-emerald-950/20 text-emerald-400"
                      : "border-red-900/65 bg-red-950/20 text-red-400"
                  }`)), "components_gifts_gifts_catalogue_span_text_5"].filter(Boolean).join(" ")}
                >
                  Health · {signed(gift.healthDelta)}
                </span>
              ) : null}''',
    '''              {gift.healthDice ? (
                <span className="border border-emerald-900/65 bg-emerald-950/20 px-2 py-1 text-[7px] uppercase tracking-[0.1em] text-emerald-400">
                  Healing · {gift.healthDice}
                  {gift.healthDelta !== 0
                    ? ` ${signed(gift.healthDelta)}`
                    : ""}
                </span>
              ) : gift.healthDelta !== 0 ? (
                <span
                  className={[((`border px-2 py-1 text-[7px] uppercase tracking-[0.1em] ${
                    gift.healthDelta > 0
                      ? "border-emerald-900/65 bg-emerald-950/20 text-emerald-400"
                      : "border-red-900/65 bg-red-950/20 text-red-400"
                  }`)), "components_gifts_gifts_catalogue_span_text_5"].filter(Boolean).join(" ")}
                >
                  Health · {signed(gift.healthDelta)}
                </span>
              ) : null}''',
    rel + " badge",
)
t = once(
    t,
    '              {!gift.damageDice &&\n              gift.healthDelta === 0 &&\n              gift.maxHealthModifier === 0 &&',
    '              {!gift.damageDice &&\n              !gift.healthDice &&\n              gift.healthDelta === 0 &&\n              gift.maxHealthModifier === 0 &&',
    rel + " empty",
)
data[rel] = t

# 6) Character Feats display
rel = "components/characters/character-gifts-display.tsx"
t = data[rel]
t = once(
    t,
    '        damage_type,\n        health_delta,\n        max_health_modifier,',
    '        damage_type,\n        health_delta,\n        health_dice,\n        max_health_modifier,',
    rel + " select",
)
t = once(
    t,
    '      damageType: gift.damage_type ?? null,\n      healthDelta: Number(gift.health_delta ?? 0),\n      maxHealthModifier:',
    '      damageType: gift.damage_type ?? null,\n      healthDelta: Number(gift.health_delta ?? 0),\n      healthDice: gift.health_dice ?? null,\n      maxHealthModifier:',
    rel + " map",
)
data[rel] = t

# 7) Deferred room-chat Feat data
rel = "app/(portal)/game/deferred-actions.ts"
t = data[rel]
t = once(
    t,
    '  durationMinutes: number | null;\n  cooldownMinutes: number;\n  healthDelta: number;\n  maxHealthModifier: number;',
    '  durationMinutes: number | null;\n  cooldownMinutes: number;\n  healthDelta: number;\n  healthDice: string | null;\n  maxHealthModifier: number;',
    rel + " type",
)
t = once(
    t,
    '        cooldown_minutes,\n        health_delta,\n        max_health_modifier,',
    '        cooldown_minutes,\n        health_delta,\n        health_dice,\n        max_health_modifier,',
    rel + " select",
)
t = once(
    t,
    '        healthDelta: gift.health_delta ?? 0,\n        maxHealthModifier: gift.max_health_modifier ?? 0,',
    '        healthDelta: gift.health_delta ?? 0,\n        healthDice: gift.health_dice ?? null,\n        maxHealthModifier: gift.max_health_modifier ?? 0,',
    rel + " map",
)
data[rel] = t

# 8) Room chat UI
rel = "app/(portal)/game/components/RoomChatForm.tsx"
t = data[rel]
t = once(
    t,
    '  durationMinutes: number | null;\n  cooldownMinutes: number;\n  healthDelta: number;\n  maxHealthModifier: number;',
    '  durationMinutes: number | null;\n  cooldownMinutes: number;\n  healthDelta: number;\n  healthDice: string | null;\n  maxHealthModifier: number;',
    rel + " type",
)
t = once(
    t,
    '''                {(selectedGift.healthDelta !== 0 ||
                  selectedGift.maxHealthModifier !== 0) ? (
                  <p className="mt-2 text-[8px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-aa8c61))] game_components_roomchatform_p_text_18">
                    {selectedGift.healthDelta !== 0
                      ? `Health ${formatSigned(selectedGift.healthDelta)}`
                      : ""}
                    {selectedGift.healthDelta !== 0 &&
                    selectedGift.maxHealthModifier !== 0
                      ? " · "
                      : ""}
                    {selectedGift.maxHealthModifier !== 0
                      ? `Max Health ${formatSigned(selectedGift.maxHealthModifier)}`
                      : ""}
                  </p>
                ) : null}''',
    '''                {(selectedGift.healthDice ||
                  selectedGift.healthDelta !== 0 ||
                  selectedGift.maxHealthModifier !== 0) ? (
                  <p className="mt-2 text-[8px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-aa8c61))] game_components_roomchatform_p_text_18">
                    {[
                      selectedGift.healthDice
                        ? `Healing ${selectedGift.healthDice}${
                            selectedGift.healthDelta !== 0
                              ? ` ${formatSigned(selectedGift.healthDelta)}`
                              : ""
                          }`
                        : selectedGift.healthDelta !== 0
                          ? `Health ${formatSigned(selectedGift.healthDelta)}`
                          : "",
                      selectedGift.maxHealthModifier !== 0
                        ? `Max Health ${formatSigned(selectedGift.maxHealthModifier)}`
                        : "",
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                ) : null}''',
    rel + " render",
)
data[rel] = t

# 9) Game Feat execution + location-chat result
rel = "app/(portal)/game/actions.ts"
t = data[rel]
t = once(
    t,
    '            duration_minutes, health_delta\n          )',
    '            duration_minutes, health_delta, health_dice\n          )',
    rel + " use select",
)
t = once(
    t,
    '            duration_minutes, cooldown_minutes, health_delta,\n            max_health_modifier,',
    '            duration_minutes, cooldown_minutes, health_delta, health_dice,\n            max_health_modifier,',
    rel + " activate select",
)
t = many(
    t,
    '''      healingCapable:
        Number(gift.health_delta ?? 0) > 0 &&
        ["other", "either"].includes(
          gift.target_mode ?? "self",
        ),''',
    '''      healingCapable:
        (
          Number(gift.health_delta ?? 0) > 0 ||
          Boolean(gift.health_dice)
        ) &&
        ["other", "either"].includes(
          gift.target_mode ?? "self",
        ),''',
    2,
    rel + " healing capable",
)
damage_helper = '''function rollGiftDamage(damageDice: string | null): number {
  if (!damageDice) return 0;

  const match = /^([1-9][0-9]*)d(4|6|8|10|12|20|100)$/.exec(
    damageDice,
  );

  if (!match) {
    throw new Error("This Feat has invalid damage dice.");
  }

  const count = Number.parseInt(match[1], 10);
  const sides = Number.parseInt(match[2], 10);

  if (count < 1 || count > 20) {
    throw new Error("This Feat has invalid damage dice.");
  }

  let total = 0;
  for (let index = 0; index < count; index += 1) {
    total += randomInt(1, sides + 1);
  }

  return total;
}
'''
healing_helper = damage_helper + '''
function rollGiftHealing(healthDice: string | null): number {
  if (!healthDice) return 0;

  const match = /^([1-9][0-9]*)d(4|6|8|10|12|20|100)$/.exec(
    healthDice,
  );

  if (!match) {
    throw new Error("This Feat has invalid healing dice.");
  }

  const count = Number.parseInt(match[1], 10);
  const sides = Number.parseInt(match[2], 10);

  if (count < 1 || count > 20) {
    throw new Error("This Feat has invalid healing dice.");
  }

  let total = 0;
  for (let index = 0; index < count; index += 1) {
    total += randomInt(1, sides + 1);
  }

  return total;
}
'''
t = once(t, damage_helper, healing_helper, rel + " helper")
t = many(
    t,
    '''    const damage = rollGiftDamage(gift.damage_dice ?? null);
    const healthDelta = Number(gift.health_delta ?? 0);
    const combinedHealthDelta = healthDelta - damage;''',
    '''    const damage = rollGiftDamage(gift.damage_dice ?? null);
    const healingRoll = rollGiftHealing(gift.health_dice ?? null);
    const healthDelta = Number(gift.health_delta ?? 0);
    const healingTotal = healthDelta + healingRoll;
    const combinedHealthDelta = healingTotal - damage;''',
    2,
    rel + " resolve",
)
t = many(
    t,
    '''    if (healthDelta !== 0) {
      effectSummary.push(
        `Health ${healthDelta > 0 ? "+" : ""}${healthDelta}`,
      );
    }

    if (damage > 0) {''',
    '''    if (gift.health_dice) {
      effectSummary.push(
        `Healing ${gift.health_dice} → ${healingRoll}${
          healthDelta !== 0
            ? ` ${healthDelta > 0 ? "+" : ""}${healthDelta} fixed`
            : ""
        } = ${healingTotal} Health`,
      );
    } else if (healthDelta !== 0) {
      effectSummary.push(
        `Health ${healthDelta > 0 ? "+" : ""}${healthDelta}`,
      );
    }

    if (damage > 0) {''',
    2,
    rel + " summary",
)
data[rel] = t

# 10) Death-threshold rescue Feats
rel = "app/(portal)/game/death-actions.ts"
t = data[rel]
t = once(
    t,
    '  description: string;\n  healthDelta: number;\n  successDie: number | null;',
    '  description: string;\n  healthDelta: number;\n  healthDice: string | null;\n  successDie: number | null;',
    rel + " type",
)
t = once(
    t,
    '  success_attribute: AttributeKey | null;\n  health_delta: number | null;\n};',
    '  success_attribute: AttributeKey | null;\n  health_delta: number | null;\n  health_dice: string | null;\n};',
    rel + " relation",
)
t = once(
    t,
    '        success_die,success_threshold,success_attribute,health_delta\n      )',
    '        success_die,success_threshold,success_attribute,health_delta,health_dice\n      )',
    rel + " select",
)
t = once(
    t,
    '''      gift.damage_dice ||
      Number(gift.health_delta ?? 0) <= 0
    ) continue;''',
    '''      gift.damage_dice ||
      (
        Number(gift.health_delta ?? 0) <= 0 &&
        !gift.health_dice
      )
    ) continue;''',
    rel + " eligibility",
)
t = once(
    t,
    '      description: gift.description ?? "",\n      healthDelta: Number(gift.health_delta ?? 0),\n      successDie:',
    '      description: gift.description ?? "",\n      healthDelta: Number(gift.health_delta ?? 0),\n      healthDice: gift.health_dice ?? null,\n      successDie:',
    rel + " map",
)
t = once(
    t,
    '''async function announceRescue(
  character: CharacterRow,
  feat: DeathRescueFeat,
  summary: string,
  succeeded: boolean,
) {''',
    '''function rollRescueHealing(feat: DeathRescueFeat) {
  if (!feat.healthDice) {
    return {
      amount: feat.healthDelta,
      summary: `Healing: ${feat.healthDelta > 0 ? "+" : ""}${feat.healthDelta} Health`,
    };
  }

  const match = /^([1-9][0-9]*)d(4|6|8|10|12|20|100)$/.exec(
    feat.healthDice,
  );

  if (!match) {
    throw new Error("This Feat has invalid healing dice.");
  }

  const count = Number.parseInt(match[1], 10);
  const sides = Number.parseInt(match[2], 10);

  if (count < 1 || count > 20) {
    throw new Error("This Feat has invalid healing dice.");
  }

  let rolled = 0;
  for (let index = 0; index < count; index += 1) {
    rolled += randomInt(1, sides + 1);
  }

  const amount = rolled + feat.healthDelta;

  return {
    amount,
    summary:
      `Healing: ${feat.healthDice} -> ${rolled}` +
      `${
        feat.healthDelta !== 0
          ? ` ${feat.healthDelta > 0 ? "+" : ""}${feat.healthDelta}`
          : ""
      } = ${amount} Health`,
  };
}

async function announceRescue(
  character: CharacterRow,
  feat: DeathRescueFeat,
  summary: string,
  succeeded: boolean,
  healthAmount: number,
) {''',
    rel + " roller",
)
t = once(
    t,
    '  const effect = succeeded\n    ? `Health +${feat.healthDelta} · Death prevented`\n    : "No effect applied · Death follows";',
    '  const effect = succeeded\n    ? `Health +${healthAmount} · Death prevented`\n    : "No effect applied · Death follows";',
    rel + " announce",
)
t = once(
    t,
    '      await announceRescue(character, feat, roll.summary, false);',
    '      await announceRescue(character, feat, roll.summary, false, 0);',
    rel + " failed",
)
t = once(
    t,
    '''    await applyGiftCurrentHealthDelta({
      characterId: character.id,
      healthDelta: feat.healthDelta,
    });
    await announceRescue(character, feat, roll.summary, true);''',
    '''    const healing = rollRescueHealing(feat);

    if (healing.amount <= 0) {
      throw new Error(
        "This rescue Feat did not produce a positive healing result.",
      );
    }

    await applyGiftCurrentHealthDelta({
      characterId: character.id,
      healthDelta: healing.amount,
    });
    await announceRescue(
      character,
      feat,
      `${roll.summary} · ${healing.summary}`,
      true,
      healing.amount,
    );''',
    rel + " apply",
)
data[rel] = t

# 11) Death gate UI
rel = "app/(portal)/game/components/CharacterDeathGate.tsx"
t = data[rel]
t = once(
    t,
    '                  Health +{feat.healthDelta}\n                  {feat.successDie',
    '''                  Healing{" "}
                  {feat.healthDice
                    ? `${feat.healthDice}${
                        feat.healthDelta !== 0
                          ? ` ${feat.healthDelta > 0 ? "+" : ""}${feat.healthDelta}`
                          : ""
                      }`
                    : `${feat.healthDelta > 0 ? "+" : ""}${feat.healthDelta}`}
                  {feat.successDie''',
    rel + " display",
)
data[rel] = t

# Create SQL only after every source replacement validated.
sql_path = root / "feat-healing-dice-migration.sql"
if sql_path.exists():
    raise SystemExit("STOP: feat-healing-dice-migration.sql already exists.")

sql = '''-- Feat healing dice
-- Built for sepulchria-portal commit a4c7e4612a5e8f79a62c096c0dac3b0087b904a8

alter table public.gifts
  add column if not exists health_dice text null;

alter table public.gifts
  drop constraint if exists gifts_health_dice_format_check;

alter table public.gifts
  add constraint gifts_health_dice_format_check
  check (
    health_dice is null
    or health_dice ~ '^[1-9][0-9]*d(4|6|8|10|12|20|100)$'
  );
'''

# No writes before this point.
for rel in paths:
    (root / rel).write_text(data[rel], encoding="utf-8")
sql_path.write_text(sql, encoding="utf-8")

print("Patch applied successfully.")
print("Changed:")
for rel in paths:
    print(" -", rel)
print(" - feat-healing-dice-migration.sql")
print()
print("Next:")
print("  1) Run feat-healing-dice-migration.sql in Supabase SQL Editor")
print("  2) npm run build")
print("  3) git diff --check")
print("  4) git diff")
