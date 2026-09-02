from pathlib import Path
import subprocess

ROOT = Path.cwd()
EXPECTED = "ceae040"

head = subprocess.check_output(
    ["git", "rev-parse", "--short", "HEAD"],
    text=True,
).strip()

if head != EXPECTED:
    raise SystemExit(
        f"Expected HEAD {EXPECTED}, found {head}. "
        "Refusing to patch a different baseline."
    )

message_file = ROOT / "app/(portal)/messages/[id]/components/ConversationMessageList.tsx"
runtime_file = ROOT / "components/cosmetics/cosmetic-runtime.tsx"

for path in (message_file, runtime_file):
    if not path.exists():
        raise SystemExit(f"Missing required file: {path}")

# ------------------------------------------------------------
# 1) Enable pm_frame on BOTH on-game and off-game PM cards.
# ------------------------------------------------------------
text = message_file.read_text(encoding="utf-8")

old_surface = '                data-cosmetic-surface={ongame ? "pm" : undefined}\n'
new_surface = '                data-cosmetic-surface="pm"\n'

count = text.count(old_surface)
if count != 1:
    raise SystemExit(
        f"PM surface assignment: expected exactly 1 match, found {count}. "
        "Nothing changed."
    )

text = text.replace(old_surface, new_surface, 1)
message_file.write_text(text, encoding="utf-8")

# ------------------------------------------------------------
# 2) Make the cosmetic a pure overlay on the OUTER message box.
#    Do not let it modify the article padding/content geometry.
# ------------------------------------------------------------
text = runtime_file.read_text(encoding="utf-8")

old_pm = '''      [data-cosmetic-surface="pm"][data-has-pm-frame="true"] {
        padding: 10px 12px !important;
      }

      [data-cosmetic-surface="pm"][data-has-pm-frame="true"]::after {
        inset: 2px;
        border: 12px solid transparent;
        border-image-source: var(--sep-cosmetic-pm-frame);
        border-image-slice: 14% 9%;
        border-image-width: 1;
        border-image-repeat: stretch;
      }
'''

new_pm = '''      [data-cosmetic-surface="pm"][data-has-pm-frame="true"]::after {
        /*
         * Pure overlay anchored to the PM card itself.
         * The message component keeps full control of its own padding,
         * height and content layout, so short and tall PMs behave alike.
         */
        inset: 12px 18px;
        border: 12px solid transparent;
        border-image-source: var(--sep-cosmetic-pm-frame);
        border-image-slice: 14% 9%;
        border-image-width: 1;
        border-image-repeat: stretch;
      }
'''

count = text.count(old_pm)
if count != 1:
    raise SystemExit(
        f"PM cosmetic block: expected exactly 1 match, found {count}. "
        "Nothing changed."
    )

text = text.replace(old_pm, new_pm, 1)
runtime_file.write_text(text, encoding="utf-8")

print("✓ PM frame fix applied against ceae040")
print("  - ON-GAME messages: framed")
print("  - OFF-GAME messages: framed")
print("  - frame anchored to outer message card")
print("  - no cosmetic padding override")
print("  - tall messages remain framed")
print("  - frame inset: 12px vertical / 18px horizontal")
print("  - no other cosmetic categories changed")
