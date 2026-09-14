#!/usr/bin/env python3
from pathlib import Path
import sys

ROOT = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else Path.cwd()
PATH = ROOT / "components/portal/admin-context-panel.tsx"

if not PATH.exists():
    raise SystemExit(f"Missing file: {PATH}")

text = PATH.read_text(encoding="utf-8")

old = '''    } else if (
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

new = '''    } else if (
      mode === "items"
    ) {
      const itemCard =
        document.getElementById(
          `item-card-${entry.id}`,
        );

      const mainScroller =
        document.querySelector<HTMLElement>(
          'main[data-portal-column][data-portal-scroll]',
        );

      if (
        !itemCard ||
        !mainScroller
      ) {
        return;
      }

      const cardRect =
        itemCard.getBoundingClientRect();

      const scrollerRect =
        mainScroller.getBoundingClientRect();

      const targetTop =
        mainScroller.scrollTop +
        cardRect.top -
        scrollerRect.top -
        Math.max(
          0,
          (
            mainScroller.clientHeight -
            cardRect.height
          ) / 2,
        );

      mainScroller.scrollTo({
        top: targetTop,
        behavior: "smooth",
      });

      return;
'''

if new in text:
    print("SKIP  /admin/items context jump already fixed")
elif old not in text:
    raise SystemExit(
        "Could not find the current /admin/items jump block in "
        "components/portal/admin-context-panel.tsx"
    )
else:
    PATH.write_text(
        text.replace(old, new, 1),
        encoding="utf-8",
    )
    print("PATCH /admin/items context jump uses the actual central portal scroller")

print()
print("DONE")
print("Run: npm run build")
