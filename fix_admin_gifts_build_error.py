#!/usr/bin/env python3
from pathlib import Path
import sys

ROOT = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else Path.cwd()
path = ROOT / "app/(portal)/admin/gifts/page.tsx"

if not path.exists():
    raise SystemExit(f"Missing file: {path}")

text = path.read_text(encoding="utf-8")

old = "        ) : null}\n        </div>\n      </div>\n    </main>\n"
new = "        ) : null}\n      </div>\n    </main>\n"

if new in text and old not in text:
    print("SKIP  admin/gifts JSX closing tags already fixed")
else:
    if old not in text:
        raise SystemExit(
            "Could not find the malformed closing-tag block in "
            "app/(portal)/admin/gifts/page.tsx"
        )

    text = text.replace(old, new, 1)
    path.write_text(text, encoding="utf-8")
    print("FIX   app/(portal)/admin/gifts/page.tsx")

print()
print("DONE")
print("Run: npm run build")
