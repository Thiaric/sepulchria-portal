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

old = '''              ? "h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] min-h-0 min-w-0 max-h-[calc(100dvh-1rem)] max-w-[calc(100vw-1rem)] overflow-hidden"
'''

new = '''              ? "h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] min-h-0 min-w-0 max-h-[calc(100dvh-1rem)] max-w-[calc(100vw-1rem)] overflow-hidden sm:resize"
'''

if text.count(old) == 1:
    text = text.replace(
        old,
        new,
        1,
    )
elif text.count(new) == 1:
    print(
        "INFO: Messages modal is already maximised and resizable."
    )
else:
    fail(
        "Could not find the Messages maximised sizing branch."
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
print("Messages now:")
print("- opens maximised")
print("- remains resizable")
print("- can still be collapsed")
print("- can still be closed")
print()
print("Next: npm run build")
