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

handler_old = '''  useEffect(() => {
    function handleExternalModalOpen(event: Event) {
'''

handler_new = '''  useEffect(() => {
    /*
     * Only the top-level portal owns modal windows.
     * Embedded modal pages forward requests through the iframe bridge.
     */
    if (window.self !== window.top) {
      return;
    }

    function handleExternalModalOpen(event: Event) {
'''

if handler_new not in text and handler_old in text:
    text = text.replace(handler_old, handler_new, 1)

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

if large_new not in text and large_old in text:
    text = text.replace(large_old, large_new, 1)

collapsed_anchor = '''  const [
    collapsed,
    setCollapsed,
  ] = useState(false);

  const [
    position,
'''

collapsed_replacement = '''  const [
    collapsed,
    setCollapsed,
  ] = useState(false);

  const [
    modalSize,
    setModalSize,
  ] = useState<{
    width: number;
    height: number;
  } | null>(null);

  const [
    position,
'''

if "setModalSize" not in text:
    if text.count(collapsed_anchor) != 1:
        fail("Could not find the PublicPageModal collapsed state block.")
    text = text.replace(collapsed_anchor, collapsed_replacement, 1)

ref_anchor = '''  const modalWindowRef =
    useRef<HTMLDivElement>(null);

  function clampPosition(
'''

ref_replacement = '''  const modalWindowRef =
    useRef<HTMLDivElement>(null);

  function rememberModalSize() {
    const modalWindow =
      modalWindowRef.current;

    if (
      !modalWindow ||
      collapsed
    ) {
      return;
    }

    const rect =
      modalWindow.getBoundingClientRect();

    const width =
      Math.round(rect.width);

    const height =
      Math.round(rect.height);

    if (
      width <= 0 ||
      height <= 0
    ) {
      return;
    }

    setModalSize((current) => {
      if (
        current?.width === width &&
        current?.height === height
      ) {
        return current;
      }

      return {
        width,
        height,
      };
    });
  }

  function clampPosition(
'''

if "function rememberModalSize()" not in text:
    if text.count(ref_anchor) != 1:
        fail("Could not find modalWindowRef in PublicPageModal.")
    text = text.replace(ref_anchor, ref_replacement, 1)

pointerup_old = '''    window.addEventListener(
      "pointerup",
      keepWindowInBounds,
    );
'''

pointerup_new = '''    function finishPointerInteraction() {
      window.requestAnimationFrame(() => {
        rememberModalSize();
        keepWindowInBounds();
      });
    }

    window.addEventListener(
      "pointerup",
      finishPointerInteraction,
    );
'''

if pointerup_new not in text and pointerup_old in text:
    text = text.replace(pointerup_old, pointerup_new, 1)

pointerup_cleanup_old = '''      window.removeEventListener(
        "pointerup",
        keepWindowInBounds,
      );
'''

pointerup_cleanup_new = '''      window.removeEventListener(
        "pointerup",
        finishPointerInteraction,
      );
'''

if pointerup_cleanup_new not in text and pointerup_cleanup_old in text:
    text = text.replace(pointerup_cleanup_old, pointerup_cleanup_new, 1)

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

observer_new = '''    function finishPointerInteraction() {
      window.requestAnimationFrame(() => {
        rememberModalSize();
        keepWindowInBounds();
      });
    }

    window.addEventListener(
      "pointerup",
      finishPointerInteraction,
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
        finishPointerInteraction,
      );
    };
'''

if "const resizeObserver =" in text:
    if text.count(observer_old) != 1:
        fail("Found ResizeObserver, but not in the expected PublicPageModal block.")
    text = text.replace(observer_old, observer_new, 1)

style_old = '''        style={{
          left: "50%",
          top: "50%",
          transform: `translate(calc(-50% + ${position.x}px), calc(-50% + ${position.y}px))`,
        }}
'''

style_new = '''        style={{
          left: "50%",
          top: "50%",
          transform: `translate(calc(-50% + ${position.x}px), calc(-50% + ${position.y}px))`,
          width:
            !collapsed &&
            modalSize
              ? `${modalSize.width}px`
              : undefined,
          height:
            !collapsed &&
            modalSize
              ? `${modalSize.height}px`
              : undefined,
        }}
'''

if style_new not in text:
    if text.count(style_old) != 1:
        fail("Could not find the PublicPageModal inline style block.")
    text = text.replace(style_old, style_new, 1)

required = [
    "function PublicPageModal",
    "modalSize",
    "setModalSize",
    "function rememberModalSize()",
    "finishPointerInteraction",
    "modalSize.width",
    "modalSize.height",
    "sm:resize",
]

for marker in required:
    if marker not in text:
        fail(f"Safety check failed: missing {marker!r}")

if text == original:
    print("INFO: Modal size persistence is already present.")
else:
    PATH.write_text(
        text,
        encoding="utf-8",
        newline="\n",
    )
    print("WROTE  components/portal/portal-sidebar.tsx")

print()
print("PATCH APPLIED SUCCESSFULLY")
print()
print("Generic modal behaviour:")
print("- Manual resize width/height is now stored in React state.")
print("- The chosen size survives iframe navigation and React rerenders.")
print("- Character tabs cannot reset the outer modal size.")
print("- Forum navigation cannot reset the outer modal size.")
print("- Message conversation navigation cannot reset the outer modal size.")
print("- Collapse/restore preserves the user's custom size.")
print("- Native resizing remains enabled.")
print("- Forum remains in the large/resizable group.")
print("- Embedded pages remain prevented from owning nested modal windows.")
print()
print("Next: npm run build")
