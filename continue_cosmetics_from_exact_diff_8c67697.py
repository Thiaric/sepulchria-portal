from pathlib import Path
import re
import subprocess

ROOT = Path.cwd()

head = subprocess.check_output(
    ["git", "rev-parse", "--short", "HEAD"],
    text=True,
).strip()

if not head.startswith("8c67697"):
    raise SystemExit(
        f"Expected HEAD 8c67697, found {head}. "
        "This patch is for the exact current working tree based on that commit."
    )

def read(rel):
    return (ROOT / rel).read_text(encoding="utf-8")

def write(rel, text):
    (ROOT / rel).write_text(text, encoding="utf-8")

def must_exist(rel):
    if not (ROOT / rel).exists():
        raise SystemExit(f"Missing required file: {rel}")

def add_import_after(text, anchor, import_line, label):
    if import_line in text:
        print(f"SKIP {label}")
        return text
    if anchor not in text:
        raise SystemExit(f"{label}: import anchor not found")
    text = text.replace(anchor, anchor + "\n" + import_line, 1)
    print(f"APPLY {label}")
    return text

def replace_once(text, old, new, label):
    if new in text:
        print(f"SKIP {label}")
        return text
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected 1 exact match, found {count}")
    print(f"APPLY {label}")
    return text.replace(old, new, 1)

def regex_once(text, pattern, replacement, label, flags=0, already=None):
    if already and re.search(already, text, flags):
        print(f"SKIP {label}")
        return text
    text2, count = re.subn(pattern, replacement, text, count=1, flags=flags)
    if count != 1:
        raise SystemExit(f"{label}: expected 1 structural match, found {count}")
    print(f"APPLY {label}")
    return text2

for rel in [
    "lib/cosmetics/catalogue.ts",
    "components/cosmetics/cosmetic-frame-overlay.tsx",
    "lib/cosmetics/get-equipped-cosmetic.ts",
    "app/api/cosmetics/equipped/route.ts",
    "components/cosmetics/cosmetic-runtime.tsx",
    "app/(portal)/cosmetics/actions.ts",
    "app/(portal)/cosmetics/page.tsx",
    "components/cosmetics/player-cosmetics-manager.tsx",
    "app/(portal)/admin/characters/cosmetic-actions.ts",
    "components/admin/admin-character-cosmetics-access.tsx",
    "cosmetics_full_system_8c67697.sql",
]:
    must_exist(rel)

# Verify current admin API state from uploaded diff.
rel = "app/api/admin/cosmetics/route.ts"
text = read(rel)
for marker in [
    'import { COSMETIC_CATEGORY_SET } from "@/lib/cosmetics/catalogue";',
    "const CATEGORIES = COSMETIC_CATEGORY_SET;",
    'return bad("Unsupported cosmetic category.");',
]:
    if marker not in text:
        raise SystemExit(
            "Admin cosmetics API does not match the uploaded current state. "
            f"Missing: {marker}"
        )
print("OK current admin API matches uploaded diff")

# Admin catalogue manager.
rel = "components/admin/cosmetics-feature-manager.tsx"
text = read(rel)

text = add_import_after(
    text,
    'import { createClient } from "@/lib/supabase/client";',
    'import { COSMETIC_CATEGORIES, COSMETIC_LABELS, type CosmeticCategory } from "@/lib/cosmetics/catalogue";',
    "admin catalogue imports",
)

text = replace_once(
    text,
    '  category: "sheet_frame" | "chat_frame";',
    '  category: CosmeticCategory;',
    "admin category type",
)

text = regex_once(
    text,
    r'function categoryLabel\(category: CosmeticAdminRow\["category"\]\)\s*\{\s*return category === "sheet_frame" \? "Sheet Frame" : "Location Chat Frame";\s*\}',
    'function categoryLabel(category: CosmeticAdminRow["category"]) {\n  return COSMETIC_LABELS[category];\n}',
    "admin category label",
    flags=re.S,
    already=r"return COSMETIC_LABELS\[category\];",
)

