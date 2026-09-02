from pathlib import Path
import subprocess

ROOT = Path.cwd()
head = subprocess.check_output(['git','rev-parse','--short','HEAD'], text=True).strip()
if not head.startswith('3d381f7'):
    raise SystemExit(f'Expected HEAD 3d381f7, found {head}. Stop and have ChatGPT re-inspect.')

rel = 'app/(portal)/game/components/RoomMessageList.tsx'
path = ROOT / rel
text = path.read_text(encoding='utf-8')

def repl(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected 1 match, found {count}')
    return text.replace(old, new, 1)

text = repl(text, 'import { PriceTooltip } from "@/components/warping/price-tooltip";\n', 'import { PriceTooltip } from "@/components/warping/price-tooltip";\nimport { CosmeticFrameOverlay } from "@/components/cosmetics/cosmetic-frame-overlay";\n', 'chat repair replacement 1')
text = repl(text, 'const [activeShapeTags,setActiveShapeTags]=useState<\n', 'const [chatFrames,setChatFrames]=useState<\n  Record<string,string>\n>({});\n\nconst chatCharacterIdsKey =\n  Array.from(\n    new Set(\n      liveMessages\n        .map(\n          (message) =>\n            message.character_id,\n        )\n        .filter(Boolean),\n    ),\n  )\n    .sort()\n    .join(",");\n\nconst [activeShapeTags,setActiveShapeTags]=useState<\n', 'chat repair replacement 2')
text = repl(text, '  useEffect(()=>{\n    let active=true;\n    const supabase=createClient();\n', '  useEffect(() => {\n    let active = true;\n\n    async function loadChatFrames() {\n      if (!chatCharacterIdsKey) {\n        if (active) {\n          setChatFrames({});\n        }\n        return;\n      }\n\n      try {\n        const response = await fetch(\n          `/api/cosmetics/chat?ids=${encodeURIComponent(\n            chatCharacterIdsKey,\n          )}`,\n          {\n            cache: "no-store",\n          },\n        );\n\n        const data = await response.json() as {\n          error?: string;\n          frames?: Record<string,string>;\n        };\n\n        if (!response.ok) {\n          throw new Error(\n            data.error ??\n              "Unable to load chat cosmetics.",\n          );\n        }\n\n        if (active) {\n          setChatFrames(\n            data.frames ?? {},\n          );\n        }\n      } catch (error) {\n        console.error(\n          "Unable to load Chat Frames:",\n          error,\n        );\n      }\n    }\n\n    void loadChatFrames();\n\n    const timer =\n      window.setInterval(\n        () =>\n          void loadChatFrames(),\n        30000,\n      );\n\n    function handleFocus() {\n      void loadChatFrames();\n    }\n\n    window.addEventListener(\n      "focus",\n      handleFocus,\n    );\n\n    return () => {\n      active = false;\n      window.clearInterval(\n        timer,\n      );\n      window.removeEventListener(\n        "focus",\n        handleFocus,\n      );\n    };\n  }, [chatCharacterIdsKey]);\n\n  useEffect(()=>{\n    let active=true;\n    const supabase=createClient();\n', 'chat repair replacement 3')
text = repl(text, '                const isMechanicalOutput =\n                  item.message_type ===\n                    "dice_roll" ||\n                  item.message_type ===\n                    "attribute_check" ||\n                  isMechanicalAction;\n\n                return (\n', '                const isMechanicalOutput =\n                  item.message_type ===\n                    "dice_roll" ||\n                  item.message_type ===\n                    "attribute_check" ||\n                  isMechanicalAction;\n\n                const chatFrameUrl =\n                  !isMechanicalOutput\n                    ? chatFrames[\n                        item.character_id\n                      ] ?? null\n                    : null;\n\n                return (\n', 'chat repair replacement 4')
text = repl(text, '                    className={`relative flex min-w-0 gap-3 py-3 pl-5 pr-12 sm:pl-7 sm:pr-12 ${\n', '                    className={`relative flex min-w-0 gap-3 py-3 pl-5 pr-12 sm:pl-7 sm:pr-12 ${\n                      chatFrameUrl\n                        ? "isolate overflow-hidden "\n                        : ""\n                    }${\n', 'chat repair replacement 5')
text = repl(text, '                  >\n                    {item.character_id &&\n', '                  >\n                    <CosmeticFrameOverlay\n                      assetUrl={chatFrameUrl}\n                      layer="background"\n                    />\n\n                    {item.character_id &&\n', 'chat repair replacement 6')
text = repl(text, '                    {/* Left: portrait, identity icons and timestamp */}\n                    <div className="flex w-[76px] shrink-0 flex-col">\n', '                    {/* Left: portrait, identity icons and timestamp */}\n                    <div className="relative z-10 flex w-[76px] shrink-0 flex-col">\n', 'chat repair replacement 7')
text = repl(text, '                    <p\n                      className={`min-w-0 flex-1 whitespace-pre-wrap break-words text-[13px] leading-[18px] ${\n', '                    <p\n                      className={`relative z-10 min-w-0 flex-1 whitespace-pre-wrap break-words text-[13px] leading-[18px] ${\n', 'chat repair replacement 8')

path.write_text(text, encoding='utf-8')
print('Step 5 chat rendering repair applied successfully.')
