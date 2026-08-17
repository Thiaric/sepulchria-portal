from pathlib import Path

ROOT = Path.cwd()
PATH = ROOT / 'app/(portal)/game/components/RoomChatForm.tsx'

if not (ROOT / 'package.json').exists():
    raise SystemExit('ERROR: Run this installer from the sepulchria-portal repository root.')

if not PATH.exists():
    raise SystemExit('ERROR: RoomChatForm.tsx not found.')

s = PATH.read_text(encoding='utf-8')

# Add browser Supabase client import.
import_anchor = 'import { ItemExchangePanel } from "./ItemExchangePanel";\n'
import_repl = 'import { ItemExchangePanel } from "./ItemExchangePanel";\nimport { createClient } from "@/lib/supabase/client";\n'
if import_anchor not in s:
    raise SystemExit('ERROR: Phase 11 ItemExchangePanel import not found. Install the Phase 11 UX fix first.')
if 'import { createClient } from "@/lib/supabase/client";' not in s:
    s = s.replace(import_anchor, import_repl, 1)

# Add incoming-exchange notification state immediately after router.
state_anchor = '  const router = useRouter();\n\n'
state_repl = '  const router = useRouter();\n\n  const exchangeSupabase =\n    useMemo(\n      () => createClient(),\n      [],\n    );\n\n  const [\n    hasIncomingExchange,\n    setHasIncomingExchange,\n  ] = useState(false);\n\n  useEffect(() => {\n    let active = true;\n    let myCharacterId:\n      string | null = null;\n\n    async function checkIncomingExchange() {\n      const {\n        data: characterId,\n        error: characterError,\n      } = await exchangeSupabase.rpc(\n        "my_character_id",\n      );\n\n      if (\n        !active ||\n        characterError ||\n        !characterId\n      ) {\n        return;\n      }\n\n      myCharacterId =\n        String(characterId);\n\n      const {\n        data,\n        error,\n      } = await exchangeSupabase\n        .from("item_trades")\n        .select("id")\n        .eq(\n          "status",\n          "open",\n        )\n        .eq(\n          "character_two_id",\n          myCharacterId,\n        )\n        .limit(1);\n\n      if (!active || error) {\n        return;\n      }\n\n      setHasIncomingExchange(\n        Boolean(data?.length),\n      );\n    }\n\n    void checkIncomingExchange();\n\n    const channel =\n      exchangeSupabase\n        .channel(\n          `incoming-item-exchange-${crypto.randomUUID()}`,\n        )\n        .on(\n          "postgres_changes",\n          {\n            event: "*",\n            schema: "public",\n            table: "item_trades",\n          },\n          () => {\n            void checkIncomingExchange();\n          },\n        )\n        .subscribe();\n\n    const fallback =\n      window.setInterval(\n        () => {\n          void checkIncomingExchange();\n        },\n        3000,\n      );\n\n    return () => {\n      active = false;\n      window.clearInterval(\n        fallback,\n      );\n      void exchangeSupabase.removeChannel(\n        channel,\n      );\n    };\n  }, [exchangeSupabase]);\n\n'
if state_anchor not in s:
    raise SystemExit('ERROR: Router state anchor not found in RoomChatForm.tsx.')
if 'hasIncomingExchange' not in s:
    s = s.replace(state_anchor, state_repl, 1)

# Add a dedicated flashing button class.
class_anchor = '  const utilityButtonActiveClass =\n    "border border-[#a17a49] bg-[#3a2919] px-3 py-2 text-[8px] uppercase tracking-[0.13em] text-[#f0d6a7]";\n\n'
class_repl = '  const utilityButtonActiveClass =\n    "border border-[#a17a49] bg-[#3a2919] px-3 py-2 text-[8px] uppercase tracking-[0.13em] text-[#f0d6a7]";\n\n  const incomingExchangeButtonClass =\n    "animate-pulse border border-[#d1a45f] bg-[#4a3218] px-3 py-2 text-[8px] uppercase tracking-[0.13em] text-[#ffe0a3] shadow-[0_0_14px_rgba(209,164,95,0.55)] transition hover:border-[#efc77c] hover:bg-[#5a3b1c]";\n\n'
if class_anchor not in s:
    raise SystemExit('ERROR: Utility button classes not found.')
if 'incomingExchangeButtonClass' not in s:
    s = s.replace(class_anchor, class_repl, 1)

# Replace only the Item Exchange utility button styling/title.
button_anchor = '        <button\n          type="button"\n          onClick={() =>\n            toggleUtility("exchange")\n          }\n          disabled={\n            presentCharacters.length === 0\n          }\n          className={\n            utilityMode === "exchange"\n              ? utilityButtonActiveClass\n              : utilityButtonClass\n          }\n        >\n          Item Exchange\n        </button>\n'
button_repl = '        <button\n          type="button"\n          onClick={() =>\n            toggleUtility("exchange")\n          }\n          disabled={\n            presentCharacters.length === 0\n          }\n          title={\n            hasIncomingExchange &&\n            utilityMode !== "exchange"\n              ? "Incoming Item Exchange"\n              : "Item Exchange"\n          }\n          className={\n            utilityMode === "exchange"\n              ? utilityButtonActiveClass\n              : hasIncomingExchange\n                ? incomingExchangeButtonClass\n                : utilityButtonClass\n          }\n        >\n          Item Exchange\n        </button>\n'
if button_anchor not in s:
    raise SystemExit('ERROR: Phase 11 Item Exchange utility button not found.')
s = s.replace(button_anchor, button_repl, 1)

PATH.write_text(s, encoding='utf-8')

print('SUCCESS')
print('Incoming Item Exchange notification installed.')
print('No SQL is required if the Phase 11 live-exchange SQL is already installed.')
print('Now run: npm run build')