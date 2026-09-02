from pathlib import Path
import re
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
        "Refusing to patch a different commit."
    )

message_file = ROOT / "app/(portal)/messages/[id]/components/ConversationMessageList.tsx"
runtime_file = ROOT / "components/cosmetics/cosmetic-runtime.tsx"

for path in (message_file, runtime_file):
    if not path.exists():
        raise SystemExit(f"Missing required file: {path}")

message_text = message_file.read_text(encoding="utf-8")
runtime_text = runtime_file.read_text(encoding="utf-8")

conditional_surface = 'data-cosmetic-surface={ongame ? "pm" : undefined}'
unconditional_surface = 'data-cosmetic-surface="pm"'

conditional_count = message_text.count(conditional_surface)
unconditional_count = message_text.count(unconditional_surface)

if conditional_count == 1:
    new_message_text = message_text.replace(
        conditional_surface,
        unconditional_surface,
        1,
    )
elif conditional_count == 0 and unconditional_count == 1:
    new_message_text = message_text
else:
    raise SystemExit(
        "Could not safely resolve PM surface assignment. "
        f"conditional={conditional_count}, unconditional={unconditional_count}. "
        "Nothing changed."
    )

padding_pattern = re.compile(
    r'      \[data-cosmetic-surface="pm"\]\[data-has-pm-frame="true"\] \{\n'
    r'        padding: [^;]+;\n'
    r'      \}\n\n'
)

runtime_without_padding, padding_count = padding_pattern.subn(
    "",
    runtime_text,
    count=1,
)

pm_after_pattern = re.compile(
    r'      \[data-cosmetic-surface="pm"\]\[data-has-pm-frame="true"\]::after \{\n'
    r'.*?'
    r'      \}',
    re.DOTALL,
)

matches = list(pm_after_pattern.finditer(runtime_without_padding))
if len(matches) != 1:
    raise SystemExit(
        f"Expected exactly 1 PM ::after block, found {len(matches)}. "
        "Nothing changed."
    )

new_pm_after = '''      [data-cosmetic-surface="pm"][data-has-pm-frame="true"]::after {
        /*
         * Pure overlay anchored to the OUTER PM card.
         * Message content controls its own height and padding.
         */
        inset: 12px 18px;
        border: 12px solid transparent;
        border-image-source: var(--sep-cosmetic-pm-frame);
        border-image-slice: 14% 9%;
        border-image-width: 1;
        border-image-repeat: stretch;
      }'''

new_runtime_text = pm_after_pattern.sub(
    new_pm_after,
    runtime_without_padding,
    count=1,
)

message_file.write_text(new_message_text, encoding="utf-8")
runtime_file.write_text(new_runtime_text, encoding="utf-8")

print("✓ PM frame repair applied")
print("  - ON-GAME enabled")
print("  - OFF-GAME enabled")
print("  - anchored to outer message card")
print("  - PM cosmetic padding override removed if present")
print("  - final inset: 12px vertical / 18px horizontal")
