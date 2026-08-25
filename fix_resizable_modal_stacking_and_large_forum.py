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

original = text

handler_old = '''  useEffect(() => {
    function handleExternalModalOpen(event: Event) {
'''

handler_new = '''  useEffect(() => {
    /*
     * A page rendered inside a portal modal still mounts the portal layout,
     * including its hidden PortalSidebar.
     *
     * Only the top-level portal is allowed to own modal windows.
     * Embedded pages forward modal requests through the iframe bridge
     * installed by PublicPageModal instead.
     */
    if (window.self !== window.top) {
      return;
    }

    function handleExternalModalOpen(event: Event) {
'''

if text.count(handler_old) == 1:
    text = text.replace(
        handler_old,
        handler_new,
        1,
    )
elif text.count(handler_new) != 1:
    fail(
        "Could not find the external portal-modal event handler."
    )

large_old = '''  const isCharacterModal =
    item.href === "/characters" ||
    item.href.startsWith(
      "/characters/",
    );

  const isLargeModal =
    isMessagesModal ||
    isCharacterModal;
'''

large_new = '''  const isCharacterModal =
    item.href === "/characters" ||
    item.href.startsWith(
      "/characters/",
    );

  const isForumModal =
    item.href === "/forum" ||
    item.href.startsWith(
      "/forum/",
    );

  const isLargeModal =
    isMessagesModal ||
    isCharacterModal ||
    isForumModal;
'''

if text.count(large_old) == 1:
    text = text.replace(
        large_old,
        large_new,
        1,
    )
elif text.count(large_new) != 1:
    fail(
        "Could not find the current large-modal detection block."
    )

observer_old = '''    const modalWindow =
      modalWindowRef.current;

    const resizeObserver =
      modalWindow &&
      typeof ResizeObserver !==
        "undefined"
        ? new ResizeObserver(() => {
            keepWindowInBounds();
          })
        : null;

    if (
      resizeObserver &&
      modalWindow
    ) {
      resizeObserver.observe(
        modalWindow,
      );
    }

    return () => {
      window.cancelAnimationFrame(
        animationFrame,
      );

      window.removeEventListener(
        "resize",
        keepWindowInBounds,
      );

      resizeObserver?.disconnect();
    };
'''

observer_new = '''    /*
     * Do not observe the modal's own dimensions here.
     *
     * Native CSS resize already owns the size while the user drags the
     * resize handle. React only needs to clamp the final position afterwards.
     */
    window.addEventListener(
      "pointerup",
      keepWindowInBounds,
    );

    return () => {
      window.cancelAnimationFrame(
        animationFrame,
      );

      window.removeEventListener(
        "resize",
        keepWindowInBounds,
      );

      window.removeEventListener(
        "pointerup",
        keepWindowInBounds,
      );
    };
'''

if text.count(observer_old) == 1:
    text = text.replace(
        observer_old,
        observer_new,
        1,
    )
elif text.count(observer_new) != 1:
    fail(
        "Could not find the current PublicPageModal ResizeObserver block."
    )

required = [
    'if (window.self !== window.top)',
    'const isForumModal =',
    'isForumModal;',
    '"pointerup",',
    'sm:resize',
    'function PublicPageModal',
]

for marker in required:
    if marker not in text:
        fail(
            f"Safety check failed after editing: missing {marker!r}."
        )

if text == original:
    print(
        "INFO: All requested modal-system fixes are already present."
    )
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
print("PATCH APPLIED SUCCESSFULLY")
print()
print("Modal-system changes:")
print("- Embedded iframe sidebars can no longer create nested modal windows.")
print("- Modal requests from iframe content are owned only by the outer portal.")
print("- Live ResizeObserver feedback during manual modal resizing is removed.")
print("- Position is clamped after pointer release and viewport resize.")
print("- Messages remain large and resizable.")
print("- Characters remain large and resizable.")
print("- Forum is now large and resizable too.")
print()
print("Next: npm run build")