if "Phase 1 supports Sheet Frames and Location Chat Frames." in text:
    text = re.sub(
        r'Phase 1 supports Sheet Frames and Location Chat Frames\.[\s\S]*?the separate store/admin preview is optional\.',
        'All character-facing and portal-facing cosmetic categories are supported. Transparent PNG is recommended for frames and overlays; PNG or WebP works well for backgrounds.',
        text,
        count=1,
    )
    print("APPLY admin explanatory copy")
else:
    print("SKIP admin explanatory copy")

if "COSMETIC_CATEGORIES.map((category)" not in text:
    old_options = '''                <option value="sheet_frame">Sheet Frame</option>
                <option value="chat_frame">Location Chat Frame</option>'''
    new_options = '''                {COSMETIC_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {COSMETIC_LABELS[category]}
                  </option>
                ))}'''
    if old_options not in text:
        raise SystemExit("admin category options: old options not found")
    text = text.replace(old_options, new_options, 1)
    print("APPLY admin category options")
else:
    print("SKIP admin category options")

write(rel, text)

# Staff character Premium Features: remove Phase 1 category filter.
rel = "app/(portal)/admin/characters/[id]/premium-features/page.tsx"
text = read(rel)

pattern = r'\s*\.in\(\s*"category"\s*,\s*\[\s*"sheet_frame"\s*,\s*"chat_frame"\s*,?\s*\]\s*,?\s*\)'

if re.search(pattern, text, re.S):
    text = re.sub(pattern, "", text, count=1, flags=re.S)
    print("APPLY premium page all cosmetic categories")
else:
    print("SKIP premium page category filter already absent")

write(rel, text)

# Portal layout: runtime + personal shell cosmetics.
rel = "app/(portal)/layout.tsx"
text = read(rel)

if 'type CSSProperties' not in text:
    text = replace_once(
        text,
        'import { Suspense, type ReactNode } from "react";',
        'import { Suspense, type ReactNode, type CSSProperties } from "react";',
        "layout CSSProperties",
    )

anchor_import = 'import { ExperienceLogoutGuard } from "@/components/experience/experience-logout-guard";'
for import_line, label in [
    ('import { CosmeticRuntime } from "@/components/cosmetics/cosmetic-runtime";', "layout runtime import"),
    ('import { getEquippedCosmetics } from "@/lib/cosmetics/get-equipped-cosmetic";', "layout resolver import"),
    ('import { cssImageUrl } from "@/components/cosmetics/cosmetic-frame-overlay";', "layout css-url import"),
]:
    text = add_import_after(text, anchor_import, import_line, label)
    anchor_import = import_line

if "const portalCosmetics =" not in text:
    marker = '''  const presenceEnabled =
    context.character?.status ===
    "approved";'''
    if marker not in text:
        raise SystemExit("layout: presenceEnabled marker not found")

    addition = marker + '''

  const portalCosmetics =
    context.character
      ? await getEquippedCosmetics(
          context.character.id,
          [
            "header_control_frame",
            "left_panel_frame",
            "right_panel_frame",
            "centre_panel_frame",
            "location_frame",
            "location_atmosphere",
          ],
        )
      : {};

  const portalCosmeticStyle = {
    "--sep-cosmetic-header-control-frame":
      cssImageUrl(portalCosmetics.header_control_frame?.assetUrl),
    "--sep-cosmetic-left-panel-frame":
      cssImageUrl(portalCosmetics.left_panel_frame?.assetUrl),
    "--sep-cosmetic-right-panel-frame":
      cssImageUrl(portalCosmetics.right_panel_frame?.assetUrl),
    "--sep-cosmetic-centre-panel-frame":
      cssImageUrl(portalCosmetics.centre_panel_frame?.assetUrl),
    "--sep-cosmetic-location-frame":
      cssImageUrl(portalCosmetics.location_frame?.assetUrl),
    "--sep-cosmetic-location-atmosphere":
      cssImageUrl(portalCosmetics.location_atmosphere?.assetUrl),
  } as CSSProperties;'''

    text = text.replace(marker, addition, 1)
    print("APPLY layout cosmetic resolver")
else:
    print("SKIP layout cosmetic resolver")

