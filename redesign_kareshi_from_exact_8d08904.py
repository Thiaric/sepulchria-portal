from pathlib import Path

ROOT = Path.cwd()

THEMES = ROOT / "app/portal-themes.css"
ATMOSPHERE = ROOT / "components/portal/portal-skin-atmosphere.tsx"
GALLERY = ROOT / "components/portal/portal-skin-gallery.tsx"


def fail(message: str) -> None:
    raise SystemExit(
        f"ERROR: {message}\nNo changes were applied."
    )


for path in (THEMES, ATMOSPHERE, GALLERY):
    if not path.exists():
        fail(f"Missing expected file: {path.relative_to(ROOT)}")

themes = THEMES.read_text(encoding="utf-8")
atmosphere = ATMOSPHERE.read_text(encoding="utf-8")
gallery = GALLERY.read_text(encoding="utf-8")

# ---------------------------------------------------------------------------
# Exact anchors verified against commit:
# 8d0890443e1be51fa69c8cc98ff86254a0624a41
# ---------------------------------------------------------------------------

old_mapping = '  if (value === "moonlit") return "moonlit";'
new_mapping = '  if (value === "moonlit") return "kareshi-night";'

old_render = '''        {(kind === "moonlit" || kind === "wolf-moon") ? (
          <>
            <span className="portal-moon-glow portal-moon-glow-a" />
            <span className="portal-moon-glow portal-moon-glow-b" />
            {kind === "wolf-moon" ? (
              <span className="portal-wolf-mist" />
            ) : null}
          </>
        ) : null}
'''

new_render = '''        {kind === "kareshi-night" ? (
          <>
            <span className="portal-kareshi-haze portal-kareshi-haze-a" />
            <span className="portal-kareshi-haze portal-kareshi-haze-b" />
            <span className="portal-kareshi-shadow-band portal-kareshi-shadow-one" />
            <span className="portal-kareshi-shadow-band portal-kareshi-shadow-two" />
          </>
        ) : null}

        {kind === "wolf-moon" ? (
          <>
            <span className="portal-moon-glow portal-moon-glow-a" />
            <span className="portal-moon-glow portal-moon-glow-b" />
            <span className="portal-wolf-mist" />
          </>
        ) : null}
'''

old_swatch = '''  moonlit: {
    background: "#080d18",
    accent: "#8da9d4",
  },
'''

new_swatch = '''  moonlit: {
    background: "#090806",
    accent: "#b58a4c",
  },
'''

style_anchor = '''        .portal-ink-writing {
'''

# ---------------------------------------------------------------------------
# Preflight BEFORE changing anything.
# ---------------------------------------------------------------------------

if old_mapping not in atmosphere and new_mapping not in atmosphere:
    fail("Exact moonlit atmosphere mapping from 8d089044 was not found.")

if old_render not in atmosphere and new_render not in atmosphere:
    fail("Exact moonlit/wolf render block from 8d089044 was not found.")

if old_swatch not in gallery and new_swatch not in gallery:
    fail("Exact moonlit swatch from 8d089044 was not found.")

if style_anchor not in atmosphere:
    fail("Exact atmosphere CSS insertion anchor from 8d089044 was not found.")

# ---------------------------------------------------------------------------
# 1. Separate Kareshi from Vaskari at atmosphere level.
# ---------------------------------------------------------------------------

if old_mapping in atmosphere:
    atmosphere = atmosphere.replace(
        old_mapping,
        new_mapping,
        1,
    )

if old_render in atmosphere:
    atmosphere = atmosphere.replace(
        old_render,
        new_render,
        1,
    )

