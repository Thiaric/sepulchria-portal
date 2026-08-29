from pathlib import Path
import sys

ROOT = Path.cwd()

TABS = ROOT / "components/characters/character-sheet-tabs.tsx"
OWN = ROOT / "app/(portal)/character/page.tsx"
PUBLIC_PAGE = ROOT / "app/(portal)/characters/[slug]/page.tsx"
PUBLIC_VIEW = ROOT / "components/characters/public-character-profile.tsx"


def fail(message):
    print(f"\nERROR: {message}")
    sys.exit(1)


def read(path):
    if not path.exists():
        fail(f"Missing file: {path}")
    return path.read_text(encoding="utf-8")


def write(path, text):
    path.write_text(text, encoding="utf-8")
    print(f"UPDATED: {path.relative_to(ROOT)}")


def replace_once(text, old, new, label):
    count = text.count(old)
    if count == 0:
        fail(f"Could not find anchor for {label}.")
    if count > 1:
        fail(f"Expected one anchor for {label}, found {count}.")
    return text.replace(old, new, 1)


TABS_CONTENT = '''"use client";

import type { ReactNode } from "react";
import {
  usePathname,
  useRouter,
  useSearchParams,
} from "next/navigation";
import { useTransition } from "react";

export type CharacterSheetTab =
  | "short"
  | "profile"
  | "inventory"
  | "ledger"
  | "trophies"
  | "gifts"
  | "warping"
  | "offgame"
  | "audit"
  | "edit";

const PUBLIC_TABS: {
  id: CharacterSheetTab;
  label: string;
}[] = [
  { id: "short", label: "IN SHORT" },
  { id: "profile", label: "PROFILE" },
  { id: "inventory", label: "INVENTORY" },
  { id: "trophies", label: "TROPHIES" },
  { id: "gifts", label: "FEATS" },
  { id: "warping", label: "WARPING" },
  { id: "offgame", label: "OFFGAME" },
];

export function CharacterSheetTabs({
  own = false,
  showAudit = false,
  activeTab = "short",
  children,
}: {
  own?: boolean;
  showAudit?: boolean;
  activeTab?: CharacterSheetTab;
  children: ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] =
    useTransition();

  const baseTabs = own
    ? [
        ...PUBLIC_TABS.slice(0, 3),
        {
          id: "ledger" as const,
          label: "LEDGER",
        },
        ...PUBLIC_TABS.slice(3),
      ]
    : [...PUBLIC_TABS];

  const tabs = [
    ...baseTabs,
    ...(own || showAudit
      ? [
          {
            id: "audit" as const,
            label: "LOG",
          },
        ]
      : []),
    ...(own
      ? [
          {
            id: "edit" as const,
            label: "EDIT",
          },
        ]
      : []),
  ];

  function openTab(
    tab: CharacterSheetTab,
  ) {
    if (tab === activeTab) {
      return;
    }

    const params =
      new URLSearchParams(
        searchParams.toString(),
      );

    if (tab === "short") {
      params.delete("tab");
    } else {
      params.set("tab", tab);
    }

    const query = params.toString();

    startTransition(() => {
      router.replace(
        query
          ? `${pathname}?${query}`
          : pathname,
        {
          scroll: false,
        },
      );
    });
  }

  return (
    <div
      className="character-sheet-tabs mt-4"
      data-character-sheet-active-tab={
        activeTab
      }
      aria-busy={pending}
    >
      <nav
        aria-label="Character sheet sections"
        role="tablist"
        data-sep-interaction-ignore="true"
        className="
          flex min-w-0 flex-wrap items-end gap-1
          border-x border-t border-[rgb(var(--sep-colour-60482e))]/45
          bg-transparent
          px-2 pt-2
          rounded-t-xl
        "
      >
        {tabs.map((tab) => {
          const active =
            activeTab === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={active}
              disabled={pending}
              onClick={() =>
                openTab(tab.id)
              }
              className={`
                relative min-w-[92px] flex-1 basis-[92px]
                rounded-t-lg
                border border-b-0
                px-2 py-3
                font-serif text-[10px]
                tracking-[0.08em]
                transition-all duration-200
                disabled:cursor-wait disabled:opacity-70

                ${
                  active
                    ? `
                      z-10
                      -mb-px
                      border-[rgb(var(--sep-colour-8a693f))]/70
                      bg-[rgb(var(--sep-colour-17110d))]
                      text-[rgb(var(--sep-colour-ead3a5))]
                      shadow-[0_-4px_14px_rgba(var(--sep-rgb-0-0-0),0.22)]
                    `
                    : `
                      border-[rgb(var(--sep-colour-4e3b29))]/45
                      bg-[rgb(var(--sep-colour-120d0a))]
                      text-[rgb(var(--sep-colour-8d7b64))]
                      hover:border-[rgb(var(--sep-colour-745536))]/60
                      hover:bg-[rgb(var(--sep-colour-1b130e))]
                      hover:text-[rgb(var(--sep-colour-c9ad82))]
                    `
                }
              `}
            >
              {tab.label}

              {active ? (
                <span
                  aria-hidden="true"
                  className="
                    absolute inset-x-5 bottom-0
                    h-px
                    bg-[rgb(var(--sep-colour-c29456))]
                    shadow-[0_0_7px_rgba(var(--sep-rgb-194-148-86),0.45)]
                  "
                />
              ) : null}
            </button>
          );
        })}
      </nav>

      <div className="-mt-8px">
        {children}
      </div>

      <style>{`
        .character-sheet-tabs [data-character-sheet-panel] { display: none; }
        .character-sheet-tabs[data-character-sheet-active-tab="short"] [data-character-sheet-panel="short"],
        .character-sheet-tabs[data-character-sheet-active-tab="profile"] [data-character-sheet-panel="profile"],
        .character-sheet-tabs[data-character-sheet-active-tab="inventory"] [data-character-sheet-panel="inventory"],
        .character-sheet-tabs[data-character-sheet-active-tab="ledger"] [data-character-sheet-panel="ledger"],
        .character-sheet-tabs[data-character-sheet-active-tab="trophies"] [data-character-sheet-panel="trophies"],
        .character-sheet-tabs[data-character-sheet-active-tab="gifts"] [data-character-sheet-panel="gifts"],
        .character-sheet-tabs[data-character-sheet-active-tab="warping"] [data-character-sheet-panel="warping"],
        .character-sheet-tabs[data-character-sheet-active-tab="offgame"] [data-character-sheet-panel="offgame"],
        .character-sheet-tabs[data-character-sheet-active-tab="audit"] [data-character-sheet-panel="audit"],
        .character-sheet-tabs[data-character-sheet-active-tab="edit"] [data-character-sheet-panel="edit"] {
          display: block;
        }
      `}</style>
    </div>
  );
}
'''


