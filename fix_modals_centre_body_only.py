from pathlib import Path
import subprocess
import sys
import shutil

EXPECTED_HEAD = "39953f1"
ROOT = Path.cwd()
TARGET = ROOT / "components/portal/portal-sidebar.tsx"

def fail(message: str):
    print(f"\nERROR: {message}")
    sys.exit(1)

try:
    head = subprocess.check_output(
        ["git", "rev-parse", "--short", "HEAD"],
        cwd=ROOT,
        text=True,
    ).strip()
except Exception as exc:
    fail(f"Could not read Git HEAD: {exc}")

if not head.startswith(EXPECTED_HEAD):
    fail(
        f"This corrective patch expects HEAD {EXPECTED_HEAD}, "
        f"but your current HEAD is {head}."
    )

if not TARGET.exists():
    fail(f"Missing file: {TARGET}")

text = TARGET.read_text(encoding="utf-8")

old = '''        <iframe
          src={iframeSrc}
          title={item.label}
          className="min-h-0 w-full flex-1 border-0 bg-[rgb(var(--sep-colour-090705))]"
        />'''

new = '''        <iframe
          src={iframeSrc}
          title={item.label}
          onLoad={(event) => {
            const frame =
              event.currentTarget;
            const doc =
              frame.contentDocument;

            if (!doc) {
              return;
            }

            const existing =
              doc.getElementById(
                "sepulchria-centre-only-modal-style",
              );

            if (existing) {
              return;
            }

            const style =
              doc.createElement(
                "style",
              );

            style.id =
              "sepulchria-centre-only-modal-style";

            style.textContent = `
              [data-portal-header],
              .portal-left-shell,
              .portal-right-shell,
              footer[aria-label="Tidings"] {
                display: none !important;
              }

              [data-portal-shell],
              [data-portal-shell-inner] {
                width: 100% !important;
                height: 100dvh !important;
                min-height: 100dvh !important;
                overflow: hidden !important;
              }

              .sepulchria-viewport-body {
                display: grid !important;
                grid-template-columns: minmax(0, 1fr) !important;
                width: 100% !important;
                max-width: none !important;
                height: 100% !important;
                min-height: 0 !important;
                overflow: hidden !important;
              }

              [data-portal-centre-host] {
                grid-column: 1 !important;
                width: 100% !important;
                min-width: 0 !important;
                height: 100% !important;
                min-height: 0 !important;
              }

              [data-portal-centre-host]
                > [data-portal-column] {
                width: 100% !important;
                max-width: none !important;
                height: 100% !important;
                min-height: 0 !important;
                overflow-y: auto !important;
                overflow-x: hidden !important;
              }
            `;

            doc.head.appendChild(
              style,
            );
          }}
          className="min-h-0 w-full flex-1 border-0 bg-[rgb(var(--sep-colour-090705))]"
        />'''

count = text.count(old)
if count != 1:
    fail(
        "Could not find the exact modal iframe block once. "
        f"Found {count} matches. No changes were made."
    )

backup = TARGET.with_suffix(
    TARGET.suffix + ".before-centre-only-modal-fix.bak"
)
if not backup.exists():
    shutil.copy2(TARGET, backup)

TARGET.write_text(
    text.replace(old, new, 1),
    encoding="utf-8",
)

print("PATCH APPLIED")
print("Only the centre page body will now be visible inside modal iframes.")
print("")
print("Next:")
print("  npm run build")