if "data-has-cosmetic-left-panel" not in text:
    old = '''          <div
            data-portal-shell-inner
            className="flex h-full min-h-0 flex-col bg-[radial-gradient(circle_at_top,_rgba(var(--sep-rgb-116-82-42),0.16),_transparent_38%),linear-gradient(to_bottom,_#17120f,_#0d0b0a)]"
          >'''
    new = '''          <div
            data-portal-shell-inner
            data-has-cosmetic-header-controls={
              portalCosmetics.header_control_frame ? "true" : "false"
            }
            data-has-cosmetic-left-panel={
              portalCosmetics.left_panel_frame ? "true" : "false"
            }
            data-has-cosmetic-right-panel={
              portalCosmetics.right_panel_frame ? "true" : "false"
            }
            data-has-cosmetic-centre-panel={
              portalCosmetics.centre_panel_frame ? "true" : "false"
            }
            data-has-cosmetic-location-frame={
              portalCosmetics.location_frame ? "true" : "false"
            }
            data-has-cosmetic-location-atmosphere={
              portalCosmetics.location_atmosphere ? "true" : "false"
            }
            style={portalCosmeticStyle}
            className="flex h-full min-h-0 flex-col bg-[radial-gradient(circle_at_top,_rgba(var(--sep-rgb-116-82-42),0.16),_transparent_38%),linear-gradient(to_bottom,_#17120f,_#0d0b0a)]"
          >'''
    if old not in text:
        raise SystemExit("layout: portal shell inner opening not found")
    text = text.replace(old, new, 1)
    print("APPLY layout shell cosmetic flags")
else:
    print("SKIP layout shell cosmetic flags")

if 'data-has-cosmetic-header-controls="true"' not in text:
    css_anchor = '''              .portal-left-shell,
              .portal-right-shell {
                display: contents;
              }'''
    if css_anchor not in text:
        raise SystemExit("layout: CSS anchor not found")

    css = css_anchor + '''

              @media (min-width: 1024px) {
                [data-portal-shell-inner][data-has-cosmetic-header-controls="true"]
                  [data-cosmetic-header-controls] :is(button,a) {
                  border-style: solid;
                  border-color: transparent;
                  border-image-source: var(--sep-cosmetic-header-control-frame);
                  border-image-slice: 18%;
                  border-image-width: 1;
                  border-image-repeat: stretch;
                }

                [data-portal-shell-inner][data-has-cosmetic-left-panel="true"]
                  .portal-left-shell > [data-portal-column] {
                  border: 8px solid transparent;
                  border-image-source: var(--sep-cosmetic-left-panel-frame);
                  border-image-slice: 10%;
                  border-image-width: 1;
                  border-image-repeat: stretch;
                }

                [data-portal-shell-inner][data-has-cosmetic-right-panel="true"]
                  .portal-right-shell > [data-portal-column] {
                  border: 8px solid transparent;
                  border-image-source: var(--sep-cosmetic-right-panel-frame);
                  border-image-slice: 10%;
                  border-image-width: 1;
                  border-image-repeat: stretch;
                }

                [data-portal-shell-inner][data-has-cosmetic-centre-panel="true"]
                  [data-portal-centre-host] > [data-portal-column] {
                  border: 8px solid transparent;
                  border-image-source: var(--sep-cosmetic-centre-panel-frame);
                  border-image-slice: 10%;
                  border-image-width: 1;
                  border-image-repeat: stretch;
                }
              }

              [data-portal-shell-inner][data-has-cosmetic-location-frame="true"]
                [data-game-location-surface] {
                border: 10px solid transparent;
                border-image-source: var(--sep-cosmetic-location-frame);
                border-image-slice: 12% 8%;
                border-image-width: 1;
                border-image-repeat: stretch;
              }

              [data-portal-shell-inner][data-has-cosmetic-location-atmosphere="true"]
                [data-game-location-surface] {
                background-image:
                  linear-gradient(rgba(0,0,0,.54), rgba(0,0,0,.54)),
                  var(--sep-cosmetic-location-atmosphere);
                background-size: cover;
                background-position: center;
                background-repeat: no-repeat;
              }'''

    text = text.replace(css_anchor, css, 1)
    print("APPLY layout cosmetic CSS")
else:
    print("SKIP layout cosmetic CSS")