def patch_tabs():
    write(TABS, TABS_CONTENT)


def patch_own():
    text = read(OWN)

    if "type CharacterSheetTab" not in text:
        text = replace_once(
            text,
            'import { CharacterSheetTabs } from "@/components/characters/character-sheet-tabs";',
            'import { CharacterSheetTabs, type CharacterSheetTab } from "@/components/characters/character-sheet-tabs";',
            "own tab type import",
        )

    text = text.replace(
        'className="mx-auto max-w-5xl"',
        'className="mx-auto w-full max-w-7xl"',
        1,
    )

    if "tab?: string;" not in text:
        text = replace_once(
            text,
            '''    submitted?: string;
    error?: string;''',
            '''    submitted?: string;
    error?: string;
    tab?: string;''',
            "own tab search param",
        )

    if "const activeTab = normaliseCharacterSheetTab" not in text:
        text = replace_once(
            text,
            '''  const params = await searchParams;
  const supabase = await createClient();''',
            '''  const params = await searchParams;
  const activeTab =
    normaliseCharacterSheetTab(
      params.tab,
      true,
      true,
    );
  const supabase = await createClient();''',
            "own active tab",
        )

    if "activeTab={activeTab}" not in text:
        text = replace_once(
            text,
            '''        own
        notice={notice}''',
            '''        own
        activeTab={activeTab}
        notice={notice}''',
            "own Profile active tab",
        )

    if 'activeTab = "short",' not in text:
        text = replace_once(
            text,
            '''  own = false,
  messageAction = null,''',
            '''  own = false,
  activeTab = "short",
  messageAction = null,''',
            "Profile active tab arg",
        )
        text = replace_once(
            text,
            '''  own?: boolean;
  messageAction?: ReactNode;''',
            '''  own?: boolean;
  activeTab?: CharacterSheetTab;
  messageAction?: ReactNode;''',
            "Profile active tab type",
        )

    text = text.replace(
        '<CharacterSheetTabs own={own}>',
        '<CharacterSheetTabs own={own} activeTab={activeTab}>',
        1,
    )

    replacements = [
        (
            '{character.id ? (\n              <CharacterInventoryDisplay characterId={character.id} own />',
            '{activeTab === "inventory" && character.id ? (\n              <CharacterInventoryDisplay characterId={character.id} own />',
        ),
        (
            '{own && character.id ? (\n              <CharacterLedger characterId={character.id} />',
            '{activeTab === "ledger" && own && character.id ? (\n              <CharacterLedger characterId={character.id} />',
        ),
        (
            '{character.id ? (\n              <CharacterTrophiesDisplay',
            '{activeTab === "trophies" && character.id ? (\n              <CharacterTrophiesDisplay',
        ),
        (
            '{character.id ? (\n              <CharacterGiftsDisplay characterId={character.id} />',
            '{activeTab === "gifts" && character.id ? (\n              <CharacterGiftsDisplay characterId={character.id} />',
        ),
        (
            '{character.id ? (\n              <CharacterShapesDisplay characterId={character.id} />',
            '{activeTab === "warping" && character.id ? (\n              <CharacterShapesDisplay characterId={character.id} />',
        ),
        (
            '{own && character.id ? (\n              <CharacterAuditTrail',
            '{activeTab === "audit" && own && character.id ? (\n              <CharacterAuditTrail',
        ),
        (
            '{canEdit ? (',
            '{activeTab === "edit" && canEdit ? (',
        ),
        (
            '{own &&\n            status === "approved" ? (',
            '{activeTab === "edit" &&\n            own &&\n            status === "approved" ? (',
        ),
        (
            '{own &&\n            status === "approved" &&\n            character.id ? (',
            '{activeTab === "edit" &&\n            own &&\n            status === "approved" &&\n            character.id ? (',
        ),
        (
            '{own && !canEdit && status !== "approved" ? (',
            '{activeTab === "edit" && own && !canEdit && status !== "approved" ? (',
        ),
    ]

    for old, new in replacements:
        if old in text:
            text = text.replace(old, new, 1)

    if "function normaliseCharacterSheetTab(" not in text:
        helper = '''function normaliseCharacterSheetTab(
  value: string | undefined,
  own: boolean,
  showAudit: boolean,
): CharacterSheetTab {
  const publicTabs: CharacterSheetTab[] = [
    "short",
    "profile",
    "inventory",
    "trophies",
    "gifts",
    "warping",
    "offgame",
  ];

  const allowed: CharacterSheetTab[] = [
    ...publicTabs,
    ...(own
      ? ["ledger", "edit"]
      : []),
    ...(own || showAudit
      ? ["audit"]
      : []),
  ] as CharacterSheetTab[];

  return value &&
    allowed.includes(
      value as CharacterSheetTab,
    )
    ? (value as CharacterSheetTab)
    : "short";
}

'''
        marker = "function formatSepulchriaSince("
        if marker not in text:
            fail("Could not place own tab normaliser.")
        text = text.replace(
            marker,
            helper + marker,
            1,
        )

    write(OWN, text)


