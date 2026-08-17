from pathlib import Path

ROOT = Path.cwd()

TABS = r'''"use client";

import type { ReactNode } from "react";
import { useState } from "react";

type TabId =
  | "short"
  | "description"
  | "notes"
  | "gifts"
  | "warping"
  | "edit";

const PUBLIC_TABS: { id: TabId; label: string }[] = [
  { id: "short", label: "In Short" },
  { id: "description", label: "Description" },
  { id: "notes", label: "Notes" },
  { id: "gifts", label: "Gifts" },
  { id: "warping", label: "Warping" },
];

export function CharacterSheetTabs({
  own = false,
  children,
}: {
  own?: boolean;
  children: ReactNode;
}) {
  const [activeTab, setActiveTab] = useState<TabId>("short");

  const tabs = own
    ? [...PUBLIC_TABS, { id: "edit" as const, label: "Edit" }]
    : PUBLIC_TABS;

  return (
    <div
      className="character-sheet-tabs mt-4"
      data-character-sheet-active-tab={activeTab}
    >
      <nav
        aria-label="Character sheet sections"
        role="tablist"
        className="flex min-w-0 flex-wrap border border-[#60482e]/45 bg-[#120e0b]"
      >
        {tabs.map((tab) => {
          const active = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setActiveTab(tab.id)}
              className={`relative min-w-[110px] flex-1 border-r border-[#59432c]/35 px-4 py-3 text-[8px] uppercase tracking-[0.18em] transition last:border-r-0 ${
                active
                  ? "bg-[#342617] text-[#efd6a5]"
                  : "bg-[#120e0b] text-[#81715d] hover:bg-[#1c140f] hover:text-[#c6a97e]"
              }`}
            >
              {tab.label}
              {active ? (
                <span
                  aria-hidden="true"
                  className="absolute inset-x-4 bottom-0 h-px bg-[#b98b50]"
                />
              ) : null}
            </button>
          );
        })}
      </nav>

      <div className="mt-4">{children}</div>

      <style>{`
        .character-sheet-tabs [data-character-sheet-panel] { display: none; }
        .character-sheet-tabs[data-character-sheet-active-tab="short"] [data-character-sheet-panel="short"],
        .character-sheet-tabs[data-character-sheet-active-tab="description"] [data-character-sheet-panel="description"],
        .character-sheet-tabs[data-character-sheet-active-tab="notes"] [data-character-sheet-panel="notes"],
        .character-sheet-tabs[data-character-sheet-active-tab="gifts"] [data-character-sheet-panel="gifts"],
        .character-sheet-tabs[data-character-sheet-active-tab="warping"] [data-character-sheet-panel="warping"],
        .character-sheet-tabs[data-character-sheet-active-tab="edit"] [data-character-sheet-panel="edit"] {
          display: block;
        }
      `}</style>
    </div>
  );
}
'''

def load(rel):
    path = ROOT / rel
    if not path.exists():
        raise SystemExit(f"ERROR: Missing {rel}. Run from the sepulchria-portal root.")
    return path, path.read_text(encoding="utf-8")

# Shared tabs component.
tabs_rel = "components/characters/character-sheet-tabs.tsx"
tabs_path = ROOT / tabs_rel
tabs_path.parent.mkdir(parents=True, exist_ok=True)
tabs_path.write_text(TABS, encoding="utf-8")
print("Created:", tabs_rel)

# OWN SHEET
rel = "app/(portal)/character/page.tsx"
path, text = load(rel)

if "@/components/characters/character-sheet-tabs" not in text:
    marker = 'import { CharacterOrderSummary } from "@/components/characters/character-order-summary";\n'
    if marker not in text:
        raise SystemExit("ERROR: Own sheet import point not found.")
    text = text.replace(marker, marker + 'import { CharacterSheetTabs } from "@/components/characters/character-sheet-tabs";\n', 1)

edit_top = '''            {canEdit ? (
              <Link
                href="/character/edit"
                className="border border-[#8d6d3e] bg-[#332719] px-4 py-2 text-[9px] uppercase tracking-[0.18em] text-[#efd9aa] transition hover:bg-[#49351f]"
              >
                Edit character
              </Link>
            ) : null}

'''
if edit_top in text:
    text = text.replace(edit_top, "", 1)

marker = '        <section className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(360px,0.9fr)]">\n'
if marker not in text:
    raise SystemExit("ERROR: Own In Short section not found.")
text = text.replace(marker, '''        <CharacterSheetTabs own={own}>
          <div data-character-sheet-panel="short">
            <section className="grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(360px,0.9fr)]">
''', 1)

old = '''          <div className="min-w-0">
            {character.id ? (
              <>
                <CharacterMechanicsDisplay
                  characterId={character.id}
                />

                <div className="mt-4">
                  <CharacterGiftsDisplay
                    characterId={character.id}
                  />
                </div>
              </>
            ) : null}
          </div>
        </section>

        <section className="mt-4 grid gap-4 md:grid-cols-2">
'''
new = '''              <div className="min-w-0">
                {character.id ? (
                  <CharacterMechanicsDisplay
                    characterId={character.id}
                  />
                ) : null}
              </div>
            </section>
          </div>

          <div data-character-sheet-panel="description">
            <section className="grid gap-4 md:grid-cols-2">
'''
if old not in text:
    raise SystemExit("ERROR: Own mechanics/Gifts block not found.")
text = text.replace(old, new, 1)

