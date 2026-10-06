from pathlib import Path

TSX = Path("components/portal/portal-sidebar.tsx")
CSS = Path("components/sepulchria/sep-ui-unified.css")

def die(msg: str) -> None:
    raise SystemExit(f"ERROR: {msg}\nNo changes were made.")

if not TSX.exists() or not CSS.exists():
    die("Expected files not found. Run this from the repository root.")

tsx = TSX.read_text(encoding="utf-8")
css = CSS.read_text(encoding="utf-8")

old = 'className="mr-1 h-7 border border-[rgb(var(--sep-colour-60482e))]/50 bg-[rgb(var(--sep-colour-17110d))] px-3 text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-bd9d6d))] transition hover:border-[rgb(var(--sep-colour-967342))] hover:text-[rgb(var(--sep-colour-f1d7a5))]"'
new = 'className="sep-modal-play-tutorial mr-1 h-7 border border-[rgb(var(--sep-colour-60482e))]/50 bg-[rgb(var(--sep-colour-17110d))] px-3 text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-bd9d6d))] transition"'

if tsx.count(old) != 1:
    die(f"Could not uniquely find modal Play Tutorial button (matches: {tsx.count(old)}).")

marker = "/* MODAL PLAY TUTORIAL HOVER */"
if marker in css:
    die("Hover override already exists.")

css_add = '''

/* MODAL PLAY TUTORIAL HOVER */
[data-portal-shell] .sep-modal-play-tutorial:hover {
  border-color: rgb(var(--sep-skin-c1)) !important;
  background-color: rgb(var(--sep-skin-c1) / 0.18) !important;
  color: rgb(var(--sep-skin-c2)) !important;
  -webkit-text-fill-color: rgb(var(--sep-skin-c2)) !important;
}
'''

TSX.write_text(tsx.replace(old, new, 1), encoding="utf-8")
CSS.write_text(css.rstrip() + css_add + "\n", encoding="utf-8")

print("SUCCESS")
print(f"Updated: {TSX}")
print(f"Updated: {CSS}")
print("Added a dedicated high-specificity hover state for the modal Play Tutorial button.")
print("Next: npm run build")
