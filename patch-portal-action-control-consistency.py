
from pathlib import Path
import re

ROOT = Path.cwd()
PORTAL = ROOT / "app/(portal)"
COMPONENTS = ROOT / "components"
LAYOUT = ROOT / "app/(portal)/layout.tsx"

if not PORTAL.exists() or not LAYOUT.exists():
    raise SystemExit("ERROR: run this from the Sepulchria repository root.")

# Files whose controls are navigation chrome, editor toolbar controls, map controls,
# or other deliberately specialised widgets. We leave these alone.
EXCLUDED_COMPONENT_FILES = {
    "components/portal/portal-sidebar.tsx",
    "components/portal/portal-header.tsx",
    "components/portal/forum-sidebar-menu.tsx",
    "components/portal/interactive-world-map.tsx",
    "components/portal/map-magnifying-lens.tsx",
    "components/editor/rich-text-editor.tsx",
    "components/world/location-image-lightbox.tsx",
}

ACTION_WORDS = (
    "back",
    "return",
    "open",
    "view",
    "new",
    "create",
    "edit",
    "manage",
    "archive",
    "unarchive",
    "delete",
    "remove",
    "assign",
    "update",
    "save",
    "submit",
    "send",
    "cancel",
    "close",
    "restore",
    "forward",
    "report",
    "block",
    "unblock",
    "invite",
    "kick",
    "approve",
    "reject",
    "resolve",
    "reopen",
    "purchase",
    "buy",
    "sell",
    "equip",
    "unequip",
    "use",
    "apply",
    "confirm",
    "add",
    "record",
    "reply",
    "appeal",
    "withdraw",
)

DANGER_WORDS = (
    "delete",
    "remove",
    "kick",
    "reject",
    "ban",
    "revoke",
    "destroy",
)

ARROW_RE = re.compile(r"[←→]")
CLASS_RE = re.compile(r'className="([^"]*)"')

# Simple Link/a/button elements. We intentionally do not modify controls that contain
# child JSX elements/components because those are usually bespoke widgets.
TAG_RE = re.compile(
    r"<(?P<tag>Link|a|button)\b(?P<attrs>[^>]*)>"
    r"(?P<body>.*?)"
    r"</(?P=tag)>",
    re.DOTALL,
)

def candidate_files():
    for path in PORTAL.rglob("*.tsx"):
        yield path

    if COMPONENTS.exists():
        for path in COMPONENTS.rglob("*.tsx"):
            rel = path.relative_to(ROOT).as_posix()
            if rel in EXCLUDED_COMPONENT_FILES:
                continue
            if rel.startswith("components/homepage/"):
                continue
            yield path

def plain_label(body: str):
    # Ignore nested JSX/HTML controls.
    if "<" in body or ">" in body:
        return None

    # Ignore expression-heavy bodies; allow whitespace only around literal text.
    if "{" in body or "}" in body:
        return None

    label = " ".join(body.split()).strip()
    return label or None

def first_word(label: str):
    clean = label.replace("←", "").replace("→", "").strip().lower()
    return clean.split()[0] if clean else ""

def internal_link(attrs: str):
    # Literal internal hrefs and JSX string/template hrefs are eligible.
    return (
        'href="/' in attrs
        or "href='/" in attrs
        or 'href={`/' in attrs
        or 'href={"/' in attrs
        or "href={profileHref}" in attrs
        or "href={sourceHref}" in attrs
        or "href={returnHref}" in attrs
    )

def has_action_semantics(tag: str, attrs: str, label: str):
    word = first_word(label)

    if tag in ("Link", "a"):
        if not internal_link(attrs):
            return False

        # All arrow navigation links should be real action buttons.
        if ARROW_RE.search(label):
            return True

        # Non-arrow internal links only if they clearly read like actions.
        return word in ACTION_WORDS

    if tag == "button":
        # Only normal text action buttons, not icon/toggle/navigation chrome.
        if 'aria-label="' in attrs and len(label) <= 2:
            return False

        if word in ACTION_WORDS:
            return True

        # Existing bordered text buttons are already being presented as actions:
        # normalize them even if the label is something like "Archive" or "Update".
        classes = CLASS_RE.search(attrs)
        class_value = classes.group(1) if classes else ""
        return (
            "border" in class_value.split()
            or any(token.startswith("border-") for token in class_value.split())
        )

    return False

def danger_semantics(label: str, attrs: str):
    lower = label.lower()
    word = first_word(label)

    if word in DANGER_WORDS:
        return True

    return (
        "destructive" in attrs.lower()
        or "danger" in attrs.lower()
        or "red-" in attrs.lower()
        or "c98f7f" in attrs.lower()
        or "c78f7e" in attrs.lower()
    )

def inject_classes(attrs: str, wanted: list[str]):
    match = CLASS_RE.search(attrs)

    if match:
        current = match.group(1).split()
        changed = False

        for item in wanted:
            if item not in current:
                current.append(item)
                changed = True

        if not changed:
            return attrs

        replacement = f'className="{" ".join(current)}"'
        return attrs[:match.start()] + replacement + attrs[match.end():]

    # Dynamic className cannot be safely rewritten automatically.
    if "className={" in attrs or "className={`" in attrs:
        return None

    return attrs.rstrip() + f' className="{" ".join(wanted)}"'

