#!/usr/bin/env python3
from pathlib import Path
import shutil
import subprocess

ROOT = Path.cwd()
TARGET = ROOT / "components/admin/admin-character-edit-form.tsx"
BACKUP = ROOT / ".patch_backups" / "fix_admin_server_action_submit_b59ea70.tsx"
BASE = "b59ea70"

OLD_REF = '  const allowOriginalSubmit =\n    useRef(false);\n\n'
OLD_HANDLER_START = '  async function handleSubmit(\n    event: FormEvent<HTMLFormElement>,\n  ) {\n    if (allowOriginalSubmit.current) {\n      allowOriginalSubmit.current =\n        false;\n      return;\n    }\n\n    event.preventDefault();\n'
NEW_HANDLER_START = '  async function handleSubmit(\n    event: FormEvent<HTMLFormElement>,\n  ) {\n    event.preventDefault();\n'
OLD_FINISH = '    /*\n     * Age + ancestry have now passed\n     * server-side validation and been\n     * saved together. Let the existing\n     * administration action perform all\n     * its normal status/history/profile\n     * work unchanged.\n     */\n    allowOriginalSubmit.current =\n      true;\n\n    form.requestSubmit();\n'
NEW_FINISH = "    /*\n     * Age + ancestry have now passed server-side validation.\n     *\n     * Do NOT call form.requestSubmit() here. This form's action is a\n     * React/Next Server Action; re-submitting the DOM form from inside\n     * the async submit handler can complete the age pre-save without\n     * reliably invoking updateCharacterAdministration.\n     *\n     * Invoke the supplied Server Action directly with the same FormData.\n     * Its existing redirect/revalidation behaviour remains unchanged.\n     */\n    await action(formData);\n"

def fail(message):
    raise SystemExit(f"ERROR: {message}")

try:
    head = subprocess.check_output(
        ["git", "rev-parse", "--short", "HEAD"],
        cwd=ROOT,
        text=True,
        stderr=subprocess.DEVNULL,
    ).strip()
except Exception:
    head = "unknown"

print(f"Current HEAD: {head}")
if head != BASE:
    print(f"WARNING: patch was built against {BASE}; current HEAD is {head}.")

if not TARGET.exists():
    fail(f"missing {TARGET}")

text = TARGET.read_text(encoding="utf-8-sig")

checks = [
    (OLD_REF, "allowOriginalSubmit ref"),
    (OLD_HANDLER_START, "submit-handler opening"),
    (OLD_FINISH, "requestSubmit hand-off"),
]

for needle, label in checks:
    count = text.count(needle)
    if count != 1:
        fail(
            f"{label}: expected exactly 1 match, found {count}. "
            "No files changed."
        )

updated = text.replace(OLD_REF, "", 1)
updated = updated.replace(
    OLD_HANDLER_START,
    NEW_HANDLER_START,
    1,
)
updated = updated.replace(
    OLD_FINISH,
    NEW_FINISH,
    1,
)

BACKUP.parent.mkdir(parents=True, exist_ok=True)
if not BACKUP.exists():
    shutil.copy2(TARGET, BACKUP)
    print(f"Backup created: {BACKUP}")
else:
    print(f"Backup already exists: {BACKUP}")

TARGET.write_text(updated, encoding="utf-8")

print(f"Patched: {TARGET}")
print("NPC/Character admin save now invokes the Server Action directly after age/ancestry validation.")
print("Nothing committed or pushed.")
print("No SQL changes required.")
print("Now run: npm run build")
