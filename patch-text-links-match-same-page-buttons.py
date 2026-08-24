
from pathlib import Path
import re
from dataclasses import dataclass

ROOT = Path.cwd()
PORTAL = ROOT / "app/(portal)"
COMPONENTS = ROOT / "components"

if not PORTAL.exists():
    raise SystemExit(
        "ERROR: run this script from the Sepulchria repository root."
    )

# We are ONLY changing text links. Existing <button> elements are NEVER rewritten.
# We also leave specialist navigation/tool components alone.
EXCLUDED = {
    "components/portal/portal-sidebar.tsx",
    "components/portal/portal-header.tsx",
    "components/portal/forum-sidebar-menu.tsx",
    "components/portal/interactive-world-map.tsx",
    "components/portal/map-magnifying-lens.tsx",
    "components/editor/rich-text-editor.tsx",
    "components/world/location-image-lightbox.tsx",
}

ACTION_STARTS = {
    "back", "return", "open", "view", "new", "create", "edit", "manage",
    "archive", "unarchive", "forward", "reply", "appeal", "withdraw",
    "go", "visit", "continue", "see", "read",
}

ARROW_RE = re.compile(r"[←→]")
STATIC_CLASS_RE = re.compile(r'className="([^"]*)"')

TEXT_LINK_RE = re.compile(
    r"<(?P<tag>Link|a)\b(?P<attrs>[^>]*)>"
    r"(?P<body>.*?)"
    r"</(?P=tag)>",
    re.DOTALL,
)

BUTTON_RE = re.compile(
    r"<button\b(?P<attrs>[^>]*)>"
    r"(?P<body>.*?)"
    r"</button>",
    re.DOTALL,
)

@dataclass
class StyleSource:
    pos: int
    class_name: str
    label: str
    source_kind: str
    score: int

def rel(path: Path) -> str:
    return path.relative_to(ROOT).as_posix()

def candidate_files():
    for path in PORTAL.rglob("*.tsx"):
        yield path

    if COMPONENTS.exists():
        for path in COMPONENTS.rglob("*.tsx"):
            r = rel(path)
            if r in EXCLUDED:
                continue
            if r.startswith("components/homepage/"):
                continue
            yield path

def plain_text(body: str):
    # Only genuinely written links: no nested HTML/JSX/components and
    # no expression-driven labels.
    if "<" in body or ">" in body or "{" in body or "}" in body:
        return None
    text = " ".join(body.split()).strip()
    return text or None

def internal_href(attrs: str):
    # Literal/internal Next.js destinations and the few local variables
    # already used for portal destinations.
    return (
        'href="/' in attrs
        or "href='/" in attrs
        or 'href={`/' in attrs
        or 'href={"/' in attrs
        or "href={profileHref}" in attrs
        or "href={sourceHref}" in attrs
        or "href={returnHref}" in attrs
        or "href={backHref}" in attrs
    )

def link_is_action(label: str):
    stripped = (
        label.replace("←", "")
        .replace("→", "")
        .strip()
        .lower()
    )
    first = stripped.split()[0] if stripped else ""

    return (
        bool(ARROW_RE.search(label))
        or first in ACTION_STARTS
        or stripped.startswith("ticket queue")
        or stripped.startswith("messages")
    )

def tokens(class_name: str):
    return class_name.split()

def buttonish(class_name: str):
    t = tokens(class_name)
    has_border = any(x == "border" or x.startswith("border-") for x in t)
    has_pad = any(
        x.startswith(("px-", "py-", "p-"))
        for x in t
    )
    return has_border and has_pad

def danger_style(class_name: str, label: str):
    lower = f"{class_name} {label}".lower()
    return any(
        marker in lower
        for marker in (
            "red-",
            "destructive",
            "danger",
            "delete",
            "remove",
            "reject",
            "kick",
            "ban",
            "c98f7f",
            "c78f7e",
            "9a5147",
        )
    )

def score_style(class_name: str, label: str):
    t = tokens(class_name)
    score = 0

    if any(x == "border" or x.startswith("border-") for x in t):
        score += 8
    if any(x.startswith("px-") for x in t):
        score += 4
    if any(x.startswith("py-") for x in t):
        score += 4
    if "uppercase" in t:
        score += 3
    if any(x.startswith("tracking-") for x in t):
        score += 2
    if any(x.startswith("text-[") or x.startswith("text-xs") for x in t):
        score += 1
    if "inline-flex" in t or "flex" in t:
        score += 1

    # Avoid borrowing styles intended for layout-wide or icon controls.
    if "w-full" in t:
        score -= 8
    if any(x in t for x in ("rounded-full", "aspect-square", "absolute", "fixed")):
        score -= 10
    if any(x.startswith("w-") for x in t) and "w-full" not in t:
        score -= 4
    if any(x.startswith("h-") for x in t):
        score -= 2

    if danger_style(class_name, label):
        score -= 20

    return score

