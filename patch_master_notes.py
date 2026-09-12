from pathlib import Path

ROOT = Path.cwd()

def read(path: str) -> str:
    p = ROOT / path
    if not p.exists():
        raise SystemExit(f"ERROR: Missing file: {path}")
    return p.read_text(encoding="utf-8-sig")

def write(path: str, text: str) -> None:
    p = ROOT / path
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(text, encoding="utf-8")
    print(f"PATCHED: {path}")

def replace_once(text: str, old: str, new: str, label: str) -> str:
    if new in text:
        print(f"SKIP: {label} already applied")
        return text
    count = text.count(old)
    if count != 1:
        raise SystemExit(
            f"ERROR: Expected exactly 1 match for {label}, found {count}. "
            "Your local file differs from the version this patch targets."
        )
    return text.replace(old, new, 1)

def insert_after_once(text: str, anchor: str, addition: str, label: str) -> str:
    if addition.strip() in text:
        print(f"SKIP: {label} already applied")
        return text
    count = text.count(anchor)
    if count != 1:
        raise SystemExit(
            f"ERROR: Expected exactly 1 match for {label}, found {count}."
        )
    return text.replace(anchor, anchor + addition, 1)

def patch_own_character_page():
    path = "app/(portal)/character/page.tsx"
    text = read(path)

    text = insert_after_once(
        text,
        'import { CharacterConditionsEditor } from "@/components/characters/character-conditions-editor";\n',
        'import { CharacterMasterNotes } from "@/components/characters/character-master-notes";\n',
        "own sheet import",
    )

    text = insert_after_once(
        text,
        '  public_notes?: string | null;\n',
        '  master_notes?: string | null;\n',
        "own sheet CharacterProfile master_notes type",
    )

    text = replace_once(
        text,
        '''      biography,
      public_notes,
      relationships,''',
        '''      biography,
      public_notes,
      master_notes,
      relationships,''',
        "own sheet query master_notes",
    )

    text = replace_once(
        text,
        '''              <div className="min-w-0 character_page_div_container_25">
                {character.id ? (
                  <CharacterMechanicsDisplay
                    characterId={character.id}
                  />
                ) : null}
              </div>''',
        '''              <div className="min-w-0 space-y-4 character_page_div_container_25">
                {character.id ? (
                  <CharacterMechanicsDisplay
                    characterId={character.id}
                  />
                ) : null}

                <CharacterMasterNotes
                  notes={character.master_notes}
                />
              </div>''',
        "own sheet Masters' Notes block",
    )

    write(path, text)

def patch_public_type():
    path = "types/public-character.ts"
    text = read(path)
    text = insert_after_once(
        text,
        '  public_notes: string | null;\n',
        '  master_notes: string | null;\n',
        "public character type master_notes",
    )
    write(path, text)

def patch_public_loader():
    path = "lib/characters/get-public-character.ts"
    text = read(path)

    text = insert_after_once(
        text,
        '  public_notes: string | null;\n',
        '  master_notes: string | null;\n',
        "public loader CharacterRow master_notes",
    )

    text = replace_once(
        text,
        '''        personality,
        public_notes,
        relationships,''',
        '''        personality,
        public_notes,
        master_notes,
        relationships,''',
        "public loader query master_notes",
    )

    text = replace_once(
        text,
        '''      personality: row.personality,
      public_notes: row.public_notes,
      relationships: row.relationships,''',
        '''      personality: row.personality,
      public_notes: row.public_notes,
      master_notes: row.master_notes,
      relationships: row.relationships,''',
        "public loader return master_notes",
    )

    write(path, text)

def patch_public_profile():
    path = "components/characters/public-character-profile.tsx"
    text = read(path)

    text = insert_after_once(
        text,
        'import { CharacterConditionsDisplay } from "@/components/characters/character-conditions-display";\n',
        'import { CharacterMasterNotes } from "@/components/characters/character-master-notes";\n',
        "public profile import",
    )

    text = replace_once(
        text,
        '''            <div className="min-w-0 components_characters_public_character_profile_div_container_21">
              <CharacterMechanicsDisplay characterId={character.id} />
            </div>''',
        '''            <div className="min-w-0 space-y-4 components_characters_public_character_profile_div_container_21">
              <CharacterMechanicsDisplay characterId={character.id} />

              <CharacterMasterNotes
                notes={character.master_notes}
              />
            </div>''',
        "public profile Masters' Notes block",
    )

    write(path, text)

