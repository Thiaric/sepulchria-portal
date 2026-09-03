#!/usr/bin/env python3
from pathlib import Path

path = Path("components/logout-button.tsx")

if not path.exists():
    raise SystemExit(
        "\nPATCH STOPPED: Run this from the sepulchria-portal project root.\n"
    )

text = path.read_text(encoding="utf-8")

old = '''      try {
        const presenceResult =
          await clearOwnPresenceForLogout();

        if (!presenceResult.ok) {
          console.error(
            "Unable to remove presence before logout:",
            presenceResult.message,
          );
        }
      } catch (presenceError) {
        console.error(
          "Unable to remove presence before logout:",
          presenceError,
        );
      }

      const { error: signOutError } =
'''

new = '''      /*
       * Start presence cleanup, but never let it hold logout hostage.
       * The server action has already been dispatched, so it can finish
       * even if we proceed to sign out after the short grace period.
       */
      try {
        const presenceCleanup =
          clearOwnPresenceForLogout();

        const presenceResult =
          await Promise.race([
            presenceCleanup,
            new Promise<null>(
              (resolve) => {
                window.setTimeout(
                  () => resolve(null),
                  800,
                );
              },
            ),
          ]);

        if (
          presenceResult &&
          !presenceResult.ok
        ) {
          console.error(
            "Unable to remove presence before logout:",
            presenceResult.message,
          );
        }
      } catch (presenceError) {
        console.error(
          "Unable to remove presence before logout:",
          presenceError,
        );
      }

      const { error: signOutError } =
'''

count = text.count(old)
if count != 1:
    raise SystemExit(
        f"\nPATCH STOPPED: presence cleanup anchor expected 1 match, found {count}.\n"
    )

text = text.replace(old, new, 1)

old = '''    data-experience-logout="1"
    onPointerDown={() => {
'''

new = '''    data-experience-logout="1"
    data-experience-logout-bypass="1"
    onPointerDown={() => {
'''

count = text.count(old)
if count != 1:
    raise SystemExit(
        f"\nPATCH STOPPED: logout button anchor expected 1 match, found {count}.\n"
    )

text = text.replace(old, new, 1)

path.write_text(
    text,
    encoding="utf-8",
    newline="\n",
)

print("✓ Logout button now bypasses ExperienceLogoutGuard.")
print("✓ Presence cleanup can delay logout by at most 800ms.")
print("✓ Supabase signOut proceeds even if live presence cleanup is slow.")
print("\nPATCH COMPLETE")
print("\nRun: npm run build")
