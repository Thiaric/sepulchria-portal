from pathlib import Path

path = Path.cwd() / "components/world/world-indicator.tsx"

if not path.exists():
    raise SystemExit(
        f"ERROR: Missing expected file: {path}"
    )

text = path.read_text(encoding="utf-8")

old = '                  eventCount > 0\n                    ? "cursor-pointer hover:bg-[rgb(var(--sep-colour-241a11))]"\n                    : "cursor-default",'
new = '                  eventCount > 0\n                    ? "cursor-pointer bg-[rgb(var(--sep-colour-2b1d12))] ring-2 ring-inset ring-[rgb(var(--sep-colour-9f7744))]/75 shadow-[inset_0_0_14px_rgba(176,128,67,0.22)] hover:bg-[rgb(var(--sep-colour-362418))] hover:ring-[rgb(var(--sep-colour-c19152))]/90"\n                    : "cursor-default",'

if new in text:
    print("ALREADY PATCHED")
elif old not in text:
    raise SystemExit(
        "ERROR: Could not find the expected calendar event-day class block. "
        "No file was changed. This patch is based on commit e7b9a09."
    )
else:
    text = text.replace(old, new, 1)
    path.write_text(text, encoding="utf-8")
    print("SUCCESS")

print("Calendar days with one or more events now have:")
print("- a distinct highlighted background")
print("- a 2px inset gold ring")
print("- a soft internal glow")
print("- a stronger hover state")
print("- the existing event-count badge unchanged")
print("Next: npm run build")