old = '''        <div className="mt-4">
          <ProfileTextSection
            title="Biography"
            value={character.biography}
          />
        </div>

        <div className="mt-4">
          <ProfileTextSection
            title="Public notes"
            value={character.public_notes}
            subtle
          />
        </div>

        {own &&
        status === "approved" ? (
'''
new = '''            <div className="mt-4">
              <ProfileTextSection
                title="Biography"
                value={character.biography}
              />
            </div>
          </div>

          <div data-character-sheet-panel="notes">
            <ProfileTextSection
              title="Public notes"
              value={character.public_notes}
              subtle
            />
          </div>

          <div data-character-sheet-panel="gifts">
            {character.id ? (
              <CharacterGiftsDisplay characterId={character.id} />
            ) : null}
          </div>

          <div data-character-sheet-panel="warping">
            <div className="min-h-28 border border-[#60482e]/35 bg-[#130f0c]" />
          </div>

          <div data-character-sheet-panel="edit">
            {canEdit ? (
              <section className="border border-[#6b5032]/50 bg-[#17110d] p-5">
                <p className="text-[8px] uppercase tracking-[0.22em] text-[#806b50]">Character editing</p>
                <h2 className="mt-2 font-serif text-xl text-[#dfc79c]">Edit character</h2>
                <p className="mt-2 text-[11px] leading-5 text-[#8f8271]">This character is still editable through the full character editor.</p>
                <Link
                  href="/character/edit"
                  className="mt-4 inline-flex border border-[#8d6d3e] bg-[#332719] px-4 py-2 text-[9px] uppercase tracking-[0.18em] text-[#efd9aa] transition hover:bg-[#49351f]"
                >
                  Open character editor
                </Link>
              </section>
            ) : null}

            {own &&
            status === "approved" ? (
'''
if old not in text:
    raise SystemExit("ERROR: Own Description/Notes/Edit transition not found.")
text = text.replace(old, new, 1)

old = '''          </details>
        ) : null}
      </div>
    </div>
  );
}
'''
new = '''              </details>
            ) : null}

            {own && !canEdit && status !== "approved" ? (
              <section className="border border-[#6b5032]/50 bg-[#17110d] p-5">
                <h2 className="font-serif text-xl text-[#dfc79c]">Editing unavailable</h2>
                <p className="mt-2 text-[11px] leading-5 text-[#8f8271]">This character cannot currently be edited while it is awaiting staff review.</p>
              </section>
            ) : null}
          </div>
        </CharacterSheetTabs>
      </div>
    </div>
  );
}
'''
if old not in text:
    raise SystemExit("ERROR: Own sheet closing editor block not found.")
text = text.replace(old, new, 1)
path.write_text(text, encoding="utf-8")
print("Updated:", rel)

# PUBLIC SHEET
rel = "components/characters/public-character-profile.tsx"
path, text = load(rel)

if "@/components/characters/character-sheet-tabs" not in text:
    marker = 'import { CharacterMusicPlayer } from "@/components/characters/character-music-player";\n'
    if marker not in text:
        raise SystemExit("ERROR: Public sheet import point not found.")
    text = text.replace(marker, marker + 'import { CharacterSheetTabs } from "@/components/characters/character-sheet-tabs";\n', 1)

marker = '      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(360px,0.9fr)]">\n'
if marker not in text:
    raise SystemExit("ERROR: Public In Short section not found.")
text = text.replace(marker, '''      <CharacterSheetTabs>
        <div data-character-sheet-panel="short">
          <section className="grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(360px,0.9fr)]">
''', 1)

old = '''        <div className="min-w-0">
          <CharacterMechanicsDisplay
            characterId={character.id}
          />

          <div className="mt-4">
            <CharacterGiftsDisplay
              characterId={character.id}
            />
          </div>

        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
'''
new = '''            <div className="min-w-0">
              <CharacterMechanicsDisplay characterId={character.id} />
            </div>
          </section>
        </div>

        <div data-character-sheet-panel="description">
          <section className="grid gap-4 md:grid-cols-2">
'''
if old not in text:
    raise SystemExit("ERROR: Public mechanics/Gifts block not found.")
text = text.replace(old, new, 1)

old = '''      <ProfileSection
        title="Biography"
        content={character.biography}
      />

      <ProfileSection
        title="Public Notes"
        content={character.public_notes}
        subtle
      />

      {!character.biography &&
      !character.physical_description &&
      !character.personality &&
      !character.public_notes ? (
        <section className="border border-[#60482e]/45 bg-[#15100d]/95 p-8 text-center">
          <p className="font-serif text-lg text-[#b9a88f]">
            This character has not yet shared
            any public information.
          </p>
        </section>
      ) : null}
    </article>
'''
new = '''          <div className="mt-4">
            <ProfileSection title="Biography" content={character.biography} />
          </div>
        </div>

        <div data-character-sheet-panel="notes">
          <ProfileSection
            title="Public Notes"
            content={character.public_notes}
            subtle
          />
          {!character.public_notes ? (
            <section className="border border-[#60482e]/35 bg-[#130f0c] p-6 text-center">
              <p className="font-serif text-sm text-[#8f8271]">No public notes have been shared.</p>
            </section>
          ) : null}
        </div>

        <div data-character-sheet-panel="gifts">
          <CharacterGiftsDisplay characterId={character.id} />
        </div>

        <div data-character-sheet-panel="warping">
          <div className="min-h-28 border border-[#60482e]/35 bg-[#130f0c]" />
        </div>
      </CharacterSheetTabs>
    </article>
'''
if old not in text:
    raise SystemExit("ERROR: Public Description/Notes ending block not found.")
text = text.replace(old, new, 1)
path.write_text(text, encoding="utf-8")
print("Updated:", rel)

print()
print("SUCCESS")
print("Character sheet tabs installed for own + public sheets.")
print("No SQL required.")
print("Now run: npm run build")
