from pathlib import Path

path = Path("components/portal/mobile-portal-navigation.tsx")
text = path.read_text(encoding="utf-8")

needle = '''  const cosmeticsEntry: LinkEntry = {
    href: "/cosmetics",
    label: "Cosmetics",
    icon: "/icons/premium.png",
    modal: {
      label: "Cosmetics",
      title:
        "Manage your owned character and chat cosmetics.",
      icon:
        "/icons/premium.png",
      href: "/cosmetics",
    },
  };

  const legalEntries: LinkEntry[] = ['''

replacement = '''  const cosmeticsEntry: LinkEntry = {
    href: "/cosmetics",
    label: "Cosmetics",
    icon: "/icons/premium.png",
    modal: {
      label: "Cosmetics",
      title:
        "Manage your owned character and chat cosmetics.",
      icon:
        "/icons/premium.png",
      href: "/cosmetics",
    },
  };

  const storeEntry: LinkEntry = {
    href: "/store",
    label: "Sepulchria's Shop",
    icon: "/icons/store.png",
  };

  const legalEntries: LinkEntry[] = ['''

if needle not in text:
    raise SystemExit("Could not find cosmeticsEntry insertion point.")

text = text.replace(needle, replacement, 1)

needle2 = '''                    <EntryButton
                      entry={cosmeticsEntry}
                    />'''

replacement2 = '''                    <EntryButton
                      entry={cosmeticsEntry}
                    />

                    <EntryButton
                      entry={storeEntry}
                      onBeforeOpen={closeMore}
                    />'''

if needle2 not in text:
    raise SystemExit("Could not find Cosmetics render point in mobile More panel.")

text = text.replace(needle2, replacement2, 1)
path.write_text(text, encoding="utf-8")

print("Added Sepulchria's Shop to the mobile More panel.")
