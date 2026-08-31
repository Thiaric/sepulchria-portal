from pathlib import Path
import subprocess, sys, re

ROOT = Path.cwd()
EXPECTED = '5b2b9cc6a436a253b418f4d09eb7e7a962a3b2a5'

def fail(message):
    print(f'\nERROR: {message}\n')
    sys.exit(1)

head = subprocess.check_output(['git','rev-parse','HEAD'], cwd=ROOT, text=True).strip()
if head != EXPECTED:
    fail(f'This patch targets {EXPECTED}, but your current HEAD is {head}.')

paths = ['app/(portal)/game/components/RoomMusicPlayer.tsx', 'components/portal/game-context-panel.tsx', 'components/portal/admin-context-panel.tsx', 'components/admin/admin-character-feature-access.tsx', 'components/admin/admin-character-music-access.tsx', 'components/polls/poll-unread-badge.tsx', 'components/portal/portal-presence-heartbeat.tsx', 'components/portal/portal-session-guard.tsx', 'components/portal/mobile-portal-navigation.tsx', 'components/portal/forum-sidebar-menu.tsx']
files = {}
for path in paths:
    p = ROOT / path
    if not p.exists(): fail(f'Missing expected file: {path}')
    files[path] = p.read_text(encoding='utf-8')

new_path = ROOT / "components/admin/admin-character-premium-features-context.tsx"
if new_path.exists(): fail('Premium Features context file already exists.')

def repl(path, old, new, label):
    count = files[path].count(old)
    if count != 1: fail(f'Preflight failed for {label} in {path}: expected 1 anchor, found {count}.')
    files[path] = files[path].replace(old, new, 1)

