#!/usr/bin/env python3
from pathlib import Path
import sys

ROOT = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else Path.cwd()

def patch(path_str: str, old: str, new: str) -> None:
    path = ROOT / path_str
    if not path.exists():
        raise SystemExit(f"Missing file: {path}")

    text = path.read_text(encoding="utf-8")

    if new in text:
        print(f"SKIP  {path_str} (already patched)")
        return

    if old not in text:
        raise SystemExit(
            f"\nCould not find expected block in:\n  {path_str}\n\n"
            "Stop here: your local file differs from commit b733ad7."
        )

    path.write_text(text.replace(old, new, 1), encoding="utf-8")
    print(f"PATCH {path_str}")

patch(
    "app/(portal)/admin/items/actions.ts",
    '''  const instantUse = triggerType === "use" && effectMode === "instant";

  return {
''',
    '''  const instantUse = triggerType === "use" && effectMode === "instant";

  const rawConditions =
    optionalText(
      formData,
      "conditions",
    );

  const conditions =
    triggerType === "use" &&
    effectMode === "temporary" &&
    rawConditions
      ? [
          ...new Set(
            rawConditions
              .split(/\\r?\\n|,/)
              .map((value) =>
                value
                  .replace(/\\s+/g, " ")
                  .trim(),
              )
              .filter(Boolean),
          ),
        ]
      : [];

  if (conditions.length > 10) {
    throw new Error(
      "An Item effect may apply at most 10 Conditions.",
    );
  }

  if (
    conditions.some(
      (condition) =>
        condition.length > 40,
    )
  ) {
    throw new Error(
      "Item Conditions may be at most 40 characters.",
    );
  }

  return {
''',
)

patch(
    "app/(portal)/admin/items/actions.ts",
    '''    duration_minutes: durationMinutes,
    muscles_modifier: instantUse ? 0 : mod("musclesModifier", "Muscles"),
''',
    '''    duration_minutes: durationMinutes,
    conditions,
    muscles_modifier: instantUse ? 0 : mod("musclesModifier", "Muscles"),
''',
)

patch(
    "app/(portal)/admin/items/page.tsx",
    '''  duration_minutes: number | null;
  muscles_modifier: number;
''',
    '''  duration_minutes: number | null;
  conditions: string[];
  muscles_modifier: number;
''',
)

patch(
    "app/(portal)/admin/items/page.tsx",
    '''          duration_minutes,
          muscles_modifier,
''',
    '''          duration_minutes,
          conditions,
          muscles_modifier,
''',
)

patch(
    "app/(portal)/admin/items/page.tsx",
    '''        <Field label="Duration (minutes)">
          <input
            type="number"
            min={1}
            name="durationMinutes"
            defaultValue={effect?.duration_minutes ?? ""}
            className={[((inputClass)), "admin_items_page_input_duration_minutes"].filter(Boolean).join(" ")}
          />
        </Field>

        <Field label="Sort order">
''',
    '''        <Field label="Duration (minutes)">
          <input
            type="number"
            min={1}
            name="durationMinutes"
            defaultValue={effect?.duration_minutes ?? ""}
            className={[((inputClass)), "admin_items_page_input_duration_minutes"].filter(Boolean).join(" ")}
          />
        </Field>

        <Field label="Conditions">
          <textarea
            name="conditions"
            rows={3}
            defaultValue={
              effect?.conditions?.join("\\n") ?? ""
            }
            placeholder={"Blinded\\nPoisoned\\nBurning"}
            className={inputClass}
          />
        </Field>

        <Field label="Sort order">
''',
)

patch(
    "components/characters/character-inventory-display.tsx",
    '''        duration_minutes: number | null;
        health_delta: number;
''',
    '''        duration_minutes: number | null;
        conditions: string[];
        health_delta: number;
''',
)

patch(
    "components/characters/character-inventory-display.tsx",
    '''              duration_minutes,
              health_delta,
''',
    '''              duration_minutes,
              conditions,
              health_delta,
''',
)

patch(
    "components/characters/character-inventory-display.tsx",
    '''    const durationMinutes =
      effect.trigger_type === "use" &&
      effect.effect_mode === "temporary"
        ? effect.duration_minutes
        : null;

    push(context, durationMinutes, "Health", effect.health_delta);
''',
    '''    const durationMinutes =
      effect.trigger_type === "use" &&
      effect.effect_mode === "temporary"
        ? effect.duration_minutes
        : null;

    for (
      const condition of
        effect.conditions ?? []
    ) {
      result.push({
        context,
        duration_minutes:
          durationMinutes,
        label: condition,
        value: 0,
        condition: true,
      });
    }

    push(context, durationMinutes, "Health", effect.health_delta);
''',
)

patch(
    "components/characters/character-inventory-browser.tsx",
    '''export type InventoryItemEffect = {
  label: string;
  value: number;
  context: string;
  duration_minutes: number | null;
};
''',
    '''export type InventoryItemEffect = {
  label: string;
  value: number;
  context: string;
  duration_minutes: number | null;
  condition?: boolean;
};
''',
)

patch(
    "components/characters/character-inventory-browser.tsx",
    '''              effect.value > 0
                ? "border-emerald-900/65 bg-emerald-950/20 text-emerald-400"
                : "border-red-900/65 bg-red-950/20 text-red-400"
''',
    '''              effect.condition
                ? "border-[rgb(var(--sep-colour-765937))]/65 bg-[rgb(var(--sep-colour-21170f))] text-[rgb(var(--sep-colour-d9b77f))]"
                : effect.value > 0
                  ? "border-emerald-900/65 bg-emerald-950/20 text-emerald-400"
                  : "border-red-900/65 bg-red-950/20 text-red-400"
''',
)

