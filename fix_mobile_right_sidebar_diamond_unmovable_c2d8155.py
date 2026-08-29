from pathlib import Path
import subprocess

BASE = 'c2d8155'
PATH = Path('components/portal/portal-responsive-right-sidebar.tsx')
OLD = '      <button\n        type="button"\n        onClick={() =>\n          setOpen(true)\n        }\n        aria-label="Open context panel"\n        aria-expanded={open}\n        className="fixed bottom-5 right-5 z-40 flex h-12 w-12 items-center justify-center border border-[rgb(var(--sep-colour-765937))] bg-[rgb(var(--sep-colour-1d160f))] font-serif text-xl text-[rgb(var(--sep-colour-d8bf91))] shadow-[0_12px_35px_rgba(var(--sep-rgb-0-0-0),0.45)] transition hover:border-[rgb(var(--sep-colour-a37b45))] hover:text-[rgb(var(--sep-colour-f0d39d))] xl:hidden"\n      >'
NEW = '      <button\n        type="button"\n        data-sep-interaction-ignore="true"\n        onClick={() =>\n          setOpen(true)\n        }\n        aria-label="Open context panel"\n        aria-expanded={open}\n        className="fixed bottom-5 right-5 z-40 flex h-12 w-12 items-center justify-center border border-[rgb(var(--sep-colour-765937))] bg-[rgb(var(--sep-colour-1d160f))] font-serif text-xl text-[rgb(var(--sep-colour-d8bf91))] shadow-[0_12px_35px_rgba(var(--sep-rgb-0-0-0),0.45)] [transform:none!important] transition-colors hover:border-[rgb(var(--sep-colour-a37b45))] hover:text-[rgb(var(--sep-colour-f0d39d))] xl:hidden"\n      >'

head = subprocess.run(
    ["git", "rev-parse", "--short", "HEAD"],
    check=True,
    capture_output=True,
    text=True,
    encoding="utf-8",
).stdout.strip()

if not head.startswith(BASE):
    raise SystemExit(
        f"This patch expects HEAD {BASE}; current HEAD is {head}. "
        "No files were changed."
    )

if not PATH.exists():
    raise SystemExit(
        "Missing portal-responsive-right-sidebar.tsx. "
        "No files were changed."
    )

text = PATH.read_text(encoding="utf-8")

if text.count(OLD) != 1:
    raise SystemExit(
        f"Expected exactly one mobile context diamond button; "
        f"found {text.count(OLD)}. No files were changed."
    )

text = text.replace(OLD, NEW, 1)
PATH.write_text(text, encoding="utf-8")

print("SUCCESS")
print("")
print("Mobile right-sidebar diamond fixed:")
print("  - excluded from portal interaction movement/glow")
print("  - transform explicitly locked to none")
print("  - still clickable")
print("  - border/text hover colour retained")
print("")
print("Run: npm run build")
