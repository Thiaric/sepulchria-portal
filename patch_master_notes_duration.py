from pathlib import Path

ROOT = Path.cwd()

def read(path: str) -> str:
    p = ROOT / path
    if not p.exists():
        raise FileNotFoundError(f"Missing file: {path}")
    return p.read_text(encoding="utf-8-sig")

def write(path: str, content: str) -> None:
    p = ROOT / path
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(content, encoding="utf-8")

def replace_once(path: str, old: str, new: str) -> None:
    content = read(path)
    count = content.count(old)
    if count != 1:
        raise RuntimeError(
            f"{path}: expected exactly 1 match, found {count}.\n"
            f"Anchor begins with:\n{old[:240]}"
        )
    write(path, content.replace(old, new, 1))
    print(f"UPDATED: {path}")

# 1. Rewrite timed Masters' Notes display component.

master_notes_component = '''"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

type CharacterMasterNotesProps = {
  notes: string | null | undefined;
  expiresAt?: string | null | undefined;
};

const MAX_TIMEOUT_MS = 2_147_000_000;

export function CharacterMasterNotes({
  notes,
  expiresAt = null,
}: CharacterMasterNotesProps) {
  const value = notes?.trim();

  const parsedExpiry = useMemo(() => {
    if (!expiresAt) {
      return null;
    }

    const timestamp =
      new Date(expiresAt).getTime();

    return Number.isNaN(timestamp)
      ? null
      : timestamp;
  }, [expiresAt]);

  const [expired, setExpired] =
    useState(() =>
      parsedExpiry !== null &&
      parsedExpiry <= Date.now(),
    );

  useEffect(() => {
    if (parsedExpiry === null) {
      setExpired(false);
      return;
    }

    let timer:
      | ReturnType<typeof setTimeout>
      | null = null;

    let cancelled = false;

    const scheduleExpiry = () => {
      if (cancelled) {
        return;
      }

      const remaining =
        parsedExpiry - Date.now();

      if (remaining <= 0) {
        setExpired(true);
        return;
      }

      setExpired(false);

      timer = setTimeout(
        scheduleExpiry,
        Math.min(
          remaining,
          MAX_TIMEOUT_MS,
        ),
      );
    };

    scheduleExpiry();

    return () => {
      cancelled = true;

      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [parsedExpiry]);

  if (!value || expired) {
    return null;
  }

  const expiryLabel =
    parsedExpiry === null
      ? "Permanent"
      : `Temporary · expires ${new Intl.DateTimeFormat(
          "en-GB",
          {
            day: "numeric",
            month: "long",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          },
        ).format(
          new Date(parsedExpiry),
        )}`;

  return (
    <section className="border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))]/80 p-4 components_characters_character_master_notes_section">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="text-[8px] uppercase tracking-[0.22em] text-[rgb(var(--sep-colour-8c704b))] components_characters_character_master_notes_label">
          Masters&apos; Notes
        </p>

        <p className="text-[8px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-8f8271))]">
          {expiryLabel}
        </p>
      </div>

      <p className="mt-3 whitespace-pre-wrap text-[11px] leading-5 text-[rgb(var(--sep-colour-c9b99d))] components_characters_character_master_notes_text">
        {value}
      </p>
    </section>
  );
}
'''

write(
    "components/characters/character-master-notes.tsx",
    master_notes_component,
)
print("REWROTE: components/characters/character-master-notes.tsx")

# 2. Public character type.

replace_once(
    "types/public-character.ts",
    '''  master_notes: string | null;
  relationships: string | null;''',
    '''  master_notes: string | null;
  master_notes_expires_at: string | null;
  relationships: string | null;''',
)

# 3. Public character loader.

replace_once(
    "lib/characters/get-public-character.ts",
    '''  master_notes: string | null;
  relationships: string | null;''',
    '''  master_notes: string | null;
  master_notes_expires_at: string | null;
  relationships: string | null;''',
)

replace_once(
    "lib/characters/get-public-character.ts",
    '''        master_notes,
        relationships,''',
    '''        master_notes,
        master_notes_expires_at,
        relationships,''',
)

replace_once(
    "lib/characters/get-public-character.ts",
    '''      master_notes: row.master_notes,
      relationships: row.relationships,''',
    '''      master_notes: row.master_notes,
      master_notes_expires_at:
        row.master_notes_expires_at,
      relationships: row.relationships,''',
)

# 4. Own character sheet.

replace_once(
    "app/(portal)/character/page.tsx",
    '''  master_notes?: string | null;
  relationships?: string | null;''',
    '''  master_notes?: string | null;
  master_notes_expires_at?: string | null;
  relationships?: string | null;''',
)

replace_once(
    "app/(portal)/character/page.tsx",
    '''      master_notes,
      relationships,''',
    '''      master_notes,
      master_notes_expires_at,
      relationships,''',
)

