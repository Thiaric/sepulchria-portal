from pathlib import Path

def read(path):
    p = Path(path)
    if not p.exists():
        raise SystemExit(f'Missing {path}. Run from the sepulchria-portal repository root.')
    return p.read_text(encoding='utf-8')

def write(path, text):
    Path(path).write_text(text, encoding='utf-8')
    print(f'✓ {path}')

def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected exactly 1 match, found {count}. Base your working tree on aa18270.')
    return text.replace(old, new, 1)

path = 'app/(portal)/character/page.tsx'
text = read(path)
text = replace_once(text, '  show_last_activity?: boolean | null;\n\n  status?: CharacterStatus | null;', '  show_last_activity?: boolean | null;\n  show_inventory?: boolean | null;\n\n  status?: CharacterStatus | null;', 'character profile type')
text = replace_once(text, '      current_health,\n      show_last_activity,\n\n      race:races!characters_race_id_fkey(', '      current_health,\n      show_last_activity,\n      show_inventory,\n\n      race:races!characters_race_id_fkey(', 'own character select')
text = replace_once(text, '                <label className="flex items-start gap-3 border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-100c09))] px-4 py-3">\n                  <input\n                    type="checkbox"\n                    name="show_last_activity"\n                    value="true"\n                    defaultChecked={\n                      character.show_last_activity === true\n                    }\n                    className="mt-0.5 h-4 w-4 shrink-0 accent-[rgb(var(--sep-colour-9a7543))]"\n                  />\n\n                  <span className="min-w-0">\n                    <span className="block text-[9px] uppercase tracking-[0.2em] text-[rgb(var(--sep-colour-b99768))]">\n                      Show Last Activity publicly\n                    </span>\n\n                    <span className="mt-1 block text-[11px] leading-5 text-[rgb(var(--sep-colour-817463))]">\n                      When enabled, other players can see when this character was last active.\n                      Staff can always see Last Activity regardless of this setting.\n                    </span>\n                  </span>\n                </label>\n', '                <label className="flex items-start gap-3 border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-100c09))] px-4 py-3">\n                  <input\n                    type="checkbox"\n                    name="show_last_activity"\n                    value="true"\n                    defaultChecked={\n                      character.show_last_activity === true\n                    }\n                    className="mt-0.5 h-4 w-4 shrink-0 accent-[rgb(var(--sep-colour-9a7543))]"\n                  />\n\n                  <span className="min-w-0">\n                    <span className="block text-[9px] uppercase tracking-[0.2em] text-[rgb(var(--sep-colour-b99768))]">\n                      Show Last Activity publicly\n                    </span>\n\n                    <span className="mt-1 block text-[11px] leading-5 text-[rgb(var(--sep-colour-817463))]">\n                      When enabled, other players can see when this character was last active.\n                      Staff can always see Last Activity regardless of this setting.\n                    </span>\n                  </span>\n                </label>\n\n                <label className="flex items-start gap-3 border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-100c09))] px-4 py-3">\n                  <input\n                    type="checkbox"\n                    name="show_inventory"\n                    value="true"\n                    defaultChecked={\n                      character.show_inventory !== false\n                    }\n                    className="mt-0.5 h-4 w-4 shrink-0 accent-[rgb(var(--sep-colour-9a7543))]"\n                  />\n\n                  <span className="min-w-0">\n                    <span className="block text-[9px] uppercase tracking-[0.2em] text-[rgb(var(--sep-colour-b99768))]">\n                      Show Inventory publicly\n                    </span>\n\n                    <span className="mt-1 block text-[11px] leading-5 text-[rgb(var(--sep-colour-817463))]">\n                      When disabled, other players cannot see this character&apos;s carried Inventory.\n                      Equipped Items remain visible. Staff can always see the full Inventory.\n                    </span>\n                  </span>\n                </label>\n', 'EDIT privacy controls')
write(path, text)

