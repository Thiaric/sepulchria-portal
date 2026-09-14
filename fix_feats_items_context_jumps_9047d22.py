#!/usr/bin/env python3
from pathlib import Path
import sys

ROOT = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else Path.cwd()

PORTAL = ROOT / "components/portal/portal-context-panel.tsx"
ADMIN = ROOT / "components/portal/admin-context-panel.tsx"

for path in (PORTAL, ADMIN):
    if not path.exists():
        raise SystemExit(f"Missing file: {path}")

def replace_once(text: str, old: str, new: str, label: str) -> str:
    if new in text and old not in text:
        print(f"SKIP  {label} (already patched)")
        return text
    if old not in text:
        raise SystemExit(f"Could not patch {label}: expected block not found.")
    print(f"PATCH {label}")
    return text.replace(old, new, 1)

portal = PORTAL.read_text(encoding="utf-8")

old_public_feat_jump = '''  function jumpToGift(
    giftId: string,
  ) {
    const element =
      document.getElementById(
        `gift-${giftId}`,
      );

    if (!element) {
      return;
    }

    element.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });

    window.history.replaceState(
      null,
      "",
      `#gift-${giftId}`,
    );
  }
'''

new_public_feat_jump = '''  function jumpToGift(
    giftId: string,
  ) {
    const element =
      document.getElementById(
        `gift-${giftId}`,
      );

    window.history.replaceState(
      null,
      "",
      `#gift-${giftId}`,
    );

    if (!element) {
      window.dispatchEvent(
        new CustomEvent(
          "sepulchria:gift-jump",
          {
            detail: {
              id: giftId,
            },
          },
        ),
      );
      return;
    }

    element.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }
'''

portal = replace_once(
    portal,
    old_public_feat_jump,
    new_public_feat_jump,
    "/feats context jump for progressively-unrendered Feats",
)

PORTAL.write_text(portal, encoding="utf-8")

admin = ADMIN.read_text(encoding="utf-8")

old_items_branch = '''    } else if (
      mode === "items"
    ) {
      target =
        document.getElementById(
          `item-card-${entry.id}`,
        );
'''

new_items_branch = '''    } else if (
      mode === "items"
    ) {
      const itemCard =
        document.getElementById(
          `item-card-${entry.id}`,
        );

      if (!itemCard) {
        return;
      }

      window.history.replaceState(
        window.history.state,
        "",
        `#item-card-${entry.id}`,
      );

      window.requestAnimationFrame(
        () => {
          itemCard.scrollIntoView({
            behavior: "smooth",
            block: "center",
          });
        },
      );

      return;
'''

admin = replace_once(
    admin,
    old_items_branch,
    new_items_branch,
    "/admin/items context jump to Item card",
)

ADMIN.write_text(admin, encoding="utf-8")

print()
print("DONE")
print("Changed only:")
print("  components/portal/portal-context-panel.tsx")
print("  components/portal/admin-context-panel.tsx")
print("No database changes.")
print("Run: npm run build")
