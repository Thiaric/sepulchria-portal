from pathlib import Path

manager_path = Path("components/portal/portal-modal-viewport-manager.tsx")
css_path = Path("components/sepulchria/sep-ui-unified.css")

if not manager_path.exists():
    raise SystemExit(
        "Missing portal-modal-viewport-manager.tsx. "
        "Apply the modal fullscreen patch first."
    )

if not css_path.exists():
    raise SystemExit(
        "Missing sep-ui-unified.css. "
        "Apply the unification patch first."
    )

manager = manager_path.read_text(encoding="utf-8")
css = css_path.read_text(encoding="utf-8")

old_create = '''function createToggle(
  dialog: HTMLElement,
  frame: HTMLElement,
): HTMLButtonElement {
  const existing =
    frame.querySelector<HTMLButtonElement>(
      "button[data-sep-modal-size-toggle='true']",
    );

  if (existing) {
    return existing;
  }

  const toggle = document.createElement("button");

  toggle.type = "button";
  toggle.dataset.sepModalSizeToggle = "true";
  toggle.className = "sep-modal-size-toggle";

  const minimize = findControl(frame, "minimize");
  const close = findControl(frame, "close");

  if (minimize?.parentElement) {
    minimize.insertAdjacentElement(
      "afterend",
      toggle,
    );
  } else if (close?.parentElement) {
    close.parentElement.insertBefore(
      toggle,
      close,
    );
  } else {
    toggle.dataset.sepModalToggleFloating = "true";
    frame.appendChild(toggle);
  }

  return toggle;
}'''

new_create = '''function createToggle(
  dialog: HTMLElement,
  frame: HTMLElement,
): HTMLButtonElement {
  const existing =
    frame.querySelector<HTMLButtonElement>(
      "button[data-sep-modal-size-toggle='true']",
    );

  if (existing) {
    return existing;
  }

  const toggle = document.createElement("button");

  toggle.type = "button";
  toggle.dataset.sepModalSizeToggle = "true";

  const minimize = findControl(frame, "minimize");
  const close = findControl(frame, "close");
  const visualSibling = minimize ?? close;

  // Match the modal's EXISTING control geometry exactly.
  if (visualSibling) {
    toggle.className =
      `${visualSibling.className} sep-modal-size-toggle`;
  } else {
    toggle.className =
      "sep-modal-size-toggle sep-modal-size-toggle--fallback";
  }

  if (minimize?.parentElement) {
    minimize.insertAdjacentElement(
      "afterend",
      toggle,
    );
  } else if (close?.parentElement) {
    close.parentElement.insertBefore(
      toggle,
      close,
    );
  } else {
    toggle.dataset.sepModalToggleFloating = "true";
    frame.appendChild(toggle);
  }

  return toggle;
}'''

if old_create not in manager:
    raise SystemExit(
        "Could not find the expected createToggle implementation. "
        "No files were changed."
    )

manager = manager.replace(old_create, new_create, 1)

old_css = '''/* Canonical maximise / restore control. */
body.portal-skin-scope
  .sep-modal-size-toggle {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  padding: 0;
  border: 1px solid
    color-mix(
      in srgb,
      rgb(var(--sep-colour-60482e)) 50%,
      transparent
    ) !important;
  border-radius: 0 !important;
  background: rgb(var(--sep-colour-18110d)) !important;
  color: rgb(var(--sep-colour-bca27b)) !important;
  font-family: Georgia, serif;
  font-size: 15px;
  line-height: 1;
  letter-spacing: 0;
  cursor: pointer;
  z-index: 80;
  transition:
    border-color 150ms ease,
    background-color 150ms ease,
    color 150ms ease;
}

body.portal-skin-scope
  .sep-modal-size-toggle:hover {
  border-color:
    rgb(var(--sep-colour-9b7446)) !important;
  background:
    rgb(var(--sep-colour-2b1d12)) !important;
  color:
    rgb(var(--sep-colour-ecd2a3)) !important;
}

body.portal-skin-scope
  .sep-modal-size-toggle:focus-visible {
  outline: 1px solid
    rgb(var(--sep-colour-9b7446));
  outline-offset: 2px;
}

/*
 * Only modals with no existing minimise/close control need a floating
 * placement. Normal modals inherit their existing header flex layout.
 */
body.portal-skin-scope
  .sep-modal-size-toggle[data-sep-modal-toggle-floating="true"] {
  position: absolute;
  top: 10px;
  right: 10px;
}'''