def patch_public_page():
    text = read(PUBLIC_PAGE)

    if "type CharacterSheetTab" not in text:
        text = replace_once(
            text,
            'import { PublicCharacterProfileView } from "@/components/characters/public-character-profile";',
            'import { PublicCharacterProfileView } from "@/components/characters/public-character-profile";\nimport type { CharacterSheetTab } from "@/components/characters/character-sheet-tabs";',
            "public tab type import",
        )

    if "tab?: string;" not in text:
        text = replace_once(
            text,
            '''  searchParams: Promise<{
    from?: string;
  }>;''',
            '''  searchParams: Promise<{
    from?: string;
    tab?: string;
  }>;''',
            "public tab search param",
        )

    text = text.replace(
        'const [{ slug }, { from }] = await Promise.all([',
        'const [{ slug }, { from, tab }] = await Promise.all([',
        1,
    )

    if "const activeTab = normalisePublicCharacterSheetTab" not in text:
        page_pos = text.find(
            "export default async function PublicCharacterPage"
        )
        if page_pos == -1:
            fail("Could not find public page function.")

        before = text[:page_pos]
        after = text[page_pos:]

        anchor = '''  const character =
    await getPublicCharacter(slug);'''
        replacement = '''  const activeTab =
    normalisePublicCharacterSheetTab(
      tab,
    );

  const character =
    await getPublicCharacter(slug);'''

        if anchor not in after:
            fail("Could not place public active tab.")

        after = after.replace(
            anchor,
            replacement,
            1,
        )
        text = before + after

    if "activeTab={activeTab}" not in text:
        text = replace_once(
            text,
            '''      <PublicCharacterProfileView
        character={character}''',
            '''      <PublicCharacterProfileView
        character={character}
        activeTab={activeTab}''',
            "public view active tab prop",
        )

    if "function normalisePublicCharacterSheetTab(" not in text:
        helper = '''function normalisePublicCharacterSheetTab(
  value: string | undefined,
): CharacterSheetTab {
  const allowed: CharacterSheetTab[] = [
    "short",
    "profile",
    "inventory",
    "trophies",
    "gifts",
    "warping",
    "offgame",
    "audit",
  ];

  return value &&
    allowed.includes(
      value as CharacterSheetTab,
    )
    ? (value as CharacterSheetTab)
    : "short";
}

'''
        marker = "export default async function PublicCharacterPage"
        text = text.replace(
            marker,
            helper + marker,
            1,
        )

    write(PUBLIC_PAGE, text)


