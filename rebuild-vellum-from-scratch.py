
from pathlib import Path
import re
from collections import Counter, defaultdict

ROOT = Path.cwd()
GLOBALS = ROOT / "app/globals.css"
THEMES = ROOT / "app/portal-themes.css"
ROOT_LAYOUT = ROOT / "app/layout.tsx"
PORTAL_LAYOUT = ROOT / "app/(portal)/layout.tsx"
BRIDGE = ROOT / "components/portal/embedded-portal-skin-bridge.tsx"

for path in (GLOBALS, ROOT_LAYOUT, PORTAL_LAYOUT, BRIDGE):
    if not path.exists():
        raise SystemExit(f"Missing expected file: {path.relative_to(ROOT)}")

# ---------------------------------------------------------------------------
# 1. Remove every previous Vellum rule from globals.css.
# ---------------------------------------------------------------------------

globals_css = GLOBALS.read_text(encoding="utf-8")

def strip_vellum_rules(css):
    out = []
    i = 0
    n = len(css)

    while i < n:
        if css.startswith("/*", i):
            end = css.find("*/", i + 2)
            if end == -1:
                out.append(css[i:])
                break
            comment = css[i:end + 2]
            if "VELLUM" not in comment.upper():
                out.append(comment)
            i = end + 2
            continue

        if css[i].isspace():
            out.append(css[i])
            i += 1
            continue

        brace = css.find("{", i)
        semi = css.find(";", i)

        if brace == -1:
            out.append(css[i:])
            break

        if semi != -1 and semi < brace:
            out.append(css[i:semi + 1])
            i = semi + 1
            continue

        prelude = css[i:brace]
        depth = 1
        j = brace + 1
        quote = None

        while j < n and depth:
            ch = css[j]

            if quote:
                if ch == "\\":
                    j += 2
                    continue
                if ch == quote:
                    quote = None
                j += 1
                continue

            if ch in ("'", '"'):
                quote = ch
                j += 1
                continue

            if css.startswith("/*", j):
                comment_end = css.find("*/", j + 2)
                if comment_end == -1:
                    j = n
                    break
                j = comment_end + 2
                continue

            if ch == "{":
                depth += 1
            elif ch == "}":
                depth -= 1
            j += 1

        block = css[i:j]

        if 'data-portal-skin="vellum"' not in prelude:
            out.append(block)

        i = j

    return "".join(out)

clean_globals = strip_vellum_rules(globals_css)
GLOBALS.write_text(clean_globals.rstrip() + "\n", encoding="utf-8")
print("Removed previous Vellum CSS from app/globals.css")

# ---------------------------------------------------------------------------
# 2. Audit the CURRENT repository for colour-token usage.
# ---------------------------------------------------------------------------

SKIP_DIRS = {".git", ".next", "node_modules", ".vercel", "dist", "build"}
SOURCE_SUFFIXES = {".tsx", ".ts", ".jsx", ".js", ".css"}

def skip_path(path):
    parts = path.relative_to(ROOT).parts
    if any(part in SKIP_DIRS for part in parts):
        return True
    return any(part.startswith(".patch_") or part.endswith("_backup") for part in parts)

utility_re = re.compile(
    r"(?P<token>"
    r"(?P<variants>(?:(?:[A-Za-z0-9_\-\[\]=]+):)*)"
    r"(?P<kind>bg|text|border|ring|outline|fill|stroke)-"
    r"\[rgb\(var\(--sep-colour-(?P<hex>[0-9a-fA-F]{6})\)\)\]"
    r"(?P<opacity>/[0-9]{1,3})?"
    r")"
)
all_var_re = re.compile(r"var\(--sep-colour-([0-9a-fA-F]{6})\)")
all_rgb_re = re.compile(r"var\(--sep-rgb-(\d{1,3})-(\d{1,3})-(\d{1,3})\)")

usage = defaultdict(Counter)
utilities = set()
all_hex_tokens = set()
all_rgb_tokens = set()

for path in ROOT.rglob("*"):
    if not path.is_file() or path.suffix not in SOURCE_SUFFIXES or skip_path(path) or path == THEMES:
        continue

    try:
        text = path.read_text(encoding="utf-8")
    except UnicodeDecodeError:
        continue

    for match in utility_re.finditer(text):
        token = match.group("token")
        variants = match.group("variants") or ""
        kind = match.group("kind")
        hex_value = match.group("hex").lower()

        utilities.add((token, variants, kind, hex_value))
        usage[hex_value][kind] += 1
        all_hex_tokens.add(hex_value)

    for match in all_var_re.finditer(text):
        all_hex_tokens.add(match.group(1).lower())

    for match in all_rgb_re.finditer(text):
        all_rgb_tokens.add(
            (int(match.group(1)), int(match.group(2)), int(match.group(3)))
        )

