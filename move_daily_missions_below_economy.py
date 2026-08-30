from pathlib import Path

path = Path("components/portal/portal-sidebar.tsx")
if not path.exists():
    raise SystemExit("Run this from the sepulchria-portal repository root.")

text = path.read_text(encoding="utf-8")

old_main = '''  {
    label: "Daily Missions",
    title:
      "Review today's missions, progress and rewards.",
    icon: "/icons/ranking.png",
    href: "/missions",
    activePaths: ["/missions"],
    opensModal: true,
  },
];
'''

new_main = '''];
'''

if old_main not in text:
    raise SystemExit(
        "Could not find the Daily Missions block in mainNavigationItems. "
        "Make sure the V1 Daily Missions patch has already been applied."
    )

text = text.replace(old_main, new_main, 1)

anchor = '''const craftingItem: NavigationItem = {
  label: "Crafting",
  title:
    "Open your crafting workbench and create items from known recipes.",
  icon: "/icons/crafting.png",
  href: "/crafting",
  activePaths: ["/crafting"],
  opensModal: true,
};

'''

replacement = anchor + '''const missionsItem: NavigationItem = {
  label: "Daily Missions",
  title:
    "Review today's missions, progress and rewards.",
  icon: "/icons/ranking.png",
  href: "/missions",
  activePaths: ["/missions"],
  opensModal: true,
};

'''

if anchor not in text:
    raise SystemExit("Could not find craftingItem definition.")

text = text.replace(anchor, replacement, 1)

mobile_anchor = '''  marketItem,
  craftingItem,
  ...(hasOrderLeadership
'''

mobile_replacement = '''  marketItem,
  craftingItem,
  missionsItem,
  ...(hasOrderLeadership
'''

if mobile_anchor not in text:
    raise SystemExit("Could not find mobileNavigationItems Economy/Crafting block.")

text = text.replace(mobile_anchor, mobile_replacement, 1)

desktop_anchor = '''                  ) : null}
                </div>

                <form
                  action={enterRoomFromMap}
                >
'''

desktop_replacement = '''                  ) : null}
                </div>

                {renderNavigationItem(
                  missionsItem,
                )}

                <form
                  action={enterRoomFromMap}
                >
'''

if desktop_anchor not in text:
    raise SystemExit("Could not find the end of the Economy & Crafting block.")

text = text.replace(desktop_anchor, desktop_replacement, 1)

path.write_text(text, encoding="utf-8")

print("✓ Daily Missions moved directly below Economy & Crafting.")
print("✓ It still opens through the existing portal modal system.")
print("✓ Mobile modal entry retained.")
print("Now run: npm run build")
