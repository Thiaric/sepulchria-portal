from pathlib import Path
import subprocess

ROOT = Path.cwd()

head = subprocess.check_output(
    ["git", "rev-parse", "--short", "HEAD"],
    text=True,
).strip()

if not head.startswith("f1377b4"):
    raise SystemExit(
        f"Expected HEAD based on f1377b4, found {head}. "
        "Refusing to patch a different baseline."
    )

runtime = ROOT / "components/cosmetics/cosmetic-runtime.tsx"
if not runtime.exists():
    raise SystemExit(f"Missing required file: {runtime}")

text = runtime.read_text(encoding="utf-8")

old_forum = '''      [data-cosmetic-surface="forum"][data-has-forum-frame="true"] {
        padding: 12px !important;
      }

      [data-cosmetic-surface="forum"][data-has-forum-frame="true"]::after {
        inset: 2px;
        border: 14px solid transparent;
        border-image-source: var(--sep-cosmetic-forum-frame);
        border-image-slice: 12% 8%;
        border-image-width: 1;
        border-image-repeat: stretch;
      }
'''

new_forum = '''      [data-cosmetic-surface="forum"][data-has-forum-frame="true"] {
        /*
         * Overlay only: the cosmetic must not alter the forum-post layout.
         */
        padding: 0 !important;
      }

      [data-cosmetic-surface="forum"][data-has-forum-frame="true"]::after {
        /*
         * Move the 9-slice rail outside the post's real perimeter instead
         * of drawing it visibly inside the authored post.
         */
        inset: -10px;
        border: 14px solid transparent;
        border-image-source: var(--sep-cosmetic-forum-frame);
        border-image-slice: 12% 8%;
        border-image-width: 1;
        border-image-repeat: stretch;
      }
'''

count = text.count(old_forum)
if count != 1:
    raise SystemExit(
        f"Forum frame block: expected exactly 1 match, found {count}. "
        "Nothing changed."
    )

text = text.replace(old_forum, new_forum, 1)
runtime.write_text(text, encoding="utf-8")
print("✓ components/cosmetics/cosmetic-runtime.tsx")

layout = ROOT / "app/(portal)/layout.tsx"
if not layout.exists():
    raise SystemExit(f"Missing required file: {layout}")

text = layout.read_text(encoding="utf-8")

required_frame_marker = '[data-cosmetic-header-controls] :is(button,a)::before'
if required_frame_marker not in text:
    raise SystemExit(
        "Could not find the permanent header-control ::before frame block. "
        "Nothing changed in layout.tsx."
    )

badge_css = '''
              /*
               * HEADER CONTROL BADGES
               * Counters/notification badges must sit above the permanent
               * cosmetic frame (::before uses z-index: 8).
               */
              [data-portal-shell-inner][data-has-cosmetic-header-controls="true"]
                [data-cosmetic-header-controls]
                :is(button,a)
                > [aria-label] {
                z-index: 20 !important;
              }

'''

if badge_css.strip() in text:
    raise SystemExit(
        "Header badge stacking patch already appears to be applied."
    )

anchor = '''              @media (max-width: 1023px) {
                [data-portal-shell-inner][data-has-cosmetic-header-controls="true"]
                  [data-cosmetic-header-controls] :is(button,a)::before {
'''

count = text.count(anchor)
if count != 1:
    raise SystemExit(
        f"Header frame insertion anchor: expected exactly 1 match, found {count}. "
        "layout.tsx was not changed."
    )

text = text.replace(anchor, badge_css + anchor, 1)
layout.write_text(text, encoding="utf-8")
print("✓ app/(portal)/layout.tsx")
print("  - forum frame moved to the actual outer post perimeter")
print("  - header badges lifted above the frame")
print("  - button hover/focus/interaction behaviour untouched")
