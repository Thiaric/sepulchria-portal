from pathlib import Path

path = Path("components/messages/messages-context-navigator.tsx")

if not path.exists():
    raise SystemExit(
        "Missing components/messages/messages-context-navigator.tsx"
    )

text = path.read_text(encoding="utf-8")

old = "shadow-[inset_2px_0_0_#c18b48]"
new = "shadow-[inset_2px_0_0_rgb(var(--sep-colour-9b7446))]"

count = text.count(old)

if count == 0:
    if new in text:
        raise SystemExit(
            "The Messages selected-conversation skin fix is already applied."
        )
    raise SystemExit(
        "Expected hard-coded selected conversation colour was not found. "
        "No files were changed."
    )

if count != 1:
    raise SystemExit(
        f"Expected exactly one selected-conversation hard-coded colour, found {count}. "
        "No files were changed."
    )

text = text.replace(old, new, 1)
path.write_text(text, encoding="utf-8")

print("SUCCESS")
print("")
print("Removed the fixed #c18b48 selected-conversation accent.")
print("The selected Messages context row now uses the active skin's")
print("--sep-colour-9b7446 accent instead.")
print("")
print("Changed only:")
print("  components/messages/messages-context-navigator.tsx")
print("")
print("Run: npm run build")