repl('components/portal/game-context-panel.tsx', '  return (\n    <div className="flex h-full min-h-0 flex-col">\n      \n\n      {error ? (', '  return (\n    <div className="flex h-full min-h-0 flex-col">\n      <div id="game-music-context-slot" className="shrink-0" />\n\n      {error ? (', 'game music sidebar slot')
repl('app/(portal)/game/components/RoomMusicPlayer.tsx', 'import {\n  useEffect,\n  useMemo,\n  useRef,\n  useState,\n} from "react";', 'import {\n  useEffect,\n  useMemo,\n  useRef,\n  useState,\n} from "react";\nimport { createPortal } from "react-dom";', 'React portal import')
repl('app/(portal)/game/components/RoomMusicPlayer.tsx', '  const [\n    needsGesture,\n    setNeedsGesture,\n  ] = useState(false);', '  const [\n    needsGesture,\n    setNeedsGesture,\n  ] = useState(false);\n\n  const [\n    portalTarget,\n    setPortalTarget,\n  ] = useState<HTMLElement | null>(\n    null,\n  );\n\n  useEffect(() => {\n    let cancelled = false;\n    let frame = 0;\n    let attempts = 0;\n\n    const findTarget = () => {\n      if (cancelled) return;\n\n      const target =\n        document.getElementById(\n          "game-music-context-slot",\n        );\n\n      if (target) {\n        setPortalTarget(target);\n        return;\n      }\n\n      attempts += 1;\n\n      if (attempts < 60) {\n        frame =\n          window.requestAnimationFrame(\n            findTarget,\n          );\n      }\n    };\n\n    findTarget();\n\n    return () => {\n      cancelled = true;\n      window.cancelAnimationFrame(\n        frame,\n      );\n    };\n  }, []);', 'music portal target')
repl('app/(portal)/game/components/RoomMusicPlayer.tsx', '  useEffect(() => {\n    const audio = audioRef.current;\n\n    if (!audio) return;\n\n    audio.muted = muted;\n\n    if (\n      fadeTimerRef.current === null\n    ) {\n      audio.volume = volume;\n    }\n  }, [muted, volume]);', '  useEffect(() => {\n    const audio = audioRef.current;\n\n    if (!audio) return;\n\n    audio.muted = muted;\n\n    if (\n      fadeTimerRef.current === null\n    ) {\n      audio.volume = volume;\n    }\n  }, [muted, volume]);\n\n  useEffect(() => {\n    if (\n      !needsGesture ||\n      !activeTrack\n    ) {\n      return;\n    }\n\n    const resume = () => {\n      const audio = audioRef.current;\n\n      if (!audio) return;\n\n      void audio\n        .play()\n        .then(() => {\n          setNeedsGesture(false);\n          fadeTo(\n            muted ? 0 : volume,\n          );\n        })\n        .catch(() => {\n          // The visible Play control\n          // remains available.\n        });\n    };\n\n    document.addEventListener(\n      "pointerdown",\n      resume,\n      {\n        capture: true,\n        once: true,\n      },\n    );\n\n    document.addEventListener(\n      "keydown",\n      resume,\n      {\n        capture: true,\n        once: true,\n      },\n    );\n\n    return () => {\n      document.removeEventListener(\n        "pointerdown",\n        resume,\n        true,\n      );\n      document.removeEventListener(\n        "keydown",\n        resume,\n        true,\n      );\n    };\n  }, [\n    needsGesture,\n    activeTrack?.id,\n    muted,\n    volume,\n  ]);', 'reload autoplay recovery')
path = 'app/(portal)/game/components/RoomMusicPlayer.tsx'
start_marker = '  return (\n    <details\n      data-sep-interaction-ignore="true"'
start = files[path].find(start_marker)
if start == -1: fail('Preflight failed for RoomMusicPlayer return start.')
end_marker = '\n    </details>\n  );\n}'
end = files[path].find(end_marker, start)
if end == -1: fail('Preflight failed for RoomMusicPlayer return end.')
end += len(end_marker)
files[path] = files[path][:start] + '  const panel = (\n    <section\n      data-sep-interaction-ignore="true"\n      className="mb-4 border border-[rgb(var(--sep-colour-59432c))]/40 bg-[rgb(var(--sep-colour-100c09))] p-4"\n    >\n      <div className="flex items-start justify-between gap-3">\n        <div className="min-w-0">\n          <p className="text-[8px] uppercase tracking-[0.24em] text-[rgb(var(--sep-colour-876a46))]">\n            Location Music\n          </p>\n          <h3 className="mt-0.5 truncate font-serif text-lg text-[rgb(var(--sep-colour-d6bd91))]">\n            {activeTrack?.name ?? "Silence"}\n          </h3>\n        </div>\n\n        {activeTrack ? (\n          <div\n            className="flex h-6 shrink-0 items-end gap-[2px] border border-[rgb(var(--sep-colour-59432c))]/45 bg-[rgb(var(--sep-colour-15100d))] px-2 py-1"\n            aria-hidden="true"\n          >\n            <span className="h-2 w-[2px] animate-pulse bg-[rgb(var(--sep-colour-a68b67))]/70" />\n            <span className="h-3 w-[2px] animate-pulse bg-[rgb(var(--sep-colour-a68b67))]/85 [animation-delay:140ms]" />\n            <span className="h-1.5 w-[2px] animate-pulse bg-[rgb(var(--sep-colour-a68b67))]/60 [animation-delay:280ms]" />\n            <span className="h-2.5 w-[2px] animate-pulse bg-[rgb(var(--sep-colour-a68b67))]/75 [animation-delay:420ms]" />\n          </div>\n        ) : null}\n      </div>\n\n      <p className="mt-2 text-[9px] text-[rgb(var(--sep-colour-756957))]">\n        {effectivePersonal\n          ? "Your selected personal track"\n          : locationName}\n      </p>\n\n      {personalAvailable ? (\n        <div className="mt-3 space-y-2">\n          <select\n            value={effectivePersonal ? "personal" : "location"}\n            onChange={(event) =>\n              chooseMode(\n                event.target.value === "personal",\n              )\n            }\n            className="w-full border border-[rgb(var(--sep-colour-59432c))]/45 bg-[rgb(var(--sep-colour-0d0907))] px-2.5 py-2 text-[10px] text-[rgb(var(--sep-colour-d4bea0))] outline-none focus:border-[rgb(var(--sep-colour-80613b))]"\n          >\n            <option value="location">Location Music</option>\n            <option value="personal">My Music</option>\n          </select>\n\n          {effectivePersonal ? (\n            <select\n              value={\n                selectedOwned?.id ??\n                ownedTracks[0]?.id ??\n                ""\n              }\n              onChange={(event) =>\n                chooseTrack(event.target.value)\n              }\n              className="w-full border border-[rgb(var(--sep-colour-59432c))]/45 bg-[rgb(var(--sep-colour-0d0907))] px-2.5 py-2 text-[10px] text-[rgb(var(--sep-colour-d4bea0))] outline-none focus:border-[rgb(var(--sep-colour-80613b))]"\n            >\n              {ownedTracks.map((track) => (\n                <option key={track.id} value={track.id}>\n                  {track.name}\n                </option>\n              ))}\n            </select>\n          ) : null}\n        </div>\n      ) : null}\n\n      <div className="mt-3 flex items-center gap-2 border-t border-[rgb(var(--sep-colour-59432c))]/30 pt-3">\n        {needsGesture && activeTrack ? (\n          <button\n            type="button"\n            onClick={() => void startPlayback()}\n            className="border border-[rgb(var(--sep-colour-80613b))]/70 bg-[rgb(var(--sep-colour-17110d))] px-2.5 py-2 text-[8px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-d8bf91))]"\n          >\n            Play\n          </button>\n        ) : null}\n\n        <button\n          type="button"\n          onClick={toggleMute}\n          className="border border-[rgb(var(--sep-colour-80613b))]/70 bg-[rgb(var(--sep-colour-17110d))] px-2.5 py-2 text-[8px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-d8bf91))]"\n        >\n          {muted ? "Unmute" : "Mute"}\n        </button>\n\n        <label className="min-w-0 flex-1">\n          <span className="mb-1 block text-[7px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-756957))]">\n            Volume\n          </span>\n          <input\n            type="range"\n            min={0}\n            max={1}\n            step={0.05}\n            value={volume}\n            onChange={(event) =>\n              setVolume(Number(event.target.value))\n            }\n            onPointerUp={() => void persist({ volume })}\n            onKeyUp={() => void persist({ volume })}\n            className="block w-full"\n          />\n        </label>\n      </div>\n    </section>\n  );\n\n  return (\n    <>\n      <audio ref={audioRef} preload="auto" className="hidden" />\n      {portalTarget\n        ? createPortal(panel, portalTarget)\n        : null}\n    </>\n  );\n}' + files[path][end:]

