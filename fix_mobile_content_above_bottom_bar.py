from pathlib import Path
import base64

PATH = Path("app/(portal)/layout.tsx")

if not PATH.exists():
    raise SystemExit("Missing app/(portal)/layout.tsx")

text = PATH.read_text(encoding="utf-8")

pairs = [
    ("outer mobile padding", "ICAgICAgICAgICAgICAgICAgb3ZlcmZsb3c6IGhpZGRlbjsKICAgICAgICAgICAgICAgICAgcGFkZGluZy1ib3R0b206CiAgICAgICAgICAgICAgICAgICAgY2FsYyg2NHB4ICsgZW52KHNhZmUtYXJlYS1pbnNldC1ib3R0b20pKTs=", "ICAgICAgICAgICAgICAgICAgb3ZlcmZsb3c6IGhpZGRlbjsKICAgICAgICAgICAgICAgICAgcGFkZGluZy1ib3R0b206IDA7"),
    ("centre host mobile height", "ICAgICAgICAgICAgICAgICAgaGVpZ2h0OiAxMDAlOwogICAgICAgICAgICAgICAgICBtaW4taGVpZ2h0OiAwOwogICAgICAgICAgICAgICAgICBvdmVyZmxvdzogaGlkZGVuOw==", "ICAgICAgICAgICAgICAgICAgaGVpZ2h0OgogICAgICAgICAgICAgICAgICAgIGNhbGMoCiAgICAgICAgICAgICAgICAgICAgICAxMDAlIC0gNjRweCAtIGVudihzYWZlLWFyZWEtaW5zZXQtYm90dG9tKQogICAgICAgICAgICAgICAgICAgICk7CiAgICAgICAgICAgICAgICAgIG1pbi1oZWlnaHQ6IDA7CiAgICAgICAgICAgICAgICAgIG92ZXJmbG93OiBoaWRkZW47"),
]

for label, old_b64, new_b64 in pairs:
    old = base64.b64decode(old_b64).decode("utf-8")
    new = base64.b64decode(new_b64).decode("utf-8")
    count = text.count(old)
    if count != 1:
        raise SystemExit(
            f"{label}: expected 1 match, found {count}."
        )
    text = text.replace(old, new, 1)

PATH.write_text(text, encoding="utf-8")

print("✓ Mobile content now ends above fixed bottom navigation")
print("✓ No per-page padding hack")
print("✓ /game keeps a true bounded available height")
print("")
print("Run: npm run build")
