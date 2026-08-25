from pathlib import Path
import subprocess

ROOT = Path.cwd()
EXPECTED = "84e3971595a1f9aa4f3ae005f2cc78a5742afbb8"

PATH = ROOT / "components/portal/portal-sidebar.tsx"


def fail(message: str) -> None:
    raise SystemExit(
        f"ERROR: {message}\nNo changes were applied."
    )


if not PATH.exists():
    fail(
        "Missing components/portal/portal-sidebar.tsx"
    )

head = subprocess.check_output(
    ["git", "rev-parse", "HEAD"],
    cwd=ROOT,
    text=True,
).strip()

if head != EXPECTED:
    fail(
        f"Patch expects HEAD {EXPECTED}, "
        f"but current HEAD is {head}"
    )

text = PATH.read_text(
    encoding="utf-8",
)

anchor = '''  const iframeSrc =
    `${item.href}${separator}embedded=1`;

  const modalWindowRef =
'''

replacement = '''  const iframeSrc =
    `${item.href}${separator}embedded=1`;

  const isMessagesModal =
    item.label === "Messages" ||
    item.label.startsWith(
      "Messages — ",
    ) ||
    item.href === "/messages" ||
    item.href.startsWith(
      "/messages/",
    );

  const modalWindowRef =
'''

if text.count(anchor) != 1:
    fail(
        "Could not find the PublicPageModal iframeSrc block."
    )

text = text.replace(
    anchor,
    replacement,
    1,
)

old_class = '''          collapsed
            ? "h-10 w-[calc(100vw-1rem)] max-w-[420px] overflow-hidden sm:w-[420px]"
            : "h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] min-h-0 min-w-0 max-h-[calc(100dvh-1rem)] max-w-[calc(100vw-1rem)] overflow-hidden sm:h-[76vh] sm:w-[76vw] sm:min-h-[360px] sm:min-w-[520px] sm:max-h-[94vh] sm:max-w-[94vw] sm:resize"
'''

new_class = '''          collapsed
            ? "h-10 w-[calc(100vw-1rem)] max-w-[420px] overflow-hidden sm:w-[420px]"
            : isMessagesModal
              ? "h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] min-h-0 min-w-0 max-h-[calc(100dvh-1rem)] max-w-[calc(100vw-1rem)] overflow-hidden"
              : "h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] min-h-0 min-w-0 max-h-[calc(100dvh-1rem)] max-w-[calc(100vw-1rem)] overflow-hidden sm:h-[76vh] sm:w-[76vw] sm:min-h-[360px] sm:min-w-[520px] sm:max-h-[94vh] sm:max-w-[94vw] sm:resize"
'''

if text.count(old_class) != 1:
    fail(
        "Could not find the current PublicPageModal size classes."
    )

text = text.replace(
    old_class,
    new_class,
    1,
)

PATH.write_text(
    text,
    encoding="utf-8",
    newline="\n",
)

print(
    "WROTE  components/portal/portal-sidebar.tsx"
)
print()
print("PATCH APPLIED SUCCESSFULLY")
print()
print("Messages behaviour:")
print("- Messages inbox opens maximised.")
print("- Individual message conversations open maximised.")
print("- Other portal modals keep their current 76vw / 76vh default size.")
print("- Messages can still be collapsed and closed normally.")
print()
print("Next: npm run build")
