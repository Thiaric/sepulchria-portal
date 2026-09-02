from pathlib import Path
import subprocess

ROOT = Path.cwd()
head = subprocess.check_output(['git','rev-parse','--short','HEAD'], text=True).strip()
if not head.startswith('8c67697'):
    raise SystemExit(f'Expected HEAD 8c67697, found {head}. Stop and have ChatGPT re-inspect.')

def read(rel):
    return (ROOT / rel).read_text(encoding='utf-8')

def write(rel, content):
    p = ROOT / rel
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(content, encoding='utf-8')

def repl(text, old, new, label):
    if new in text:
        return text
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected 1 old match or existing new form, found {count}')
    return text.replace(old, new, 1)

# The first script already wrote the standalone files before it stopped.
required = [
    'lib/cosmetics/catalogue.ts',
    'components/cosmetics/cosmetic-frame-overlay.tsx',
    'lib/cosmetics/get-equipped-cosmetic.ts',
    'app/api/cosmetics/equipped/route.ts',
    'components/cosmetics/cosmetic-runtime.tsx',
    'app/(portal)/cosmetics/actions.ts',
    'app/(portal)/cosmetics/page.tsx',
    'components/cosmetics/player-cosmetics-manager.tsx',
    'app/(portal)/admin/characters/cosmetic-actions.ts',
    'components/admin/admin-character-cosmetics-access.tsx',
    'cosmetics_full_system_8c67697.sql',
]
missing = [rel for rel in required if not (ROOT / rel).exists()]
if missing:
    raise SystemExit(
        'The first patch did not create all prerequisite files: ' + ', '.join(missing)
    )

rel='app/api/admin/cosmetics/route.ts'; text=read(rel)

catalogue_import = 'import { COSMETIC_CATEGORY_SET } from "@/lib/cosmetics/catalogue";'
admin_import = 'import { createAdminClient } from "@/lib/supabase/admin";'

if catalogue_import not in text:
    if admin_import not in text:
        raise SystemExit('admin api import: createAdminClient import not found')
    text = text.replace(
        admin_import,
        admin_import + '\n' + catalogue_import,
        1,
    )

old_categories = 'const CATEGORIES = new Set(["sheet_frame", "chat_frame"]);'
new_categories = 'const CATEGORIES = COSMETIC_CATEGORY_SET;'
if new_categories not in text:
    if old_categories not in text:
        raise SystemExit('admin api categories: neither old nor new form found')
    text = text.replace(old_categories, new_categories, 1)

old_error = 'if (!CATEGORIES.has(category)) return bad("Only Sheet Frame and Chat Frame cosmetics are available in Phase 1.");'
new_error = 'if (!CATEGORIES.has(category)) return bad("Unsupported cosmetic category.");'
if new_error not in text:
    if old_error not in text:
        raise SystemExit('admin api validation: neither old nor new form found')
    text = text.replace(old_error, new_error, 1)

write(rel,text)

rel='components/admin/cosmetics-feature-manager.tsx'; text=read(rel)
text=repl(text, 'import { createClient } from "@/lib/supabase/client";\\n', 'import { createClient } from "@/lib/supabase/client";\\nimport { COSMETIC_CATEGORIES, COSMETIC_LABELS, type CosmeticCategory } from "@/lib/cosmetics/catalogue";\\n', 'admin manager catalogue import')
text=repl(text, '  category: "sheet_frame" | "chat_frame";', '  category: CosmeticCategory;', 'admin manager category type')
text=repl(text, 'function categoryLabel(category: CosmeticAdminRow["category"]) {\\n  return category === "sheet_frame" ? "Sheet Frame" : "Location Chat Frame";\\n}', 'function categoryLabel(category: CosmeticAdminRow["category"]) {\\n  return COSMETIC_LABELS[category];\\n}', 'admin manager category label')
text=repl(text, '          Phase 1 supports Sheet Frames and Location Chat Frames. The actual asset should be transparent PNG,\\n          WebP or SVG; the separate store/admin preview is optional.', '          All character-facing and portal-facing cosmetic categories are supported. Transparent PNG is recommended for frames and overlays; PNG or WebP works well for backgrounds.', 'admin manager description')
text=repl(text, '                <option value="sheet_frame">Sheet Frame</option>\\n                <option value="chat_frame">Location Chat Frame</option>', '                {COSMETIC_CATEGORIES.map((category) => (\\n                  <option key={category} value={category}>\\n                    {COSMETIC_LABELS[category]}\\n                  </option>\\n                ))}', 'admin manager options')
write(rel,text)