for match in re.finditer(r"--sep-colour-([0-9a-fA-F]{6}):", clean_globals):
    all_hex_tokens.add(match.group(1).lower())

for match in re.finditer(
    r"--sep-rgb-(\d{1,3})-(\d{1,3})-(\d{1,3}):",
    clean_globals,
):
    all_rgb_tokens.add(
        (int(match.group(1)), int(match.group(2)), int(match.group(3)))
    )

if not all_hex_tokens:
    raise SystemExit("No portal colour tokens were discovered.")

# ---------------------------------------------------------------------------
# 3. Define one coherent Vellum palette.
# ---------------------------------------------------------------------------

P = {
    "canvas": (218, 208, 189),
    "shell": (214, 203, 182),
    "surface": (232, 223, 205),
    "surface_alt": (225, 214, 194),
    "surface_soft": (239, 232, 217),
    "surface_hover": (211, 196, 170),
    "surface_active": (198, 178, 145),
    "border": (169, 148, 113),
    "border_strong": (132, 107, 75),
    "text": (48, 41, 34),
    "text_muted": (105, 91, 73),
    "text_faint": (133, 116, 94),
    "accent": (103, 78, 48),
    "accent_dark": (67, 51, 35),
}

def rgb_from_hex(value):
    return tuple(int(value[i:i+2], 16) for i in (0, 2, 4))

def luminance(rgb):
    r, g, b = rgb
    return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255

def saturation(rgb):
    mx = max(rgb)
    mn = min(rgb)
    if mx == 0:
        return 0
    return (mx - mn) / mx

def semantic_colour(rgb):
    r, g, b = rgb
    sat = saturation(rgb)

    if sat < 0.55:
        return False

    if g >= 115 and g > r * 1.18 and g > b * 1.05:
        return True

    if r >= 145 and r > g * 1.32 and r > b * 1.25:
        return True

    if r >= 175 and 90 <= g <= 180 and b <= 80 and r > g * 1.12:
        return True

    return False

def role_colour(kind, rgb, variants):
    if semantic_colour(rgb):
        return rgb

    y = luminance(rgb)
    is_hover = "hover:" in variants
    is_active = (
        "active:" in variants
        or "aria-selected:" in variants
        or "data-[state=active]:" in variants
        or "data-[state=open]:" in variants
    )

    if kind == "bg":
        if is_active:
            return P["surface_active"]
        if is_hover:
            return P["surface_hover"]
        if y < 0.10:
            return P["surface"]
        if y < 0.24:
            return P["surface_alt"]
        if y < 0.50:
            return P["surface_soft"]
        return P["surface"]

    if kind == "text":
        if y > 0.66:
            return P["text"]
        if y > 0.34:
            return P["text_muted"]
        return P["text_faint"]

    if kind in {"border", "ring", "outline"}:
        return P["border"] if y < 0.30 else P["border_strong"]

    if kind in {"fill", "stroke"}:
        return P["accent_dark"] if y > 0.50 else P["accent"]

    return P["text"]

def dominant_token_colour(hex_value):
    rgb = rgb_from_hex(hex_value)

    if semantic_colour(rgb):
        return rgb

    counts = usage.get(hex_value, Counter())

    if counts:
        dominant_kind = counts.most_common(1)[0][0]
        return role_colour(dominant_kind, rgb, "")

    y = luminance(rgb)
    if y < 0.30:
        return P["surface_alt"]
    if y > 0.58:
        return P["text"]
    return P["border"]

# ---------------------------------------------------------------------------
# 4. Build a brand-new dedicated theme stylesheet.
# ---------------------------------------------------------------------------

lines = [
    "/*",
    " * Sepulchria Portal theme layer.",
    " * Imported after globals.css.",
    " * Vellum is rebuilt here from scratch.",
    " */",
    "",
    'html[data-portal-skin="vellum"],',
    'body[data-portal-skin="vellum"],',
    '[data-portal-skin="vellum"] {',
]

for hex_value in sorted(all_hex_tokens):
    colour = dominant_token_colour(hex_value)
    lines.append(
        f"  --sep-colour-{hex_value}: {colour[0]} {colour[1]} {colour[2]};"
    )

