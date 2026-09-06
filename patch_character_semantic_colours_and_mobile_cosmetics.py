from pathlib import Path
import shutil

ROOT = Path.cwd()
css = ROOT / 'components' / 'sepulchria' / 'sep-ui-unified.css'
mobile = ROOT / 'components' / 'portal' / 'mobile-portal-navigation.tsx'

if not css.exists() or not mobile.exists():
    raise SystemExit('Run this from the sepulchria-portal repo root.')

css_text = css.read_text(encoding='utf-8')
mobile_text = mobile.read_text(encoding='utf-8')

marker = 'CHARACTER SHEET SEMANTIC C1/C2'
if marker not in css_text:
    css_text += '''

/* CHARACTER SHEET SEMANTIC C1/C2 */
body[data-portal-skin] [data-character-sheet-panel="profile"] section > h2,
body[data-portal-skin] [data-character-sheet-panel="offgame"] section > h2 {
  color: rgb(var(--sep-skin-c1)) !important;
}

body[data-portal-skin] [data-character-sheet-panel="profile"] section > p,
body[data-portal-skin] [data-character-sheet-panel="offgame"] section > p {
  color: rgb(var(--sep-skin-c2)) !important;
}

body[data-portal-skin] [aria-label="Displayed Trophies"] [role="tooltip"] > span:first-child {
  color: rgb(var(--sep-skin-c1)) !important;
}

body[data-portal-skin] [aria-label="Displayed Trophies"] [role="tooltip"] > span:nth-child(2) {
  color: rgb(var(--sep-skin-c2)) !important;
}
'''

definition_anchor = '''  const rankingEntry: LinkEntry = {
    href: "/ranking",
    label: "Hall of Renown",
    icon: "/icons/ranking.png",
    modal: {
      label: "Hall of Renown",
      title:
        "Enter the Hall of Renown and view Sepulchria's records of standing and achievement.",
      icon:
        "/icons/ranking.png",
      href: "/ranking",
    },
  };

  const legalEntries: LinkEntry[] = ['''

definition_replacement = '''  const rankingEntry: LinkEntry = {
    href: "/ranking",
    label: "Hall of Renown",
    icon: "/icons/ranking.png",
    modal: {
      label: "Hall of Renown",
      title:
        "Enter the Hall of Renown and view Sepulchria's records of standing and achievement.",
      icon:
        "/icons/ranking.png",
      href: "/ranking",
    },
  };

  const cosmeticsEntry: LinkEntry = {
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

if 'const cosmeticsEntry: LinkEntry' not in mobile_text:
    count = mobile_text.count(definition_anchor)
    if count != 1:
        raise SystemExit(f'STOP: cosmetics definition anchor: expected 1 match, found {count}. No files changed.')
    mobile_text = mobile_text.replace(definition_anchor, definition_replacement, 1)

render_anchor = '''                    <EntryButton
                      entry={rankingEntry}
                    />

                     {isStaff ? ('''

render_replacement = '''                    <EntryButton
                      entry={rankingEntry}
                    />

                    <EntryButton
                      entry={cosmeticsEntry}
                    />

                     {isStaff ? ('''

if 'entry={cosmeticsEntry}' not in mobile_text:
    count = mobile_text.count(render_anchor)
    if count != 1:
        raise SystemExit(f'STOP: cosmetics render anchor: expected 1 match, found {count}. No files changed.')
    mobile_text = mobile_text.replace(render_anchor, render_replacement, 1)

for path in (css, mobile):
    backup = path.with_suffix(path.suffix + '.before_character_skin_cosmetics_mobile.bak')
    if not backup.exists():
        shutil.copy2(path, backup)

css.write_text(css_text, encoding='utf-8')
mobile.write_text(mobile_text, encoding='utf-8')

print('DONE')
print('Profile/Offgame headings -> C1; body -> C2; Trophy tooltip name -> C1; description -> C2.')
print('Cosmetics added to mobile More menu.')
print('No DB changes. No GitHub push.')
print('Now run: npm run build')