rel='app/(portal)/admin/characters/[id]/premium-features/page.tsx'; text=read(rel)
text=repl(text, '      .eq(\n        "is_active",\n        true,\n      )\n      .in(\n        "category",\n        [\n          "sheet_frame",\n          "chat_frame",\n        ],\n      )\n      .order(\n', '      .eq(\n        "is_active",\n        true,\n      )\n      .order(\n', 'premium page cosmetic filter')
write(rel,text)

rel='app/(portal)/layout.tsx'; text=read(rel)
text=repl(text, 'import { Suspense, type ReactNode } from "react";', 'import { Suspense, type ReactNode, type CSSProperties } from "react";', 'layout react import')
text=repl(text, 'import { ExperienceLogoutGuard } from "@/components/experience/experience-logout-guard";\\n', 'import { ExperienceLogoutGuard } from "@/components/experience/experience-logout-guard";\\nimport { CosmeticRuntime } from "@/components/cosmetics/cosmetic-runtime";\\nimport { getEquippedCosmetics } from "@/lib/cosmetics/get-equipped-cosmetic";\\nimport { cssImageUrl } from "@/components/cosmetics/cosmetic-frame-overlay";\\n', 'layout cosmetic imports')
text=repl(text, '  const presenceEnabled =\n    context.character?.status ===\n    "approved";\n\n  return (\n', '  const presenceEnabled =\n    context.character?.status ===\n    "approved";\n\n  const portalCosmetics =\n    context.character\n      ? await getEquippedCosmetics(\n          context.character.id,\n          [\n            "header_control_frame",\n            "left_panel_frame",\n            "right_panel_frame",\n            "centre_panel_frame",\n            "location_frame",\n            "location_atmosphere",\n          ],\n        )\n      : {};\n\n  const portalCosmeticStyle = {\n    "--sep-cosmetic-header-control-frame":\n      cssImageUrl(portalCosmetics.header_control_frame?.assetUrl),\n    "--sep-cosmetic-left-panel-frame":\n      cssImageUrl(portalCosmetics.left_panel_frame?.assetUrl),\n    "--sep-cosmetic-right-panel-frame":\n      cssImageUrl(portalCosmetics.right_panel_frame?.assetUrl),\n    "--sep-cosmetic-centre-panel-frame":\n      cssImageUrl(portalCosmetics.centre_panel_frame?.assetUrl),\n    "--sep-cosmetic-location-frame":\n      cssImageUrl(portalCosmetics.location_frame?.assetUrl),\n    "--sep-cosmetic-location-atmosphere":\n      cssImageUrl(portalCosmetics.location_atmosphere?.assetUrl),\n  } as CSSProperties;\n\n  return (\n', 'layout portal cosmetics resolver')
text=repl(text, 'className="flex h-full min-h-0 flex-col bg-[radial-gradient(circle_at_top,_rgba(var(--sep-rgb-116-82-42),0.16),_transparent_38%),linear-gradient(to_bottom,_#17120f,_#0d0b0a)]"', 'style={portalCosmeticStyle}\\n            className="flex h-full min-h-0 flex-col bg-[radial-gradient(circle_at_top,_rgba(var(--sep-rgb-116-82-42),0.16),_transparent_38%),linear-gradient(to_bottom,_#17120f,_#0d0b0a)]"', 'layout cosmetic style')
text=repl(text, '              .portal-left-shell,\n              .portal-right-shell {\n                display: contents;\n              }\n', '              .portal-left-shell,\n              .portal-right-shell {\n                display: contents;\n              }\n\n              @media (min-width: 1024px) {\n                [data-cosmetic-header-controls] :is(button,a) {\n                  border-style: solid;\n                  border-color: transparent;\n                  border-image-source: var(--sep-cosmetic-header-control-frame);\n                  border-image-slice: 18%;\n                  border-image-width: 1;\n                  border-image-repeat: stretch;\n                }\n\n                .portal-left-shell > [data-portal-column] {\n                  border: 8px solid transparent;\n                  border-image-source: var(--sep-cosmetic-left-panel-frame);\n                  border-image-slice: 10%;\n                  border-image-width: 1;\n                  border-image-repeat: stretch;\n                }\n\n                .portal-right-shell > [data-portal-column] {\n                  border: 8px solid transparent;\n                  border-image-source: var(--sep-cosmetic-right-panel-frame);\n                  border-image-slice: 10%;\n                  border-image-width: 1;\n                  border-image-repeat: stretch;\n                }\n\n                [data-portal-centre-host] > [data-portal-column] {\n                  border: 8px solid transparent;\n                  border-image-source: var(--sep-cosmetic-centre-panel-frame);\n                  border-image-slice: 10%;\n                  border-image-width: 1;\n                  border-image-repeat: stretch;\n                }\n              }\n\n              [data-game-location-surface] {\n                border: 10px solid transparent;\n                border-image-source: var(--sep-cosmetic-location-frame);\n                border-image-slice: 12% 8%;\n                border-image-width: 1;\n                border-image-repeat: stretch;\n                background-image: var(--sep-cosmetic-location-atmosphere);\n                background-size: cover;\n                background-position: center;\n                background-repeat: no-repeat;\n              }\n', 'layout cosmetic css')
text=repl(text, '            <PortalInteractionLayer />\\n', '            <PortalInteractionLayer />\\n            <CosmeticRuntime />\\n', 'mount cosmetic runtime')
write(rel,text)

