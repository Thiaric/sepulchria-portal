from pathlib import Path
import re
import subprocess

ROOT = Path.cwd()
EXPECTED = "5022e38"

head = subprocess.check_output(
    ["git", "rev-parse", "--short", "HEAD"],
    text=True,
).strip()

if head != EXPECTED:
    raise SystemExit(
        f"Expected HEAD {EXPECTED}, found {head}. "
        "Refusing to patch a different commit."
    )

dock = ROOT / "components/instant-chat/instant-chat-dock.tsx"
runtime = ROOT / "components/cosmetics/cosmetic-runtime.tsx"

for path in (dock, runtime):
    if not path.exists():
        raise SystemExit(f"Missing required file: {path}")

dock_text = dock.read_text(encoding="utf-8")
runtime_text = runtime.read_text(encoding="utf-8")

old_open = '''                        <div
                          data-cosmetic-character-id={message.sender_character_id}
                          data-cosmetic-surface="instant"
                          className={`max-w-[82%] border px-2 py-1.5 text-[10px] leading-4 ${
'''

new_open = '''                        <div
                          data-cosmetic-character-id={message.sender_character_id}
                          data-cosmetic-surface="instant"
                          className="relative max-w-[82%] overflow-visible"
                        >
                          <div
                            className={`border px-2 py-1.5 text-[10px] leading-4 ${
'''

if dock_text.count(old_open) != 1:
    raise SystemExit(
        "Could not find the original Instant Chat message bubble opening "
        "exactly once. Nothing changed."
    )

dock_new = dock_text.replace(old_open, new_open, 1)

old_close = '''                        </div>

                        {!own ? (
                          <div className="shrink-0 self-end pb-0.5">
'''

new_close = '''                          </div>
                        </div>

                        {!own ? (
                          <div className="shrink-0 self-end pb-0.5">
'''

if dock_new.count(old_close) != 1:
    raise SystemExit(
        "Could not find the Instant Chat message bubble closing anchor "
        "exactly once. Nothing changed."
    )

dock_new = dock_new.replace(old_close, new_close, 1)

runtime_new = runtime_text.replace(
    '''      [data-cosmetic-surface="pm"][data-has-pm-frame="true"]::after,
      [data-cosmetic-surface="instant"][data-has-instant-chat-frame="true"]::after,
      [data-cosmetic-surface="forum"][data-has-forum-frame="true"]::after {
''',
    '''      [data-cosmetic-surface="pm"][data-has-pm-frame="true"]::after,
      [data-cosmetic-surface="forum"][data-has-forum-frame="true"]::after {
''',
    1,
)

instant_block = re.compile(
    r'\n[ \t]*\[data-cosmetic-surface="instant"\]'
    r'\[data-has-instant-chat-frame="true"\]'
    r'(?:::(?:before|after))?[ \t]*\{'
    r'.*?'
    r'\n[ \t]*\}',
    re.DOTALL,
)

runtime_new, removed = instant_block.subn("", runtime_new)

if removed < 1:
    raise SystemExit(
        "Could not find any existing instant-chat cosmetic CSS block. "
        "Nothing changed."
    )

forum_anchor = '''      [data-cosmetic-surface="forum"][data-has-forum-frame="true"] {
'''

if runtime_new.count(forum_anchor) != 1:
    raise SystemExit(
        "Could not find the forum cosmetic anchor exactly once. "
        "Nothing changed."
    )

clean_instant = '''      /*
       * INSTANT CHAT FRAME
       *
       * Dedicated non-interactive wrapper around the authored message.
       * The wrapper follows the bubble's real width and height.
       */
      [data-cosmetic-surface="instant"][data-has-instant-chat-frame="true"] {
        position: relative !important;
        isolation: isolate;
        overflow: visible !important;
      }

      [data-cosmetic-surface="instant"][data-has-instant-chat-frame="true"]::after {
        content: "";
        position: absolute;
        z-index: var(--sep-cosmetic-shell-z);
        inset: -10px -8px;
        border: 10px solid transparent;
        border-image-source: var(--sep-cosmetic-instant-chat-frame);
        border-image-slice: 15% 10%;
        border-image-width: 1;
        border-image-repeat: stretch;
        pointer-events: none;
        filter: drop-shadow(0 3px 7px rgba(0,0,0,.32));
      }

'''

runtime_new = runtime_new.replace(
    forum_anchor,
    clean_instant + forum_anchor,
    1,
)

if runtime_new.count(
    '[data-cosmetic-surface="instant"][data-has-instant-chat-frame="true"]::after'
) != 1:
    raise SystemExit(
        "Sanity check failed: expected one final instant ::after rule. "
        "Nothing changed."
    )

dock.write_text(dock_new, encoding="utf-8")
runtime.write_text(runtime_new, encoding="utf-8")

print("✓ Instant Chat cosmetic structure rebuilt against 5022e38")
print("  - old instant-chat experiments removed")
print("  - cosmetic moved to dedicated wrapper")
print("  - message bubble padding restored to component ownership")
print("  - adaptive 9-slice restored")
print("  - short and long messages use the wrapper's real dimensions")
print("  - no hover pseudo-element conflict on the message bubble")
print("  - starting inset: -10px vertical / -8px horizontal")
