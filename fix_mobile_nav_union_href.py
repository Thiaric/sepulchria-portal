from pathlib import Path
import base64

PATH = Path("components/portal/mobile-portal-navigation.tsx")

if not PATH.exists():
    raise SystemExit("Missing components/portal/mobile-portal-navigation.tsx")

text = PATH.read_text(encoding="utf-8")

old = base64.b64decode("ICAgICAgICAgIGNvbnN0IGFjdGl2ZSA9CiAgICAgICAgICAgIGlzUm91dGVBY3RpdmUoCiAgICAgICAgICAgICAgcGF0aG5hbWUsCiAgICAgICAgICAgICAgZW50cnkuaHJlZiwKICAgICAgICAgICAgKTsKCiAgICAgICAgICByZXR1cm4gKAogICAgICAgICAgICA8TGluawogICAgICAgICAgICAgIGtleT17YCR7dGl0bGV9LSR7ZW50cnkubGFiZWx9YH0KICAgICAgICAgICAgICBocmVmPXtlbnRyeS5ocmVmfQ==").decode("utf-8")
new = base64.b64decode("ICAgICAgICAgIGlmICghKCJocmVmIiBpbiBlbnRyeSkpIHsKICAgICAgICAgICAgcmV0dXJuIG51bGw7CiAgICAgICAgICB9CgogICAgICAgICAgY29uc3QgYWN0aXZlID0KICAgICAgICAgICAgaXNSb3V0ZUFjdGl2ZSgKICAgICAgICAgICAgICBwYXRobmFtZSwKICAgICAgICAgICAgICBlbnRyeS5ocmVmLAogICAgICAgICAgICApOwoKICAgICAgICAgIHJldHVybiAoCiAgICAgICAgICAgIDxMaW5rCiAgICAgICAgICAgICAga2V5PXtgJHt0aXRsZX0tJHtlbnRyeS5sYWJlbH1gfQogICAgICAgICAgICAgIGhyZWY9e2VudHJ5LmhyZWZ9").decode("utf-8")

count = text.count(old)
if count != 1:
    raise SystemExit(f"Expected 1 MenuSection href block, found {count}.")

PATH.write_text(text.replace(old, new, 1), encoding="utf-8")

print("✓ Fixed MobileMenuEntry href narrowing")
print("Run: npm run build")
