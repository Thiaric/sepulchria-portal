from pathlib import Path

ROOT = Path.cwd()

HEADER_PATH = ROOT / "components/portal/header-character-identity.tsx"
TABS_PATH = ROOT / "components/characters/character-sheet-tabs.tsx"


def fail(message: str) -> None:
    raise SystemExit(
        f"ERROR: {message}\nNo changes were applied."
    )


def read(path: Path) -> str:
    if not path.exists():
        fail(f"Missing expected file: {path.relative_to(ROOT)}")
    return path.read_text(encoding="utf-8")


header = read(HEADER_PATH)
tabs = read(TABS_PATH)

import_anchor = '''import { HeaderOrderIcon } from "@/components/portal/header-order-icon";
'''

import_replacement = '''import { HeaderOrderIcon } from "@/components/portal/header-order-icon";
import { openPortalModal } from "@/components/portal/portal-modal-button";
'''

if header.count(import_anchor) == 1:
    header_after = header.replace(
        import_anchor,
        import_replacement,
        1,
    )
elif header.count(import_replacement) == 1:
    header_after = header
else:
    fail(
        "Could not find the HeaderOrderIcon import block."
    )

link_open = '''    <Link
      href="/character"
      title="Open character sheet"
      className="flex min-w-0 items-center gap-2 lg:gap-3"
    >
'''

button_open = '''    <button
      type="button"
      title="Open character sheet"
      aria-label={`Open ${character.display_name} character sheet`}
      onClick={() =>
        openPortalModal({
          label: character.display_name,
          title: "Your character sheet",
          icon:
            character.portrait_url ??
            "/icons/characters.png",
          href: "/character",
        })
      }
      className="flex min-w-0 items-center gap-2 text-left lg:gap-3"
    >
'''

if header_after.count(link_open) == 1:
    header_after = header_after.replace(
        link_open,
        button_open,
        1,
    )
elif header_after.count(button_open) != 1:
    fail(
        "Could not find the existing /character header link."
    )

link_close = '''      
    </Link>
  </div>
);
}'''

button_close = '''      
    </button>
  </div>
);
}'''

if header_after.count(link_close) == 1:
    header_after = header_after.replace(
        link_close,
        button_close,
        1,
    )
elif header_after.count(button_close) != 1:
    fail(
        "Could not find the closing tag for the character-sheet header control."
    )

nav_classes_old = '''  flex min-w-0 flex-nowrap items-end gap-1
  border-x border-t border-[rgb(var(--sep-colour-60482e))]/45
'''

nav_classes_new = '''  flex min-w-0 flex-wrap items-end gap-1
  border-x border-t border-[rgb(var(--sep-colour-60482e))]/45
'''

if tabs.count(nav_classes_old) == 1:
    tabs_after = tabs.replace(
        nav_classes_old,
        nav_classes_new,
        1,
    )
elif tabs.count(nav_classes_new) == 1:
    tabs_after = tabs
else:
    fail(
        "Could not find the character-sheet tab navigation classes."
    )

button_classes_old = '''          relative min-w-0 flex-1
          rounded-t-lg
'''

button_classes_new = '''          relative min-w-[92px] flex-1 basis-[92px]
          rounded-t-lg
'''

if tabs_after.count(button_classes_old) == 1:
    tabs_after = tabs_after.replace(
        button_classes_old,
        button_classes_new,
        1,
    )
elif tabs_after.count(button_classes_new) != 1:
    fail(
        "Could not find the character-sheet tab button sizing classes."
    )

HEADER_PATH.write_text(
    header_after,
    encoding="utf-8",
    newline="\n",
)

TABS_PATH.write_text(
    tabs_after,
    encoding="utf-8",
    newline="\n",
)

print("WROTE  components/portal/header-character-identity.tsx")
print("WROTE  components/characters/character-sheet-tabs.tsx")
print()
print("PATCH APPLIED SUCCESSFULLY")
print()
print("Changes:")
print("- Clicking your own character in the top-right header opens /character in a portal modal.")
print("- Create Character remains a normal page link when no character exists.")
print("- Character-sheet tabs prefer one row when there is enough room.")
print("- Tabs wrap naturally to additional rows when the sheet/modal/mobile width is too small.")
print("- The wrapping applies to both your own sheet and other characters' sheets.")
print()
print("Next: npm run build")