for rgb in sorted(all_rgb_tokens):
    mapped = rgb if semantic_colour(rgb) else (73, 61, 47)
    lines.append(
        f"  --sep-rgb-{rgb[0]}-{rgb[1]}-{rgb[2]}: "
        f"{mapped[0]} {mapped[1]} {mapped[2]};"
    )

lines += [
    "",
    '  --portal-font-body: "Trebuchet MS", ui-sans-serif, system-ui, sans-serif;',
    '  --portal-font-display: Georgia, "Times New Roman", serif;',
    "  --portal-skin-radius: 0px;",
    "  --portal-navigation-icon-filter: grayscale(1) sepia(0.28) saturate(0.75) brightness(0.43) contrast(1.16);",
    "  --portal-map-hotspot-fill: rgba(103, 78, 48, 0.08);",
    "  --portal-map-hotspot-fill-active: rgba(103, 78, 48, 0.20);",
    "  --portal-map-hotspot-stroke: rgba(103, 78, 48, 0.90);",
    "  --portal-map-hotspot-stroke-active: rgba(54, 43, 31, 1);",
    "}",
    "",
    'html[data-portal-skin="vellum"] body,',
    'body[data-portal-skin="vellum"] {',
    "  background: rgb(218 208 189) !important;",
    "  color: rgb(48 41 34) !important;",
    "}",
    "",
    '[data-portal-skin="vellum"] [data-portal-shell] {',
    "  background: rgb(218 208 189) !important;",
    "  color: rgb(48 41 34) !important;",
    "}",
    "",
    '[data-portal-skin="vellum"] [data-portal-shell-inner] {',
    "  background: linear-gradient(to bottom, rgb(226 216 197), rgb(218 208 189)) !important;",
    "}",
    "",
    '[data-portal-skin="vellum"] [data-portal-header],',
    '[data-portal-skin="vellum"] [data-portal-navigation],',
    '[data-portal-skin="vellum"] [data-portal-right-sidebar] {',
    "  background-color: rgb(214 203 182) !important;",
    "}",
    "",
    '[data-portal-skin="vellum"] [data-portal-centre-host],',
    '[data-portal-skin="vellum"] main[data-portal-column] {',
    "  background-color: rgb(232 223 205) !important;",
    "}",
    "",
    '[data-portal-skin="vellum"] :where(input, select, textarea) {',
    "  background-color: rgb(239 232 217) !important;",
    "  color: rgb(48 41 34) !important;",
    "  border-color: rgb(169 148 113) !important;",
    "}",
    "",
    '[data-portal-skin="vellum"] ::placeholder {',
    "  color: rgb(105 91 73) !important;",
    "}",
    "",
    '[data-portal-skin="vellum"] .portal-left-collapse-toggle,',
    '[data-portal-skin="vellum"] .portal-right-collapse-toggle {',
    "  background: rgb(225 214 194) !important;",
    "  border-color: rgb(169 148 113) !important;",
    "  color: rgb(67 51 35) !important;",
    "  box-shadow: 0 0 10px rgba(73, 61, 47, 0.14) !important;",
    "}",
    "",
    '[data-portal-skin="vellum"] .portal-left-collapse-toggle:hover,',
    '[data-portal-skin="vellum"] .portal-right-collapse-toggle:hover {',
    "  background: rgb(211 196 170) !important;",
    "  border-color: rgb(132 107 75) !important;",
    "  color: rgb(48 41 34) !important;",
    "}",
    "",
    "/* Role-aware utility overrides discovered from current source. */",
]

def pseudo_for_variants(variants):
    pseudos = []
    if "hover:" in variants:
        pseudos.append(":hover")
    if "focus:" in variants:
        pseudos.append(":focus")
    if "active:" in variants:
        pseudos.append(":active")
    if "disabled:" in variants:
        pseudos.append(":disabled")
    return "".join(pseudos)

property_for_kind = {
    "bg": "background-color",
    "text": "color",
    "border": "border-color",
    "ring": "--tw-ring-color",
    "outline": "outline-color",
    "fill": "fill",
    "stroke": "stroke",
}

for token, variants, kind, hex_value in sorted(utilities):
    colour = role_colour(kind, rgb_from_hex(hex_value), variants)
    prop = property_for_kind[kind]
    pseudo = pseudo_for_variants(variants)

    lines += [
        f'[data-portal-skin="vellum"] [class~="{token}"]{pseudo} {{',
        f"  {prop}: rgb({colour[0]} {colour[1]} {colour[2]}) !important;",
        "}",
    ]