repl('components/portal/admin-context-panel.tsx', 'import { MusicContextPanel } from "@/components/admin/music-context-panel";', 'import { MusicContextPanel } from "@/components/admin/music-context-panel";\nimport { AdminCharacterPremiumFeaturesContext } from "@/components/admin/admin-character-premium-features-context";', 'premium context import')
repl('components/portal/admin-context-panel.tsx', '  | "character_detail"\n  | "codex"', '  | "character_detail"\n  | "character_premium_features"\n  | "codex"', 'premium context mode')
repl('components/portal/admin-context-panel.tsx', '  if (\n    /^\\/admin\\/characters\\/[0-9a-f-]+$/i.test(\n      pathname,\n    )\n  ) {\n    return "character_detail";\n  }', '  if (\n    /^\\/admin\\/characters\\/[0-9a-f-]+\\/premium-features$/i.test(\n      pathname,\n    )\n  ) {\n    return "character_premium_features";\n  }\n\n  if (\n    /^\\/admin\\/characters\\/[0-9a-f-]+$/i.test(\n      pathname,\n    )\n  ) {\n    return "character_detail";\n  }', 'premium route recognition')
repl('components/portal/admin-context-panel.tsx', '  if (mode === "character_detail") {\n    return (\n      <AdminCharacterFieldNavigator />\n    );\n  }\n\n  if (mode === "forum") {', '  if (mode === "character_detail") {\n    return (\n      <AdminCharacterFieldNavigator />\n    );\n  }\n\n  if (\n    mode ===\n    "character_premium_features"\n  ) {\n    return (\n      <AdminCharacterPremiumFeaturesContext />\n    );\n  }\n\n  if (mode === "forum") {', 'premium context branch')
repl('components/admin/admin-character-feature-access.tsx', '            <form\n              key={feature.key}\n              action={\n                setCharacterFeatureEntitlement\n              }\n              className="bg-[rgb(var(--sep-colour-17110d))] p-5"\n            >', '            <form\n              key={feature.key}\n              id={`premium-feature-${feature.key}`}\n              data-admin-premium-feature="true"\n              data-admin-feature-name={feature.name}\n              data-admin-feature-type="Feature"\n              action={\n                setCharacterFeatureEntitlement\n              }\n              className="scroll-mt-6 bg-[rgb(var(--sep-colour-17110d))] p-5"\n            >', 'feature DOM markers')
repl('components/admin/admin-character-feature-access.tsx', '              <form\n                key={\n                  `skin-${skin.id}`\n                }\n                action={\n                  setCharacterPortalSkinEntitlement\n                }\n                className="bg-[rgb(var(--sep-colour-17110d))] p-5"\n              >', '              <form\n                key={\n                  `skin-${skin.id}`\n                }\n                id={`premium-feature-skin-${skin.id}`}\n                data-admin-premium-feature="true"\n                data-admin-feature-name={skin.name}\n                data-admin-feature-type="Portal Skin"\n                action={\n                  setCharacterPortalSkinEntitlement\n                }\n                className="scroll-mt-6 bg-[rgb(var(--sep-colour-17110d))] p-5"\n              >', 'skin DOM markers')
repl('components/admin/admin-character-music-access.tsx', '            <form\n              key={track.id}\n              action={\n                setCharacterMusicEntitlement\n              }\n              className="bg-[rgb(var(--sep-colour-17110d))] p-5"\n            >', '            <form\n              key={track.id}\n              id={`premium-feature-music-${track.id}`}\n              data-admin-premium-feature="true"\n              data-admin-feature-name={track.name}\n              data-admin-feature-type="Music Track"\n              action={\n                setCharacterMusicEntitlement\n              }\n              className="scroll-mt-6 bg-[rgb(var(--sep-colour-17110d))] p-5"\n            >', 'music DOM markers')
helper = '\nfunction isTransientTransportError(\n  error: unknown,\n) {\n  return (\n    error instanceof TypeError &&\n    /failed to fetch|networkerror|load failed/i.test(\n      error.message,\n    )\n  );\n}\n'
path = 'components/polls/poll-unread-badge.tsx'
anchor = 'const REFRESH_MS ='
if files[path].count(anchor) != 1: fail('Preflight failed for poll helper anchor.')
files[path] = files[path].replace(anchor, helper + '\n' + anchor, 1)
path = 'components/polls/poll-unread-badge.tsx'
pattern = re.compile(
    r'(?P<indent>[ \t]*)\} catch \(error\) \{\s*'
    r'console\.error\(\s*'
    r'"Unable to refresh Poll unread count:",\s*'
    r'error,\s*'
    r'\);\s*'
    r'\}',
    re.MULTILINE,
)
matches = list(pattern.finditer(files[path]))
if len(matches) != 1:
    fail(
        f'Preflight failed for poll restart fetch noise in {path}: '
        f'expected 1 catch block, found {len(matches)}.'
    )
