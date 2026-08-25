from pathlib import Path

ROOT = Path.cwd()
PATH = ROOT / "components/portal/portal-sidebar.tsx"


def fail(message: str) -> None:
    raise SystemExit(
        f"ERROR: {message}\nNo changes were applied."
    )


if not PATH.exists():
    fail(
        "Missing components/portal/portal-sidebar.tsx"
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

if text.count(anchor) == 1:
    text = text.replace(
        anchor,
        replacement,
        1,
    )
elif text.count(replacement) == 1:
    print(
        "INFO: Messages modal detection is already present."
    )
else:
    fail(
        "Could not find the expected PublicPageModal iframeSrc block."
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

if text.count(old_class) == 1:
    text = text.replace(
        old_class,
        new_class,
        1,
    )
elif text.count(new_class) == 1:
    print(
        "INFO: Messages maximise sizing is already present."
    )
else:
    fail(
        "Could not find the expected PublicPageModal size classes."
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
print("- Other portal modals keep their current default size.")
print("- Messages can still be collapsed and closed normally.")
print()
print("Next: npm run build")