replace_once(
    "app/(portal)/character/page.tsx",
    '''                <CharacterMasterNotes
                  notes={character.master_notes}
                />''',
    '''                <CharacterMasterNotes
                  notes={character.master_notes}
                  expiresAt={
                    character.master_notes_expires_at
                  }
                />''',
)

# 5. Public character sheet.

replace_once(
    "components/characters/public-character-profile.tsx",
    '''              <CharacterMasterNotes
                notes={character.master_notes}
              />''',
    '''              <CharacterMasterNotes
                notes={character.master_notes}
                expiresAt={
                  character.master_notes_expires_at
                }
              />''',
)

# 6. Admin character page.

replace_once(
    "app/(portal)/admin/characters/[id]/page.tsx",
    '''  master_notes: string | null;
  relationships: string | null;''',
    '''  master_notes: string | null;
  master_notes_expires_at: string | null;
  relationships: string | null;''',
)

replace_once(
    "app/(portal)/admin/characters/[id]/page.tsx",
    '''        master_notes,
        relationships,''',
    '''        master_notes,
        master_notes_expires_at,
        relationships,''',
)

old_admin_field = '''                <AdminField label="Masters' Notes">
                  <textarea
                    name="masterNotes"
                    rows={8}
                    maxLength={10000}
                    defaultValue={
                      character.master_notes ??
                      ""
                    }
                    className="w-full resize-y border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-3 py-3 text-sm leading-6 text-[rgb(var(--sep-colour-d7c4a5))] outline-none focus:border-[rgb(var(--sep-colour-a17a49))] admin_characters_id_page_textarea_master_notes"
                  />
                </AdminField>'''

new_admin_field = '''                <AdminField label="Masters' Notes">
                  <div className="space-y-3">
                    <textarea
                      name="masterNotes"
                      rows={8}
                      maxLength={10000}
                      defaultValue={
                        character.master_notes ??
                        ""
                      }
                      className="w-full resize-y border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-3 py-3 text-sm leading-6 text-[rgb(var(--sep-colour-d7c4a5))] outline-none focus:border-[rgb(var(--sep-colour-a17a49))] admin_characters_id_page_textarea_master_notes"
                    />

                    <input
                      type="hidden"
                      name="masterNotesOriginalExpiresAt"
                      value={
                        character.master_notes_expires_at ??
                        ""
                      }
                    />

                    <input
                      type="hidden"
                      name="masterNotesOriginalDurationDays"
                      value={
                        character.master_notes_expires_at
                          ? Math.max(
                              1,
                              Math.ceil(
                                (
                                  new Date(
                                    character.master_notes_expires_at,
                                  ).getTime() -
                                  Date.now()
                                ) /
                                  86_400_000,
                              ),
                            )
                          : ""
                      }
                    />

                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="block">
                        <span className="text-[8px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-806b50))]">
                          Duration
                        </span>

                        <select
                          name="masterNotesDurationMode"
                          defaultValue={
                            character.master_notes_expires_at
                              ? "temporary"
                              : "permanent"
                          }
                          className="mt-2 w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-3 py-3 text-sm text-[rgb(var(--sep-colour-d7c4a5))] outline-none focus:border-[rgb(var(--sep-colour-a17a49))]"
                        >
                          <option value="permanent">
                            Permanent
                          </option>
                          <option value="temporary">
                            Temporary
                          </option>
                        </select>
                      </label>

                      <label className="block">
                        <span className="text-[8px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-806b50))]">
                          Days
                        </span>

                        <input
                          type="number"
                          name="masterNotesDurationDays"
                          min={1}
                          max={36500}
                          step={1}
                          defaultValue={
                            character.master_notes_expires_at
                              ? Math.max(
                                  1,
                                  Math.ceil(
                                    (
                                      new Date(
                                        character.master_notes_expires_at,
                                      ).getTime() -
                                      Date.now()
                                    ) /
                                      86_400_000,
                                  ),
                                )
                              : 7
                          }
                          className="mt-2 w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-3 py-3 text-sm text-[rgb(var(--sep-colour-d7c4a5))] outline-none focus:border-[rgb(var(--sep-colour-a17a49))]"
                        />
                      </label>
                    </div>

                    <p className="text-[10px] leading-5 text-[rgb(var(--sep-colour-8f8271))]">
                      Permanent notes remain until manually removed.
                      Temporary notes disappear automatically from the
                      character sheet when their duration ends.
                    </p>
                  </div>
                </AdminField>'''

replace_once(
    "app/(portal)/admin/characters/[id]/page.tsx",
    old_admin_field,
    new_admin_field,
)

# 7. Admin save action.

