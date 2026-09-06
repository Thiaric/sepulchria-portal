from pathlib import Path

ROOT = Path.cwd()
sidebar = ROOT / "components/portal/portal-sidebar.tsx"

text = sidebar.read_text(encoding="utf-8")

if 'const storeItem: NavigationItem = {' not in text:
    raise SystemExit(
        "Store item is not present yet. Run the Phase 3 Store patch first."
    )

old = (
    '    {hasPrivateLocationAccess\n'
    '      ? renderMobileItem(\n'
    '          privateLocationItem,\n'
    '        )\n'
    '      : null}\n\n'
    '    {hasFriendListFeature\n'
)

new = (
    '    {renderMobileItem(\n'
    '      storeItem,\n'
    '    )}\n\n'
    '    {hasPrivateLocationAccess\n'
    '      ? renderMobileItem(\n'
    '          privateLocationItem,\n'
    '        )\n'
    '      : null}\n\n'
    '    {hasFriendListFeature\n'
)

if new in text:
    print("Mobile Store link: already applied")
elif old not in text:
    raise SystemExit(
        "Expected mobile sidebar block not found. "
        "Your local portal-sidebar.tsx differs from the ac6e8ab-based version."
    )
else:
    sidebar.write_text(
        text.replace(old, new, 1),
        encoding="utf-8",
    )
    print("Mobile Store link: patched")

print("DONE: Store now appears in the mobile sidebar using /icons/store.png.")
