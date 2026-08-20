from pathlib import Path

ROOT = Path.cwd()
rel = "app/(portal)/private-location/actions.ts"
path = ROOT / rel

if not path.exists():
    raise SystemExit(f"Missing expected file: {rel}")

text = path.read_text(encoding="utf-8")

old_import = '''import {
  hasCharacterFeature,
} from "@/lib/features/character-feature-entitlements";
import {
  createClient,
} from "@/lib/supabase/server";
'''

new_import = '''import {
  hasCharacterFeature,
} from "@/lib/features/character-feature-entitlements";
import {
  getStaffSession,
} from "@/lib/auth/require-staff";
import {
  createClient,
} from "@/lib/supabase/server";
'''

if old_import not in text:
    raise SystemExit(
        "Patch stopped: expected import block was not found. "
        "The repository may have changed."
    )

text = text.replace(old_import, new_import, 1)

old_access = '''  if (privateError || !privateRoom) {
    return false;
  }

  const {
    data: entitlement,
  } = await admin
'''

new_access = '''  if (privateError || !privateRoom) {
    return false;
  }

  /*
   * Staff are allowed to enter every character-owned Private Location,
   * exactly like Order Headquarters. They do not need an invitation or
   * a private_location_members row.
   *
   * The shared game access guard already grants staff access; this keeps
   * the dedicated "Enter Private Location" action consistent with it.
   */
  const staff =
    await getStaffSession();

  if (staff) {
    return true;
  }

  const {
    data: entitlement,
  } = await admin
'''

if old_access not in text:
    raise SystemExit(
        "Patch stopped: expected Private Location access block was not found. "
        "The repository may have changed."
    )

text = text.replace(old_access, new_access, 1)

path.write_text(text, encoding="utf-8")

print(f"Updated {rel}")
print()
print("Staff now bypass invitation/membership checks when entering any character-owned Private Location.")
print("Run: npm run build")
