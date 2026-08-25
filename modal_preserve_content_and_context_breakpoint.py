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

if text.count(old_open) == 1:
    text = text.replace(
        old_open,
        new_open,
        1,
    )
else:
    fail(
        "Could not find the current collapse/iframe opening block."
    )

old_close = '''            </div>
          </>
        ) : null}
      </div>
'''

new_close = '''            </div>
        </div>
      </div>
'''

if text.count(old_close) == 1:
    text = text.replace(
        old_close,
        new_close,
        1,
    )
else:
    fail(
        "Could not find the current collapse/iframe closing block."
    )

old_breakpoint = '''                  @media (max-width: 899px) {
                    .sepulchria-viewport-body {
                      grid-template-columns:
                        minmax(0, 1fr) !important;
                    }

                    .portal-right-shell {
                      display: none !important;
                    }
                  }
'''

new_breakpoint = '''                  @media (max-width: 959px) {
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

if text.count(old_breakpoint) == 1:
    text = text.replace(
        old_breakpoint,
        new_breakpoint,
        1,
    )
elif text.count(new_breakpoint) != 1:
    fail(
        "Could not find the current embedded Context breakpoint."
    )

required = [
    'collapsed\n              ? "hidden"\n              : "flex min-h-0 flex-1 flex-col"',
    "@media (max-width: 959px)",
    ".portal-right-shell {\n                      display: none !important;",
    "cursor-se-resize",
    "function PublicPageModal({",
]

for marker in required:
    if marker not in text:
        fail(
            f"Safety check failed after editing: missing {marker!r}"
        )

if "{!collapsed ? (" in text:
    fail(
        "Safety check failed: the iframe is still conditionally unmounted."
    )

if text == original:
    print("INFO: Both improvements are already present.")
else:
    PATH.write_text(
        text,
        encoding="utf-8",
        newline="\n",
    )

    print(
        "WROTE  components/portal/portal-sidebar.tsx"
    )

print()
print("TARGETED MODAL IMPROVEMENTS APPLIED")
print()
print("- The iframe now stays mounted while the modal is collapsed.")
print("- Collapse/restore therefore preserves the current internal page/state.")
print("- Context remains visible on wider modals.")
print("- Context hides automatically below 960px modal width.")
print("- Existing drag, resize, modal ownership and navigation handling are unchanged.")
print()
print("Next: npm run build")