rel='components/portal/portal-header.tsx'; text=read(rel)
text=repl(text, '<div className="flex shrink-0 items-center gap-1.5 sm:gap-2 lg:gap-2.5 2xl:gap-3">', '<div data-cosmetic-header-controls className="flex shrink-0 items-center gap-1.5 sm:gap-2 lg:gap-2.5 2xl:gap-3">', 'header control marker')
write(rel,text)

rel='app/(portal)/game/page.tsx'; text=read(rel)
text=repl(text, '  <div\\n  className={\\n    privateLocation', '  <div\\n  data-game-location-surface\\n  className={\\n    privateLocation', 'game location surface')
write(rel,text)

rel='app/(portal)/game/components/RoomMessageList.tsx'; text=read(rel)
text=repl(text, '                            paddingLeft: "4px",\\n                            paddingTop: "4px",\\n                            paddingBottom: "4px",', '                            paddingLeft: "4px",\\n                            paddingRight: "4px",\\n                            paddingTop: "4px",\\n                            paddingBottom: "4px",', 'chat horizontal gap')
text=repl(text, '                      key={item.id}\\n                      className={`relative flex gap-3 py-3 pl-5 pr-12 sm:pl-7 sm:pr-12 ${', '                      key={item.id}\\n                      data-cosmetic-character-id={item.character_id}\\n                      data-cosmetic-surface={isWhisper ? "whisper" : undefined}\\n                      className={`relative flex gap-3 py-3 pl-5 pr-12 sm:pl-7 sm:pr-12 ${', 'whisper cosmetic surface')
text=repl(text, '                    key={item.id}\\n                    className={`relative flex min-w-0 gap-3 py-3 pl-5 pr-12 sm:pl-7 sm:pr-12 ${', '                    key={item.id}\\n                    data-cosmetic-character-id={item.character_id}\\n                    data-cosmetic-surface={!isMechanicalOutput ? "action" : undefined}\\n                    className={`relative flex min-w-0 gap-3 py-3 pl-5 pr-12 sm:pl-7 sm:pr-12 ${', 'action cosmetic surface')
text=repl(text, '    <div className="h-9 w-9 shrink-0 overflow-hidden border border-[rgb(var(--sep-colour-60482e))] bg-[rgb(var(--sep-colour-0d0a08))]">', '    <div\\n      data-cosmetic-character-id={author?.id}\\n      data-cosmetic-surface="portrait"\\n      className="h-9 w-9 shrink-0 overflow-hidden border border-[rgb(var(--sep-colour-60482e))] bg-[rgb(var(--sep-colour-0d0a08))]"\\n    >', 'chat portrait surface')
write(rel,text)

