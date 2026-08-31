from pathlib import Path

BASE = "a1bcb03"
PATH = Path("components/logout-button.tsx")

if not PATH.exists():
    raise SystemExit(f"Missing {PATH}. Run from repo root.")

text = PATH.read_text(encoding="utf-8")

old = '''  <button
    type="button"
    onPointerDown={() => {'''

new = '''  <button
    type="button"
    aria-label="Log out"
    data-experience-logout="1"
    onPointerDown={() => {'''

count = text.count(old)
if count != 1:
    raise SystemExit(
        f"Logout button marker: expected 1 match, found {count}. "
        "This patch expects the working tree produced from a1bcb03."
    )

text = text.replace(old, new, 1)

PATH.write_text(text, encoding="utf-8")
print("✓ components/logout-button.tsx")
print("Logout button is now explicitly identifiable by the experience-feedback guard.")
print("Run: npm run build")