path = 'app/(portal)/character/actions.ts'
text = read(path)
text = replace_once(text, '  const showLastActivity =\n    formData.get("show_last_activity") === "true";\n\n  if (!physicalDescription) {', '  const showLastActivity =\n    formData.get("show_last_activity") === "true";\n\n  const showInventory =\n    formData.get("show_inventory") === "true";\n\n  if (!physicalDescription) {', 'read inventory privacy checkbox')
text = replace_once(text, '      relationships,\n      offgame,\n      show_last_activity\n    `)', '      relationships,\n      offgame,\n      show_last_activity,\n      show_inventory\n    `)', 'approved profile current values select')
text = replace_once(text, '  setIfChanged(\n    "show_last_activity",\n    character.show_last_activity,\n    showLastActivity,\n  );\n\n  if (', '  setIfChanged(\n    "show_last_activity",\n    character.show_last_activity,\n    showLastActivity,\n  );\n\n  setIfChanged(\n    "show_inventory",\n    character.show_inventory,\n    showInventory,\n  );\n\n  if (', 'save inventory privacy setting')
write(path, text)

path = 'types/public-character.ts'
text = read(path)
text = replace_once(text, '  current_health: number | null;\n  show_last_activity: boolean;\n  status: PublicCharacterStatus;', '  current_health: number | null;\n  show_last_activity: boolean;\n  show_inventory: boolean;\n  status: PublicCharacterStatus;', 'public character type')
write(path, text)

path = 'lib/characters/get-public-character.ts'
text = read(path)
text = replace_once(text, '  current_health: number | null;\n  show_last_activity: boolean;\n  status:', '  current_health: number | null;\n  show_last_activity: boolean;\n  show_inventory: boolean;\n  status:', 'public loader row type')
text = replace_once(text, '        current_health,\n        show_last_activity,\n        status,', '        current_health,\n        show_last_activity,\n        show_inventory,\n        status,', 'public loader select')
text = replace_once(text, '      show_last_activity:\n        row.show_last_activity,\n      status: row.status,', '      show_last_activity:\n        row.show_last_activity,\n      show_inventory:\n        row.show_inventory,\n      status: row.status,', 'public loader return')
write(path, text)

path = 'app/(portal)/characters/[slug]/page.tsx'
text = read(path)
text = replace_once(text, '        canViewLastActivity={\n          character.show_last_activity ||\n          staffSession !== null ||\n          activeCharacter?.id === character.id\n        }\n        viewerIsStaff={', '        canViewLastActivity={\n          character.show_last_activity ||\n          staffSession !== null ||\n          activeCharacter?.id === character.id\n        }\n        canViewInventory={\n          character.show_inventory ||\n          staffSession !== null ||\n          activeCharacter?.id === character.id\n        }\n        viewerIsStaff={', 'public page inventory visibility')
write(path, text)

path = 'components/characters/public-character-profile.tsx'
text = read(path)
text = replace_once(text, '  canMessage: boolean;\n  canViewLastActivity: boolean;\n  viewerIsStaff: boolean;', '  canMessage: boolean;\n  canViewLastActivity: boolean;\n  canViewInventory: boolean;\n  viewerIsStaff: boolean;', 'public profile props type')
text = replace_once(text, '  canMessage,\n  canViewLastActivity,\n  viewerIsStaff,', '  canMessage,\n  canViewLastActivity,\n  canViewInventory,\n  viewerIsStaff,', 'public profile props destructure')
text = replace_once(text, '            <CharacterInventoryDisplay\n              characterId={character.id}\n            />', '            <CharacterInventoryDisplay\n              characterId={character.id}\n              showInventoryItems={\n                canViewInventory\n              }\n            />', 'public Inventory rendering')
write(path, text)