changed = []
skipped_dynamic = []

for path in candidate_files():
    original = path.read_text(encoding="utf-8")
    replacements = []

    for match in TAG_RE.finditer(original):
        tag = match.group("tag")
        attrs = match.group("attrs")
        label = plain_label(match.group("body"))

        if not label:
            continue

        if not has_action_semantics(tag, attrs, label):
            continue

        classes = ["portal-action-button"]

        if danger_semantics(label, attrs):
            classes.append("portal-action-button-danger")

        new_attrs = inject_classes(attrs, classes)

        if new_attrs is None:
            skipped_dynamic.append(
                (path.relative_to(ROOT).as_posix(), tag, label)
            )
            continue

        if new_attrs == attrs:
            continue

        replacement = (
            f"<{tag}{new_attrs}>"
            f"{match.group('body')}"
            f"</{tag}>"
        )

        replacements.append(
            (match.start(), match.end(), replacement)
        )

        changed.append(
            (path.relative_to(ROOT).as_posix(), tag, label, classes)
        )

    if replacements:
        text = original

        for start, end, replacement in reversed(replacements):
            text = text[:start] + replacement + text[end:]

        path.write_text(text, encoding="utf-8")

# Replace the earlier temporary arrow-button CSS, if the user ran that patch locally.
layout = LAYOUT.read_text(encoding="utf-8")

old_start = "              /* CONSISTENT ARROW ACTION LINKS */"
old_end_marker = """              /*
               * Keep selected text clearly visible inside all rich-text
"""

if old_start in layout:
    start = layout.index(old_start)
    end = layout.index(old_end_marker, start)
    layout = layout[:start] + layout[end:]

STYLE_MARKER = "              /* CONSISTENT PORTAL ACTION BUTTONS */"

if STYLE_MARKER not in layout:
    anchor = """              /*
               * Keep selected text clearly visible inside all rich-text
"""

    if anchor not in layout:
        raise SystemExit(
            "ERROR: expected style anchor not found in app/(portal)/layout.tsx."
        )

    css = """              /* CONSISTENT PORTAL ACTION BUTTONS */
              .portal-action-button {
                display: inline-flex !important;
                min-height: 2.75rem;
                align-items: center;
                justify-content: center;
                gap: 0.5rem;
                border-width: 1px !important;
                border-style: solid !important;
                border-color: rgba(var(--sep-rgb-110-85-53), 0.62) !important;
                border-radius: 0 !important;
                background: rgb(var(--sep-colour-100c09)) !important;
                padding: 0.72rem 1.2rem !important;
                color: rgb(var(--sep-colour-b8a27e)) !important;
                font-size: 0.625rem !important;
                font-weight: 400 !important;
                line-height: 1 !important;
                letter-spacing: 0.18em !important;
                text-decoration: none !important;
                text-transform: uppercase !important;
                white-space: nowrap;
                cursor: pointer;
                transition:
                  border-color 150ms ease,
                  background 150ms ease,
                  color 150ms ease,
                  opacity 150ms ease;
              }

              .portal-action-button:hover:not(:disabled) {
                border-color: rgb(var(--sep-colour-9a7445)) !important;
                background: rgb(var(--sep-colour-1d160f)) !important;
                color: rgb(var(--sep-colour-efd39f)) !important;
              }

              .portal-action-button:focus-visible {
                outline: 2px solid rgb(var(--sep-colour-a88652)) !important;
                outline-offset: 2px;
              }

              .portal-action-button:disabled,
              .portal-action-button[aria-disabled="true"] {
                cursor: not-allowed;
                opacity: 0.45;
              }

              .portal-action-button-danger {
                border-color: rgba(var(--sep-rgb-150-67-55), 0.72) !important;
                background: rgba(var(--sep-rgb-66-25-21), 0.42) !important;
                color: rgb(var(--sep-colour-c98f7f)) !important;
              }

              .portal-action-button-danger:hover:not(:disabled) {
                border-color: rgb(var(--sep-colour-c98f7f)) !important;
                background: rgba(var(--sep-rgb-91-31-25), 0.62) !important;
                color: rgb(var(--sep-colour-f0b1a3)) !important;
              }

"""

    layout = layout.replace(anchor, css + anchor, 1)

LAYOUT.write_text(layout, encoding="utf-8")

print("")
print("Portal action-control consistency pass complete.")
print(f"Modified {len(changed)} action controls across the portal.")

if changed:
    print("")
    print("Changed controls:")
    for filename, tag, label, classes in changed:
        variant = "danger" if "portal-action-button-danger" in classes else "standard"
        print(f"  - {filename} :: <{tag}> {label!r} [{variant}]")

if skipped_dynamic:
    print("")
    print("Skipped dynamic-class controls (not safe for automatic rewrite):")
    for filename, tag, label in skipped_dynamic:
        print(f"  - {filename} :: <{tag}> {label!r}")

print("")
print("Specialised controls intentionally excluded:")
for item in sorted(EXCLUDED_COMPONENT_FILES):
    print(f"  - {item}")

print("")
print("Next: npm run build")