rel='app/(portal)/character/page.tsx'; text=read(rel)
text=repl(text, '        <div\\n          className="relative isolate"\\n          style={cosmeticFrameStyle(', '        <div\\n          data-cosmetic-character-id={character.id}\\n          data-cosmetic-surface="sheet"\\n          className="relative isolate"\\n          style={cosmeticFrameStyle(', 'own sheet surface')
text=repl(text, '              <div className="mx-auto w-full max-w-[180px] lg:mx-0">', '              <div\\n                data-cosmetic-character-id={character.id}\\n                data-cosmetic-surface="portrait"\\n                className="mx-auto w-full max-w-[180px] lg:mx-0"\\n              >', 'own portrait surface')
text=repl(text, '                      <h1 className="min-w-0 break-words font-serif text-[1.7rem] text-[rgb(var(--sep-colour-ecd9b2))] sm:text-[1.95rem]">', '                      <h1\\n                        data-cosmetic-character-id={character.id}\\n                        data-cosmetic-surface="nameplate"\\n                        className="min-w-0 break-words font-serif text-[1.7rem] text-[rgb(var(--sep-colour-ecd9b2))] sm:text-[1.95rem]"\\n                      >', 'own nameplate surface')
write(rel,text)

rel='components/characters/public-character-profile.tsx'; text=read(rel)
text=repl(text, '      <div\\n        className="relative isolate"\\n        style={cosmeticFrameStyle(', '      <div\\n        data-cosmetic-character-id={character.id}\\n        data-cosmetic-surface="sheet"\\n        className="relative isolate"\\n        style={cosmeticFrameStyle(', 'public sheet surface')
text=repl(text, '              <div className="relative aspect-[3/4] w-full overflow-hidden border border-[rgb(var(--sep-colour-60482e))]/50 bg-[rgb(var(--sep-colour-0d0a08))]">', '              <div\\n                data-cosmetic-character-id={character.id}\\n                data-cosmetic-surface="portrait"\\n                className="relative aspect-[3/4] w-full overflow-hidden border border-[rgb(var(--sep-colour-60482e))]/50 bg-[rgb(var(--sep-colour-0d0a08))]"\\n              >', 'public portrait surface')
text=repl(text, '                    <h1 className="min-w-0 break-words font-serif text-3xl text-[rgb(var(--sep-colour-ecd9b2))] sm:text-[2.15rem]">', '                    <h1\\n                      data-cosmetic-character-id={character.id}\\n                      data-cosmetic-surface="nameplate"\\n                      className="min-w-0 break-words font-serif text-3xl text-[rgb(var(--sep-colour-ecd9b2))] sm:text-[2.15rem]"\\n                    >', 'public nameplate surface')
write(rel,text)

rel='app/(portal)/messages/[id]/components/ConversationMessageList.tsx'; text=read(rel)
text=repl(text, '                key={message.id}\\n                data-sep-interaction-ignore="true"', '                key={message.id}\\n                data-sep-interaction-ignore="true"\\n                data-cosmetic-character-id={message.sender_character_id}\\n                data-cosmetic-surface={ongame ? "pm" : undefined}', 'pm message surface')
text=repl(text, '                  <div className="h-8 w-8 shrink-0 overflow-hidden border border-[rgb(var(--sep-colour-60482e))]/75 bg-[rgb(var(--sep-colour-0d0907))]">', '                  <div\\n                    data-cosmetic-character-id={message.sender_character_id}\\n                    data-cosmetic-surface="portrait"\\n                    className="h-8 w-8 shrink-0 overflow-hidden border border-[rgb(var(--sep-colour-60482e))]/75 bg-[rgb(var(--sep-colour-0d0907))]"\\n                  >', 'pm portrait surface')
text=repl(text, '                        <p\\n                          className={`font-serif text-sm ${', '                        <p\\n                          data-cosmetic-character-id={message.sender_character_id}\\n                          data-cosmetic-surface="nameplate"\\n                          className={`font-serif text-sm ${', 'pm nameplate surface')
write(rel,text)

