from pathlib import Path
import shutil
import sys

ROOT = Path.cwd()
TARGET = ROOT / "app" / "(portal)" / "layout.tsx"

if not TARGET.exists():
    raise SystemExit(
        "ERROR: app/(portal)/layout.tsx not found.\n"
        "Run this script from the root of sepulchria-portal."
    )

text = TARGET.read_text(encoding="utf-8")

marker = r'''          <PortalNotificationCountsProvider
            staffRole={staffRole}
          >
            <div
              data-portal-shell
              data-portal-modal-shell="true"
'''

replacement = r'''          <PortalNotificationCountsProvider
            staffRole={staffRole}
          >
            {/*
              Embedded/modal portal pages must mount the same cosmetic runtime
              as the full portal. This restores equipped cosmetics on every
              data-cosmetic surface rendered inside modals: character/profile
              portrait frame, nameplate, crest, profile background, PM frames,
              instant-chat frames, forum frames, action/whisper cosmetics, etc.
            */}
            <CosmeticRuntime />

            <div
              data-portal-shell
              data-portal-modal-shell="true"
'''

# Already patched: do nothing.
embedded_start = text.find("function EmbeddedPortalLayout(")
if embedded_start == -1:
    raise SystemExit("ERROR: EmbeddedPortalLayout not found; refusing to patch an unexpected file.")

embedded_text = text[embedded_start:]
if "<CosmeticRuntime />" in embedded_text:
    print("Already patched: EmbeddedPortalLayout already mounts <CosmeticRuntime />.")
    sys.exit(0)

count = text.count(marker)
if count != 1:
    raise SystemExit(
        f"ERROR: expected exactly 1 embedded-layout insertion point, found {count}. "
        "File was not changed."
    )

backup = TARGET.with_suffix(".tsx.before_restore_embedded_cosmetics.bak")
shutil.copy2(TARGET, backup)

text = text.replace(marker, replacement, 1)
TARGET.write_text(text, encoding="utf-8")

# Verify the runtime exists in BOTH full and embedded layouts.
updated = TARGET.read_text(encoding="utf-8")
runtime_count = updated.count("<CosmeticRuntime />")
if runtime_count < 2:
    shutil.copy2(backup, TARGET)
    raise SystemExit(
        f"ERROR: verification failed: expected at least 2 CosmeticRuntime mounts, found {runtime_count}. "
        "Original file restored."
    )

print("DONE.")
print("Restored CosmeticRuntime to EmbeddedPortalLayout.")
print(f"Backup: {backup}")
print("No commit. No push. GitHub was not modified.")
print()
print("Now run:")
print("  npm run build")
print("or:")
print("  npm run dev")
