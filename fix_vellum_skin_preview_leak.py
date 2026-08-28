from pathlib import Path

ROOT = Path.cwd()
gallery_path = ROOT / "components/portal/portal-skin-gallery.tsx"
css_path = ROOT / "app/globals.css"

if not gallery_path.exists():
    raise SystemExit(f"Missing file: {gallery_path}")
if not css_path.exists():
    raise SystemExit(f"Missing file: {css_path}")

gallery = gallery_path.read_text(encoding="utf-8")
css = css_path.read_text(encoding="utf-8")

replacements = [
    (
        'className="portal-skin-scope"',
        'className="portal-skin-scope portal-skin-preview-card"',
    ),
    (
        'className="flex h-full min-h-[200px] flex-col overflow-hidden border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))] text-[rgb(var(--sep-colour-cbbba3))]"',
        'className="portal-skin-preview-surface flex h-full min-h-[200px] flex-col overflow-hidden border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))] text-[rgb(var(--sep-colour-cbbba3))]"',
    ),
    (
        'className="text-xl text-[rgb(var(--sep-colour-e1c89f))]"',
        'className="portal-skin-preview-title text-xl text-[rgb(var(--sep-colour-e1c89f))]"',
    ),
    (
        'className="mt-2 text-[11px] leading-5 text-[rgb(var(--sep-colour-8f8271))]"',
        'className="portal-skin-preview-description mt-2 text-[11px] leading-5 text-[rgb(var(--sep-colour-8f8271))]"',
    ),
    (
        'className="shrink-0 border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-100c09))] px-2 py-1 text-[7px] uppercase tracking-[0.15em] text-[rgb(var(--sep-colour-a99069))]"',
        'className="portal-skin-preview-badge shrink-0 border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-100c09))] px-2 py-1 text-[7px] uppercase tracking-[0.15em] text-[rgb(var(--sep-colour-a99069))]"',
    ),
    (
        'className="mt-4 border-t border-[rgb(var(--sep-colour-60482e))]/30 pt-3 text-[9px] leading-4 text-[rgb(var(--sep-colour-8f8271))]"',
        'className="portal-skin-preview-locked mt-4 border-t border-[rgb(var(--sep-colour-60482e))]/30 pt-3 text-[9px] leading-4 text-[rgb(var(--sep-colour-8f8271))]"',
    ),
    (
        'className="border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2 text-[8px] uppercase tracking-[0.15em] text-[rgb(var(--sep-colour-baa78c))] transition hover:border-[rgb(var(--sep-colour-8d693e))] hover:bg-[rgb(var(--sep-colour-19120d))] hover:text-[rgb(var(--sep-colour-d8bb8a))]"',
        'className="portal-skin-preview-secondary-button border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2 text-[8px] uppercase tracking-[0.15em] text-[rgb(var(--sep-colour-baa78c))] transition hover:border-[rgb(var(--sep-colour-8d693e))] hover:bg-[rgb(var(--sep-colour-19120d))] hover:text-[rgb(var(--sep-colour-d8bb8a))]"',
    ),
    (
        'className="border border-[rgb(var(--sep-colour-987344))] bg-[rgb(var(--sep-colour-3b2919))] px-3 py-2 text-[8px] uppercase tracking-[0.15em] text-[rgb(var(--sep-colour-efd6a8))] transition hover:border-[rgb(var(--sep-colour-b78b50))] hover:bg-[rgb(var(--sep-colour-4a331f))] disabled:opacity-50"',
        'className="portal-skin-preview-primary-button border border-[rgb(var(--sep-colour-987344))] bg-[rgb(var(--sep-colour-3b2919))] px-3 py-2 text-[8px] uppercase tracking-[0.15em] text-[rgb(var(--sep-colour-efd6a8))] transition hover:border-[rgb(var(--sep-colour-b78b50))] hover:bg-[rgb(var(--sep-colour-4a331f))] disabled:opacity-50"',
    ),
]

new_gallery = gallery
for old, new in replacements:
    if new in new_gallery:
        continue
    count = new_gallery.count(old)
    if count != 1:
        raise SystemExit(f"Expected exactly one anchor but found {count}: {old[:120]}")
    new_gallery = new_gallery.replace(old, new, 1)

css_block = '''
/* =========================================================
   APPEARANCE GALLERY - NESTED SKIN PREVIEW ISOLATION
   Each preview card must render from its own data-portal-skin
   even when the active page skin has descendant overrides.
   ========================================================= */

.portal-skin-preview-card[data-portal-skin] {
  font-family: var(--portal-font-body) !important;
}

.portal-skin-preview-card[data-portal-skin] > .portal-skin-preview-surface {
  border-color: rgb(var(--sep-colour-60482e) / 0.45) !important;
  background: rgb(var(--sep-colour-15100d)) !important;
  color: rgb(var(--sep-colour-cbbba3)) !important;
  font-family: var(--portal-font-body) !important;
}

.portal-skin-preview-card[data-portal-skin] .portal-skin-preview-title {
  color: rgb(var(--sep-colour-e1c89f)) !important;
  font-family: var(--portal-font-display) !important;
}

.portal-skin-preview-card[data-portal-skin] .portal-skin-preview-description,
.portal-skin-preview-card[data-portal-skin] .portal-skin-preview-locked {
  color: rgb(var(--sep-colour-8f8271)) !important;
  font-family: var(--portal-font-body) !important;
}

.portal-skin-preview-card[data-portal-skin] .portal-skin-preview-badge {
  border-color: rgb(var(--sep-colour-60482e) / 0.45) !important;
  background: rgb(var(--sep-colour-100c09)) !important;
  color: rgb(var(--sep-colour-a99069)) !important;
  font-family: var(--portal-font-body) !important;
}

.portal-skin-preview-card[data-portal-skin] .portal-skin-preview-secondary-button {
  border-color: rgb(var(--sep-colour-60482e) / 0.55) !important;
  background: rgb(var(--sep-colour-100c09)) !important;
  color: rgb(var(--sep-colour-baa78c)) !important;
  font-family: var(--portal-font-body) !important;
}

.portal-skin-preview-card[data-portal-skin] .portal-skin-preview-secondary-button:hover {
  border-color: rgb(var(--sep-colour-8d693e)) !important;
  background: rgb(var(--sep-colour-19120d)) !important;
  color: rgb(var(--sep-colour-d8bb8a)) !important;
}

.portal-skin-preview-card[data-portal-skin] .portal-skin-preview-primary-button {
  border-color: rgb(var(--sep-colour-987344)) !important;
  background: rgb(var(--sep-colour-3b2919)) !important;
  color: rgb(var(--sep-colour-efd6a8)) !important;
  font-family: var(--portal-font-body) !important;
}

.portal-skin-preview-card[data-portal-skin] .portal-skin-preview-primary-button:hover {
  border-color: rgb(var(--sep-colour-b78b50)) !important;
  background: rgb(var(--sep-colour-4a331f)) !important;
}
'''

marker = "APPEARANCE GALLERY - NESTED SKIN PREVIEW ISOLATION"
new_css = css
if marker not in new_css:
    new_css = new_css.rstrip() + "\n\n" + css_block.strip() + "\n"

if new_gallery == gallery and new_css == css:
    print("Already patched; no changes needed.")
else:
    gallery_path.write_text(new_gallery, encoding="utf-8")
    css_path.write_text(new_css, encoding="utf-8")
    print("Patched:")
    print(f" - {gallery_path}")
    print(f" - {css_path}")
    print("Now run: npm run build")