lines += [
    "",
    "/* Selected/dark legacy surfaces may use ordinary black utilities. */",
    '[data-portal-skin="vellum"] [class~="bg-black"],',
    '[data-portal-skin="vellum"] [class~="bg-black/95"],',
    '[data-portal-skin="vellum"] [class~="bg-black/90"] {',
    "  background-color: rgb(225 214 194) !important;",
    "}",
    "",
    "/* Modal backdrops remain dark overlays. */",
    '[data-portal-skin="vellum"] .fixed.inset-0[class*="bg-black/"] {',
    "  background-color: rgba(32, 28, 24, 0.72) !important;",
    "}",
    "",
    '[data-portal-skin="vellum"] :where(button, input, select, textarea, article, section, aside, nav, dialog, [role="dialog"]) {',
    "  border-radius: 0 !important;",
    "}",
    "",
    "/* Magnifying lens is circular in every skin. */",
    "[data-map-magnifying-lens-button],",
    "[data-map-magnifying-lens-glass],",
    "[data-map-magnifying-lens-ring] {",
    "  border-radius: 9999px !important;",
    "}",
]

THEMES.write_text("\n".join(lines).rstrip() + "\n", encoding="utf-8")
print(f"Created app/portal-themes.css from {len(utilities)} live colour utilities")

# ---------------------------------------------------------------------------
# 5. Load the dedicated theme file AFTER globals.css.
# ---------------------------------------------------------------------------

root_layout = ROOT_LAYOUT.read_text(encoding="utf-8")
theme_import = 'import "./portal-themes.css";'
globals_import = 'import "./globals.css";'

if theme_import not in root_layout:
    if globals_import not in root_layout:
        raise SystemExit("Could not find globals.css import in app/layout.tsx")
    root_layout = root_layout.replace(
        globals_import,
        globals_import + "\n" + theme_import,
        1,
    )

ROOT_LAYOUT.write_text(root_layout, encoding="utf-8")
print("Imported portal-themes.css after globals.css")

# ---------------------------------------------------------------------------
# 6. Add explicit shell hooks so literal dark gradients cannot escape theme.
# ---------------------------------------------------------------------------

portal_layout = PORTAL_LAYOUT.read_text(encoding="utf-8")

main_shell_old = '''        <div className="h-dvh overflow-hidden bg-[rgb(var(--sep-colour-120f0d))] text-[rgb(var(--sep-colour-e8dcc4))]">
'''
main_shell_new = '''        <div
          data-portal-shell
          className="h-dvh overflow-hidden bg-[rgb(var(--sep-colour-120f0d))] text-[rgb(var(--sep-colour-e8dcc4))]"
        >
'''

if "data-portal-shell" not in portal_layout:
    if main_shell_old not in portal_layout:
        raise SystemExit("Could not locate main portal shell")
    portal_layout = portal_layout.replace(main_shell_old, main_shell_new, 1)

main_inner_old = '''          <div className="flex h-full min-h-0 flex-col bg-[radial-gradient(circle_at_top,_rgba(var(--sep-rgb-116-82-42),0.16),_transparent_38%),linear-gradient(to_bottom,_#17120f,_#0d0b0a)]">
'''
main_inner_new = '''          <div
            data-portal-shell-inner
            className="flex h-full min-h-0 flex-col bg-[radial-gradient(circle_at_top,_rgba(var(--sep-rgb-116-82-42),0.16),_transparent_38%),linear-gradient(to_bottom,_#17120f,_#0d0b0a)]"
          >
'''

if "data-portal-shell-inner" not in portal_layout:
    if main_inner_old not in portal_layout:
        raise SystemExit("Could not locate main inner portal shell")
    portal_layout = portal_layout.replace(main_inner_old, main_inner_new, 1)

# Loading shell, if still unhooked.
loading_shell_old = '''    <div className="h-dvh overflow-hidden bg-[rgb(var(--sep-colour-120f0d))] text-[rgb(var(--sep-colour-e8dcc4))]">
'''
loading_shell_new = '''    <div
      data-portal-shell
      className="h-dvh overflow-hidden bg-[rgb(var(--sep-colour-120f0d))] text-[rgb(var(--sep-colour-e8dcc4))]"
    >
'''
portal_layout = portal_layout.replace(loading_shell_old, loading_shell_new, 1)

