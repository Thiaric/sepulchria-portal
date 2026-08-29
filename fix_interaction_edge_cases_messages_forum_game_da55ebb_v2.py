from pathlib import Path
import subprocess

BASE = 'da55ebb'

head = subprocess.run(
    ["git", "rev-parse", "--short", "HEAD"],
    check=True, capture_output=True, text=True, encoding='utf-8'
).stdout.strip()

if not head.startswith(BASE):
    raise SystemExit(f'This patch expects HEAD {BASE}; current HEAD is {head}. No files were changed.')

repls = [('components/portal/portal-interaction-layer.tsx', 'const CONTROL_SELECTOR = [\n  "button:not(:disabled)",\n  "a[href]",\n  \'[role="button"]\',\n].join(", ");', 'const CONTROL_SELECTOR = [\n  "button",\n  "a[href]",\n  \'[role="button"]\',\n].join(", ");', 'CONTROL_SELECTOR'), ('components/portal/portal-interaction-layer.tsx', '  if (\n    control &&\n    portal.contains(control) &&\n    !control.closest(\n      \'[data-sep-interaction-ignore="true"]\',\n    )\n  ) {\n    return {\n      element: control,\n      kind: classifyControl(control),\n    };\n  }', '  if (\n    control &&\n    portal.contains(control) &&\n    !control.closest(\n      \'[data-sep-interaction-ignore="true"]\',\n    )\n  ) {\n    if (\n      control.matches(":disabled") ||\n      control.getAttribute("aria-disabled") === "true"\n    ) {\n      return null;\n    }\n\n    return {\n      element: control,\n      kind: classifyControl(control),\n    };\n  }', 'control resolution block'), ('app/(portal)/game/page.tsx', '  <article className="flex min-h-0 flex-1 flex-col overflow-visible border border-[rgb(var(--sep-colour-6a5032))]/50 bg-[rgb(var(--sep-colour-17110d))] lg:overflow-hidden">\n\n    {room.slug === "house-of-chances" && houseOfChancesState ? (', '  <article\n    data-sep-interaction-fixed="true"\n    className="flex min-h-0 flex-1 flex-col overflow-visible border border-[rgb(var(--sep-colour-6a5032))]/50 bg-[rgb(var(--sep-colour-17110d))] lg:overflow-hidden"\n  >\n    <div data-sep-interaction-ignore="true" className="contents">\n\n    {room.slug === "house-of-chances" && houseOfChancesState ? (', 'game play article opening'), ('app/(portal)/game/page.tsx', '        />\n\n        <RoomChatForm', '        />\n\n        </div>\n\n        <RoomChatForm', 'static game region closing'), ('app/(portal)/messages/[id]/components/ConversationMessageList.tsx', 'data-sep-danger="true"\n                            className="border border-[rgb(var(--sep-colour-7b4035))]/80 bg-[rgb(var(--sep-colour-27120f))] px-2.5 py-1.5 text-[7px]', 'data-sep-danger="true"\n                            className="red-danger border border-[rgb(var(--sep-colour-7b4035))]/80 bg-[rgb(var(--sep-colour-27120f))] px-2 py-1 text-[7px]', 'individual message Delete styling'), ('app/(portal)/messages/[id]/components/ConversationMessageList.tsx', 'data-sep-danger="true"\n                  className="border border-[rgb(var(--sep-colour-a65343))] bg-[rgb(var(--sep-colour-301713))] px-4 py-2 text-[8px]', 'data-sep-danger="true"\n                  className="red-danger border border-[rgb(var(--sep-colour-a65343))] bg-[rgb(var(--sep-colour-301713))] px-4 py-2 text-[8px]', 'Delete selected styling'), ('app/(portal)/messages/[id]/components/DeleteConversationForm.tsx', 'data-sep-danger="true"\n        className="border border-[rgb(var(--sep-colour-7b4035))] bg-[rgb(var(--sep-colour-27120f))] px-3 py-2 text-[10px]', 'data-sep-danger="true"\n        className="red-danger border border-[rgb(var(--sep-colour-7b4035))] bg-[rgb(var(--sep-colour-27120f))] px-3 py-2 text-[10px]', 'Delete Conversation styling'), ('app/(portal)/messages/components/MessageComposer.tsx', '          <button\n            type="button"\n            onClick={() =>\n              setMessageMode("offgame")\n            }\n            aria-pressed={!isOnGame}', '          <button\n            type="button"\n            data-sep-offgame-selector="true"\n            onClick={() =>\n              setMessageMode("offgame")\n            }\n            aria-pressed={!isOnGame}', 'OFF-GAME selector marker'), ('components/forum/forum-topic-favourite-button.tsx', '      disabled={loading || saving}\n      aria-pressed={favourite}', '      disabled={loading || saving}\n      data-forum-favourite={favourite ? "true" : "false"}\n      aria-pressed={favourite}', 'favourite state marker'), ('app/(portal)/forum/[sectionSlug]/page.tsx', '    <article\n      className={`group relative grid gap-4 border transition md:grid-cols-[minmax(0,1fr)_110px_190px] md:items-center ${', '    <article\n      data-forum-topic-row="true"\n      className={`group relative grid gap-4 border transition md:grid-cols-[minmax(0,1fr)_110px_190px] md:items-center ${', 'forum topic row marker')]