if "<CosmeticRuntime />" not in text:
    marker = "<PortalInteractionLayer />"
    if marker not in text:
        raise SystemExit("layout: PortalInteractionLayer mount not found")
    text = text.replace(marker, marker + "\n            <CosmeticRuntime />", 1)
    print("APPLY CosmeticRuntime mount")
else:
    print("SKIP CosmeticRuntime mount")

write(rel, text)

# Header control cluster.
rel = "components/portal/portal-header.tsx"
text = read(rel)
text = replace_once(
    text,
    '<div className="flex shrink-0 items-center gap-1.5 sm:gap-2 lg:gap-2.5 2xl:gap-3">',
    '<div data-cosmetic-header-controls className="flex shrink-0 items-center gap-1.5 sm:gap-2 lg:gap-2.5 2xl:gap-3">',
    "header control cosmetic anchor",
)
write(rel, text)

# Whole /game location surface.
rel = "app/(portal)/game/page.tsx"
text = read(rel)
if "data-game-location-surface" not in text:
    old = '''  <div
  className={
    privateLocation'''
    new = '''  <div
  data-game-location-surface
  className={
    privateLocation'''
    if old not in text:
        raise SystemExit("game: outer location wrapper not found")
    text = text.replace(old, new, 1)
    print("APPLY whole location surface")
else:
    print("SKIP whole location surface")
write(rel, text)

# Location chronicle: <= 5px gap on BOTH sides + public character cosmetics.
rel = "app/(portal)/game/components/RoomMessageList.tsx"
text = read(rel)

if 'paddingRight: "4px"' not in text:
    old = '''                            paddingLeft: "4px",
                            paddingTop: "4px",
                            paddingBottom: "4px",'''
    new = '''                            paddingLeft: "4px",
                            paddingRight: "4px",
                            paddingTop: "4px",
                            paddingBottom: "4px",'''
    if old not in text:
        raise SystemExit("chat: framed spacing block not found")
    text = text.replace(old, new, 1)
    print("APPLY chat max-4px left/right inner gap")
else:
    print("SKIP chat right gap already fixed")

if 'data-cosmetic-surface={isWhisper ? "whisper" : undefined}' not in text:
    old = '''                    <article
                      key={item.id}
                      className={`relative flex gap-3 py-3 pl-5 pr-12 sm:pl-7 sm:pr-12 ${'''
    new = '''                    <article
                      key={item.id}
                      data-cosmetic-character-id={item.character_id}
                      data-cosmetic-surface={isWhisper ? "whisper" : undefined}
                      className={`relative flex gap-3 py-3 pl-5 pr-12 sm:pl-7 sm:pr-12 ${'''
    if old not in text:
        raise SystemExit("chat: whisper/OOC article not found")
    text = text.replace(old, new, 1)
    print("APPLY whisper cosmetic surface")
else:
    print("SKIP whisper cosmetic surface")

if 'data-cosmetic-surface={!isMechanicalOutput ? "action" : undefined}' not in text:
    old = '''                  <article
                    key={item.id}
                    className={`relative flex min-w-0 gap-3 py-3 pl-5 pr-12 sm:pl-7 sm:pr-12 ${'''
    new = '''                  <article
                    key={item.id}
                    data-cosmetic-character-id={item.character_id}
                    data-cosmetic-surface={!isMechanicalOutput ? "action" : undefined}
                    className={`relative flex min-w-0 gap-3 py-3 pl-5 pr-12 sm:pl-7 sm:pr-12 ${'''
    if old not in text:
        raise SystemExit("chat: normal action article not found")
    text = text.replace(old, new, 1)
    print("APPLY action style/flourish surface")
else:
    print("SKIP action style/flourish surface")

portrait_old = '''    <div className="h-9 w-9 shrink-0 overflow-hidden border border-[rgb(var(--sep-colour-60482e))] bg-[rgb(var(--sep-colour-0d0a08))]">'''
if 'data-cosmetic-character-id={author?.id}' not in text:
    portrait_new = '''    <div
      data-cosmetic-character-id={author?.id}
      data-cosmetic-surface="portrait"
      className="h-9 w-9 shrink-0 overflow-hidden border border-[rgb(var(--sep-colour-60482e))] bg-[rgb(var(--sep-colour-0d0a08))]"
    >'''
    if portrait_old not in text:
        raise SystemExit("chat: portrait helper target not found")
    text = text.replace(portrait_old, portrait_new, 1)
    print("APPLY chat portrait surface")
