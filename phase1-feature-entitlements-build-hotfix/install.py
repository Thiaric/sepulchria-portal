from pathlib import Path

ROOT = Path.cwd()

if not (ROOT / "package.json").exists():
    raise SystemExit(
        "ERROR: Run this from the root of sepulchria-portal."
    )

PAGE = ROOT / "app/(portal)/admin/characters/[id]/page.tsx"

if not PAGE.exists():
    raise SystemExit(
        "ERROR: Could not find app/(portal)/admin/characters/[id]/page.tsx"
    )

text = PAGE.read_text(encoding="utf-8")

old_render_1 = '''        <AdminCharacterFeatureAccess
          characterId={character.id}
          entitlements={
            (featureEntitlementsResult.data ??
              []) as CharacterFeatureEntitlementRow[]
          }
        />'''

old_render_2 = '''        <AdminCharacterFeatureAccess
          characterId={character.id}
          entitlements={
            (featureEntitlementsResult.data ?? [])
              as CharacterFeatureEntitlementRow[]
          }
        />'''

new_render = '''        <AdminCharacterFeatureAccess
          characterId={character.id}
          entitlements={featureEntitlements}
        />'''

if new_render not in text:
    if old_render_1 in text:
        text = text.replace(old_render_1, new_render, 1)
    elif old_render_2 in text:
        text = text.replace(old_render_2, new_render, 1)
    else:
        raise SystemExit(
            "ERROR: Could not find the broken AdminCharacterFeatureAccess block."
        )

marker = '''  const displayName =
    getDisplayName(character);

  return ('''

replacement = '''  const displayName =
    getDisplayName(character);

  const featureEntitlements =
    (featureEntitlementsResult.data ??
      []) as CharacterFeatureEntitlementRow[];

  return ('''

if "const featureEntitlements =" not in text:
    if marker not in text:
        raise SystemExit(
            "ERROR: Could not find the displayName/return marker."
        )
    text = text.replace(marker, replacement, 1)

PAGE.write_text(text, encoding="utf-8")

print("SUCCESS: Feature Entitlements JSX build hotfix installed.")
print("Now run: npm run build")
