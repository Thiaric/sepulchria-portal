from pathlib import Path
import re

ROOT = Path.cwd()
rel = "app/(portal)/admin/characters/[id]/page.tsx"
path = ROOT / rel

if not path.exists():
    raise SystemExit(f"Missing expected file: {rel}")

text = path.read_text(encoding="utf-8")
original = text

# Remove imports used only by the moved panels.
text = text.replace(
    'import { AdminCharacterRemnants } from "@/components/admin/admin-character-remnants";\n',
    "",
    1,
)

feature_import = '''import {
  AdminCharacterFeatureAccess,
  type CharacterFeatureEntitlementRow,
  type CharacterPortalSkinEntitlementRow,
  type CharacterPortalSkinRow,
} from "@/components/admin/admin-character-feature-access";
'''
text = text.replace(feature_import, "", 1)

text = text.replace(
    'import { createAdminClient } from "@/lib/supabase/admin";\n',
    "",
    1,
)

# Remove feature entitlements from the first Promise.all.
text = text.replace(
    '''    orderMembershipResult,
    featureEntitlementsResult,
''',
    '''    orderMembershipResult,
''',
    1,
)

feature_query = '''    supabase
      .from("character_feature_entitlements")
      .select(
        "feature_key, enabled, source, note, granted_at, updated_at",
      )
      .eq("character_id", id),
'''
text = text.replace(feature_query, "", 1)

text = text.replace(
    '''    racesResult.error ??
    orderMembershipResult.error ??
    featureEntitlementsResult.error;''',
    '''    racesResult.error ??
    orderMembershipResult.error;''',
    1,
)

# Remove portal-skin privileged loading from the main page.
start_marker = '''  const privileged =
    createAdminClient();

'''
start = text.find(start_marker)

if start != -1:
    end_marker = '''  const races =
    (racesResult.data ??
      []) as CodexOption[];
'''
    end = text.find(end_marker, start)

    if end == -1:
        raise SystemExit(
            "Found portal skin loader but could not find the races declaration. No file written."
        )

    text = text[:start] + text[end:]

# Remove local feature entitlement cast.
feature_local = '''  const featureEntitlements =
    (featureEntitlementsResult.data ??
      []) as CharacterFeatureEntitlementRow[];

'''
text = text.replace(feature_local, "", 1)

# Remove the two inline panels.
text = re.sub(
    r'\n\s*<AdminCharacterFeatureAccess\b[\s\S]*?/>',
    "",
    text,
    count=1,
)

text = re.sub(
    r'\n\s*<AdminCharacterRemnants\b[\s\S]*?/>',
    "",
    text,
    count=1,
)

# Add the new buttons using the exact block from the pushed repository.
if "/premium-features" not in text:
    exact_warping = '''            <Link
              href={`/admin/characters/${character.id}/warping`}
              className="border border-[rgb(var(--sep-colour-987344))] bg-[rgb(var(--sep-colour-3b2919))] px-4 py-3 text-[9px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-efd6a8))] transition hover:border-[rgb(var(--sep-colour-b98c50))] hover:bg-[rgb(var(--sep-colour-50371f))]"
            >
              Manage Warping
            </Link>
'''

    if exact_warping not in text:
        raise SystemExit(
            "The exact Manage Warping block from the current pushed repository was not found. No file written."
        )

    extra = exact_warping + '''
            <Link
              href={`/admin/characters/${character.id}/premium-features`}
              className="border border-[rgb(var(--sep-colour-987344))] bg-[rgb(var(--sep-colour-3b2919))] px-4 py-3 text-[9px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-efd6a8))] transition hover:border-[rgb(var(--sep-colour-b98c50))] hover:bg-[rgb(var(--sep-colour-50371f))]"
            >
              Premium Features
            </Link>

            <Link
              href={`/admin/characters/${character.id}/ledger`}
              className="border border-[rgb(var(--sep-colour-987344))] bg-[rgb(var(--sep-colour-3b2919))] px-4 py-3 text-[9px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-efd6a8))] transition hover:border-[rgb(var(--sep-colour-b98c50))] hover:bg-[rgb(var(--sep-colour-50371f))]"
            >
              Ledger
            </Link>
'''

    text = text.replace(exact_warping, extra, 1)

# Sanity checks.
for forbidden in [
    "AdminCharacterFeatureAccess",
    "AdminCharacterRemnants",
    "featureEntitlementsResult",
    "CharacterFeatureEntitlementRow",
    "CharacterPortalSkinEntitlementRow",
    "CharacterPortalSkinRow",
    "portalSkinsResult",
    "portalSkinEntitlementsResult",
    "createAdminClient",
]:
    if forbidden in text:
        raise SystemExit(
            f"Cleanup incomplete: {forbidden} is still present. No file written."
        )

for required in [
    "/inventory",
    "/warping",
    "/premium-features",
    "/ledger",
    "Open public profile",
]:
    if required not in text:
        raise SystemExit(
            f"Required navigation marker missing: {required}. No file written."
        )

if text == original:
    print("No changes needed; main page already appears reorganised.")
else:
    path.write_text(text, encoding="utf-8")
    print("Updated app/(portal)/admin/characters/[id]/page.tsx")

print()
print("Main character page reorganisation finished.")
print("Do NOT rerun reorganise-admin-character-sections.py.")
print("Now run: npm run build")
