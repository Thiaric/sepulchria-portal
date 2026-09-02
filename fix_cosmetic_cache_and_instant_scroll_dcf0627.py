from pathlib import Path
import subprocess

ROOT = Path.cwd()
EXPECTED = "dcf0627"

head = subprocess.check_output(
    ["git", "rev-parse", "--short", "HEAD"],
    text=True,
).strip()

if head != EXPECTED:
    raise SystemExit(
        f"Expected HEAD {EXPECTED}, found {head}. "
        "Refusing to patch a different baseline."
    )

runtime = ROOT / "components/cosmetics/cosmetic-runtime.tsx"
dock = ROOT / "components/instant-chat/instant-chat-dock.tsx"

for path in (runtime, dock):
    if not path.exists():
        raise SystemExit(f"Missing required file: {path}")

runtime_text = runtime.read_text(encoding="utf-8")
dock_text = dock.read_text(encoding="utf-8")

old_css_url = '''function cssUrl(value: string) {
  return `url("${value.replace(/"/g, "%22")}")`;
}
'''

new_css_url = '''const COSMETIC_ASSET_CACHE_BUSTER =
  Date.now().toString(36);

function cssUrl(value: string) {
  const separator =
    value.includes("?")
      ? "&"
      : "?";

  const freshValue =
    `${value}${separator}sep_asset_v=${COSMETIC_ASSET_CACHE_BUSTER}`;

  return `url("${freshValue.replace(/"/g, "%22")}")`;
}
'''

if runtime_text.count(old_css_url) != 1:
    raise SystemExit(
        "Cosmetic cssUrl baseline did not match exactly once. "
        "Nothing changed."
    )

runtime_new = runtime_text.replace(
    old_css_url,
    new_css_url,
    1,
)

old_refs = '''  const openChatRef =
    useRef<OpenChat | null>(null);

  useEffect(() => {
'''

new_refs = '''  const openChatRef =
    useRef<OpenChat | null>(null);

  const lastAutoScrolledConversationRef =
    useRef<string | null>(null);

  const lastAutoScrolledMessageIdRef =
    useRef<string | null>(null);

  useEffect(() => {
'''

if dock_text.count(old_refs) != 1:
    raise SystemExit(
        "Instant Chat ref insertion baseline did not match exactly once. "
        "Nothing changed."
    )

dock_new = dock_text.replace(
    old_refs,
    new_refs,
    1,
)

old_scroll_effect = '''  useEffect(() => {
    if (
      !openChat ||
      chatMinimised
    ) {
      return;
    }

    window.requestAnimationFrame(
      () => {
        if (
          scrollRef.current
        ) {
          scrollRef.current.scrollTop =
            scrollRef.current
              .scrollHeight;
        }
      },
    );
  }, [
    messages,
    openChat,
    chatMinimised,
  ]);
'''

new_scroll_effect = '''  useEffect(() => {
    if (
      !openChat ||
      chatMinimised
    ) {
      return;
    }

    const lastMessageId =
      messages.length > 0
        ? messages[
            messages.length - 1
          ].id
        : null;

    const conversationChanged =
      lastAutoScrolledConversationRef.current !==
      openChat.conversationId;

    const lastMessageChanged =
      lastAutoScrolledMessageIdRef.current !==
      lastMessageId;

    if (
      !conversationChanged &&
      !lastMessageChanged
    ) {
      return;
    }

    lastAutoScrolledConversationRef.current =
      openChat.conversationId;

    lastAutoScrolledMessageIdRef.current =
      lastMessageId;

    window.requestAnimationFrame(
      () => {
        if (
          scrollRef.current
        ) {
          scrollRef.current.scrollTop =
            scrollRef.current
              .scrollHeight;
        }
      },
    );
  }, [
    messages,
    openChat,
    chatMinimised,
  ]);
'''

if dock_new.count(old_scroll_effect) != 1:
    raise SystemExit(
        "Instant Chat scroll-effect baseline did not match exactly once. "
        "Nothing changed."
    )

dock_new = dock_new.replace(
    old_scroll_effect,
    new_scroll_effect,
    1,
)

runtime.write_text(runtime_new, encoding="utf-8")
dock.write_text(dock_new, encoding="utf-8")

print("✓ Fixes applied against dcf0627")
print("  - cosmetic assets get one cache-busting token per page load")
print("  - overwritten PNGs at the same URL refresh after reload")
print("  - Instant Chat no longer jumps down on unchanged polling refreshes")
print("  - it still scrolls on conversation change or a genuinely new last message")
