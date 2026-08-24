from pathlib import Path
import shutil, subprocess

ROOT = Path.cwd()
EXPECTED = "d6e8d86ca48bc5b438a3b9923a15d3bf2f04375a"
EXPERTISE_ACTION = '"use server";\n\nimport {\n  createClient,\n} from "@/lib/supabase/server";\n\nexport async function heartbeatExpertisePresence():\n  Promise<void> {\n  const supabase =\n    await createClient();\n\n  const {\n    data: { user },\n    error: authError,\n  } =\n    await supabase.auth.getUser();\n\n  if (authError || !user) {\n    return;\n  }\n\n  const { error } =\n    await supabase.rpc(\n      "claim_presence_expertise_tick",\n    );\n\n  if (error) {\n    throw new Error(\n      `Unable to update portal-time Expertise: ${error.message}`,\n    );\n  }\n}\n'

def read(rel):
    p = ROOT / rel
    if not p.exists(): raise SystemExit(f'ERROR: missing file: {rel}')
    return p.read_text(encoding='utf-8')

def write(rel, text):
    p = ROOT / rel
    b = p.with_suffix(p.suffix + '.before-10min-expertise-location-log-tabs.bak')
    if not b.exists(): shutil.copy2(p, b)
    p.write_text(text, encoding='utf-8')
    print(f'Updated: {rel}')

def replace_once(text, old, new, rel, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'PRECHECK FAILED in {rel}: {label} expected once, found {count}.')
    return text.replace(old, new, 1)

head = subprocess.check_output(['git','rev-parse','HEAD'], cwd=ROOT, text=True).strip()
if head != EXPECTED:
    raise SystemExit(f'PRECHECK FAILED: built for {EXPECTED[:7]}, current HEAD is {head[:7]}.')

new_rel = 'app/(portal)/game/expertise-presence-actions.ts'
new_path = ROOT / new_rel
if new_path.exists(): raise SystemExit(f'PRECHECK FAILED: {new_rel} already exists.')
new_path.write_text(EXPERTISE_ACTION, encoding='utf-8')
print(f'Created: {new_rel}')

changes = {}
rel = 'components/portal/portal-presence-heartbeat.tsx'
text = changes.get(rel, read(rel))
text = replace_once(text, 'import {\n  heartbeatPresence,\n  restoreManualPresence,\n  setAutomaticAway,\n} from "@/app/(portal)/game/actions";\n', 'import {\n  heartbeatPresence,\n  restoreManualPresence,\n  setAutomaticAway,\n} from "@/app/(portal)/game/actions";\nimport {\n  heartbeatExpertisePresence,\n} from "@/app/(portal)/game/expertise-presence-actions";\n', rel, 'Expertise heartbeat import')
changes[rel] = text

rel = 'components/portal/portal-presence-heartbeat.tsx'
text = changes.get(rel, read(rel))
text = replace_once(text, 'const HEARTBEAT_INTERVAL_MS =\n  60_000;\n\nconst AWAY_AFTER_MS =', 'const HEARTBEAT_INTERVAL_MS =\n  60_000;\n\nconst EXPERTISE_HEARTBEAT_INTERVAL_MS =\n  10 * 60_000;\n\nconst AWAY_AFTER_MS =', rel, '10-minute Expertise interval')
changes[rel] = text

rel = 'components/portal/portal-presence-heartbeat.tsx'
text = changes.get(rel, read(rel))
text = replace_once(text, '  const runningRef =\n    useRef(false);\n\n  const awayTimerRef =', '  const runningRef =\n    useRef(false);\n\n  const expertiseRunningRef =\n    useRef(false);\n\n  const awayTimerRef =', rel, 'Expertise running ref')
changes[rel] = text

rel = 'components/portal/portal-presence-heartbeat.tsx'
text = changes.get(rel, read(rel))
text = replace_once(text, '    async function markAutomaticAway() {', '    async function sendExpertiseHeartbeat() {\n      if (\n        expertiseRunningRef.current ||\n        document.visibilityState ===\n          "hidden"\n      ) {\n        return;\n      }\n\n      expertiseRunningRef.current = true;\n\n      try {\n        await heartbeatExpertisePresence();\n      } catch (error) {\n        console.error(\n          "Unable to refresh portal-time Expertise:",\n          error,\n        );\n      } finally {\n        expertiseRunningRef.current = false;\n      }\n    }\n\n    async function markAutomaticAway() {', rel, 'Expertise heartbeat function')
changes[rel] = text

rel = 'components/portal/portal-presence-heartbeat.tsx'
text = changes.get(rel, read(rel))
text = replace_once(text, '    const intervalId =\n      window.setInterval(\n        () => {\n          if (\n            document.visibilityState ===\n            "visible"\n          ) {\n            void sendHeartbeat();\n          }\n        },\n        HEARTBEAT_INTERVAL_MS,\n      );\n\n    function handleVisibilityChange() {', '    const intervalId =\n      window.setInterval(\n        () => {\n          if (\n            document.visibilityState ===\n            "visible"\n          ) {\n            void sendHeartbeat();\n          }\n        },\n        HEARTBEAT_INTERVAL_MS,\n      );\n\n    if (\n      document.visibilityState ===\n      "visible"\n    ) {\n      void sendExpertiseHeartbeat();\n    }\n\n    const expertiseIntervalId =\n      window.setInterval(\n        () => {\n          if (\n            document.visibilityState ===\n            "visible"\n          ) {\n            void sendExpertiseHeartbeat();\n          }\n        },\n        EXPERTISE_HEARTBEAT_INTERVAL_MS,\n      );\n\n    function handleVisibilityChange() {', rel, 'dedicated Expertise interval')
changes[rel] = text

rel = 'components/portal/portal-presence-heartbeat.tsx'
text = changes.get(rel, read(rel))
text = replace_once(text, '      window.clearInterval(\n        intervalId,\n      );\n\n      clearTimers();', '      window.clearInterval(\n        intervalId,\n      );\n\n      window.clearInterval(\n        expertiseIntervalId,\n      );\n\n      clearTimers();', rel, 'clear Expertise interval')
changes[rel] = text

rel = 'components/characters/character-sheet-tabs.tsx'
text = changes.get(rel, read(rel))
text = replace_once(text, '  flex min-w-0 flex-wrap items-end gap-1', '  flex min-w-0 flex-nowrap items-end gap-1', rel, 'single-row tab bar')
changes[rel] = text

rel = 'components/characters/character-sheet-tabs.tsx'
text = changes.get(rel, read(rel))
text = replace_once(text, '          relative min-w-[112px] flex-1\n          rounded-t-lg\n          border border-b-0\n          px-4 py-3\n          font-serif text-[11px]', '          relative min-w-0 flex-1\n          rounded-t-lg\n          border border-b-0\n          px-2 py-3\n          font-serif text-[10px]', rel, 'fit all Character tabs on one row')
changes[rel] = text

for rel, text in changes.items():
    write(rel, text)

print('')
print('Patch applied.')
print('NEXT:')
print('  1. Run 10_MIN_EXPERTISE_AND_REMOVE_LOCATION_LOGS.sql in Supabase.')
print('  2. Run npm run build')
