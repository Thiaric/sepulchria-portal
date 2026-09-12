from pathlib import Path

ROOT = Path.cwd()

def load(path):
    p = ROOT / path
    if not p.exists():
        raise SystemExit(f"ERROR: missing {path}")
    return p.read_text(encoding="utf-8-sig")

def save(path, text):
    (ROOT / path).write_text(text, encoding="utf-8")
    print(f"PATCHED: {path}")

def replace_once(text, old, new, label):
    if new in text:
        print(f"SKIP: {label} already applied")
        return text
    n = text.count(old)
    if n != 1:
        raise SystemExit(f"ERROR: {label}: expected 1 match, found {n}")
    return text.replace(old, new, 1)

def patch_admin_page():
    path = "app/(portal)/admin/characters/[id]/page.tsx"
    text = load(path)

    old = '''        <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px] admin_characters_id_page_div_container_5">
          <div className="space-y-6 admin_characters_id_page_div_container_6">
            <CharacterTextSection
              title="Biography"
              content={
                character.biography
              }
            />

            <CharacterTextSection
              title="Physical description"
              content={
                character.physical_description
              }
            />

            <CharacterTextSection
              title="Personality"
              content={
                character.personality
              }
            />

            <CharacterTextSection
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
              title="Relationships"
              content={
                character.relationships
              }
            />

            <CharacterTextSection
              title="Offgame"
              content={
                character.offgame
              }
            />
          </div>

          <section id="admin-character-review"'''
    new = '''        <div className="mt-6 admin_characters_id_page_div_container_5">
          <section id="admin-character-review"'''
    text = replace_once(text, old, new, "remove redundant read-only profile cards")

    surname_block = '''                  <AdminField label="Surname">
                    <input
                      type="text"
                      name="surname"
                      required
                      maxLength={80}
                      defaultValue={
                        character.surname
                      }
                      className="w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-3 py-3 text-sm text-[rgb(var(--sep-colour-d7c4a5))] outline-none focus:border-[rgb(var(--sep-colour-a17a49))] admin_characters_id_page_input_surname"
                    />
                  </AdminField>
'''
    title_block = '''
                  <AdminField label="Public title">
                    <input
                      type="text"
                      name="title"
                      defaultValue={
                        character.title ??
                        ""
                      }
                      maxLength={120}
                      placeholder="Optional public title"
                      className="w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-3 py-3 text-sm text-[rgb(var(--sep-colour-d7c4a5))] outline-none placeholder:text-[rgb(var(--sep-colour-625747))] focus:border-[rgb(var(--sep-colour-a17a49))] admin_characters_id_page_input_title"
                    />
                  </AdminField>
'''
    text = replace_once(text, surname_block, surname_block + title_block, "move Public title into identity grid")

    old_lower_title = '''                <AdminField label="Public title">
                  <input
                    type="text"
                    name="title"
                    defaultValue={
                      character.title ??
                      ""
                    }
                    maxLength={120}
                    placeholder="Optional public title"
                    className="w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-3 py-3 text-sm text-[rgb(var(--sep-colour-d7c4a5))] outline-none placeholder:text-[rgb(var(--sep-colour-625747))] focus:border-[rgb(var(--sep-colour-a17a49))] admin_characters_id_page_input_title"
                  />
                </AdminField>

'''
    pos = text.rfind(old_lower_title)
    if pos != -1:
        text = text[:pos] + text[pos + len(old_lower_title):]
        print("PATCHED: removed old lower Public title field")

    old_ancestry = '''                <AdminField label="Ancestry">
                  <select
                    name="raceId"
                    defaultValue={
                      character.race_id ??
                      ""
                    }
                    className="w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-3 py-3 text-sm text-[rgb(var(--sep-colour-d7c4a5))] outline-none focus:border-[rgb(var(--sep-colour-a17a49))] admin_characters_id_page_select_race_id"
                  >
                    <option className="admin_characters_id_page_option_race_id" value="">
                      No ancestry assigned
                    </option>

                    {races.map(
                      (option) => (
                        <option className="admin_characters_id_page_option_option"
                          key={
                            option.id
                          }
                          value={
                            option.id
                          }
                        >
                          {
                            option.name
                          }
                        </option>
                      ),
                    )}
                  </select>
                </AdminField>

                <AdminAncestryGiftSelector
                  gifts={ancestryGiftOptions}
                  initialRaceId={character.race_id ?? ""}
                  initialSelectedIds={selectedAncestryGiftIds}
                />'''
    new_ancestry = '''                <div className="space-y-3 admin_characters_id_page_div_ancestry_and_feats">
                  <AdminField label="Ancestry">
                    <select
                      name="raceId"
                      defaultValue={
                        character.race_id ??
                        ""
                      }
                      className="w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-3 py-3 text-sm text-[rgb(var(--sep-colour-d7c4a5))] outline-none focus:border-[rgb(var(--sep-colour-a17a49))] admin_characters_id_page_select_race_id"
                    >
                      <option className="admin_characters_id_page_option_race_id" value="">
                        No ancestry assigned
                      </option>

                      {races.map(
                        (option) => (
                          <option className="admin_characters_id_page_option_option"
                            key={
                              option.id
                            }
                            value={
                              option.id
                            }
                          >
                            {
                              option.name
                            }
                          </option>
                        ),
                      )}
                    </select>
                  </AdminField>

                  <AdminAncestryGiftSelector
                    gifts={ancestryGiftOptions}
                    initialRaceId={character.race_id ?? ""}
                    initialSelectedIds={selectedAncestryGiftIds}
                  />
                </div>'''
    text = replace_once(text, old_ancestry, new_ancestry, "group ancestry selector with Ancestry Feats")

    text = replace_once(
        text,
        '''                  <CharacterGiftsDisplay
                    characterId={id}
                    compact
                  />''',
        '''                  <CharacterGiftsDisplay
                    characterId={id}
                    compact
                    twoColumns
                  />''',
        "admin Character Feats twoColumns prop",
    )

    save(path, text)

