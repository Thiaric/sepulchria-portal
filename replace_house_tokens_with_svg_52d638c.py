from pathlib import Path
import subprocess

BASE = '52d638c'
TOKEN_START = '                return (\n                  <span\n                    key={index}\n                    className="h-2.5 w-2.5 rounded-full border"\n                    style={{'
TOKEN_END = '                    title={remaining ? "Chance available" : "Chance spent"}\n                  />\n                );'
NEW_TOKEN_BLOCK = '                return (\n                  <svg\n                    key={index}\n                    viewBox="0 0 12 12"\n                    aria-label={\n                      remaining\n                        ? "Chance available"\n                        : "Chance spent"\n                    }\n                    role="img"\n                    className="h-2.5 w-2.5 shrink-0"\n                    style={{\n                      color:\n                        readableTokenColour,\n                    }}\n                  >\n                    <circle\n                      cx="6"\n                      cy="6"\n                      r="5"\n                      fill={\n                        remaining\n                          ? "currentColor"\n                          : "none"\n                      }\n                      stroke="currentColor"\n                      strokeWidth="1"\n                    />\n                  </svg>\n                );'
COIN_START = '                  <div className="relative h-6 w-8 shrink-0" aria-hidden="true">'
COIN_END = '                  </div>\n                  <span\n                    className="font-serif text-sm"'
NEW_COIN_BLOCK = '                  <svg\n                    viewBox="0 0 32 24"\n                    aria-hidden="true"\n                    className="h-6 w-8 shrink-0"\n                    style={{\n                      color:\n                        readableTokenColour,\n                    }}\n                  >\n                    <circle cx="9" cy="15" r="6" fill="currentColor" />\n                    <circle cx="21" cy="15" r="6" fill="currentColor" />\n                    <circle cx="15" cy="8" r="6" fill="currentColor" />\n                  </svg>\n                  <span\n                    className="font-serif text-sm"'
SPENT_BLOCK = '\n  const spentTokenColour =\n    `color-mix(in srgb, ${readableTokenColour} 42%, rgb(128 128 128))`;\n'

head = subprocess.run(["git","rev-parse","--short","HEAD"], check=True, capture_output=True, text=True, encoding="utf-8").stdout.strip()
if not head.startswith(BASE):
    raise SystemExit(f"This patch expects HEAD {BASE}; current HEAD is {head}. No files were changed.")

path = Path("app/(portal)/game/components/HouseOfChancesPanel.tsx")
if not path.exists():
    raise SystemExit("Missing HouseOfChancesPanel.tsx. No files were changed.")
text = path.read_text(encoding="utf-8")

start = text.find(TOKEN_START)
if start == -1:
    raise SystemExit("Could not find Fortune-token render block. No files were changed.")
end = text.find(TOKEN_END, start)
if end == -1:
    raise SystemExit("Could not find end of Fortune-token render block. No files were changed.")
end += len(TOKEN_END)
text = text[:start] + NEW_TOKEN_BLOCK + text[end:]

cstart = text.find(COIN_START)
if cstart == -1:
    raise SystemExit("Could not find Remnants coin icon block. No files were changed.")
cend = text.find(COIN_END, cstart)
if cend == -1:
    raise SystemExit("Could not find end of Remnants coin icon block. No files were changed.")
cend += len(COIN_END)
text = text[:cstart] + NEW_COIN_BLOCK + text[cend:]

if SPENT_BLOCK in text:
    text = text.replace(SPENT_BLOCK, "\n", 1)

path.write_text(text, encoding="utf-8")

print("SUCCESS")
print("- unused Fortune tokens: solid SVG circles in readable text colour")
print("- used Fortune tokens: hollow SVG circles in readable text colour")
print("- Remnants stash: three solid SVG coins in readable text colour")
print("Run: npm run build")
