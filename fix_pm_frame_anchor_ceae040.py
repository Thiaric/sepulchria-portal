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

# ------------------------------------------------------------
# 1) Attach PM cosmetic to the actual private-message card
#    for BOTH on-game and off-game messages.
# ------------------------------------------------------------
message_file = ROOT / "app/(portal)/messages/[id]/components/ConversationMessageList.tsx"

if not message_file.exists():
    raise SystemExit(f"Missing required file: {message_file}")

text = message_file.read_text(encoding="utf-8")

old_surface = '                data-cosmetic-surface={ongame ? "pm" : undefined}
'
new_surface = '                data-cosmetic-surface="pm"
'

count = text.count(old_surface)
if count != 1:
    raise SystemExit(
        f"PM surface assignment: expected exactly 1 match, found {count}. "
        "Nothing changed."
    )

text = text.replace(old_surface, new_surface, 1)
message_file.write_text(text, encoding="utf-8")

print("✓ ConversationMessageList.tsx")
print("  - pm_frame now attaches to the whole PM card in both modes")

# ------------------------------------------------------------
# 2) Make PM frame a pure overlay anchored to the card edges.
#    Do NOT let the cosmetic rewrite message padding/layout.
# ------------------------------------------------------------
runtime_file = ROOT / "components/cosmetics/cosmetic-runtime.tsx"

if not runtime_file.exists():
    raise SystemExit(f"Missing required file: {runtime_file}")

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

new_pm = '''      [data-cosmetic-surface="pm"][data-has-pm-frame="true"] {
        /*
         * PM frame is an overlay only.
         * The message component owns its own padding and height.
         */
        padding: revert-layer;
      }

      [data-cosmetic-surface="pm"][data-has-pm-frame="true"]::after {
        /*
         * Anchor the 9-slice to the outer PM card edges, not to
         * the amount of text inside it. This remains stable for
         * one-line and very tall messages alike.
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

print("✓ cosmetic-runtime.tsx")
print("  - PM cosmetic no longer controls message padding")
print("  - frame is anchored 12px vertically / 18px horizontally inside card edges")
print("  - tall messages remain framed")
print("  - forum/instant/whisper/other cosmetics untouched")