path = 'components/characters/character-inventory-display.tsx'
text = read(path)
text = replace_once(text, 'export async function CharacterInventoryDisplay({\n  characterId,\n  own = false,\n}: {\n  characterId: string;\n  own?: boolean;\n}) {', 'export async function CharacterInventoryDisplay({\n  characterId,\n  own = false,\n  showInventoryItems = true,\n}: {\n  characterId: string;\n  own?: boolean;\n  showInventoryItems?: boolean;\n}) {', 'Inventory display props')
text = replace_once(text, '  const rows =\n    (data ?? []) as unknown as InventoryRow[];\n\n  const itemIds = [', '  const allRows =\n    (data ?? []) as unknown as InventoryRow[];\n\n  const inventoryItemsVisible =\n    own || showInventoryItems;\n\n  const rows =\n    inventoryItemsVisible\n      ? allRows\n      : allRows.filter(\n          (row) =>\n            row.is_equipped === true,\n        );\n\n  const itemIds = [', 'server-side hidden inventory filtering')
text = replace_once(text, '      own={own}\n      useTargets={useTargets}\n    />', '      own={own}\n      useTargets={useTargets}\n      showInventoryItems={\n        inventoryItemsVisible\n      }\n    />', 'pass visibility to browser')
write(path, text)

path = 'components/characters/character-inventory-browser.tsx'
text = read(path)
text = replace_once(text, 'export function CharacterInventoryBrowser({\n  rows,\n  characterName,\n  own = false,\n  useTargets = [],\n}: {\n  rows:\n    InventoryBrowserRow[];\n  characterName: string;\n  own?: boolean;\n  useTargets?: InventoryUseTarget[];\n}) {', 'export function CharacterInventoryBrowser({\n  rows,\n  characterName,\n  own = false,\n  useTargets = [],\n  showInventoryItems = true,\n}: {\n  rows:\n    InventoryBrowserRow[];\n  characterName: string;\n  own?: boolean;\n  useTargets?: InventoryUseTarget[];\n  showInventoryItems?: boolean;\n}) {', 'Inventory browser props')
text = replace_once(text, '  if (!rows.length) {\n    return (\n      <section className="border border-[rgb(var(--sep-colour-60482e))]/35 bg-[rgb(var(--sep-colour-130f0c))] p-6">', '  if (!showInventoryItems) {\n    return (\n      <section className="border border-[rgb(var(--sep-colour-60482e))]/35 bg-[rgb(var(--sep-colour-130f0c))] p-4 sm:p-5">\n        <div className="flex flex-wrap items-end justify-between gap-3">\n          <div>\n            <p className="text-[8px] uppercase tracking-[0.22em] text-[rgb(var(--sep-colour-806b50))]">\n              Possessions\n            </p>\n\n            <h2 className="mt-1 font-serif text-2xl text-[rgb(var(--sep-colour-dfc79c))]">\n              Inventory\n            </h2>\n          </div>\n\n          <p className="text-[8px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-756958))]">\n            Private\n          </p>\n        </div>\n\n        <EquipmentFigure\n          equipped={equipped}\n          inventory={[]}\n          own={false}\n          collapsed={equipmentCollapsed}\n          onToggle={() =>\n            setEquipmentCollapsed(\n              (value) => !value,\n            )\n          }\n        />\n\n        <div className="mt-5 border border-[rgb(var(--sep-colour-60482e))]/35 bg-[rgb(var(--sep-colour-100c09))] px-5 py-6 text-center">\n          <p className="font-serif text-lg text-[rgb(var(--sep-colour-bda681))]">\n            Inventory hidden by this character\n          </p>\n\n          <p className="mt-2 text-[11px] leading-5 text-[rgb(var(--sep-colour-817565))]">\n            Equipped Items remain publicly visible above.\n          </p>\n        </div>\n      </section>\n    );\n  }\n\n  if (!rows.length) {\n    return (\n      <section className="border border-[rgb(var(--sep-colour-60482e))]/35 bg-[rgb(var(--sep-colour-130f0c))] p-6">', 'hidden Inventory browser branch')
write(path, text)

print('\nInventory privacy patch applied. Run: npm run build')