m = matches[0]
indent = m.group('indent')
replacement = (
    indent + '} catch (error) {\n'
    + indent + '  if (\n'
    + indent + '    isTransientTransportError(\n'
    + indent + '      error,\n'
    + indent + '    )\n'
    + indent + '  ) {\n'
    + indent + '    return;\n'
    + indent + '  }\n\n'
    + indent + '  console.error(\n'
    + indent + '    "Unable to refresh Poll unread count:",\n'
    + indent + '    error,\n'
    + indent + '  );\n'
    + indent + '}'
)
files[path] = (
    files[path][:m.start()]
    + replacement
    + files[path][m.end():]
)
path = 'components/portal/portal-presence-heartbeat.tsx'
if files[path].count('"use client";') != 1: fail(f'Preflight failed for transport helper in {path}.')
files[path] = files[path].replace('"use client";', '"use client";\n' + helper, 1)
path = 'components/portal/portal-session-guard.tsx'
if files[path].count('"use client";') != 1: fail(f'Preflight failed for transport helper in {path}.')
files[path] = files[path].replace('"use client";', '"use client";\n' + helper, 1)
repl('components/portal/portal-presence-heartbeat.tsx', '      } catch (error) {\n        console.error(\n          "Unable to refresh portal presence:",\n          error,\n        );\n      } finally {', '      } catch (error) {\n        if (\n          !isTransientTransportError(\n            error,\n          )\n        ) {\n          console.error(\n            "Unable to refresh portal presence:",\n            error,\n          );\n        }\n      } finally {', 'presence restart fetch noise')
repl('components/portal/portal-session-guard.tsx', '        } else {\n          console.error(\n            "Unable to verify active portal login:",\n            error,\n          );\n        }', '        } else if (\n          !isTransientTransportError(\n            error,\n          )\n        ) {\n          console.error(\n            "Unable to verify active portal login:",\n            error,\n          );\n        }', 'session restart fetch noise')
path = 'components/portal/mobile-portal-navigation.tsx'
s = files[path].find('  const personalEntries =\n')
e = files[path].find('\n  const loreEntries:', s)
if s == -1 or e == -1: fail('Preflight failed for personalEntries removal.')
files[path] = files[path][:s] + files[path][e+1:]
s = files[path].find('              <section>\n                <SectionTitle>\n                  People & Character')
e = files[path].find('              <section>\n                <SectionTitle>\n                  Lore', s)
if s == -1 or e == -1: fail('Preflight failed for mobile People section removal.')
files[path] = files[path][:s] + files[path][e:]
repl('components/portal/mobile-portal-navigation.tsx', '<span className="text-[11px] text-[rgb(var(--sep-colour-b8a98f))]">\n                          Rules', '<span className="min-w-0 flex-1 truncate text-[11px] text-[rgb(var(--sep-colour-b8a98f))]">\n                          Rules', 'Rules mobile label style')
repl('components/portal/mobile-portal-navigation.tsx', '<span className="text-[11px] text-[rgb(var(--sep-colour-b8a98f))]">\n                          Economy & Crafting', '<span className="min-w-0 flex-1 truncate text-[11px] text-[rgb(var(--sep-colour-b8a98f))]">\n                          Economy & Crafting', 'Economy mobile label style')
repl('components/portal/mobile-portal-navigation.tsx', '                    <ForumSidebarMenu\n                      unreadCount={\n                        currentUnreadForumCount\n                      }\n                    />', '                    <ForumSidebarMenu\n                      unreadCount={\n                        currentUnreadForumCount\n                      }\n                      mobile\n                    />', 'Forum mobile variant use')
repl('components/portal/forum-sidebar-menu.tsx', 'type ForumSidebarMenuProps = {\n  unreadCount: number;\n};', 'type ForumSidebarMenuProps = {\n  unreadCount: number;\n  mobile?: boolean;\n};', 'Forum mobile prop type')
repl('components/portal/forum-sidebar-menu.tsx', 'export function ForumSidebarMenu({\n  unreadCount,\n}: ForumSidebarMenuProps) {', 'export function ForumSidebarMenu({\n  unreadCount,\n  mobile = false,\n}: ForumSidebarMenuProps) {', 'Forum mobile prop')
repl('components/portal/forum-sidebar-menu.tsx', '        className={`flex min-h-[var(--portal-nav-min-h)] items-center border text-[11px] transition lg:text-xs ${', '        className={`flex ${mobile ? "min-h-[52px]" : "min-h-[var(--portal-nav-min-h)]"} items-center border text-[11px] transition lg:text-xs ${', 'Forum mobile row height')
repl('components/portal/forum-sidebar-menu.tsx', '          className="flex min-w-0 flex-1 items-center gap-2 px-2.5 py-[var(--portal-nav-y)] text-left"', '          className={\n            mobile\n              ? "flex min-w-0 flex-1 items-center gap-3 px-3 py-2 text-left"\n              : "flex min-w-0 flex-1 items-center gap-2 px-2.5 py-[var(--portal-nav-y)] text-left"\n          }', 'Forum mobile spacing')
repl('components/portal/forum-sidebar-menu.tsx', '          <span className="flex h-[18px] w-[18px] shrink-0 items-center justify-center">', '          <span className={mobile ? "flex h-[22px] w-[22px] shrink-0 items-center justify-center" : "flex h-[18px] w-[18px] shrink-0 items-center justify-center"}>', 'Forum mobile icon')
repl('components/portal/forum-sidebar-menu.tsx', '          <span className="truncate">\n            Forum\n          </span>', '          <span className={mobile ? "min-w-0 flex-1 truncate text-[11px] text-[rgb(var(--sep-colour-b8a98f))]" : "truncate"}>\n            Forum\n          </span>', 'Forum mobile label')
mobile = files['components/portal/mobile-portal-navigation.tsx']
for label in ['Aureth','Enter','People','Messages','More']:
    if f'<span>{label}</span>' not in mobile: fail(f'Bottom navigation label {label} is not title case.')
