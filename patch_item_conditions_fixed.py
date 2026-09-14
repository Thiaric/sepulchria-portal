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

import base64

_SQL_B64 = "YmVnaW47CgphbHRlciB0YWJsZSBwdWJsaWMuaXRlbV9lZmZlY3RzCmFkZCBjb2x1bW4gaWYgbm90IGV4aXN0cyBjb25kaXRpb25zIHRleHRbXSBub3QgbnVsbCBkZWZhdWx0ICd7fSc7CgphbHRlciB0YWJsZSBwdWJsaWMuY2hhcmFjdGVyX2FjdGl2ZV9pdGVtX2VmZmVjdHMKYWRkIGNvbHVtbiBpZiBub3QgZXhpc3RzIGNvbmRpdGlvbnMgdGV4dFtdIG5vdCBudWxsIGRlZmF1bHQgJ3t9JzsKCmRvICRwYXRjaCQKZGVjbGFyZQogIGYgdGV4dDsKYmVnaW4KICBzZWxlY3QgcGdfZ2V0X2Z1bmN0aW9uZGVmKHAub2lkKQogIGludG8gZgogIGZyb20gcGdfcHJvYyBwCiAgam9pbiBwZ19uYW1lc3BhY2UgbgogICAgb24gbi5vaWQgPSBwLnByb25hbWVzcGFjZQogIHdoZXJlIG4ubnNwbmFtZSA9ICdwdWJsaWMnCiAgICBhbmQgcC5wcm9uYW1lID0gJ3VzZV9vd25faW52ZW50b3J5X3JlY29yZF90YXJnZXRlZCcKICBvcmRlciBieSBwLm9pZCBkZXNjCiAgbGltaXQgMTsKCiAgaWYgZiBpcyBudWxsIHRoZW4KICAgIHJhaXNlIGV4Y2VwdGlvbiAndXNlX293bl9pbnZlbnRvcnlfcmVjb3JkX3RhcmdldGVkIHdhcyBub3QgZm91bmQnOwogIGVuZCBpZjsKCiAgaWYgcG9zaXRpb24oJ3ZfY29uZGl0aW9uX2NvdW50IGludGVnZXIgOj0gMDsnIGluIGYpID0gMCB0aGVuCiAgICBmIDo9IHJlcGxhY2UoCiAgICAgIGYsCiAgICAgICcgIHZfdGVtcG9yYXJ5X2NvdW50IGludGVnZXIgOj0gMDsnIHx8IGNocigxMCksCiAgICAgICcgIHZfdGVtcG9yYXJ5X2NvdW50IGludGVnZXIgOj0gMDsnIHx8IGNocigxMCkgfHwKICAgICAgJyAgdl9jb25kaXRpb25fY291bnQgaW50ZWdlciA6PSAwOycgfHwgY2hyKDEwKQogICAgKTsKICBlbmQgaWY7CgogIGlmIHBvc2l0aW9uKCdzb3VyY2VfbmFtZSxjb25kaXRpb25zLCcgaW4gZikgPSAwIHRoZW4KICAgIGYgOj0gcmVwbGFjZSgKICAgICAgZiwKICAgICAgJyAgICAgICAgY2hhcmFjdGVyX2lkLGl0ZW1faWQsaXRlbV9pbnN0YW5jZV9pZCxzb3VyY2VfZWZmZWN0X2lkLHNvdXJjZV9uYW1lLCcgfHwgY2hyKDEwKSB8fAogICAgICAnICAgICAgICBtdXNjbGVzX21vZGlmaWVyLHJlZmxleGVzX21vZGlmaWVyLHZpZ291cl9tb2RpZmllcixzaHJld2RfbW9kaWZpZXIsJywKICAgICAgJyAgICAgICAgY2hhcmFjdGVyX2lkLGl0ZW1faWQsaXRlbV9pbnN0YW5jZV9pZCxzb3VyY2VfZWZmZWN0X2lkLHNvdXJjZV9uYW1lLGNvbmRpdGlvbnMsJyB8fCBjaHIoMTApIHx8CiAgICAgICcgICAgICAgIG11c2NsZXNfbW9kaWZpZXIscmVmbGV4ZXNfbW9kaWZpZXIsdmlnb3VyX21vZGlmaWVyLHNocmV3ZF9tb2RpZmllciwnCiAgICApOwoKICAgIGYgOj0gcmVwbGFjZSgKICAgICAgZiwKICAgICAgJyAgICAgICAgdl90YXJnZXRfY2hhcmFjdGVyX2lkLHZfaXRlbV9pZCx2X2l0ZW1faW5zdGFuY2VfaWQsdl9lZmZlY3QuaWQsdl9pdGVtX25hbWUsJyB8fCBjaHIoMTApIHx8CiAgICAgICcgICAgICAgIGNvYWxlc2NlKHZfZWZmZWN0Lm11c2NsZXNfbW9kaWZpZXIsMCksY29hbGVzY2Uodl9lZmZlY3QucmVmbGV4ZXNfbW9kaWZpZXIsMCksJywKICAgICAgJyAgICAgICAgdl90YXJnZXRfY2hhcmFjdGVyX2lkLHZfaXRlbV9pZCx2X2l0ZW1faW5zdGFuY2VfaWQsdl9lZmZlY3QuaWQsdl9pdGVtX25hbWUsJyB8fCBjaHIoMTApIHx8CiAgICAgICcgICAgICAgIGNvYWxlc2NlKHZfZWZmZWN0LmNvbmRpdGlvbnMsJyd7fScnOjp0ZXh0W10pLCcgfHwgY2hyKDEwKSB8fAogICAgICAnICAgICAgICBjb2FsZXNjZSh2X2VmZmVjdC5tdXNjbGVzX21vZGlmaWVyLDApLGNvYWxlc2NlKHZfZWZmZWN0LnJlZmxleGVzX21vZGlmaWVyLDApLCcKICAgICk7CgogICAgZiA6PSByZXBsYWNlKAogICAgICBmLAogICAgICAnICAgICAgdl90ZW1wb3JhcnlfY291bnQ6PXZfdGVtcG9yYXJ5X2NvdW50KzE7JyB8fCBjaHIoMTApLAogICAgICAnICAgICAgdl90ZW1wb3JhcnlfY291bnQ6PXZfdGVtcG9yYXJ5X2NvdW50KzE7JyB8fCBjaHIoMTApIHx8CiAgICAgICcgICAgICB2X2NvbmRpdGlvbl9jb3VudDo9dl9jb25kaXRpb25fY291bnQrY29hbGVzY2UoY2FyZGluYWxpdHkodl9lZmZlY3QuY29uZGl0aW9ucyksMCk7JyB8fCBjaHIoMTApCiAgICApOwogIGVuZCBpZjsKCiAgaWYgcG9zaXRpb24oJycnY29uZGl0aW9ucycnLHZfY29uZGl0aW9uX2NvdW50JyBpbiBmKSA9IDAgdGhlbgogICAgZiA6PSByZXBsYWNlKAogICAgICBmLAogICAgICAnJydoZWFsdGhfZGVsdGEnJyx2X2hlYWx0aF9kZWx0YSwnJ3RlbXBvcmFyeV9lZmZlY3RzJycsdl90ZW1wb3JhcnlfY291bnQsJyB8fCBjaHIoMTApIHx8CiAgICAgICcgICAgICAnJ2NoYXJnZXNfcmVtYWluaW5nJycsdl9jaGFyZ2VzX3JlbWFpbmluZycsCiAgICAgICcnJ2hlYWx0aF9kZWx0YScnLHZfaGVhbHRoX2RlbHRhLCcndGVtcG9yYXJ5X2VmZmVjdHMnJyx2X3RlbXBvcmFyeV9jb3VudCwnIHx8IGNocigxMCkgfHwKICAgICAgJyAgICAgICcnY29uZGl0aW9ucycnLHZfY29uZGl0aW9uX2NvdW50LCcnY2hhcmdlc19yZW1haW5pbmcnJyx2X2NoYXJnZXNfcmVtYWluaW5nJwogICAgKTsKCiAgICBmIDo9IHJlcGxhY2UoCiAgICAgIGYsCiAgICAgICcnJ3RhcmdldF9uYW1lJycsdl90YXJnZXRfbmFtZSwnJ2hlYWx0aF9kZWx0YScnLHZfaGVhbHRoX2RlbHRhLCcndGVtcG9yYXJ5X2VmZmVjdHMnJyx2X3RlbXBvcmFyeV9jb3VudCwnIHx8IGNocigxMCkgfHwKICAgICAgJyAgICAnJ2NoYXJnZXNfcmVtYWluaW5nJycsdl9jaGFyZ2VzX3JlbWFpbmluZywnJ2Nvb2xkb3duX3JlYWR5X2F0Jycsdl9yZWFkeV9hdCcsCiAgICAgICcnJ3RhcmdldF9uYW1lJycsdl90YXJnZXRfbmFtZSwnJ2hlYWx0aF9kZWx0YScnLHZfaGVhbHRoX2RlbHRhLCcndGVtcG9yYXJ5X2VmZmVjdHMnJyx2X3RlbXBvcmFyeV9jb3VudCwnIHx8IGNocigxMCkgfHwKICAgICAgJyAgICAnJ2NvbmRpdGlvbnMnJyx2X2NvbmRpdGlvbl9jb3VudCwnJ2NoYXJnZXNfcmVtYWluaW5nJycsdl9jaGFyZ2VzX3JlbWFpbmluZywnJ2Nvb2xkb3duX3JlYWR5X2F0Jycsdl9yZWFkeV9hdCcKICAgICk7CiAgZW5kIGlmOwoKICBleGVjdXRlIGY7CmVuZAokcGF0Y2gkOwoKY29tbWl0Owo="
sql = base64.b64decode(_SQL_B64).decode("utf-8")


sql_path = ROOT / "supabase_item_conditions.sql"
sql_path.write_text(sql, encoding="utf-8")
print(f"WRITE {sql_path.name}")

print()
print("DONE")
print("1) git diff")
print("2) Run supabase_item_conditions.sql in Supabase SQL Editor")
print("3) npm run build")