replace_once(
    "app/(portal)/admin/characters/actions.ts",
    '''  const masterNotes =
    readOptionalText(
      formData.get(
        "masterNotes",
      ),
      10000,
    );

  const relationships =''',
    '''  const masterNotes =
    readOptionalText(
      formData.get(
        "masterNotes",
      ),
      10000,
    );

  const masterNotesDurationMode =
    String(
      formData.get(
        "masterNotesDurationMode",
      ) ?? "permanent",
    ).trim();

  if (
    masterNotesDurationMode !==
      "permanent" &&
    masterNotesDurationMode !==
      "temporary"
  ) {
    throw new Error(
      "Masters' Notes duration is invalid.",
    );
  }

  const masterNotesDurationDaysRaw =
    String(
      formData.get(
        "masterNotesDurationDays",
      ) ?? "",
    ).trim();

  const masterNotesOriginalExpiresAt =
    String(
      formData.get(
        "masterNotesOriginalExpiresAt",
      ) ?? "",
    ).trim();

  const masterNotesOriginalDurationDaysRaw =
    String(
      formData.get(
        "masterNotesOriginalDurationDays",
      ) ?? "",
    ).trim();

  let masterNotesDurationDays:
    number | null = null;

  if (
    masterNotes &&
    masterNotesDurationMode ===
      "temporary"
  ) {
    const parsedDays =
      Number(
        masterNotesDurationDaysRaw,
      );

    if (
      !Number.isInteger(
        parsedDays,
      ) ||
      parsedDays < 1 ||
      parsedDays > 36500
    ) {
      throw new Error(
        "Temporary Masters' Notes must last between 1 and 36500 days.",
      );
    }

    masterNotesDurationDays =
      parsedDays;
  }

  const relationships =''',
)

replace_once(
    "app/(portal)/admin/characters/actions.ts",
    '''      master_notes,
      relationships,''',
    '''      master_notes,
      master_notes_expires_at,
      relationships,''',
)

expiry_logic = '''  let masterNotesExpiresAt:
    string | null = null;

  if (
    masterNotes &&
    masterNotesDurationMode ===
      "temporary"
  ) {
    const originalDurationDays =
      Number(
        masterNotesOriginalDurationDaysRaw,
      );

    const existingExpiryTimestamp =
      character.master_notes_expires_at
        ? new Date(
            character.master_notes_expires_at,
          ).getTime()
        : Number.NaN;

    const preserveExistingExpiry =
      Boolean(
        character.master_notes_expires_at,
      ) &&
      masterNotesOriginalExpiresAt ===
        character.master_notes_expires_at &&
      Number.isInteger(
        originalDurationDays,
      ) &&
      originalDurationDays ===
        masterNotesDurationDays &&
      !Number.isNaN(
        existingExpiryTimestamp,
      ) &&
      existingExpiryTimestamp >
        Date.now();

    masterNotesExpiresAt =
      preserveExistingExpiry
        ? character
            .master_notes_expires_at
        : new Date(
            Date.now() +
              (
                masterNotesDurationDays ??
                1
              ) *
                86_400_000,
          ).toISOString();
  }

'''

replace_once(
    "app/(portal)/admin/characters/actions.ts",
    '''  const candidatePayload:
    Record<string, unknown> = {''',
    expiry_logic + '''  const candidatePayload:
    Record<string, unknown> = {''',
)

replace_once(
    "app/(portal)/admin/characters/actions.ts",
    '''      master_notes:
        masterNotes,
      relationships,''',
    '''      master_notes:
        masterNotes,
      master_notes_expires_at:
        masterNotesExpiresAt,
      relationships,''',
)

replace_once(
    "app/(portal)/admin/characters/actions.ts",
    '''      master_notes:
        character.master_notes,
      relationships:''',
    '''      master_notes:
        character.master_notes,
      master_notes_expires_at:
        character.master_notes_expires_at,
      relationships:''',
)

replace_once(
    "app/(portal)/admin/characters/actions.ts",
    '''          master_notes:
            character.master_notes,
          relationships:''',
    '''          master_notes:
            character.master_notes,
          master_notes_expires_at:
            character.master_notes_expires_at,
          relationships:''',
)

# 8. SQL file for Supabase.

sql = '''-- Masters' Notes duration / expiry
-- NULL = permanent
-- timestamp = hide the note once this moment is reached

alter table public.characters
add column if not exists master_notes_expires_at timestamptz;

comment on column public.characters.master_notes_expires_at is
'Expiry time for Masters Notes. NULL means permanent.';
'''

write(
    "master_notes_duration.sql",
    sql,
)
print("CREATED: master_notes_duration.sql")

print()
print("DONE.")
print()
print("Next:")
print("1. Run master_notes_duration.sql in Supabase SQL Editor.")
print("2. Run: npm run build")
print("3. Test one Permanent note and one Temporary note.")