if 'Legal & Safety' not in mobile: fail('Legal & Safety label missing.')

print('Preflight passed. Applying fixes...')
for path, text in files.items():
    (ROOT / path).write_text(text, encoding='utf-8')
    print('  wrote', path)
new_context = '"use client";\n\nimport {\n  useEffect,\n  useMemo,\n  useState,\n} from "react";\n\ntype FeatureEntry = {\n  id: string;\n  name: string;\n  type: string;\n};\n\nexport function AdminCharacterPremiumFeaturesContext() {\n  const [entries, setEntries] =\n    useState<FeatureEntry[]>([]);\n  const [search, setSearch] =\n    useState("");\n\n  useEffect(() => {\n    const readEntries = () => {\n      const nodes = Array.from(\n        document.querySelectorAll<HTMLElement>(\n          \'[data-admin-premium-feature="true"]\',\n        ),\n      );\n\n      setEntries(\n        nodes.map((node) => ({\n          id: node.id,\n          name:\n            node.dataset.adminFeatureName ??\n            "Unnamed feature",\n          type:\n            node.dataset.adminFeatureType ??\n            "Feature",\n        })),\n      );\n    };\n\n    readEntries();\n    const frame =\n      window.requestAnimationFrame(\n        readEntries,\n      );\n\n    window.addEventListener(\n      "sepulchria:admin-data-changed",\n      readEntries,\n    );\n\n    return () => {\n      window.cancelAnimationFrame(frame);\n      window.removeEventListener(\n        "sepulchria:admin-data-changed",\n        readEntries,\n      );\n    };\n  }, []);\n\n  const visible = useMemo(() => {\n    const query =\n      search.trim().toLowerCase();\n\n    if (!query) return entries;\n\n    return entries.filter((entry) =>\n      `${entry.name} ${entry.type}`\n        .toLowerCase()\n        .includes(query),\n    );\n  }, [entries, search]);\n\n  function jumpTo(id: string) {\n    document\n      .getElementById(id)\n      ?.scrollIntoView({\n        behavior: "smooth",\n        block: "start",\n      });\n  }\n\n  return (\n    <div className="flex h-full min-h-0 flex-col">\n      <p className="text-[8px] uppercase tracking-[0.24em] text-[rgb(var(--sep-colour-806b50))]">\n        Premium Features\n      </p>\n\n      <h2 className="mt-1 font-serif text-xl text-[rgb(var(--sep-colour-d8bf91))]">\n        Feature Navigator\n      </h2>\n\n      <p className="mt-2 text-[11px] leading-5 text-[rgb(var(--sep-colour-8f8271))]">\n        Search by feature name or type, then jump directly to it.\n      </p>\n\n      <input\n        type="search"\n        value={search}\n        onChange={(event) =>\n          setSearch(event.target.value)\n        }\n        placeholder="Search features..."\n        className="mt-4 w-full border border-[rgb(var(--sep-colour-59432c))]/45 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2.5 text-xs text-[rgb(var(--sep-colour-d4bea0))] outline-none focus:border-[rgb(var(--sep-colour-987344))]"\n      />\n\n      <div className="mt-3 min-h-0 flex-1 space-y-1.5 overflow-y-auto">\n        {visible.map((entry) => (\n          <button\n            key={entry.id}\n            type="button"\n            onClick={() =>\n              jumpTo(entry.id)\n            }\n            className="w-full border border-[rgb(var(--sep-colour-59432c))]/40 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2.5 text-left transition hover:border-[rgb(var(--sep-colour-80613b))] hover:bg-[rgb(var(--sep-colour-17110d))]"\n          >\n            <span className="block truncate font-serif text-[13px] text-[rgb(var(--sep-colour-cbb28a))]">\n              {entry.name}\n            </span>\n            <span className="mt-1 block text-[7px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-6f6252))]">\n              {entry.type}\n            </span>\n          </button>\n        ))}\n\n        {visible.length === 0 ? (\n          <p className="px-2 py-5 text-center text-[10px] text-[rgb(var(--sep-colour-706452))]">\n            No matching features.\n          </p>\n        ) : null}\n      </div>\n    </div>\n  );\n}\n'
new_path.parent.mkdir(parents=True, exist_ok=True)
new_path.write_text(new_context, encoding='utf-8')
print('  wrote', str(new_path.relative_to(ROOT)))
print('\nApplied successfully. Next: npm run build')