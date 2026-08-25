from pathlib import Path

ROOT = Path.cwd()
PATH = ROOT / "app/rules/page.tsx"


def fail(message: str) -> None:
    raise SystemExit(
        f"ERROR: {message}\nNo changes were applied."
    )


if not PATH.exists():
    fail("Missing app/rules/page.tsx")

text = PATH.read_text(encoding="utf-8")

old = """  return (
    <div className="relative">
      <EmbeddedPortalSkinBridge />
"""

new = """  return (
    <div
      className={
        isEmbedded
          ? "relative h-screen overflow-y-auto overscroll-contain"
          : "relative"
      }
    >
      <EmbeddedPortalSkinBridge />
"""

if new in text:
    print("Rules embedded scrolling is already fixed.")
    raise SystemExit(0)

if text.count(old) != 1:
    fail(
        "Exact Rules page anchor from commit 8d089044 was not found."
    )

updated = text.replace(
    old,
    new,
    1,
)

for marker in [
    'isEmbedded',
    '"relative h-screen overflow-y-auto overscroll-contain"',
    '<PublicRules',
]:
    if marker not in updated:
        fail(
            f"Final validation failed: missing {marker!r}"
        )

PATH.write_text(
    updated,
    encoding="utf-8",
    newline="\n",
)

print("WROTE  app/rules/page.tsx")
print()
print("RULES MODAL SCROLL FIX APPLIED")
print("- Standalone /rules is unchanged.")
print("- Embedded /rules now owns a viewport-height scrolling container.")
print("- Long rule content can scroll to the bottom.")
print("- Modal/iframe CSS is untouched.")
print("- Other modals are untouched.")
print()
print("Next: npm run build")