def collect_style_sources(text: str):
    sources = []

    # Existing buttons are style references ONLY. We do not modify them.
    for m in BUTTON_RE.finditer(text):
        cm = STATIC_CLASS_RE.search(m.group("attrs"))
        label = plain_text(m.group("body"))
        if not cm or not label:
            continue

        cls = cm.group(1)
        if not buttonish(cls):
            continue

        sources.append(
            StyleSource(
                pos=m.start(),
                class_name=cls,
                label=label,
                source_kind="existing button",
                score=score_style(cls, label),
            )
        )

    # Existing Link/a controls that already look like buttons can also be
    # used as a style reference for nearby naked links.
    for m in TEXT_LINK_RE.finditer(text):
        cm = STATIC_CLASS_RE.search(m.group("attrs"))
        label = plain_text(m.group("body"))
        if not cm or not label:
            continue

        cls = cm.group(1)
        if not buttonish(cls):
            continue

        sources.append(
            StyleSource(
                pos=m.start(),
                class_name=cls,
                label=label,
                source_kind="existing styled link",
                score=score_style(cls, label),
            )
        )

    return sources

def choose_source(sources, link_pos):
    usable = [s for s in sources if s.score >= 8]

    if not usable:
        return None

    # Strongest style first, then nearest source location in the SAME file/page.
    usable.sort(
        key=lambda s: (
            -s.score,
            abs(s.pos - link_pos),
        )
    )
    return usable[0]

def preserved_layout_classes(original_class: str):
    # Preserve only positioning/layout classes from the naked link.
    # Colour, border, typography and shape come entirely from the
    # existing button on that same page.
    keep_prefixes = (
        "m-", "mt-", "mb-", "ml-", "mr-", "mx-", "my-",
        "self-", "justify-self-", "place-self-",
        "sm:m", "md:m", "lg:m", "xl:m",
    )
    keep_exact = {"block", "inline-block"}

    kept = []
    for token in tokens(original_class):
        if token in keep_exact or token.startswith(keep_prefixes):
            kept.append(token)

    return kept

def replace_static_class(attrs: str, new_class: str):
    cm = STATIC_CLASS_RE.search(attrs)

    if not cm:
        # Do not invent around dynamic className expressions.
        if "className={" in attrs or "className={`" in attrs:
            return None
        return attrs.rstrip() + f' className="{new_class}"'

    original = cm.group(1)
    extras = preserved_layout_classes(original)

    merged = new_class.split()
    for extra in extras:
        if extra not in merged:
            merged.append(extra)

    replacement = f'className="{" ".join(merged)}"'
    return attrs[:cm.start()] + replacement + attrs[cm.end():]

changed = []
skipped_no_style = []
skipped_dynamic = []

for path in candidate_files():
    original = path.read_text(encoding="utf-8")
    sources = collect_style_sources(original)
    replacements = []

    for m in TEXT_LINK_RE.finditer(original):
        attrs = m.group("attrs")
        label = plain_text(m.group("body"))

        if not label:
            continue

        if not internal_href(attrs):
            continue

        if not link_is_action(label):
            continue

        cm = STATIC_CLASS_RE.search(attrs)
        existing_class = cm.group(1) if cm else ""

        # It is already a button-looking link. Leave it exactly alone.
        if existing_class and buttonish(existing_class):
            continue

        source = choose_source(sources, m.start())
        if not source:
            skipped_no_style.append((rel(path), label))
            continue

        new_attrs = replace_static_class(attrs, source.class_name)

        if new_attrs is None:
            skipped_dynamic.append((rel(path), label))
            continue

        replacement = (
            f"<{m.group('tag')}{new_attrs}>"
            f"{m.group('body')}"
            f"</{m.group('tag')}>"
        )

        replacements.append(
            (m.start(), m.end(), replacement)
        )

        changed.append(
            (
                rel(path),
                label,
                source.source_kind,
                source.label,
            )
        )

    if replacements:
        text = original
        for start, end, replacement in reversed(replacements):
            text = text[:start] + replacement + text[end:]
        path.write_text(text, encoding="utf-8")

print("")
print("SAME-PAGE LINK → BUTTON STYLE PASS COMPLETE")
print("Existing <button> elements modified: 0")
print(f"Text links restyled: {len(changed)}")

if changed:
    print("")
    print("Restyled links:")
    for filename, label, kind, source_label in changed:
        print(
            f"  - {filename}: {label!r}"
            f"  <= style copied from {kind} {source_label!r}"
        )

if skipped_no_style:
    print("")
    print("Skipped because that exact source file contains no safe existing button style:")
    for filename, label in skipped_no_style:
        print(f"  - {filename}: {label!r}")

if skipped_dynamic:
    print("")
    print("Skipped because the link uses a dynamic className:")
    for filename, label in skipped_dynamic:
        print(f"  - {filename}: {label!r}")

print("")
print("IMPORTANT: this script does not add global CSS and does not alter any existing button.")
print("Next: npm run build")
