from pathlib import Path
import base64

PATH = Path("components/portal/mobile-portal-navigation.tsx")

if not PATH.exists():
    raise SystemExit("Missing components/portal/mobile-portal-navigation.tsx")

text = PATH.read_text(encoding="utf-8")

pairs = [
    ("restore Sepulchria's People", "ICBjb25zdCBwZXJzb25hbEVudHJpZXMgPQogICAgdXNlTWVtbzxMaW5rRW50cnlbXT4oCiAgICAgICgpID0+IFsKICAgICAgICAuLi4oaGFzRnJpZW5kTGlzdEZlYXR1cmU=", "ICBjb25zdCBwZXJzb25hbEVudHJpZXMgPQogICAgdXNlTWVtbzxMaW5rRW50cnlbXT4oCiAgICAgICgpID0+IFsKICAgICAgICB7CiAgICAgICAgICBocmVmOiAiL2NoYXJhY3RlcnMiLAogICAgICAgICAgbGFiZWw6CiAgICAgICAgICAgICJTZXB1bGNocmlhJ3MgUGVvcGxlIiwKICAgICAgICAgIGljb246CiAgICAgICAgICAgICIvaWNvbnMvY2hhcmFjdGVycy5wbmciLAogICAgICAgICAgbW9kYWw6IHsKICAgICAgICAgICAgbGFiZWw6CiAgICAgICAgICAgICAgIlNlcHVsY2hyaWEncyBQZW9wbGUiLAogICAgICAgICAgICB0aXRsZToKICAgICAgICAgICAgICAiQnJvd3NlIHRoZSBjaGFyYWN0ZXJzIHdobyBpbmhhYml0IFNlcHVsY2hyaWEuIiwKICAgICAgICAgICAgaWNvbjoKICAgICAgICAgICAgICAiL2ljb25zL2NoYXJhY3RlcnMucG5nIiwKICAgICAgICAgICAgaHJlZjogIi9jaGFyYWN0ZXJzIiwKICAgICAgICAgIH0sCiAgICAgICAgfSwKICAgICAgICAuLi4oaGFzRnJpZW5kTGlzdEZlYXR1cmU="),
    ("rename first mobile section", "ICAgICAgICAgICAgICAgIDxTZWN0aW9uVGl0bGU+CiAgICAgICAgICAgICAgICAgIE15IENoYXJhY3RlcgogICAgICAgICAgICAgICAgPC9TZWN0aW9uVGl0bGU+", "ICAgICAgICAgICAgICAgIDxTZWN0aW9uVGl0bGU+CiAgICAgICAgICAgICAgICAgIFBlb3BsZSAmIENoYXJhY3RlcgogICAgICAgICAgICAgICAgPC9TZWN0aW9uVGl0bGU+"),
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

print("✓ Restored Sepulchria's People in More")
print("✓ My Character remains removed")
print("✓ Friends / Private Location conditions unchanged")
print("✓ Bottom People button remains unchanged")
print("")
print("Run: npm run build")
