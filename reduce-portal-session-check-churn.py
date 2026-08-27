from pathlib import Path
import sys

PATH = Path("components/portal/portal-session-guard.tsx")

def fail(message):
    print(f"ERROR: {message}")
    print("No files were changed.")
    sys.exit(1)

if not PATH.exists():
    fail(f"{PATH} not found. Run this script from the repository root.")

text = PATH.read_text(encoding="utf-8")

old_interval = 'const CHECK_INTERVAL_MS =\n  5_000;\n\nconst CHECK_TIMEOUT_MS =\n  10_000;'
new_interval = 'const CHECK_INTERVAL_MS =\n  30_000;\n\nconst CHECK_TIMEOUT_MS =\n  6_000;\n\nconst EVENT_CHECK_COOLDOWN_MS =\n  2_000;'
if text.count(old_interval) != 1:
    fail("Session guard timing constants are not in the expected state.")
text = text.replace(old_interval, new_interval, 1)

old_refs = '  const replacedRef =\n    useRef(false);\n\n  const checkCurrentLogin ='
new_refs = '  const replacedRef =\n    useRef(false);\n\n  const lastEventCheckRef =\n    useRef(0);\n\n  const checkCurrentLogin ='
if text.count(old_refs) != 1:
    fail("Session guard ref anchor not found exactly once.")
text = text.replace(old_refs, new_refs, 1)

old_events = '''    function handleFocus() {
      void checkCurrentLogin();
    }

    function handleVisibilityChange() {
      if (
        document.visibilityState ===
        "visible"
      ) {
        void checkCurrentLogin();
      }
    }

    function handleOnline() {
      void checkCurrentLogin();
    }

    function handlePageShow() {
      void checkCurrentLogin();
    }

    window.addEventListener(
      "focus",
      handleFocus,
    );

    window.addEventListener(
      "online",
      handleOnline,
    );

    window.addEventListener(
      "pageshow",
      handlePageShow,
    );

    document.addEventListener(
      "visibilitychange",
      handleVisibilityChange,
    );'''

new_events = '''    function checkFromBrowserEvent() {
      const now = Date.now();

      if (
        now -
          lastEventCheckRef.current <
        EVENT_CHECK_COOLDOWN_MS
      ) {
        return;
      }

      lastEventCheckRef.current =
        now;

      void checkCurrentLogin();
    }

    function handleVisibilityChange() {
      if (
        document.visibilityState ===
        "visible"
      ) {
        checkFromBrowserEvent();
      }
    }

    function handleOnline() {
      checkFromBrowserEvent();
    }

    window.addEventListener(
      "online",
      handleOnline,
    );

    document.addEventListener(
      "visibilitychange",
      handleVisibilityChange,
    );'''

if text.count(old_events) != 1:
    fail("Session guard browser-event block not found exactly once.")
text = text.replace(old_events, new_events, 1)

old_cleanup = '''      window.removeEventListener(
        "focus",
        handleFocus,
      );

      window.removeEventListener(
        "online",
        handleOnline,
      );

      window.removeEventListener(
        "pageshow",
        handlePageShow,
      );

      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange,
      );'''

new_cleanup = '''      window.removeEventListener(
        "online",
        handleOnline,
      );

      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange,
      );'''

if text.count(old_cleanup) != 1:
    fail("Session guard cleanup block not found exactly once.")
text = text.replace(old_cleanup, new_cleanup, 1)

old_warning = '          console.warn(\n            "Portal session verification timed out; it will retry.",\n          );'
new_warning = '          console.warn(\n            "Portal session verification timed out; the next scheduled check will retry.",\n          );'
if text.count(old_warning) != 1:
    fail("Session guard timeout warning anchor not found exactly once.")
text = text.replace(old_warning, new_warning, 1)

PATH.write_text(text, encoding="utf-8")

print("Updated:")
print(f" - {PATH}")
print("")
print("Changes:")
print(" - Active-session verification now runs every 30 seconds instead of every 5 seconds.")
print(" - Request timeout reduced from 10 seconds to 6 seconds.")
print(" - Removed duplicate focus and pageshow-triggered checks.")
print(" - Visibility/online event checks are deduplicated with a 2-second cooldown.")
print(" - Initial check and replacement detection behaviour are preserved.")
print(" - No backup files were created.")