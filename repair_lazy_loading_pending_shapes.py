from pathlib import Path
import subprocess

ROOT = Path.cwd()

def fail(message: str) -> None:
    raise SystemExit(f"\nPATCH STOPPED: {message}\n")

def read(rel: str) -> str:
    path = ROOT / rel
    if not path.exists():
        fail(f"Missing expected file: {rel}")
    return path.read_text(encoding="utf-8")

def write(rel: str, text: str) -> None:
    (ROOT / rel).write_text(text, encoding="utf-8")

def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        fail(f"{label}: expected exactly 1 match, found {count}")
    return text.replace(old, new, 1)

head = subprocess.check_output(
    ["git", "rev-parse", "--short=7", "HEAD"],
    text=True,
).strip()

if head != "2564660":
    fail(f"Expected HEAD 2564660, found {head}")

rel = "app/(portal)/game/components/PendingShapeResponses.tsx"
text = read(rel)

if 'loadMyEffectiveAttributes' not in text:
    text = replace_once(
        text,
        'import type {CharacterAttributes} from "@/types/game";',
        'import type {CharacterAttributes} from "@/types/game";\n'
        'import {loadMyEffectiveAttributes} from "../deferred-actions";',
        "lazy attributes import",
    )

text = replace_once(
    text,
    'export function PendingShapeResponses({attributes}:{attributes:CharacterAttributes}){',
    'export function PendingShapeResponses(){',
    "PendingShapeResponses signature",
)

text = replace_once(
    text,
    ' const db=useMemo(()=>createClient(),[]);\n'
    ' const [rows,setRows]=useState<any[]>([]);\n'
    ' const [state,action]=useActionState(resolveIncomingShape,initial);',
    ' const db=useMemo(()=>createClient(),[]);\n'
    ' const [rows,setRows]=useState<any[]>([]);\n'
    ' const [attributes,setAttributes]=useState<CharacterAttributes|null>(null);\n'
    ' const [state,action]=useActionState(resolveIncomingShape,initial);',
    "PendingShapeResponses state",
)

guard = ' if(!rows.length)return null;'
lazy_effect = (
    ' useEffect(()=>{\n'
    '  if(!rows.length||attributes)return;\n'
    '  let active=true;\n'
    '  void loadMyEffectiveAttributes()\n'
    '    .then(result=>{\n'
    '      if(active)setAttributes(result.attributes);\n'
    '    })\n'
    '    .catch(()=>{});\n'
    '  return()=>{active=false};\n'
    ' },[rows.length,attributes]);\n\n'
    ' if(!rows.length)return null;'
)

text = replace_once(
    text,
    guard,
    lazy_effect,
    "PendingShapeResponses lazy attribute effect",
)

text = text.replace(
    'Number(attributes[A[x]]??0)',
    'Number(attributes?.[A[x]]??0)',
)

write(rel, text)

print("Completed the interrupted lazy-loading patch.")
print("Next: npm run build")
