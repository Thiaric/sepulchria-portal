from pathlib import Path
import subprocess

ROOT = Path.cwd()
EXPECTED = "816e492"
TARGET = ROOT / "app/(portal)/layout.tsx"

head = subprocess.check_output(
    ["git", "rev-parse", "--short", "HEAD"],
    text=True,
).strip()

if head != EXPECTED:
    raise SystemExit(
        f"Expected HEAD {EXPECTED}, found {head}. "
        "Refusing to patch a different baseline."
    )

if not TARGET.exists():
    raise SystemExit(f"Missing required file: {TARGET}")

text = TARGET.read_text(encoding="utf-8")

old_frame = '''              [data-portal-shell-inner][data-has-cosmetic-header-controls="true"]
                [data-cosmetic-header-controls] :is(button,a)::before {
                content: "";
                position: absolute;
                z-index: 8;
'''

new_frame = '''              [data-portal-shell-inner][data-has-cosmetic-header-controls="true"]
                [data-cosmetic-header-controls] :is(button,a)::before {
                content: "";
                position: absolute;
                /*
                 * Keep the permanent cosmetic frame ABOVE the shared
                 * interaction illumination (::after uses z-index: 20).
                 * Hover may illuminate the control, but must never alter
                 * the apparent brightness of the frame itself.
                 */
                z-index: 30;
'''

old_badge = '''                > [aria-label] {
                z-index: 20 !important;
              }
'''

new_badge = '''                > [aria-label] {
                z-index: 40 !important;
              }
'''

frame_count = text.count(old_frame)
badge_count = text.count(old_badge)

if frame_count != 1:
    raise SystemExit(
        f"Expected exactly 1 permanent header ::before block, found {frame_count}. "
        "Nothing changed."
    )

if badge_count != 1:
    raise SystemExit(
        f"Expected exactly 1 header badge z-index block, found {badge_count}. "
        "Nothing changed."
    )

new_text = text.replace(old_frame, new_frame, 1)
new_text = new_text.replace(old_badge, new_badge, 1)

TARGET.write_text(new_text, encoding="utf-8")

print("✓ Header frame stacking fixed")
print("  - permanent ::before frame raised from z-index 8 to 30")
print("  - shared hover illumination remains at z-index 20 underneath it")
print("  - notification badges raised to z-index 40")
print("  - frame brightness should now remain constant before/during/after hover")
print("  - no hover behaviour or cosmetic geometry changed")
