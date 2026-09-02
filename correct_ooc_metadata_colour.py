from pathlib import Path

ROOT = Path.cwd()
TARGET = ROOT / "app/(portal)/game/components/RoomMessageList.tsx"

if not TARGET.exists():
    raise SystemExit(f"Missing required file: {TARGET}")

text = TARGET.read_text(encoding="utf-8")

# This patch corrects the previous metadata-colour patch.
# It expects the optional metadataColour plumbing added by that patch.
required = [
    "metadataColour?:string,",
    'style={{\n                            color:\n                              "rgb(var(--sep-colour-776b5b))",\n                          }}',
    '"rgb(var(--sep-colour-776b5b))",',
]

missing = [item for item in required if item not in text]
if missing:
    raise SystemExit(
        "Could not find the previous metadata-colour patch exactly. "
        "Nothing changed. Missing: " + repr(missing)
    )

# 1) Date/time in the whisper/OOC shared block:
#    use EXACTLY the OOC // message body colour.
old_time_style = '''                          style={{
                            color:
                              "rgb(var(--sep-colour-776b5b))",
                          }}
'''
new_time_style = '''                          style={{
                            color:
                              privateLocationTheme
                                ? privateLocationTheme.offgameTextColour
                                : "rgb(var(--sep-colour-d3c2aa))",
                          }}
'''

count = text.count(old_time_style)
if count != 1:
    raise SystemExit(
        f"timestamp correction: expected 1 match, found {count}. Nothing changed."
    )
text = text.replace(old_time_style, new_time_style, 1)

# 2) Price / condition text in the same whisper/OOC block:
#    use EXACTLY the OOC // message body colour.
old_call = '''                            ? shapeTagHeaderText(
                                author.id,
                                "rgb(var(--sep-colour-776b5b))",
                              )
'''
new_call = '''                            ? shapeTagHeaderText(
                                author.id,
                                privateLocationTheme
                                  ? privateLocationTheme.offgameTextColour
                                  : "rgb(var(--sep-colour-d3c2aa))",
                              )
'''

count = text.count(old_call)
if count != 1:
    raise SystemExit(
        f"price/condition correction: expected 1 match, found {count}. Nothing changed."
    )
text = text.replace(old_call, new_call, 1)

TARGET.write_text(text, encoding="utf-8")

print("✓ Corrected app/(portal)/game/components/RoomMessageList.tsx")
print("  - removed the wrong neutral metadata colour")
print("  - date/time now matches the actual // off-character message text")
print("  - Price/condition text now matches the actual // off-character message text")
print("  - private-location OOC themes use offgameTextColour")
print("  - default OOC uses --sep-colour-d3c2aa")
print("  - normal action message colours are untouched")
print("  - whisper label/body colour logic is untouched")