def patch_ancestry_selector():
    path = "components/admin/admin-ancestry-gift-selector.tsx"
    text = load(path)

    text = replace_once(
        text,
        '''      {eligible.length ? (
        <div className="mt-4 grid gap-2 md:grid-cols-2 components_admin_admin_ancestry_gift_selector_div_container_2">''',
        '''      {!raceId ? (
        <p className="mt-4 text-[10px] italic leading-5 text-[rgb(var(--sep-colour-746958))] components_admin_admin_ancestry_gift_selector_p_choose_ancestry">
          Select an Ancestry above to choose its Feats.
        </p>
      ) : eligible.length ? (
        <div className="mt-4 grid gap-2 md:grid-cols-2 components_admin_admin_ancestry_gift_selector_div_container_2">''',
        "require ancestry before feat choices",
    )

    for oldc, newc in [
        (
            'className="text-[8px] uppercase tracking-[0.22em] text-[rgb(var(--sep-colour-806b50))] components_admin_admin_ancestry_gift_selector_p_text"',
            'className="text-[11px] font-medium normal-case tracking-normal text-[rgb(var(--sep-colour-bda681))] components_admin_admin_ancestry_gift_selector_p_text"',
        ),
        (
            'className="text-[8px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-8a765a))] components_admin_admin_ancestry_gift_selector_span_text_2"',
            'className="text-[9px] normal-case tracking-normal text-[rgb(var(--sep-colour-8a765a))] components_admin_admin_ancestry_gift_selector_span_text_2"',
        ),
        (
            'className="mt-3 text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-6f6353))] components_admin_admin_ancestry_gift_selector_p_text_5"',
            'className="mt-3 text-[9px] normal-case tracking-normal text-[rgb(var(--sep-colour-6f6353))] components_admin_admin_ancestry_gift_selector_p_text_5"',
        ),
    ]:
        if oldc in text:
            text = text.replace(oldc, newc, 1)

    save(path, text)

def patch_character_gifts_display():
    path = "components/characters/character-gifts-display.tsx"
    text = load(path)

    text = replace_once(
        text,
        '''export async function CharacterGiftsDisplay({
  characterId,
  compact = false,
}: {
  characterId: string;
  compact?: boolean;
}) {''',
        '''export async function CharacterGiftsDisplay({
  characterId,
  compact = false,
  twoColumns = false,
}: {
  characterId: string;
  compact?: boolean;
  twoColumns?: boolean;
}) {''',
        "CharacterGiftsDisplay twoColumns prop",
    )

    text = replace_once(
        text,
        '''      <GiftsCatalogue
        gifts={gifts}
        characterMode
      />''',
        '''      <GiftsCatalogue
        gifts={gifts}
        characterMode
        twoColumns={twoColumns}
      />''',
        "pass twoColumns to GiftsCatalogue",
    )

    save(path, text)

def patch_gifts_catalogue():
    path = "components/gifts/gifts-catalogue.tsx"
    text = load(path)

    text = replace_once(
        text,
        '''export function GiftsCatalogue({
  gifts,
  characterMode = false,
}: {
  gifts: GiftCard[];
  characterMode?: boolean;
}) {''',
        '''export function GiftsCatalogue({
  gifts,
  characterMode = false,
  twoColumns = false,
}: {
  gifts: GiftCard[];
  characterMode?: boolean;
  twoColumns?: boolean;
}) {''',
        "GiftsCatalogue twoColumns prop",
    )

    text = replace_once(
        text,
        '''        <section className="mt-3 grid items-start gap-3 grid-cols-1 md:grid-cols-2 xl:grid-cols-3 components_gifts_gifts_catalogue_section_section_2">''',
        '''        <section
          className={[
            "mt-3 grid items-start gap-3 grid-cols-1 md:grid-cols-2 components_gifts_gifts_catalogue_section_section_2",
            twoColumns ? "" : "xl:grid-cols-3",
          ]
            .filter(Boolean)
            .join(" ")}
        >''',
        "GiftsCatalogue two cards per row option",
    )

    save(path, text)

def main():
    print("Applying admin character layout cleanup...\\n")
    patch_admin_page()
    patch_ancestry_selector()
    patch_character_gifts_display()
    patch_gifts_catalogue()
    print("\\nDONE.")
    print("Now run: npm run build")

if __name__ == "__main__":
    main()