else:
    print("SKIP chat portrait surface")

write(rel, text)

# Own character profile.
rel = "app/(portal)/character/page.tsx"
text = read(rel)

if 'data-cosmetic-surface="sheet"' not in text:
    old = '''        <div
          className="relative isolate"
          style={cosmeticFrameStyle('''
    new = '''        <div
          data-cosmetic-character-id={character.id}
          data-cosmetic-surface="sheet"
          className="relative isolate"
          style={cosmeticFrameStyle('''
    if old not in text:
        raise SystemExit("own profile: sheet wrapper not found")
    text = text.replace(old, new, 1)
    print("APPLY own profile background surface")
else:
    print("SKIP own profile background surface")

if 'data-cosmetic-surface="portrait"' not in text:
    old = '''              <div className="mx-auto w-full max-w-[180px] lg:mx-0">'''
    new = '''              <div
                data-cosmetic-character-id={character.id}
                data-cosmetic-surface="portrait"
                className="mx-auto w-full max-w-[180px] lg:mx-0"
              >'''
    if old not in text:
        raise SystemExit("own profile: portrait wrapper not found")
    text = text.replace(old, new, 1)
    print("APPLY own portrait surface")
else:
    print("SKIP own portrait surface")

if 'data-cosmetic-surface="nameplate"' not in text:
    old = '''                      <h1 className="min-w-0 break-words font-serif text-[1.7rem] text-[rgb(var(--sep-colour-ecd9b2))] sm:text-[1.95rem]">'''
    new = '''                      <h1
                        data-cosmetic-character-id={character.id}
                        data-cosmetic-surface="nameplate"
                        className="min-w-0 break-words font-serif text-[1.7rem] text-[rgb(var(--sep-colour-ecd9b2))] sm:text-[1.95rem]"
                      >'''
    if old not in text:
        raise SystemExit("own profile: name h1 not found")
    text = text.replace(old, new, 1)
    print("APPLY own nameplate/crest surface")
else:
    print("SKIP own nameplate/crest surface")

write(rel, text)

# Public character profile.
rel = "components/characters/public-character-profile.tsx"
text = read(rel)

if 'data-cosmetic-surface="sheet"' not in text:
    old = '''      <div
        className="relative isolate"
        style={cosmeticFrameStyle('''
    new = '''      <div
        data-cosmetic-character-id={character.id}
        data-cosmetic-surface="sheet"
        className="relative isolate"
        style={cosmeticFrameStyle('''
    if old not in text:
        raise SystemExit("public profile: sheet wrapper not found")
    text = text.replace(old, new, 1)
    print("APPLY public profile background surface")
else:
    print("SKIP public profile background surface")

if 'data-cosmetic-surface="portrait"' not in text:
    old = '''              <div className="relative aspect-[3/4] w-full overflow-hidden border border-[rgb(var(--sep-colour-60482e))]/50 bg-[rgb(var(--sep-colour-0d0a08))]">'''
    new = '''              <div
                data-cosmetic-character-id={character.id}
                data-cosmetic-surface="portrait"
                className="relative aspect-[3/4] w-full overflow-hidden border border-[rgb(var(--sep-colour-60482e))]/50 bg-[rgb(var(--sep-colour-0d0a08))]"
              >'''
    if old not in text:
        raise SystemExit("public profile: portrait wrapper not found")
    text = text.replace(old, new, 1)
    print("APPLY public portrait surface")
else:
    print("SKIP public portrait surface")

if 'data-cosmetic-surface="nameplate"' not in text:
    m = re.search(
        r'<h1 className="([^"]*font-serif[^"]*text-\[rgb\(var\(--sep-colour-ecd9b2\)\)\][^"]*)">',
        text,
    )
    if not m:
        raise SystemExit("public profile: main h1 not found")
    replacement = '''<h1
                      data-cosmetic-character-id={character.id}
                      data-cosmetic-surface="nameplate"
                      className="''' + m.group(1) + '''"
                    >'''
    text = text[:m.start()] + replacement + text[m.end():]
    print("APPLY public nameplate/crest surface")