kareshi_atmosphere_css = r'''        .portal-kareshi-haze {
          position: absolute;
          left: -12%;
          width: 124%;
          height: 150px;
          pointer-events: none;
          opacity: 0.11;
          filter: blur(24px);
          background:
            linear-gradient(
              90deg,
              transparent,
              rgb(171 124 67 / 0.23) 30%,
              rgb(105 76 43 / 0.16) 58%,
              transparent
            );
          animation:
            portal-kareshi-haze-drift
            28s ease-in-out infinite alternate;
        }

        .portal-kareshi-haze-a {
          top: 4%;
        }

        .portal-kareshi-haze-b {
          bottom: 7%;
          opacity: 0.075;
          transform: scaleX(-1);
          animation-delay: -11s;
        }

        .portal-kareshi-shadow-band {
          position: absolute;
          left: -20%;
          width: 140%;
          height: 32vh;
          min-height: 180px;
          pointer-events: none;
          opacity: 0.12;
          filter: blur(36px);
          background:
            radial-gradient(
              ellipse at center,
              rgb(0 0 0 / 0.78) 0%,
              rgb(20 15 11 / 0.46) 42%,
              transparent 72%
            );
          animation:
            portal-kareshi-shadow-drift
            34s ease-in-out infinite alternate;
        }

        .portal-kareshi-shadow-one {
          top: 18%;
          transform: translateX(-7%) rotate(-3deg);
        }

        .portal-kareshi-shadow-two {
          bottom: 10%;
          transform: translateX(8%) rotate(2deg);
          animation-delay: -17s;
        }

        @keyframes portal-kareshi-haze-drift {
          from {
            transform: translate3d(-3%, 0, 0);
          }

          to {
            transform: translate3d(4%, 8px, 0);
          }
        }

        @keyframes portal-kareshi-shadow-drift {
          from {
            margin-left: -4%;
            opacity: 0.09;
          }

          to {
            margin-left: 5%;
            opacity: 0.15;
          }
        }

'''

# IMPORTANT: check for the actual CSS selector, not merely the class name
# which already appears in JSX after the render replacement.
if ".portal-kareshi-haze {" not in atmosphere:
    atmosphere = atmosphere.replace(
        style_anchor,
        kareshi_atmosphere_css + style_anchor,
        1,
    )

# ---------------------------------------------------------------------------
# 2. Hand-authored Kareshi palette override.
#    This is appended last so it wins over the older generated moonlit map.
#    Starfall/Vaskari is untouched.
# ---------------------------------------------------------------------------

theme_marker = "/* KARESHI NIGHT - DISTINCT HAND-AUTHORED OVERRIDE"

kareshi_theme_css = r'''
/* KARESHI NIGHT - DISTINCT HAND-AUTHORED OVERRIDE
 *
 * Vaskari / starfall remains celestial indigo.
 * Kareshi / moonlit is soot-black, smoked bronze and muted amber.
 */
html[data-portal-skin="moonlit"],
body[data-portal-skin="moonlit"],
[data-portal-skin="moonlit"] {
  --sep-colour-050403: 5 5 5;
  --sep-colour-090705: 7 7 6;
  --sep-colour-090706: 8 8 7;
  --sep-colour-0b0806: 10 9 8;
  --sep-colour-0c0907: 11 10 9;
  --sep-colour-0d0a08: 12 11 10;
  --sep-colour-100c09: 15 13 11;
  --sep-colour-110d0a: 17 14 12;
  --sep-colour-120e0b: 19 16 13;
  --sep-colour-130f0c: 21 18 15;
  --sep-colour-15100d: 24 20 16;
  --sep-colour-17110d: 27 22 17;
  --sep-colour-19120e: 30 24 18;
  --sep-colour-1a130e: 32 26 19;
  --sep-colour-21170f: 39 30 21;
  --sep-colour-241811: 44 33 23;
  --sep-colour-2b1d12: 51 38 25;
  --sep-colour-3a2819: 67 49 31;
  --sep-colour-3b2919: 71 52 32;
  --sep-colour-4a331f: 85 62 37;
  --sep-colour-50371f: 91 66 38;

  --sep-colour-60482e: 92 70 45;
  --sep-colour-6e5535: 107 81 50;
  --sep-colour-765735: 115 86 50;
  --sep-colour-806f59: 126 111 89;
  --sep-colour-8c704b: 139 108 68;
  --sep-colour-8d693e: 142 103 58;
  --sep-colour-8d6a40: 142 104 61;
  --sep-colour-947047: 148 111 69;
  --sep-colour-967342: 151 113 64;
  --sep-colour-987344: 154 114 65;

  --sep-colour-a58b68: 166 139 102;
  --sep-colour-a99069: 171 143 102;
  --sep-colour-aa9675: 174 151 117;
  --sep-colour-ad824d: 176 128 73;
  --sep-colour-b68b4f: 185 139 75;
  --sep-colour-b78b50: 187 140 78;
  --sep-colour-b98c50: 189 142 80;
  --sep-colour-baa78c: 188 168 138;
  --sep-colour-cbbba3: 204 188 161;
  --sep-colour-d8bb8a: 216 187 138;
  --sep-colour-d8c096: 219 194 150;
  --sep-colour-d8bd91: 218 190 145;
  --sep-colour-dec095: 224 195 149;
  --sep-colour-dfc79c: 225 200 156;
  --sep-colour-e1c89f: 227 201 160;
  --sep-colour-ead5ac: 235 214 174;
  --sep-colour-efd6a8: 240 215 169;
  --sep-colour-f1d7a5: 242 216 166;
}

[data-portal-skin="moonlit"] [data-portal-navigation] img {
  filter:
    grayscale(.8)
    sepia(.55)
    saturate(.8)
    hue-rotate(350deg)
    brightness(.78)
    contrast(1.3) !important;
}

[data-portal-skin="moonlit"] [data-portal-column],
[data-portal-skin="moonlit"] [data-portal-right-sidebar] {
  background-image:
    linear-gradient(
      180deg,
      rgb(79 57 32 / 0.045),
      transparent 26%,
      rgb(0 0 0 / 0.08)
    );
}
'''

