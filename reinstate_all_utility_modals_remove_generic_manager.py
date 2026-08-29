from pathlib import Path

path = Path("app/(portal)/layout.tsx")

if not path.exists():
    raise SystemExit("Missing app/(portal)/layout.tsx")

text = path.read_text(encoding="utf-8")

import_line = (
    'import { PortalModalViewportManager } '
    'from "@/components/portal/portal-modal-viewport-manager";\n'
)

mount_line = "            <PortalModalViewportManager />\n"

changed = False

if import_line in text:
    text = text.replace(import_line, "", 1)
    changed = True

if mount_line in text:
    text = text.replace(mount_line, "", 1)
    changed = True

if not changed:
    raise SystemExit(
        "PortalModalViewportManager is already not mounted. "
        "No files were changed."
    )

path.write_text(text, encoding="utf-8")

print("SUCCESS")
print("")
print("Removed the generic PortalModalViewportManager from the portal shell.")
print("")
print("Result:")
print("  - stacked PublicPageModal navigation windows are untouched")
print("  - image enlargement/lightbox popups use their original behaviour")
print("  - Current Location INFO uses its original behaviour")
print("  - crafted-item result/reveal modal uses its original behaviour")
print("  - Portal Appearance uses its original behaviour")
print("  - People in Sepulchria uses its original behaviour")
print("  - Calendar remains on its original behaviour")
print("  - other bespoke utility/detail dialogs are also no longer hijacked")
print("")
print("Changed only:")
print("  app/(portal)/layout.tsx")
print("")
print("The manager component file is intentionally left in place but unused.")
print("")
print("Run: npm run build")
