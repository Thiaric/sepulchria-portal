from pathlib import Path
import base64

PATH = Path("components/portal/mobile-portal-navigation.tsx")

if not PATH.exists():
    raise SystemExit("Missing components/portal/mobile-portal-navigation.tsx")

text = PATH.read_text(encoding="utf-8")

old = base64.b64decode("Y2xhc3NOYW1lPSJmaXhlZCBpbnNldC14LTAgYm90dG9tLTAgei1bOTVdIGZsZXggbWF4LWgtWzg4ZHZoXSBmbGV4LWNvbCBvdmVyZmxvdy1oaWRkZW4gcm91bmRlZC10LVsxOHB4XSBib3JkZXItdCBib3JkZXItW3JnYih2YXIoLS1zZXAtY29sb3VyLTYwNDgyZSkpXS82NSBiZy1bcmdiKHZhcigtLXNlcC1jb2xvdXItMTAwZDBiKSldIHNoYWRvdy1bMF8tMjRweF81NXB4X3JnYmEodmFyKC0tc2VwLXJnYi0wLTAtMCksMC41OCldIFstLXBvcnRhbC1uYXYtbWluLWg6Mi41cmVtXSBbLS1wb3J0YWwtbmF2LXk6MC4zNXJlbV0gbGc6aGlkZGVuIg==").decode("utf-8")
new = base64.b64decode("Y2xhc3NOYW1lPSJmaXhlZCBpbnNldC14LTAgYm90dG9tLVtjYWxjKDY0cHgrZW52KHNhZmUtYXJlYS1pbnNldC1ib3R0b20pKV0gei1bOTVdIGZsZXggbWF4LWgtW2NhbGMoODhkdmgtNjRweC1lbnYoc2FmZS1hcmVhLWluc2V0LWJvdHRvbSkpXSBmbGV4LWNvbCBvdmVyZmxvdy1oaWRkZW4gcm91bmRlZC10LVsxOHB4XSBib3JkZXItdCBib3JkZXItW3JnYih2YXIoLS1zZXAtY29sb3VyLTYwNDgyZSkpXS82NSBiZy1bcmdiKHZhcigtLXNlcC1jb2xvdXItMTAwZDBiKSldIHNoYWRvdy1bMF8tMjRweF81NXB4X3JnYmEodmFyKC0tc2VwLXJnYi0wLTAtMCksMC41OCldIFstLXBvcnRhbC1uYXYtbWluLWg6Mi41cmVtXSBbLS1wb3J0YWwtbmF2LXk6MC4zNXJlbV0gbGc6aGlkZGVuIg==").decode("utf-8")

count = text.count(old)
if count != 1:
    raise SystemExit(
        f"More sheet matcher: expected 1 match, found {count}."
    )

PATH.write_text(
    text.replace(old, new, 1),
    encoding="utf-8",
)

print("✓ More panel now ends above the mobile bottom bar")
print("✓ Legal & Safety remains fully reachable")
print("✓ Safe-area inset is included")
print("")
print("Run: npm run build")