else:
    print("SKIP public nameplate/crest surface")

write(rel, text)

# Private Messages.
rel = "app/(portal)/messages/[id]/components/ConversationMessageList.tsx"
text = read(rel)

if 'data-cosmetic-surface={ongame ? "pm" : undefined}' not in text:
    old = '''                key={message.id}
                data-sep-interaction-ignore="true"'''
    new = '''                key={message.id}
                data-sep-interaction-ignore="true"
                data-cosmetic-character-id={message.sender_character_id}
                data-cosmetic-surface={ongame ? "pm" : undefined}'''
    if old not in text:
        raise SystemExit("PM: message article markers not found")
    text = text.replace(old, new, 1)
    print("APPLY PM frame surface")
else:
    print("SKIP PM frame surface")

if 'data-cosmetic-surface="portrait"' not in text:
    old = '''                  <div className="h-8 w-8 shrink-0 overflow-hidden border border-[rgb(var(--sep-colour-60482e))]/75 bg-[rgb(var(--sep-colour-0d0907))]">'''
    new = '''                  <div
                    data-cosmetic-character-id={message.sender_character_id}
                    data-cosmetic-surface="portrait"
                    className="h-8 w-8 shrink-0 overflow-hidden border border-[rgb(var(--sep-colour-60482e))]/75 bg-[rgb(var(--sep-colour-0d0907))]"
                  >'''
    if old not in text:
        raise SystemExit("PM: portrait wrapper not found")
    text = text.replace(old, new, 1)
    print("APPLY PM portrait surface")
else:
    print("SKIP PM portrait surface")

if 'data-cosmetic-surface="nameplate"' not in text:
    old = '''                        <p
                          className={`font-serif text-sm ${'''
    new = '''                        <p
                          data-cosmetic-character-id={message.sender_character_id}
                          data-cosmetic-surface="nameplate"
                          className={`font-serif text-sm ${'''
    if old not in text:
        raise SystemExit("PM: sender name target not found")
    text = text.replace(old, new, 1)
    print("APPLY PM nameplate surface")
else:
    print("SKIP PM nameplate surface")

write(rel, text)

# Instant Chat.
rel = "components/instant-chat/instant-chat-dock.tsx"
text = read(rel)

if 'data-cosmetic-surface="instant"' not in text:
    old = '''                        <div
                          className={`max-w-[82%] border px-2 py-1.5 text-[10px] leading-4 ${'''
    new = '''                        <div
                          data-cosmetic-character-id={message.sender_character_id}
                          data-cosmetic-surface="instant"
                          className={`max-w-[82%] border px-2 py-1.5 text-[10px] leading-4 ${'''
    if old not in text:
        raise SystemExit("Instant Chat: message bubble not found")
    text = text.replace(old, new, 1)
    print("APPLY Instant Chat frame surface")
else:
    print("SKIP Instant Chat frame surface")

if 'data-cosmetic-character-id={other.character_id}' not in text:
    old = '''            <div className="h-6 w-6 shrink-0 overflow-hidden border border-[rgb(var(--sep-colour-60482e))] bg-[rgb(var(--sep-colour-0d0907))]">'''
    new = '''            <div
              data-cosmetic-character-id={other.character_id}
              data-cosmetic-surface="portrait"
              className="h-6 w-6 shrink-0 overflow-hidden border border-[rgb(var(--sep-colour-60482e))] bg-[rgb(var(--sep-colour-0d0907))]"
            >'''
    if old not in text:
        raise SystemExit("Instant Chat: header portrait not found")
    text = text.replace(old, new, 1)
    print("APPLY Instant Chat portrait surface")
else:
    print("SKIP Instant Chat portrait surface")

if 'data-cosmetic-surface="nameplate"' not in text:
    old = '''              <p className="truncate font-serif text-[11px] leading-tight text-[rgb(var(--sep-colour-e1c89d))]">'''
    new = '''              <p
                data-cosmetic-character-id={other.character_id}
                data-cosmetic-surface="nameplate"
                className="truncate font-serif text-[11px] leading-tight text-[rgb(var(--sep-colour-e1c89d))]"
              >'''
    if old not in text:
        raise SystemExit("Instant Chat: header name not found")
    text = text.replace(old, new, 1)
    print("APPLY Instant Chat nameplate surface")
