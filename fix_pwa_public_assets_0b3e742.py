from pathlib import Path
import subprocess
import struct
import zlib
import math

BASE = "0b3e742"

def read(path):
    p = Path(path)
    if not p.exists():
        raise SystemExit(f"Missing {path}. Run from repo root. Expected {BASE}.")
    return p.read_text(encoding="utf-8")

def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(
            f"{label}: expected 1 match, found {count}. Expected {BASE}."
        )
    return text.replace(old, new, 1)

head = subprocess.check_output(
    ["git", "rev-parse", "--short", "HEAD"],
    text=True,
).strip()

if head != BASE:
    raise SystemExit(
        f"Wrong baseline: HEAD is {head}, expected {BASE}."
    )

# 1. Make PWA infrastructure explicitly public.
path = "lib/supabase/proxy.ts"
text = read(path)

old_public = '  "/api/registration-invitations",\n];'
new_public = '''  "/api/registration-invitations",
  "/manifest.webmanifest",
  "/sw.js",
  "/offline.html",
  "/icons/pwa",
];'''

text = replace_once(
    text,
    old_public,
    new_public,
    "PWA public routes",
)

Path(path).write_text(text, encoding="utf-8")
print("✓", path)

# 2. Exclude PWA files from proxy execution entirely.
path = "proxy.ts"
text = read(path)

old_matcher = '    "/((?!_next/static|_next/image|favicon.ico|.*\\\\.(?:svg|png|jpg|jpeg|gif|webp|mp4|webm|ogg)$).*)",'
new_matcher = '    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|offline.html|icons/pwa|.*\\\\.(?:svg|png|jpg|jpeg|gif|webp|mp4|webm|ogg)$).*)",'

text = replace_once(
    text,
    old_matcher,
    new_matcher,
    "PWA proxy matcher exclusion",
)

Path(path).write_text(text, encoding="utf-8")
print("✓", path)

# 3. Regenerate genuinely valid PNG files.
def chunk(kind: bytes, data: bytes) -> bytes:
    return (
        struct.pack(">I", len(data))
        + kind
        + data
        + struct.pack(
            ">I",
            zlib.crc32(kind + data) & 0xFFFFFFFF,
        )
    )

def write_icon(path: str, size: int, maskable: bool = False):
    bg = (16, 12, 9, 255)
    gold = (204, 164, 97, 255)
    dark = (34, 23, 15, 255)

    cx = cy = (size - 1) / 2
    radius = size * (0.30 if maskable else 0.38)
    ring = max(2.0, size * 0.025)
    rows = []

    for y in range(size):
        row = bytearray([0])

        for x in range(size):
            dx = x - cx
            dy = y - cy
            d = math.hypot(dx, dy)
            colour = bg

            if d <= radius:
                colour = dark

            if abs(d - radius) <= ring:
                colour = gold

            top = math.hypot(
                x - (cx + size * 0.035),
                y - (cy - size * 0.17),
            )
            bottom = math.hypot(
                x - (cx - size * 0.035),
                y - (cy + size * 0.17),
            )
            stroke = size * 0.075

            rune = (
                (
                    abs(top - size * 0.145) < stroke
                    and x <= cx + size * 0.09
                )
                or (
                    abs(bottom - size * 0.145) < stroke
                    and x >= cx - size * 0.09
                )
                or (
                    abs(
                        (y - cy)
                        + 0.58 * (x - cx)
                    )
                    < stroke * 0.55
                    and abs(x - cx) < size * 0.15
                    and abs(y - cy) < size * 0.12
                )
            )

            if rune:
                colour = gold

            row.extend(colour)

        rows.append(bytes(row))

    raw = b"".join(rows)
    compressed = zlib.compress(raw, 9)

    png = (
        bytes([137, 80, 78, 71, 13, 10, 26, 10])
        + chunk(
            b"IHDR",
            struct.pack(
                ">IIBBBBB",
                size,
                size,
                8,
                6,
                0,
                0,
                0,
            ),
        )
        + chunk(b"IDAT", compressed)
        + chunk(b"IEND", b"")
    )

    p = Path(path)
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_bytes(png)

    if p.read_bytes()[:8] != bytes([137, 80, 78, 71, 13, 10, 26, 10]):
        raise SystemExit(f"Generated invalid PNG: {path}")

write_icon("public/icons/pwa/icon-192.png", 192)
write_icon("public/icons/pwa/icon-512.png", 512)
write_icon("public/icons/pwa/apple-touch-icon.png", 180)
write_icon(
    "public/icons/pwa/icon-maskable-512.png",
    512,
    True,
)

print("✓ regenerated valid PWA PNG icons")
print("")
print("PWA public-assets fix installed.")
print("Run: npm run build")
print("Then commit/push and wait for Vercel deployment.")
