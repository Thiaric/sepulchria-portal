from pathlib import Path

path = Path("components/portal/portal-sidebar.tsx")

if not path.exists():
    raise SystemExit("Missing components/portal/portal-sidebar.tsx")

text = path.read_text(encoding="utf-8")

old_wrapper = '''              : "flex min-h-0 flex-1 flex-col"
          }'''

new_wrapper = '''              : "relative flex min-h-0 flex-1 flex-col"
          }'''

if old_wrapper not in text:
    raise SystemExit(
        "Could not find PublicPageModal content wrapper. "
        "No files were changed."
    )

text = text.replace(old_wrapper, new_wrapper, 1)

old_handle = '''              className="absolute bottom-0 right-0 z-20 h-5 w-5 cursor-se-resize"'''
new_handle = '''              className="absolute bottom-0 right-0 z-30 h-8 w-8 touch-none cursor-se-resize select-none"'''

if old_handle not in text:
    raise SystemExit(
        "Could not find the current resize handle. "
        "No files were changed."
    )

text = text.replace(old_handle, new_handle, 1)

old_mark = '''                className="absolute bottom-1 right-1 block h-2.5 w-2.5 border-b border-r border-[rgb(var(--sep-colour-a98b61))]/80"'''
new_mark = '''                className="pointer-events-none absolute bottom-1.5 right-1.5 block h-3.5 w-3.5 border-b border-r border-[rgb(var(--sep-colour-a98b61))]/80"'''

if old_mark not in text:
    raise SystemExit(
        "Could not find the resize corner marker. "
        "No files were changed."
    )

text = text.replace(old_mark, new_mark, 1)

path.write_text(text, encoding="utf-8")

print("SUCCESS")
print("")
print("Restored PublicPageModal resizing made easier and reliable.")
print("")
print("Changes:")
print("  - content wrapper is now explicitly relative")
print("  - bottom-right resize hit area increased from 20x20 to 32x32")
print("  - resize handle has higher z-index above iframe content")
print("  - touch selection/interference disabled on resize corner")
print("  - visible corner marker enlarged slightly")
print("")
print("Maximized windows still intentionally cannot be manually resized.")
print("Click Restore first, then drag the bottom-right corner.")
print("")
print("Changed only:")
print("  components/portal/portal-sidebar.tsx")
print("")
print("Run: npm run build")
