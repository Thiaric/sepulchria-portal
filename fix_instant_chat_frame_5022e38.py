from pathlib import Path
import subprocess

ROOT = Path.cwd()
EXPECTED = "5022e38"
TARGET = ROOT / "components/cosmetics/cosmetic-runtime.tsx"

head = subprocess.check_output(
    ["git", "rev-parse", "--short", "HEAD"],
    text=True,
).strip()

if head != EXPECTED:
    raise SystemExit(
        f"Expected HEAD {EXPECTED}, found {head}. "
        "Refusing to patch a different baseline."
    )

if not TARGET.exists():
    raise SystemExit(f"Missing required file: {TARGET}")

text = TARGET.read_text(encoding="utf-8")

old_shared = '''      [data-cosmetic-surface="pm"][data-has-pm-frame="true"]::after,
      [data-cosmetic-surface="instant"][data-has-instant-chat-frame="true"]::after,
      [data-cosmetic-surface="forum"][data-has-forum-frame="true"]::after {
        content: "";
        position: absolute;
        z-index: var(--sep-cosmetic-shell-z);
        pointer-events: none;
        filter: drop-shadow(0 3px 7px rgba(0,0,0,.32));
      }
'''

new_shared = '''      [data-cosmetic-surface="pm"][data-has-pm-frame="true"]::after,
      [data-cosmetic-surface="forum"][data-has-forum-frame="true"]::after {
        content: "";
        position: absolute;
        z-index: var(--sep-cosmetic-shell-z);
        pointer-events: none;
        filter: drop-shadow(0 3px 7px rgba(0,0,0,.32));
      }
'''

old_instant = '''      [data-cosmetic-surface="instant"][data-has-instant-chat-frame="true"]::after {
        inset: -2px;
        border: 10px solid transparent;
        border-image-source: var(--sep-cosmetic-instant-chat-frame);
        border-image-slice: 15% 10%;
        border-image-width: 1;
        border-image-repeat: stretch;
      }
'''

new_instant = '''      /*
       * INSTANT CHAT FRAME
       * Uses ::before deliberately: the shared pointer/focus interaction
       * illumination owns ::after, so the cosmetic frame must not compete
       * with it or disappear after hover.
       */
      [data-cosmetic-surface="instant"][data-has-instant-chat-frame="true"]::before {
        content: "";
        position: absolute;
        z-index: var(--sep-cosmetic-shell-z);
        inset: 10px 14px;
        border: 10px solid transparent;
        border-image-source: var(--sep-cosmetic-instant-chat-frame);
        border-image-slice: 15% 10%;
        border-image-width: 1;
        border-image-repeat: stretch;
        pointer-events: none;
        filter: drop-shadow(0 3px 7px rgba(0,0,0,.32));
      }
'''

for old, label in [
    (old_shared, "shared ornamental pseudo-element block"),
    (old_instant, "instant chat frame block"),
]:
    count = text.count(old)
    if count != 1:
        raise SystemExit(
            f"{label}: expected exactly 1 match, found {count}. "
            "Nothing changed."
        )

new_text = text.replace(old_shared, new_shared, 1)
new_text = new_text.replace(old_instant, new_instant, 1)

TARGET.write_text(new_text, encoding="utf-8")

print("✓ components/cosmetics/cosmetic-runtime.tsx")
print("  - instant chat frame moved from ::after to ::before")
print("  - frame now survives hover / mouse-leave interaction state")
print("  - frame inset changed from -2px to 10px 14px")
print("  - PM and forum frame behaviour untouched")