texts = {}
for path, old, new, label in repls:
    p = Path(path)
    if not p.exists():
        raise SystemExit(f'Missing {path}. No files were changed.')
    if path not in texts:
        texts[path] = p.read_text(encoding='utf-8')
    if old not in texts[path]:
        raise SystemExit(f'Could not find {label} in {path}. No files were changed.')
    texts[path] = texts[path].replace(old, new, 1)

css_path = Path('components/sepulchria/sep-ui-unified.css')
css = css_path.read_text(encoding='utf-8')
extra_css = '\n\n/* ==================================================================\n   SEPULCHRIA MESSAGE + FAVOURITE CORRECTIONS\n   ================================================================== */\n\n[data-portal-shell]\n  button.red-danger[data-sep-danger="true"] {\n  border-color:\n    rgb(var(--sep-colour-7b4035)) !important;\n  background-color:\n    rgb(var(--sep-colour-27120f)) !important;\n  color:\n    rgb(var(--sep-colour-d99b8e)) !important;\n}\n\n[data-portal-shell]\n  button.red-danger[data-sep-danger="true"]:hover:not(:disabled) {\n  border-color:\n    rgb(var(--sep-colour-ad5a4c)) !important;\n  background-color:\n    rgb(var(--sep-colour-391713)) !important;\n  color:\n    rgb(var(--sep-colour-f1b2a5)) !important;\n}\n\n/*\n * Deliberately stronger than the global unified button rule.\n * Existing skin surface, only darkened — no new hue.\n */\nbody.portal-skin-scope\n  [data-portal-shell]\n  button[data-sep-offgame-selector="true"] {\n  background-color:\n    color-mix(\n      in srgb,\n      rgb(var(--sep-colour-100c09)) 42%,\n      black\n    ) !important;\n}\n\nbody.portal-skin-scope\n  [data-portal-shell]\n  button[data-sep-offgame-selector="true"]:hover:not(:disabled) {\n  background-color:\n    color-mix(\n      in srgb,\n      rgb(var(--sep-colour-100c09)) 52%,\n      black\n    ) !important;\n}\n\n[data-portal-shell]\n  [data-forum-topic-row="true"]:has(\n    [data-forum-favourite="true"]\n  ) {\n  background-color:\n    color-mix(\n      in srgb,\n      rgb(var(--sep-colour-100c09)) 58%,\n      black\n    ) !important;\n}\n\n[data-portal-shell]\n  [data-forum-topic-row="true"]:has(\n    [data-forum-favourite="true"]\n  ):hover {\n  background-color:\n    color-mix(\n      in srgb,\n      rgb(var(--sep-colour-15100d)) 66%,\n      black\n    ) !important;\n}\n'
marker = 'SEPULCHRIA MESSAGE + FAVOURITE CORRECTIONS'
if marker not in css:
    css += extra_css

for path, text in texts.items():
    Path(path).write_text(text, encoding='utf-8')
css_path.write_text(css, encoding='utf-8')

print('SUCCESS')
print('')
print('Fixed:')
print('  - Delete controls are red again.')
print('  - Compact message Delete matches Forward padding/height.')
print('  - Delete Conversation stays header-sized like Archive.')
print('  - OFF-GAME selector is distinctly darker than ON-GAME.')
print('  - Entire location/game surface above the composer is static.')
print('  - House of Chances / Odd Jobs / other special room panels are static.')
print('  - Bottom RoomChatForm buttons remain interactive.')
print('  - Favourite-star loading/saving no longer animates the parent row.')
print('  - Favourited forum topic rows have a distinctly darker background.')
print('')
print('Run: npm run build')
