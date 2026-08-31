from pathlib import Path
import base64

sidebar_path = Path("components/portal/portal-sidebar.tsx")
css_path = Path("app/globals.css")

if not sidebar_path.exists():
    raise SystemExit("Missing components/portal/portal-sidebar.tsx")
if not css_path.exists():
    raise SystemExit("Missing app/globals.css")

sidebar = sidebar_path.read_text(encoding="utf-8")
old = base64.b64decode("ICBjb25zdCBtb2RhbEl0ZW0gPQogICAgbW9kYWxXaW5kb3dzLmxlbmd0aCA+IDAKICAgICAgPyBtb2RhbFdpbmRvd3MucmVkdWNlKAogICAgICAgICAgKHRvcCwgY2FuZGlkYXRlKSA9PgogICAgICAgICAgICBjYW5kaWRhdGUuekluZGV4ID4KICAgICAgICAgICAgdG9wLnpJbmRleAogICAgICAgICAgICAgID8gY2FuZGlkYXRlCiAgICAgICAgICAgICAgOiB0b3AsCiAgICAgICAgKS5pdGVtCiAgICAgIDogbnVsbDsKCiAgZnVuY3Rpb24gc2V0TW9kYWxJdGVtKA==").decode("utf-8")
new = base64.b64decode("ICBjb25zdCBtb2RhbEl0ZW0gPQogICAgbW9kYWxXaW5kb3dzLmxlbmd0aCA+IDAKICAgICAgPyBtb2RhbFdpbmRvd3MucmVkdWNlKAogICAgICAgICAgKHRvcCwgY2FuZGlkYXRlKSA9PgogICAgICAgICAgICBjYW5kaWRhdGUuekluZGV4ID4KICAgICAgICAgICAgdG9wLnpJbmRleAogICAgICAgICAgICAgID8gY2FuZGlkYXRlCiAgICAgICAgICAgICAgOiB0b3AsCiAgICAgICAgKS5pdGVtCiAgICAgIDogbnVsbDsKCiAgdXNlRWZmZWN0KCgpID0+IHsKICAgIGNvbnN0IHJvb3QgPQogICAgICBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQ7CgogICAgaWYgKG1vZGFsV2luZG93cy5sZW5ndGggPiAwKSB7CiAgICAgIHJvb3QuZGF0YXNldC5wb3J0YWxNb2RhbE9wZW4gPQogICAgICAgICJ0cnVlIjsKICAgIH0gZWxzZSB7CiAgICAgIGRlbGV0ZSByb290LmRhdGFzZXQKICAgICAgICAucG9ydGFsTW9kYWxPcGVuOwogICAgfQoKICAgIHJldHVybiAoKSA9PiB7CiAgICAgIGRlbGV0ZSByb290LmRhdGFzZXQKICAgICAgICAucG9ydGFsTW9kYWxPcGVuOwogICAgfTsKICB9LCBbbW9kYWxXaW5kb3dzLmxlbmd0aF0pOwoKICBmdW5jdGlvbiBzZXRNb2RhbEl0ZW0o").decode("utf-8")

count = sidebar.count(old)
if count != 1:
    raise SystemExit(
        f"Portal modal state matcher: expected 1 match, found {count}."
    )

sidebar = sidebar.replace(old, new, 1)
sidebar_path.write_text(sidebar, encoding="utf-8")

css = css_path.read_text(encoding="utf-8")
addition = base64.b64decode("Ci8qIE1vYmlsZSBhcHAgbmF2aWdhdGlvbiBiZWxvbmdzIHRvIHRoZSBtYWluIHBvcnRhbCBvbmx5LgogICBQb3J0YWwgbW9kYWwgd2luZG93cyBpbnRlbnRpb25hbGx5IGhpZGUgaXQuICovCkBtZWRpYSAobWF4LXdpZHRoOiAxMDIzcHgpIHsKICBodG1sW2RhdGEtcG9ydGFsLW1vZGFsLW9wZW49InRydWUiXQogICAgW2RhdGEtbW9iaWxlLXBvcnRhbC1uYXZdIHsKICAgIGRpc3BsYXk6IG5vbmUgIWltcG9ydGFudDsKICB9Cn0K").decode("utf-8")

marker = 'html[data-portal-modal-open="true"]'
if marker not in css:
    css = css.rstrip() + "\n" + addition
    css_path.write_text(css, encoding="utf-8")

print("✓ Mobile bottom bar hides while any portal modal is open")
print("✓ It reappears when the last modal closes")
print("✓ Stacked modal windows are handled correctly")
print("✓ Desktop navigation is untouched")
print("")
print("Run: npm run build")