loading_inner_old = '''      <div className="flex h-full min-h-0 flex-col bg-[radial-gradient(circle_at_top,_rgba(var(--sep-rgb-116-82-42),0.16),_transparent_38%),linear-gradient(to_bottom,_#17120f,_#0d0b0a)]">
'''
loading_inner_new = '''      <div
        data-portal-shell-inner
        className="flex h-full min-h-0 flex-col bg-[radial-gradient(circle_at_top,_rgba(var(--sep-rgb-116-82-42),0.16),_transparent_38%),linear-gradient(to_bottom,_#17120f,_#0d0b0a)]"
      >
'''
portal_layout = portal_layout.replace(loading_inner_old, loading_inner_new, 1)

PORTAL_LAYOUT.write_text(portal_layout, encoding="utf-8")
print("Added explicit portal shell theme hooks")

# ---------------------------------------------------------------------------
# 7. Rebuild the embedded Codex/Rules bridge so every valid skin works.
# ---------------------------------------------------------------------------

bridge = '''"use client";

import { useEffect } from "react";

const STORAGE_KEY =
  "sepulchria:portal-skin";

function validSkinSlug(
  value: string | null,
): value is string {
  return (
    typeof value === "string" &&
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(
      value,
    )
  );
}

function applySkin(
  skin: string,
) {
  document.documentElement.dataset.portalSkin =
    skin;

  document.body.dataset.portalSkin =
    skin;

  document.documentElement.classList.add(
    "portal-skin-scope",
  );

  document.body.classList.add(
    "portal-skin-scope",
  );
}

export function EmbeddedPortalSkinBridge() {
  useEffect(() => {
    const stored =
      window.localStorage.getItem(
        STORAGE_KEY,
      );

    applySkin(
      validSkinSlug(stored)
        ? stored
        : "sepulchria",
    );

    function onStorage(
      event: StorageEvent,
    ) {
      if (
        event.key !== STORAGE_KEY ||
        !validSkinSlug(
          event.newValue,
        )
      ) {
        return;
      }

      applySkin(
        event.newValue,
      );
    }

    window.addEventListener(
      "storage",
      onStorage,
    );

    return () => {
      window.removeEventListener(
        "storage",
        onStorage,
      );
    };
  }, []);

  return null;
}
'''

BRIDGE.write_text(bridge, encoding="utf-8")
print("Rebuilt Codex/Rules embedded skin bridge")

# ---------------------------------------------------------------------------
# 8. Remove obsolete Vellum helper scripts that may have been committed.
# ---------------------------------------------------------------------------

obsolete_names = {
    "fix-vellum-too-white.py",
    "fix-vellum-buttons-codex-rules.py",
    "fix-vellum-hardcoded-colours-repo-wide.py",
    "fix-vellum-final-cascade.py",
    "add-vellum-light-skin-and-circular-map-lens.py",
}

removed = []

for name in obsolete_names:
    candidate = ROOT / name
    if candidate.exists():
        candidate.unlink()
        removed.append(name)

if removed:
    print("Removed obsolete Vellum patch scripts:", ", ".join(removed))

# ---------------------------------------------------------------------------
# 9. Verify the rebuild.
# ---------------------------------------------------------------------------

if 'data-portal-skin="vellum"' in GLOBALS.read_text(encoding="utf-8"):
    raise SystemExit("Verification failed: old Vellum CSS remains in globals.css")

layout_text = ROOT_LAYOUT.read_text(encoding="utf-8")
if layout_text.find(theme_import) < layout_text.find(globals_import):
    raise SystemExit("Verification failed: portal-themes.css loads before globals.css")

theme_text = THEMES.read_text(encoding="utf-8")
for marker in (
    'data-portal-skin="vellum"',
    "data-map-magnifying-lens-button",
    "--sep-colour-",
):
    if marker not in theme_text:
        raise SystemExit(f"Verification failed: {marker} missing")

print()
print("VELLUM REBUILD COMPLETE")
print("-----------------------")
print("Old Vellum CSS: removed")
print("New theme file: app/portal-themes.css")
print("Theme load order: after globals.css")
print("Live colour utilities audited:", len(utilities))
print("Portal colour tokens covered:", len(all_hex_tokens))
print("Portal RGB tokens covered:", len(all_rgb_tokens))
print("Codex/Rules bridge: rebuilt")
print("Map magnifier: always circular")
print()
print("No SQL changes are required.")
print("Now run: npm run build")
