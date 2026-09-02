from pathlib import Path

ROOT = Path.cwd()
TARGET = ROOT / "app/(portal)/game/components/RoomMessageList.tsx"

if not TARGET.exists():
    raise SystemExit(f"Missing required file: {TARGET}")

text = TARGET.read_text(encoding="utf-8")

old_link_style = '''                                privateLocationTheme
                                  ? {
                                      color:
                                        isWhisper
                                          ? privateLocationTheme.whisperTextColour
                                          : privateLocationTheme.offgameTextColour,
                                    }
                                  : undefined
'''
new_link_style = '''                                {
                                  color:
                                    privateLocationTheme
                                      ? privateLocationTheme.offgameTextColour
                                      : "rgb(var(--sep-colour-d3c2aa))",
                                }
'''

old_span_style = '''                                privateLocationTheme
                                  ? {
                                      color:
                                        isWhisper
                                          ? privateLocationTheme.whisperTextColour
                                          : privateLocationTheme.offgameTextColour,
                                    }
                                  : undefined
'''
new_span_style = '''                                {
                                  color:
                                    privateLocationTheme
                                      ? privateLocationTheme.offgameTextColour
                                      : "rgb(var(--sep-colour-d3c2aa))",
                                }
'''

old_action_colours = '''                            speechColour={
                              privateLocationTheme
                                ? isWhisper
                                  ? privateLocationTheme.whisperTextColour
                                  : privateLocationTheme.offgameTextColour
                                : undefined
                            }
                            actionColour={
                              privateLocationTheme
                                ? isWhisper
                                  ? privateLocationTheme.whisperTextColour
                                  : privateLocationTheme.offgameTextColour
                                : undefined
                            }
'''
new_action_colours = '''                            speechColour={
                              privateLocationTheme
                                ? privateLocationTheme.offgameTextColour
                                : "rgb(var(--sep-colour-d3c2aa))"
                            }
                            actionColour={
                              privateLocationTheme
                                ? privateLocationTheme.offgameTextColour
                                : "rgb(var(--sep-colour-d3c2aa))"
                            }
'''

# The same author style block occurs twice: Link and fallback span.
count = text.count(old_link_style)
if count != 2:
    raise SystemExit(
        f"Expected 2 whisper/OOC author colour blocks, found {count}. Nothing changed."
    )
text = text.replace(old_link_style, new_link_style, 2)

count = text.count(old_action_colours)
if count != 1:
    raise SystemExit(
        f"Expected 1 whisper/OOC message colour block, found {count}. Nothing changed."
    )
text = text.replace(old_action_colours, new_action_colours, 1)

TARGET.write_text(text, encoding="utf-8")

print("✓ app/(portal)/game/components/RoomMessageList.tsx")
print("  - whisper character name now uses the OOC // text colour")
print("  - whisper message body now uses the OOC // text colour")
print("  - OOC behaviour remains the same")
print("  - WHISPER TO ... label keeps its whisper-specific colour")
print("  - no other message types changed")