def patch_public_view():
    text = read(PUBLIC_VIEW)

    if "type CharacterSheetTab" not in text:
        text = replace_once(
            text,
            'import { CharacterSheetTabs } from "@/components/characters/character-sheet-tabs";',
            'import { CharacterSheetTabs, type CharacterSheetTab } from "@/components/characters/character-sheet-tabs";',
            "public view tab type import",
        )

    if "activeTab: CharacterSheetTab;" not in text:
        text = replace_once(
            text,
            '''  character: PublicCharacterProfile;
  returnHref: string | null;''',
            '''  character: PublicCharacterProfile;
  activeTab: CharacterSheetTab;
  returnHref: string | null;''',
            "public view active tab prop type",
        )

    if "  activeTab,\n  returnHref," not in text:
        text = replace_once(
            text,
            '''  character,
  returnHref,''',
            '''  character,
  activeTab,
  returnHref,''',
            "public view active tab argument",
        )

    text = text.replace(
        '''      <CharacterSheetTabs
        showAudit={viewerIsStaff}
      >''',
        '''      <CharacterSheetTabs
        showAudit={viewerIsStaff}
        activeTab={activeTab}
      >''',
        1,
    )

    replacements = [
        (
            '<CharacterInventoryDisplay characterId={character.id} />',
            '{activeTab === "inventory" ? (\n            <CharacterInventoryDisplay characterId={character.id} />\n          ) : null}',
        ),
        (
            '''<CharacterTrophiesDisplay
            characterId={character.id}
          />''',
            '''{activeTab === "trophies" ? (
            <CharacterTrophiesDisplay
              characterId={character.id}
            />
          ) : null}''',
        ),
        (
            '<CharacterGiftsDisplay characterId={character.id} />',
            '{activeTab === "gifts" ? (\n            <CharacterGiftsDisplay characterId={character.id} />\n          ) : null}',
        ),
        (
            '<CharacterShapesDisplay characterId={character.id} />',
            '{activeTab === "warping" ? (\n            <CharacterShapesDisplay characterId={character.id} />\n          ) : null}',
        ),
        (
            '{viewerIsStaff ? (\n            <CharacterAuditTrail',
            '{activeTab === "audit" && viewerIsStaff ? (\n            <CharacterAuditTrail',
        ),
    ]

    for old, new in replacements:
        if old in text:
            text = text.replace(old, new, 1)

    write(PUBLIC_VIEW, text)


def main():
    for path in (
        TABS,
        OWN,
        PUBLIC_PAGE,
        PUBLIC_VIEW,
    ):
        if not path.exists():
            fail(
                "Run from the sepulchria-portal repository root. "
                f"Missing: {path.relative_to(ROOT)}"
            )

    print("Applying character-sheet width + lazy-tab patch...")
    print("No GitHub or Vercel operations are performed.\n")

    patch_tabs()
    patch_own()
    patch_public_page()
    patch_public_view()

    print("\nSUCCESS.")
    print("Run: npm run build")


if __name__ == "__main__":
    main()