patch(
    "components/characters/character-inventory-browser.tsx",
    '''            {effect.context} · {effect.label}{" "}
            {effect.value > 0 ? "+" : ""}
            {effect.value}
            {effect.duration_minutes !== null
              ? ` · ${effect.duration_minutes} min`
              : ""}
''',
    '''            {effect.context} ·{" "}
            {effect.condition
              ? `Condition: ${effect.label}`
              : `${effect.label} ${
                  effect.value > 0
                    ? "+"
                    : ""
                }${effect.value}`}
            {effect.duration_minutes !== null
              ? ` · ${effect.duration_minutes} min`
              : ""}
''',
)

patch(
    "lib/items/use-actions.ts",
    '''      health_delta?: number;
      temporary_effects?: number;
    };
''',
    '''      health_delta?: number;
      temporary_effects?: number;
      conditions?: number;
    };
''',
)

patch(
    "lib/items/use-actions.ts",
    '''    if (
      Number(
        result.temporary_effects ?? 0,
      ) > 0
    ) {
      details.push(
        "temporary effect activated",
      );
    }

    if (damage > 0) {
''',
    '''    if (
      Number(
        result.temporary_effects ?? 0,
      ) > 0
    ) {
      details.push(
        "temporary effect activated",
      );
    }

    if (
      Number(
        result.conditions ?? 0,
      ) > 0
    ) {
      const count =
        Number(
          result.conditions,
        );

      details.push(
        `${count} Condition${
          count === 1
            ? ""
            : "s"
        } applied`,
      );
    }

    if (damage > 0) {
''',
)

sql = r'''begin;

alter table public.item_effects
add column if not exists conditions text[] not null default '{}';

alter table public.character_active_item_effects
add column if not exists conditions text[] not null default '{}';

do $patch$
declare
  f text;
begin
  select pg_get_functiondef(p.oid)
  into f
  from pg_proc p
  join pg_namespace n
    on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname = 'use_own_inventory_record_targeted'
  order by p.oid desc
  limit 1;

  if f is null then
    raise exception 'use_own_inventory_record_targeted was not found';
  end if;

  if position('v_condition_count integer := 0;' in f) = 0 then
    f := replace(
      f,
      '  v_temporary_count integer := 0;' || chr(10),
      '  v_temporary_count integer := 0;' || chr(10) ||
      '  v_condition_count integer := 0;' || chr(10)
    );
  end if;

  if position('source_name,conditions,' in f) = 0 then
    f := replace(
      f,
      '        character_id,item_id,item_instance_id,source_effect_id,source_name,' || chr(10) ||
      '        muscles_modifier,reflexes_modifier,vigour_modifier,shrewd_modifier,',
      '        character_id,item_id,item_instance_id,source_effect_id,source_name,conditions,' || chr(10) ||
      '        muscles_modifier,reflexes_modifier,vigour_modifier,shrewd_modifier,'
    );

    f := replace(
      f,
      '        v_target_character_id,v_item_id,v_item_instance_id,v_effect.id,v_item_name,' || chr(10) ||
      '        coalesce(v_effect.muscles_modifier,0),coalesce(v_effect.reflexes_modifier,0),',
      '        v_target_character_id,v_item_id,v_item_instance_id,v_effect.id,v_item_name,' || chr(10) ||
      '        coalesce(v_effect.conditions,''{}''::text[]),' || chr(10) ||
      '        coalesce(v_effect.muscles_modifier,0),coalesce(v_effect.reflexes_modifier,0),'
    );

    f := replace(
      f,
      '      v_temporary_count:=v_temporary_count+1;' || chr(10),
      '      v_temporary_count:=v_temporary_count+1;' || chr(10) ||
      '      v_condition_count:=v_condition_count+coalesce(cardinality(v_effect.conditions),0);' || chr(10)
    );
  end if;

  if position('''conditions'',v_condition_count' in f) = 0 then
    f := replace(
      f,
      '''health_delta'',v_health_delta,''temporary_effects'',v_temporary_count,' || chr(10) ||
      '      ''charges_remaining'',v_charges_remaining',
      '''health_delta'',v_health_delta,''temporary_effects'',v_temporary_count,' || chr(10) ||
      '      ''conditions'',v_condition_count,''charges_remaining'',v_charges_remaining'
    );

    f := replace(
      f,
      '''target_name'',v_target_name,''health_delta'',v_health_delta,''temporary_effects'',v_temporary_count,' || chr(10) ||
      '    ''charges_remaining'',v_charges_remaining,''cooldown_ready_at'',v_ready_at',
      '''target_name'',v_target_name,''health_delta'',v_health_delta,''temporary_effects'',v_temporary_count,' || chr(10) ||
      '    ''conditions'',v_condition_count,''charges_remaining'',v_charges_remaining,''cooldown_ready_at'',v_ready_at'
    );
  end if;

  execute f;
end
$patch$;

commit;
'''

sql_path = ROOT / "supabase_item_conditions.sql"
sql_path.write_text(sql, encoding="utf-8")
print(f"WRITE {sql_path.name}")

print()
print("DONE")
print("1) git diff")
print("2) Run supabase_item_conditions.sql in Supabase SQL Editor")
print("3) npm run build")
