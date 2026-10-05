from pathlib import Path

COMPOSER = Path("app/(portal)/messages/components/MessageComposer.tsx")
UNIFIED = Path("components/sepulchria/sep-ui-unified.css")

for path in (COMPOSER, UNIFIED):
    if not path.exists():
        raise SystemExit(
            f"ERROR: {path} not found. Run this from the Sepulchria repo root."
        )

composer = COMPOSER.read_text(encoding="utf-8")
unified = UNIFIED.read_text(encoding="utf-8")

old_button = '''          <button
            type="button"
            data-sep-message-mode-selector="ongame"
            disabled={isDead}'''

new_button = '''          <button
            type="button"
            id="sep-ongame-message-selector"
            data-sep-message-mode-selector="ongame"
            disabled={isDead}'''

old_css = '''body.portal-skin-scope
  [data-portal-shell]
  button[data-sep-message-mode-selector="ongame"][aria-pressed="true"] {
  background-color:
    rgb(var(--sep-skin-c1) / 0.14) !important;
  color:
    rgb(var(--sep-skin-c2)) !important;
  -webkit-text-fill-color:
    rgb(var(--sep-skin-c2)) !important;
}'''

new_css = '''body.portal-skin-scope
  [data-portal-shell]
  #sep-ongame-message-selector[data-sep-message-mode-selector="ongame"][aria-pressed="true"] {
  background-color:
    rgb(var(--sep-skin-c1) / 0.14) !important;
  color:
    rgb(var(--sep-skin-c2)) !important;
  -webkit-text-fill-color:
    rgb(var(--sep-skin-c2)) !important;
}'''

for label, text, old in [
    ("On-game button", composer, old_button),
    ("On-game CSS override", unified, old_css),
]:
    count = text.count(old)
    if count != 1:
        raise SystemExit(
            f"ERROR: {label} expected exactly once, found {count}. No changes were made."
        )

composer = composer.replace(old_button, new_button, 1)
unified = unified.replace(old_css, new_css, 1)

COMPOSER.write_text(composer, encoding="utf-8")
UNIFIED.write_text(unified, encoding="utf-8")

print("SUCCESS: On-game selector specificity fixed.")
print("Next: npm run build")