new_css = '''/* Canonical maximise / restore control. */
body.portal-skin-scope
  .sep-modal-size-toggle {
  /* Geometry comes from the neighbouring Minimize/Close control. */
  flex: 0 0 auto;
  cursor: pointer;
  z-index: 80;
  line-height: 1;
  letter-spacing: 0 !important;
}

body.portal-skin-scope
  .sep-modal-size-toggle:focus-visible {
  outline: 1px solid
    rgb(var(--sep-colour-9b7446));
  outline-offset: 2px;
}

/*
 * Fallback geometry is used only for the rare modal that has no
 * Minimize OR Close control from which we can inherit sizing.
 */
body.portal-skin-scope
  .sep-modal-size-toggle--fallback {
  display: inline-flex;
  width: 36px;
  height: 36px;
  padding: 0;
  align-items: center;
  justify-content: center;
  border: 1px solid
    color-mix(
      in srgb,
      rgb(var(--sep-colour-60482e)) 50%,
      transparent
    ) !important;
  border-radius: 0 !important;
  background: rgb(var(--sep-colour-18110d)) !important;
  color: rgb(var(--sep-colour-bca27b)) !important;
  font-family: Georgia, serif;
  font-size: 15px;
}

/*
 * Only modals with no existing minimise/close control need a floating
 * placement. Normal modals inherit their existing header flex layout.
 */
body.portal-skin-scope
  .sep-modal-size-toggle[data-sep-modal-toggle-floating="true"] {
  position: absolute;
  top: 10px;
  right: 10px;
}'''

if old_css not in css:
    raise SystemExit(
        "Could not find the expected modal-size-toggle CSS block. "
        "No files were changed."
    )

css = css.replace(old_css, new_css, 1)

marker = "PORTAL MODAL ROOT — TRUE VIEWPORT MAXIMIZATION"

root_fix = '''

/* ==================================================================
   PORTAL MODAL ROOT — TRUE VIEWPORT MAXIMIZATION
   ==================================================================
   Some older portal modals render their semantic dialog inside a page
   container rather than as their own fixed viewport overlay.
   ================================================================== */

body.portal-skin-scope
  [data-sep-managed-modal="true"] {
  position: fixed !important;
  inset: 0 !important;
  width: auto !important;
  height: auto !important;
  min-width: 0 !important;
  min-height: 0 !important;
  max-width: none !important;
  max-height: none !important;
  margin: 0 !important;
  z-index: 9990 !important;
}

body.portal-skin-scope
  [data-sep-managed-modal="true"][data-sep-modal-maximized="true"] {
  display: flex !important;
  align-items: stretch !important;
  justify-content: stretch !important;
  padding: 8px !important;
}

body.portal-skin-scope
  [data-sep-managed-modal="true"][data-sep-modal-maximized="false"] {
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
}

body.portal-skin-scope
  [data-sep-managed-modal="true"][data-sep-modal-maximized="false"]
  [data-sep-managed-modal-frame="true"] {
  max-width: revert !important;
  max-height: revert !important;
  margin: auto !important;
}
'''

if marker not in css:
    css += root_fix

manager_path.write_text(manager, encoding="utf-8")
css_path.write_text(css, encoding="utf-8")

print("SUCCESS")
print("")
print("Fixed:")
print("  1. Maximize/restore button now copies Minimize/Close sizing/classes.")
print("  2. Every managed modal root is fixed to the actual browser viewport.")
print("  3. Older Codex-style/page-contained modals maximize in the right place.")
print("  4. Existing already-fullscreen modals keep the same behaviour.")
print("")
print("Changed only:")
print("  components/portal/portal-modal-viewport-manager.tsx")
print("  components/sepulchria/sep-ui-unified.css")
print("")
print("Run: npm run build")
