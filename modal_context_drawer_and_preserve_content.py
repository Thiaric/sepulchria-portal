from pathlib import Path

ROOT = Path.cwd()
PATH = ROOT / "components/portal/portal-sidebar.tsx"


def fail(message: str) -> None:
    raise SystemExit(
        f"ERROR: {message}\nNo changes were applied."
    )


if not PATH.exists():
    fail("Missing components/portal/portal-sidebar.tsx")

text = PATH.read_text(encoding="utf-8")
original = text

# ---------------------------------------------------------------------------
# 1. Preserve iframe content across collapse/restore.
#    Apply only if the old conditional-unmount version is still present.
# ---------------------------------------------------------------------------

old_open = '''        {!collapsed ? (
          <>
            <iframe
'''

new_open = '''        <div
          className={
            collapsed
              ? "hidden"
              : "flex min-h-0 flex-1 flex-col"
          }
        >
            <iframe
'''

if old_open in text:
    if text.count(old_open) != 1:
        fail("Found multiple collapse/iframe opening blocks.")
    text = text.replace(old_open, new_open, 1)

old_close = '''            </div>
          </>
        ) : null}
      </div>
'''

new_close = '''            </div>
        </div>
      </div>
'''

if old_close in text:
    if text.count(old_close) != 1:
        fail("Found multiple collapse/iframe closing blocks.")
    text = text.replace(old_close, new_close, 1)

# ---------------------------------------------------------------------------
# 2. Narrow modal Context behaviour:
#    use the SAME drawer mechanics as the normal portal.
#
#    Wide modal:
#      centre + right Context column
#
#    Narrow modal (<960px):
#      centre fills modal
#      diamond button appears
#      Context stays off-canvas until clicked
#      clicking diamond slides it over content
#      backdrop/close button still work
# ---------------------------------------------------------------------------

old_899 = '''                  @media (max-width: 899px) {
                    .sepulchria-viewport-body {
                      grid-template-columns:
                        minmax(0, 1fr) !important;
                    }

                    .portal-right-shell {
                      display: none !important;
                    }
                  }
'''

old_959 = '''                  @media (max-width: 959px) {
                    .sepulchria-viewport-body {
                      grid-template-columns:
                        minmax(0, 1fr) !important;
                    }

                    [data-portal-centre-host] {
                      grid-column: 1 !important;
                      width: 100% !important;
                    }

                    .portal-right-shell {
                      display: none !important;
                    }
                  }
'''

drawer_css = '''                  @media (max-width: 959px) {
                    .sepulchria-viewport-body {
                      grid-template-columns:
                        minmax(0, 1fr) !important;
                      grid-template-rows:
                        minmax(0, 1fr) !important;
                    }

                    [data-portal-centre-host] {
                      grid-column: 1 !important;
                      grid-row: 1 !important;
                      width: 100% !important;
                      min-width: 0 !important;
                    }

                    /*
                     * Match the main portal's responsive Context behaviour.
                     * The shell itself becomes layout-transparent so its
                     * floating button/backdrop/sidebar can sit over content.
                     */
                    .portal-right-shell {
                      display: contents !important;
                    }

                    /*
                     * Re-enable the existing diamond opener and backdrop.
                     * They are direct buttons rendered by
                     * PortalResponsiveRightSidebar.
                     */
                    .portal-right-shell
                      > button:not(
                        .portal-right-collapse-toggle
                      ) {
                      display: flex !important;
                    }

                    .portal-right-collapse-toggle {
                      display: none !important;
                    }

                    /*
                     * Restore the component's own mobile/off-canvas drawer
                     * semantics inside the iframe viewport.
                     */
                    .portal-right-shell
                      > [data-portal-right-sidebar] {
                      position: fixed !important;
                      inset: 0 0 0 auto !important;
                      z-index: 70 !important;
                      display: flex !important;
                      flex-direction: column !important;
                      width: min(88vw, 360px) !important;
                      height: 100dvh !important;
                      min-height: 0 !important;
                      max-height: none !important;
                      overflow: hidden !important;
                      transform:
                        translateX(100%) !important;
                      box-shadow:
                        -18px 0 50px
                        rgba(
                          var(--sep-rgb-0-0-0),
                          0.55
                        ) !important;
                      transition:
                        transform 200ms ease-out !important;
                    }

                    .portal-right-shell
                      > [data-portal-right-sidebar].translate-x-0 {
                      transform:
                        translateX(0) !important;
                    }

                    .portal-right-shell
                      > [data-portal-right-sidebar].translate-x-full {
                      transform:
                        translateX(100%) !important;
                    }

                    /*
                     * In drawer mode the component's own Context header and
                     * close button must be visible again.
                     */
                    .portal-right-shell
                      > [data-portal-right-sidebar]
                      > div:first-child {
                      display: flex !important;
                    }

                    /*
                     * Keep the modal-specific content filtering already used
                     * in the wide Context column.
                     */
                    .portal-right-shell
                      > [data-portal-right-sidebar]
                      > div:nth-child(2)
                      > div:first-child
                      > div:first-child {
                      display: none !important;
                    }

                    .portal-right-shell
                      > [data-portal-right-sidebar]
                      > div:nth-child(2)
                      > div:last-child {
                      display: none !important;
                    }
                  }
'''

if drawer_css not in text:
    if text.count(old_959) == 1:
        text = text.replace(old_959, drawer_css, 1)
    elif text.count(old_899) == 1:
        text = text.replace(old_899, drawer_css, 1)
    else:
        fail(
            "Could not find the current narrow-modal Context breakpoint."
        )

# ---------------------------------------------------------------------------
# Safety checks
# ---------------------------------------------------------------------------

required = [
    "@media (max-width: 959px)",
    "> button:not(",
    "width: min(88vw, 360px) !important;",
    "> [data-portal-right-sidebar].translate-x-0",
    "> [data-portal-right-sidebar].translate-x-full",
    "display: contents !important;",
    "cursor-se-resize",
    "function PublicPageModal({",
]

for marker in required:
    if marker not in text:
        fail(
            f"Safety check failed after editing: missing {marker!r}"
        )

if "portal-right-shell {\n                      display: none !important;" in text:
    fail(
        "Safety check failed: narrow Context is still permanently hidden."
    )

if text == original:
    print("INFO: Requested Context drawer behavior is already present.")
else:
    PATH.write_text(
        text,
        encoding="utf-8",
        newline="\n",
    )
    print("WROTE  components/portal/portal-sidebar.tsx")

print()
print("TARGETED MODAL CONTEXT FIX APPLIED")
print()
print("- Wide modal: Context remains a normal right column.")
print("- Narrow modal (<960px): Context column leaves the layout.")
print("- The existing diamond opener becomes visible.")
print("- Clicking the diamond slides Context over the modal content.")
print("- The existing backdrop and Context close control remain operational.")
print("- Collapse/restore keeps the iframe mounted and preserves its current page.")
print("- Modal ownership, drag, resize, navigation and postMessage handling are unchanged.")
print()
print("Next: npm run build")