def patch_admin_page():
    path = "app/(portal)/admin/characters/[id]/page.tsx"
    text = read(path)

    text = insert_after_once(
        text,
        '  public_notes: string | null;\n',
        '  master_notes: string | null;\n',
        "admin CharacterRow master_notes",
    )

    text = replace_once(
        text,
        '''        personality,
        public_notes,
        relationships,''',
        '''        personality,
        public_notes,
        master_notes,
        relationships,''',
        "admin page query master_notes",
    )

    text = replace_once(
        text,
        '''            <CharacterTextSection
              title="Public notes"
              content={
                character.public_notes
              }
            />

            <CharacterTextSection
              title="Relationships"''',
        '''            <CharacterTextSection
              title="Public notes"
              content={
                character.public_notes
              }
            />

            <CharacterTextSection
              title="Masters' Notes"
              content={
                character.master_notes
              }
            />

            <CharacterTextSection
              title="Relationships"''',
        "admin read-only Masters' Notes card",
    )

    text = replace_once(
        text,
        '''                <AdminField label="Public notes">
                  <textarea
                    name="publicNotes"
                    rows={6}
                    maxLength={10000}
                    defaultValue={
                      character.public_notes ??
                      ""
                    }
                    className="w-full resize-y border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-3 py-3 text-sm leading-6 text-[rgb(var(--sep-colour-d7c4a5))] outline-none focus:border-[rgb(var(--sep-colour-a17a49))] admin_characters_id_page_textarea_public_notes"
                  />
                </AdminField>

                <AdminField label="Relationships">''',
        '''                <AdminField label="Public notes">
                  <textarea
                    name="publicNotes"
                    rows={6}
                    maxLength={10000}
                    defaultValue={
                      character.public_notes ??
                      ""
                    }
                    className="w-full resize-y border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-3 py-3 text-sm leading-6 text-[rgb(var(--sep-colour-d7c4a5))] outline-none focus:border-[rgb(var(--sep-colour-a17a49))] admin_characters_id_page_textarea_public_notes"
                  />
                </AdminField>

                <AdminField label="Masters' Notes">
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
                </AdminField>

                <AdminField label="Relationships">''',
        "admin editable Masters' Notes field",
    )

    write(path, text)

def patch_admin_actions():
    path = "app/(portal)/admin/characters/actions.ts"
    text = read(path)

    text = replace_once(
        text,
        '''  const publicNotes =
    readOptionalText(
      formData.get(
        "publicNotes",
      ),
      10000,
    );

  const relationships =''',
        '''  const publicNotes =
    readOptionalText(
      formData.get(
        "publicNotes",
      ),
      10000,
    );

  const masterNotes =
    readOptionalText(
      formData.get(
        "masterNotes",
      ),
      10000,
    );

  const relationships =''',
        "admin action read masterNotes",
    )

    text = replace_once(
        text,
        '''      biography,
      public_notes,
      relationships,''',
        '''      biography,
      public_notes,
      master_notes,
      relationships,''',
        "admin action select master_notes",
    )

    text = replace_once(
        text,
        '''      biography,
      public_notes:
        publicNotes,
      relationships,''',
        '''      biography,
      public_notes:
        publicNotes,
      master_notes:
        masterNotes,
      relationships,''',
        "admin action candidate payload master_notes",
    )

    text = replace_once(
        text,
        '''      biography:
        character.biography,
      public_notes:
        character.public_notes,
      relationships:''',
        '''      biography:
        character.biography,
      public_notes:
        character.public_notes,
      master_notes:
        character.master_notes,
      relationships:''',
        "admin action current values master_notes",
    )

    text = replace_once(
        text,
        '''          biography:
            character.biography,
          public_notes:
            character.public_notes,
          relationships:''',
        '''          biography:
            character.biography,
          public_notes:
            character.public_notes,
          master_notes:
            character.master_notes,
          relationships:''',
        "admin action rollback master_notes",
    )

    write(path, text)

def create_component():
    path = "components/characters/character-master-notes.tsx"
    p = ROOT / path
    content = '''type CharacterMasterNotesProps = {
  notes: string | null | undefined;
};

export function CharacterMasterNotes({
  notes,
}: CharacterMasterNotesProps) {
  const value = notes?.trim();

  return (
    <section className="border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))]/80 p-4 components_characters_character_master_notes_section">
      <p className="text-[8px] uppercase tracking-[0.22em] text-[rgb(var(--sep-colour-8c704b))] components_characters_character_master_notes_label">
        Masters&apos; Notes
      </p>

      {value ? (
        <p className="mt-3 whitespace-pre-wrap text-[11px] leading-5 text-[rgb(var(--sep-colour-c9b99d))] components_characters_character_master_notes_text">
          {value}
        </p>
      ) : (
        <p className="mt-3 text-[10px] italic leading-5 text-[rgb(var(--sep-colour-746958))] components_characters_character_master_notes_empty">
          No Masters&apos; Notes recorded.
        </p>
      )}
    </section>
  );
}
'''
    if p.exists() and p.read_text(encoding="utf-8-sig") == content:
        print(f"SKIP: {path} already correct")
        return
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(content, encoding="utf-8")
    print(f"CREATED: {path}")

def create_sql():
    path = "supabase/migrations/20260912090000_add_character_master_notes.sql"
    p = ROOT / path
    content = '''alter table public.characters
add column if not exists master_notes text;
'''
    p.parent.mkdir(parents=True, exist_ok=True)
    if not p.exists():
        p.write_text(content, encoding="utf-8")
        print(f"CREATED: {path}")
    else:
        print(f"SKIP: {path} already exists")

def main():
    print("Applying Sepulchria Masters' Notes patch...\\n")
    create_component()
    patch_own_character_page()
    patch_public_type()
    patch_public_loader()
    patch_public_profile()
    patch_admin_page()
    patch_admin_actions()
    create_sql()
    print("\\nDONE.")
    print("Run the generated SQL migration in Supabase, then run npm run build.")

if __name__ == "__main__":
    main()