else:
    print("SKIP Instant Chat nameplate surface")

write(rel, text)

# Forum posts.
rel = "components/forum/topic-post.tsx"
text = read(rel)

if 'data-cosmetic-surface={!post.is_anonymous ? "forum" : undefined}' not in text:
    old = '''      id={`post-${post.id}`}
      data-sep-interaction-fixed="true"'''
    new = '''      id={`post-${post.id}`}
      data-sep-interaction-fixed="true"
      data-cosmetic-character-id={post.author_character?.id}
      data-cosmetic-surface={!post.is_anonymous ? "forum" : undefined}'''
    if old not in text:
        raise SystemExit("Forum: post article marker not found")
    text = text.replace(old, new, 1)
    print("APPLY Forum frame surface")
else:
    print("SKIP Forum frame surface")

if 'data-cosmetic-surface={!post.is_anonymous ? "nameplate" : undefined}' not in text:
    old = '''              <h2
  className={`font-serif text-base leading-tight ${'''
    new = '''              <h2
  data-cosmetic-character-id={post.author_character?.id}
  data-cosmetic-surface={!post.is_anonymous ? "nameplate" : undefined}
  className={`font-serif text-base leading-tight ${'''
    if old not in text:
        raise SystemExit("Forum: author h2 not found")
    text = text.replace(old, new, 1)
    print("APPLY Forum nameplate surface")
else:
    print("SKIP Forum nameplate surface")

if 'data-cosmetic-character-id={character?.id}' not in text:
    old_img = '''      <div className="h-20 w-20 shrink-0 overflow-hidden border border-[rgb(var(--sep-colour-6b5031))]/55 bg-[rgb(var(--sep-colour-0b0806))] lg:h-44 lg:w-full">'''
    new_img = '''      <div
        data-cosmetic-character-id={character?.id}
        data-cosmetic-surface="portrait"
        className="h-20 w-20 shrink-0 overflow-hidden border border-[rgb(var(--sep-colour-6b5031))]/55 bg-[rgb(var(--sep-colour-0b0806))] lg:h-44 lg:w-full"
      >'''
    old_fallback = '''    <div className="flex h-20 w-20 shrink-0 items-center justify-center border border-[rgb(var(--sep-colour-6b5031))]/55 bg-[rgb(var(--sep-colour-1b130e))] font-serif text-2xl text-[rgb(var(--sep-colour-a98a61))] lg:h-44 lg:w-full lg:text-4xl">'''
    new_fallback = '''    <div
      data-cosmetic-character-id={character?.id}
      data-cosmetic-surface="portrait"
      className="flex h-20 w-20 shrink-0 items-center justify-center border border-[rgb(var(--sep-colour-6b5031))]/55 bg-[rgb(var(--sep-colour-1b130e))] font-serif text-2xl text-[rgb(var(--sep-colour-a98a61))] lg:h-44 lg:w-full lg:text-4xl"
    >'''

    if old_img not in text or old_fallback not in text:
        raise SystemExit("Forum: portrait helper branches not found")

    text = text.replace(old_img, new_img, 1)
    text = text.replace(old_fallback, new_fallback, 1)
    print("APPLY Forum portrait surfaces")
else:
    print("SKIP Forum portrait surfaces")

write(rel, text)

# Cosmetics context panel wording.
rel = "components/portal/portal-context-panel.tsx"
text = read(rel)

old = "Manage the visual treatments your character owns and choose which cosmetic is currently equipped in each slot."
new = "Manage character-facing and portal-facing visual treatments, including profiles, messages, panels, location styling and identity ornaments."

if new not in text:
    if old not in text:
        raise SystemExit("Cosmetics context: description sentence not found")
    text = text.replace(old, new, 1)
    print("APPLY expanded Cosmetics context copy")
else:
    print("SKIP expanded Cosmetics context copy")

write(rel, text)

print()
print("SUCCESS: exact-state continuation completed.")
print("Next run cosmetics_full_system_8c67697.sql in Supabase, then npm run build.")
