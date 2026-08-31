from pathlib import Path
import subprocess, base64

BASE = "7502b07"
PATH = Path("components/portal/portal-header.tsx")

head = subprocess.check_output(
    ["git", "rev-parse", "--short", "HEAD"],
    text=True,
).strip()

if head != BASE:
    raise SystemExit(
        f"Wrong baseline: HEAD is {head}, expected {BASE}."
    )

if not PATH.exists():
    raise SystemExit("Missing components/portal/portal-header.tsx")

text = PATH.read_text(encoding="utf-8")
old = base64.b64decode("ICAgICAgICAgIDxMaW5rIGhyZWY9Ii8iIGNsYXNzTmFtZT0ibWluLXctMCBzaHJpbmsiPgogICAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9ImJsb2NrIHRydW5jYXRlIGZvbnQtc2VyaWYgdGV4dC1sZyBmb250LXNlbWlib2xkIHRyYWNraW5nLVswLjE4ZW1dIHRleHQtW3JnYih2YXIoLS1zZXAtY29sb3VyLWQ5YmQ4MikpXSBzbTp0ZXh0LXhsIHNtOnRyYWNraW5nLVswLjIyZW1dIDJ4bDp0ZXh0LTJ4bCI+CiAgICAgICAgICAgICAgU0VQVUxDSFJJQQogICAgICAgICAgICA8L3NwYW4+CiAgICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT0ibXQtMC41IGhpZGRlbiB0cnVuY2F0ZSB0ZXh0LVs4cHhdIHVwcGVyY2FzZSB0cmFja2luZy1bMC4yNGVtXSB0ZXh0LVtyZ2IodmFyKC0tc2VwLWNvbG91ci04ZjgwNmQpKV0gbWQ6YmxvY2sgbGc6dGV4dC1bOXB4XSAyeGw6bXQtMSAyeGw6dGV4dC1bMTBweF0gMnhsOnRyYWNraW5nLVswLjM1ZW1dIj4KICAgICAgICAgICAgICBCdWlsdCB1cG9uIHRoZSByZW1haW5zIG9mIFRoZSBGaXJzdCwgc2hhcGVkIGJ5IHlvdXIgY2hvaWNlcy4KICAgICAgICAgICAgPC9zcGFuPgogICAgICAgICAgPC9MaW5rPg==").decode("utf-8")
new = base64.b64decode("ICAgICAgICAgIDxMaW5rCiAgICAgICAgICAgIGhyZWY9Ii8iCiAgICAgICAgICAgIGNsYXNzTmFtZT0ibWluLXctMCBzaHJpbmsiCiAgICAgICAgICAgIGFyaWEtbGFiZWw9IlNlcHVsY2hyaWEgaG9tZSIKICAgICAgICAgID4KICAgICAgICAgICAgPGltZwogICAgICAgICAgICAgIHNyYz0iL2ljb25zL25ld0xvZ28ucG5nIgogICAgICAgICAgICAgIGFsdD0iU2VwdWxjaHJpYSIKICAgICAgICAgICAgICBjbGFzc05hbWU9ImJsb2NrIGgtOSB3LWF1dG8gbWF4LXctWzk2cHhdIG9iamVjdC1jb250YWluIHNtOmhpZGRlbiIKICAgICAgICAgICAgLz4KCiAgICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT0iaGlkZGVuIHRydW5jYXRlIGZvbnQtc2VyaWYgdGV4dC1sZyBmb250LXNlbWlib2xkIHRyYWNraW5nLVswLjE4ZW1dIHRleHQtW3JnYih2YXIoLS1zZXAtY29sb3VyLWQ5YmQ4MikpXSBzbTpibG9jayBzbTp0ZXh0LXhsIHNtOnRyYWNraW5nLVswLjIyZW1dIDJ4bDp0ZXh0LTJ4bCI+CiAgICAgICAgICAgICAgU0VQVUxDSFJJQQogICAgICAgICAgICA8L3NwYW4+CiAgICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT0ibXQtMC41IGhpZGRlbiB0cnVuY2F0ZSB0ZXh0LVs4cHhdIHVwcGVyY2FzZSB0cmFja2luZy1bMC4yNGVtXSB0ZXh0LVtyZ2IodmFyKC0tc2VwLWNvbG91ci04ZjgwNmQpKV0gbWQ6YmxvY2sgbGc6dGV4dC1bOXB4XSAyeGw6bXQtMSAyeGw6dGV4dC1bMTBweF0gMnhsOnRyYWNraW5nLVswLjM1ZW1dIj4KICAgICAgICAgICAgICBCdWlsdCB1cG9uIHRoZSByZW1haW5zIG9mIFRoZSBGaXJzdCwgc2hhcGVkIGJ5IHlvdXIgY2hvaWNlcy4KICAgICAgICAgICAgPC9zcGFuPgogICAgICAgICAgPC9MaW5rPg==").decode("utf-8")

count = text.count(old)

if count != 1:
    raise SystemExit(
        f"Header brand matcher: expected 1 match, found {count}."
    )

PATH.write_text(
    text.replace(old, new, 1),
    encoding="utf-8",
)

print("✓ Mobile header now uses /icons/newLogo.png")
print("✓ Desktop SEPULCHRIA + tagline remain unchanged")
print("✓ Logo still links to /")
print("")
print("Run: npm run build")
