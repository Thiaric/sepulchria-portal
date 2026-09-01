from pathlib import Path
import re
import subprocess
import sys

ROOT = Path.cwd()
EXPECTED_PREFIX = "74fc1f6"

def fail(message: str) -> None:
    print(f"\nERROR: {message}\n")
    sys.exit(1)

head = subprocess.check_output(
    ["git", "rev-parse", "HEAD"],
    cwd=ROOT,
    text=True,
).strip()

if not head.startswith(EXPECTED_PREFIX):
    fail(
        f"This patch targets commit {EXPECTED_PREFIX}, "
        f"but HEAD is {head}."
    )

layout_path = ROOT / "app/(portal)/admin/layout.tsx"
context_path = ROOT / "components/portal/admin-context-panel.tsx"

for path in (layout_path, context_path):
    if not path.exists():
        fail(f"Missing {path.relative_to(ROOT)}")

layout = layout_path.read_text(encoding="utf-8")
context = context_path.read_text(encoding="utf-8")

# ------------------------------------------------------------------
# 1. Sort the TOP /admin navigation structurally.
#    We keep every original can(...) block byte-for-byte; only order changes.
# ------------------------------------------------------------------

nav_start_marker = '          <nav\n            aria-label="Administration"'
nav_end_marker = "          </nav>"

nav_start = layout.find(nav_start_marker)
if nav_start == -1:
    fail("Could not locate the Administration <nav> start.")

nav_end = layout.find(nav_end_marker, nav_start)
if nav_end == -1:
    fail("Could not locate the Administration </nav> end.")

nav_end += len(nav_end_marker)
nav = layout[nav_start:nav_end]

block_pattern = re.compile(
    r'(?ms)^            \{can\("(?P<section>[^"]+)"\) \? \(\n'
    r'(?P<body>.*?)'
    r'^            \) : null\}'
)

matches = list(block_pattern.finditer(nav))

if len(matches) < 30:
    fail(
        "Admin navigation parsing looked unsafe: "
        f"only found {len(matches)} can(...) blocks."
    )

def displayed_label(block: str) -> str:
    # Simple direct-label links.
    direct = re.search(
        r'<AdminNavigationLink[^>]*>\s*'
        r'([A-Za-z][^<\n]*?)\s*'
        r'</AdminNavigationLink>',
        block,
        re.S,
    )
    if direct:
        return " ".join(direct.group(1).split())

    # Badge-bearing links contain a visible <span>Label</span>.
    nested = re.search(
        r'<span>([^<]+)</span>',
        block,
    )
    if nested:
        return " ".join(nested.group(1).split())

    fail(
        "Could not determine displayed label for block:\n"
        + block[:300]
    )
    raise AssertionError

blocks = []
for match in matches:
    block = match.group(0)
    label = displayed_label(block)
    blocks.append((label, block))

labels = [label for label, _ in blocks]

if labels.count("Overview") != 1:
    fail(
        f"Expected exactly one Overview button; found {labels.count('Overview')}."
    )

# Ensure we are not silently losing/duplicating anything.
if len(set(labels)) != len(labels):
    duplicates = sorted(
        {label for label in labels if labels.count(label) > 1}
    )
    fail(
        "Duplicate displayed labels make alphabetical sorting ambiguous: "
        + ", ".join(duplicates)
    )

overview = next(
    block for label, block in blocks
    if label == "Overview"
)
rest = sorted(
    (
        (label, block)
        for label, block in blocks
        if label != "Overview"
    ),
    key=lambda item: item[0].casefold(),
)

sorted_blocks = [overview] + [block for _, block in rest]

# Replace only the stretch from the first can-block through the last.
first_start = matches[0].start()
last_end = matches[-1].end()

prefix = nav[:first_start]
suffix = nav[last_end:]

new_nav = (
    prefix
    + "\n\n".join(sorted_blocks)
    + suffix
)

# Verify exact block preservation.
for _, original_block in blocks:
    if new_nav.count(original_block) != 1:
        fail(
            "A navigation block was not preserved exactly during sorting."
        )

layout = layout[:nav_start] + new_nav + layout[nav_end:]

# ------------------------------------------------------------------
# 2. Add Music to the /admin OVERVIEW right-side context navigator.
#    The existing component filters entries through canAccessAdminSection.
# ------------------------------------------------------------------

array_marker = (
    "const ADMIN_NAVIGATION_ENTRIES: AdminNavigationEntry[] = ["
)
array_start = context.find(array_marker)

if array_start == -1:
    fail("Could not locate ADMIN_NAVIGATION_ENTRIES.")

array_end = context.find("\n];", array_start)
if array_end == -1:
    fail("Could not locate end of ADMIN_NAVIGATION_ENTRIES.")

array_end += len("\n];")
array_text = context[array_start:array_end]

music_entry = (
    '  { section: "music", label: "Music", href: "/admin/music" },'
)

if music_entry not in array_text:
    media_entry = (
        '  { section: "media", label: "Media", href: "/admin/media" },'
    )

    if array_text.count(media_entry) != 1:
        fail(
            "Expected exactly one Media entry in "
            "ADMIN_NAVIGATION_ENTRIES."
        )

    array_text = array_text.replace(
        media_entry,
        media_entry + "\n" + music_entry,
        1,
    )

    context = (
        context[:array_start]
        + array_text
        + context[array_end:]
    )

# Final safeguards.
if layout.count('can("music")') < 1:
    fail("Music access condition unexpectedly disappeared from admin layout.")

if context.count(music_entry) != 1:
    fail(
        "Music was not added exactly once to "
        "ADMIN_NAVIGATION_ENTRIES."
    )

layout_path.write_text(layout, encoding="utf-8")
context_path.write_text(context, encoding="utf-8")

print("Applied successfully.")
print("Top admin order:")
print("  Overview")
for label, _ in rest:
    print(f"  {label}")
print("\nAdded Music to the /admin right-side navigator.")
print("All original can(...) blocks and badge contents were preserved.")
