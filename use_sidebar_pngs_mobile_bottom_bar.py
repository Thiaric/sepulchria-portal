from pathlib import Path
import base64

PATH = Path("components/portal/mobile-portal-navigation.tsx")

if not PATH.exists():
    raise SystemExit("Missing components/portal/mobile-portal-navigation.tsx")

text = PATH.read_text(encoding="utf-8")

pairs = [('PEhvbWUgY2xhc3NOYW1lPSJoLVsxOHB4XSB3LVsxOHB4XSIgLz4=', 'PGltZwogICAgICAgICAgICAgIHNyYz0iL2ljb25zL2Rhc2hib2FyZC5wbmciCiAgICAgICAgICAgICAgYWx0PSIiCiAgICAgICAgICAgICAgYXJpYS1oaWRkZW49InRydWUiCiAgICAgICAgICAgICAgY2xhc3NOYW1lPSJoLVsyMHB4XSB3LVsyMHB4XSBvYmplY3QtY29udGFpbiIKICAgICAgICAgICAgLz4='), ('PE1hcCBjbGFzc05hbWU9ImgtWzE4cHhdIHctWzE4cHhdIiAvPg==', 'PGltZwogICAgICAgICAgICAgIHNyYz0iL2ljb25zL3BsYXkucG5nIgogICAgICAgICAgICAgIGFsdD0iIgogICAgICAgICAgICAgIGFyaWEtaGlkZGVuPSJ0cnVlIgogICAgICAgICAgICAgIGNsYXNzTmFtZT0iaC1bMjBweF0gdy1bMjBweF0gb2JqZWN0LWNvbnRhaW4iCiAgICAgICAgICAgIC8+'), ('PFVzZXJzIGNsYXNzTmFtZT0iaC1bMThweF0gdy1bMThweF0iIC8+', 'PGltZwogICAgICAgICAgICAgIHNyYz0iL2ljb25zL2NoYXJhY3RlcnMucG5nIgogICAgICAgICAgICAgIGFsdD0iIgogICAgICAgICAgICAgIGFyaWEtaGlkZGVuPSJ0cnVlIgogICAgICAgICAgICAgIGNsYXNzTmFtZT0iaC1bMjBweF0gdy1bMjBweF0gb2JqZWN0LWNvbnRhaW4iCiAgICAgICAgICAgIC8+'), ('PE1lc3NhZ2VDaXJjbGUgY2xhc3NOYW1lPSJoLVsxOHB4XSB3LVsxOHB4XSIgLz4=', 'PGltZwogICAgICAgICAgICAgIHNyYz0iL2ljb25zL21lc3NhZ2VzLnBuZyIKICAgICAgICAgICAgICBhbHQ9IiIKICAgICAgICAgICAgICBhcmlhLWhpZGRlbj0idHJ1ZSIKICAgICAgICAgICAgICBjbGFzc05hbWU9ImgtWzIwcHhdIHctWzIwcHhdIG9iamVjdC1jb250YWluIgogICAgICAgICAgICAvPg==')]

for i, (old_b64, new_b64) in enumerate(pairs, 1):
    old = base64.b64decode(old_b64).decode("utf-8")
    new = base64.b64decode(new_b64).decode("utf-8")
    count = text.count(old)
    if count != 1:
        raise SystemExit(
            f"Bottom icon {i}: expected 1 match, found {count}."
        )
    text = text.replace(old, new, 1)

PATH.write_text(text, encoding="utf-8")

print("✓ Mobile bottom bar now uses existing sidebar PNG icons")
print("  Aureth   -> /icons/dashboard.png")
print("  Enter    -> /icons/play.png")
print("  People   -> /icons/characters.png")
print("  Messages -> /icons/messages.png")
print("  More     -> unchanged ellipsis")
print("")
print("Run: npm run build")