if theme_marker not in themes:
    themes = (
        themes.rstrip()
        + "\n\n"
        + kareshi_theme_css.strip()
        + "\n"
    )

# ---------------------------------------------------------------------------
# 3. Update appearance swatch only for moonlit.
# ---------------------------------------------------------------------------

if old_swatch in gallery:
    gallery = gallery.replace(
        old_swatch,
        new_swatch,
        1,
    )

# ---------------------------------------------------------------------------
# Final safety validation.
# ---------------------------------------------------------------------------

required_atmosphere = [
    'if (value === "starfall") return "starfall";',
    'if (value === "moonlit") return "kareshi-night";',
    'kind === "kareshi-night"',
    '.portal-kareshi-haze {',
    '.portal-kareshi-shadow-band {',
    '@keyframes portal-kareshi-haze-drift',
    '@keyframes portal-kareshi-shadow-drift',
]

for value in required_atmosphere:
    if value not in atmosphere:
        fail(
            f"Atmosphere final validation failed: {value!r}"
        )

required_theme = [
    theme_marker,
    'html[data-portal-skin="moonlit"]',
    '--sep-colour-090705: 7 7 6;',
    '--sep-colour-b68b4f: 185 139 75;',
    '[data-portal-skin="moonlit"] [data-portal-navigation] img',
]

for value in required_theme:
    if value not in themes:
        fail(
            f"Theme final validation failed: {value!r}"
        )

required_gallery = [
    'moonlit: {',
    'background: "#090806"',
    'accent: "#b58a4c"',
]

for value in required_gallery:
    if value not in gallery:
        fail(
            f"Gallery final validation failed: {value!r}"
        )

# Ensure Vaskari's starfall swatch was not modified.
if '''  starfall: {
    background: "#080d1e",
    accent: "#758fd6",
  },
''' not in gallery:
    fail(
        "Starfall/Vaskari swatch changed unexpectedly."
    )

# Write only after every transformation and final validation succeeds.
THEMES.write_text(
    themes,
    encoding="utf-8",
    newline="\n",
)

ATMOSPHERE.write_text(
    atmosphere,
    encoding="utf-8",
    newline="\n",
)

GALLERY.write_text(
    gallery,
    encoding="utf-8",
    newline="\n",
)

print("WROTE  app/portal-themes.css")
print("WROTE  components/portal/portal-skin-atmosphere.tsx")
print("WROTE  components/portal/portal-skin-gallery.tsx")
print()
print("SUCCESS")
print("- Exact 8d089044 anchors used.")
print("- Vaskari / starfall left untouched.")
print("- Kareshi / moonlit now has a distinct black/bronze/amber palette.")
print("- Kareshi no longer uses the moon-glow atmosphere.")
print("- Kareshi now uses warm haze and drifting shadow bands.")
print("- Appearance swatch updated.")
print()
print("Next: npm run build")
