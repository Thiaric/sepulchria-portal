from pathlib import Path
import re
import sys

ROOT = Path.cwd()

print("Applying remaining zoom button rounding...")
print("No GitHub or Vercel operations are performed.")
print()

extensions = {".tsx", ".ts", ".jsx", ".js"}
skip_parts = {"node_modules", ".next", ".git", "dist", "build"}

# The Sepulchria zoom icon consistently uses this magnifier path.
MAGNIFIER_MARKERS = (
    'm14.7 14.7 4.1 4.1',
    'M10.5 8v5',
    'M8 10.5h5',
)

def is_candidate_file(path: Path) -> bool:
    if path.suffix not in extensions:
        return False
    if any(part in skip_parts for part in path.parts):
        return False
    return True

def add_round_to_class(class_value: str) -> tuple[str, bool]:
    if "rounded-full" in class_value:
        return class_value, False

    # Only round visible compact controls, never the full-image clickable overlay.
    has_fixed_box = bool(
        re.search(r'(?:^|\s)h-(?:7|8|9|10|11|12|14|16)(?:\s|$)', class_value)
        and re.search(r'(?:^|\s)w-(?:7|8|9|10|11|12|14|16)(?:\s|$)', class_value)
    )
    has_square_size = bool(re.search(r'(?:^|\s)size-(?:7|8|9|10|11|12|14|16)(?:\s|$)', class_value))

    if not (has_fixed_box or has_square_size):
        return class_value, False

    # Insert near sizing/flex tokens; Tailwind order is not semantically important,
    # but this keeps the class list readable.
    tokens = class_value.split()
    insert_at = 0
    for i, token in enumerate(tokens):
        if token in {"flex", "inline-flex", "grid"} or token.startswith(("h-", "w-", "size-")):
            insert_at = i + 1

    tokens.insert(insert_at, "rounded-full")
    return " ".join(tokens), True

def patch_zoom_region(text: str, start: int, end: int) -> tuple[str, int]:
    """
    Patch visible className="..." controls inside a small zoom-control region.
    We deliberately ignore full-overlay classes such as absolute inset-0.
    """
    region = text[start:end]
    count = 0

    pattern = re.compile(r'className="([^"]*)"')

    def repl(match):
        nonlocal count
        cls = match.group(1)

        # Skip the full-image click target.
        if "inset-0" in cls and not re.search(r'(?:^|\s)(?:h-|w-|size-)', cls):
            return match.group(0)

        new_cls, changed = add_round_to_class(cls)
        if changed:
            count += 1
            return f'className="{new_cls}"'
        return match.group(0)

    return text[:start] + pattern.sub(repl, region) + text[end:], count

updated_files = []
already_rounded_files = []
found_zoom_files = []

for path in ROOT.rglob("*"):
    if not path.is_file() or not is_candidate_file(path):
        continue

    try:
        original = path.read_text(encoding="utf-8")
    except UnicodeDecodeError:
        continue

    # Candidate if it explicitly uses zoom cursor OR contains the Sepulchria magnifier-plus SVG.
    if "cursor-zoom-in" not in original and not any(marker in original for marker in MAGNIFIER_MARKERS):
        continue

    found_zoom_files.append(path)
    text = original
    file_changes = 0

    # 1) For every cursor-zoom-in occurrence, inspect its surrounding JSX.
    #    This catches:
    #      - a compact button that itself has cursor-zoom-in
    #      - a full overlay button whose child <span> is the visible square icon
    cursor_positions = [m.start() for m in re.finditer(r'cursor-zoom-in', text)]

    # Work backwards so string offsets remain safe.
    for pos in reversed(cursor_positions):
        start = max(0, text.rfind("<", 0, pos) - 300)
        # Include enough following JSX to reach an inner icon <span>.
        end = min(len(text), pos + 1800)
        text, changes = patch_zoom_region(text, start, end)
        file_changes += changes

    # 2) Fallback for magnifier-plus controls that do not use cursor-zoom-in.
    #    Find the nearest preceding compact className within ~900 chars.
    if any(marker in text for marker in MAGNIFIER_MARKERS):
        marker_positions = []
        for marker in MAGNIFIER_MARKERS:
            marker_positions.extend(m.start() for m in re.finditer(re.escape(marker), text))

        for pos in sorted(set(marker_positions), reverse=True):
            search_start = max(0, pos - 1200)
            prefix = text[search_start:pos]
            matches = list(re.finditer(r'className="([^"]*)"', prefix))
            if not matches:
                continue

            # Try nearest class first, and only change a compact h/w or size box.
            changed_here = False
            for match in reversed(matches):
                cls = match.group(1)
                new_cls, changed = add_round_to_class(cls)
                if not changed:
                    continue

                abs_start = search_start + match.start(1)
                abs_end = search_start + match.end(1)
                text = text[:abs_start] + new_cls + text[abs_end:]
                file_changes += 1
                changed_here = True
                break

            if changed_here:
                # Subsequent markers in the same SVG will now see rounded-full and skip.
                pass

    # De-duplicate accidental repeated rounded-full if a local file was hit by overlapping windows.
    text = re.sub(r'\brounded-full(?:\s+rounded-full)+\b', 'rounded-full', text)

    if text != original:
        path.write_text(text, encoding="utf-8")
        updated_files.append(path)
        print(f"UPDATED: {path}")
    else:
        # Only call it already rounded if at least one compact rounded control exists.
        if re.search(
            r'className="[^"]*rounded-full[^"]*(?:h-(?:7|8|9|10|11|12|14|16)[^"]*w-(?:7|8|9|10|11|12|14|16)|size-(?:7|8|9|10|11|12|14|16))',
            original,
        ):
            already_rounded_files.append(path)
            print(f"SKIPPED: {path} — zoom control already rounded")

print()

if not found_zoom_files:
    print("ERROR: No image zoom controls were found in this checkout.")
    print("Make sure you run this script from the sepulchria-portal project root.")
    sys.exit(1)

# Explicit sanity checks for the two known detail-lightbox components when present.
known = [
    ROOT / "components" / "codex" / "codex-entry-image-lightbox.tsx",
    ROOT / "components" / "world" / "location-image-lightbox.tsx",
    ROOT / "components" / "world" / "image-preview-button.tsx",
]

problems = []
for path in known:
    if not path.exists():
        continue
    content = path.read_text(encoding="utf-8")
    if ("cursor-zoom-in" in content or any(m in content for m in MAGNIFIER_MARKERS)) and "rounded-full" not in content:
        problems.append(path)

if problems:
    print("ERROR: These known zoom components still contain no rounded-full class:")
    for path in problems:
        print(f"  - {path}")
    print()
    print("Nothing was pushed or deployed. Please show me this output.")
    sys.exit(1)

print(f"Done. {len(updated_files)} file(s) updated.")
print("All detected compact image-zoom controls are now circular.")
print()
print("Next run:")
print("  npm run build")