rel='components/instant-chat/instant-chat-dock.tsx'; text=read(rel)
text=repl(text, '                        <div\\n                          className={`max-w-[82%] border px-2 py-1.5 text-[10px] leading-4 ${', '                        <div\\n                          data-cosmetic-character-id={message.sender_character_id}\\n                          data-cosmetic-surface="instant"\\n                          className={`max-w-[82%] border px-2 py-1.5 text-[10px] leading-4 ${', 'instant message surface')
text=repl(text, '            <div className="h-6 w-6 shrink-0 overflow-hidden border border-[rgb(var(--sep-colour-60482e))] bg-[rgb(var(--sep-colour-0d0907))]">', '            <div\\n              data-cosmetic-character-id={other.character_id}\\n              data-cosmetic-surface="portrait"\\n              className="h-6 w-6 shrink-0 overflow-hidden border border-[rgb(var(--sep-colour-60482e))] bg-[rgb(var(--sep-colour-0d0907))]"\\n            >', 'instant portrait surface')
text=repl(text, '              <p className="truncate font-serif text-[11px] leading-tight text-[rgb(var(--sep-colour-e1c89d))]">', '              <p\\n                data-cosmetic-character-id={other.character_id}\\n                data-cosmetic-surface="nameplate"\\n                className="truncate font-serif text-[11px] leading-tight text-[rgb(var(--sep-colour-e1c89d))]"\\n              >', 'instant nameplate surface')
write(rel,text)

rel='components/forum/topic-post.tsx'; text=read(rel)
text=repl(text, '      id={`post-${post.id}`}\\n      data-sep-interaction-fixed="true"', '      id={`post-${post.id}`}\\n      data-sep-interaction-fixed="true"\\n      data-cosmetic-character-id={post.author_character?.id}\\n      data-cosmetic-surface={!post.is_anonymous ? "forum" : undefined}', 'forum post surface')
text=repl(text, '              <h2\\n  className={`font-serif text-base leading-tight ${', '              <h2\\n  data-cosmetic-character-id={post.author_character?.id}\\n  data-cosmetic-surface={!post.is_anonymous ? "nameplate" : undefined}\\n  className={`font-serif text-base leading-tight ${', 'forum nameplate surface')
text=repl(text, '      <div className="h-20 w-20 shrink-0 overflow-hidden border border-[rgb(var(--sep-colour-6b5031))]/55 bg-[rgb(var(--sep-colour-0b0806))] lg:h-44 lg:w-full">', '      <div\\n        data-cosmetic-character-id={character?.id}\\n        data-cosmetic-surface="portrait"\\n        className="h-20 w-20 shrink-0 overflow-hidden border border-[rgb(var(--sep-colour-6b5031))]/55 bg-[rgb(var(--sep-colour-0b0806))] lg:h-44 lg:w-full"\\n      >', 'forum portrait image surface')
text=repl(text, '    <div className="flex h-20 w-20 shrink-0 items-center justify-center border border-[rgb(var(--sep-colour-6b5031))]/55 bg-[rgb(var(--sep-colour-1b130e))] font-serif text-2xl text-[rgb(var(--sep-colour-a98a61))] lg:h-44 lg:w-full lg:text-4xl">', '    <div\\n      data-cosmetic-character-id={character?.id}\\n      data-cosmetic-surface="portrait"\\n      className="flex h-20 w-20 shrink-0 items-center justify-center border border-[rgb(var(--sep-colour-6b5031))]/55 bg-[rgb(var(--sep-colour-1b130e))] font-serif text-2xl text-[rgb(var(--sep-colour-a98a61))] lg:h-44 lg:w-full lg:text-4xl"\\n    >', 'forum fallback portrait surface')
write(rel,text)

rel='components/portal/portal-context-panel.tsx'; text=read(rel)
text=repl(text, '        Manage the visual treatments your character owns and choose which cosmetic is currently equipped in each slot.', '        Manage character-facing and portal-facing visual treatments, including profiles, messages, panels, location styling and identity ornaments.', 'cosmetics context description')
write(rel,text)

print('Full cosmetics expansion applied. Next run cosmetics_full_system_8c67697.sql in Supabase, then npm run build.')
