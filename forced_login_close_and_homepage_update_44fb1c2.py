from pathlib import Path
import subprocess

ROOT = Path.cwd()
EXPECTED = "44fb1c2"


def read(path: str) -> str:
    p = ROOT / path
    if not p.exists():
        raise SystemExit(f"ERROR: Missing expected file: {path}")
    return p.read_text(encoding="utf-8")


def write(path: str, content: str) -> None:
    p = ROOT / path
    p.write_text(content, encoding="utf-8", newline="\n")
    print(f"WROTE  {path}")


def replace_once(path: str, content: str, old: str, new: str) -> str:
    count = content.count(old)
    if count != 1:
        raise SystemExit(
            f"ERROR: Expected exactly one match in {path}, found {count}. "
            "No changes were applied."
        )
    return content.replace(old, new, 1)


head = subprocess.check_output(
    ["git", "rev-parse", "--short", "HEAD"],
    cwd=ROOT,
    text=True,
).strip()

if not head.startswith(EXPECTED):
    raise SystemExit(
        f"ERROR: Patch expects {EXPECTED} but current HEAD is {head}. "
        "No changes were applied."
    )

guard_path = "components/portal/portal-session-guard.tsx"
homepage_path = "components/homepage/sepulchria-homepage.tsx"

guard = read(guard_path)
homepage = read(homepage_path)

# ---------------------------------------------------------------------------
# 1. Forced replacement: tell opener, clear this popup's instance id,
#    close the losing Sepulchria window, fallback to login if close blocked.
# ---------------------------------------------------------------------------

guard_old = '''        if (response.status === 409) {
          replacedRef.current = true;

          /*
           * Do NOT call supabase.auth.signOut() here. Auth storage can be
           * shared by windows in the same browser; signing out the losing
           * window could also destroy the winning login.
           */
          window.location.replace(
            "/auth/login?portalSession=replaced",
          );
          return;
        }
'''

guard_new = '''        if (response.status === 409) {
          replacedRef.current = true;

          /*
           * Do NOT call supabase.auth.signOut() here. Auth storage can be
           * shared by windows in the same browser; signing out the losing
           * window could also destroy the winning login.
           *
           * Instead, notify the homepage that THIS portal instance lost,
           * clear only this popup's window-scoped instance id, then close
           * the old Sepulchria window.
           */
          sessionStorage.removeItem(
            STORAGE_KEY,
          );

          if (
            window.opener &&
            !window.opener.closed
          ) {
            try {
              window.opener.postMessage(
                {
                  type:
                    "sepulchria:portal-session-replaced",
                },
                window.location.origin,
              );
            } catch (error) {
              console.warn(
                "Unable to notify homepage that the portal session was replaced:",
                error,
              );
            }
          }

          window.close();

          /*
           * A normal Enter Sepulchria popup can close itself. If a browser
           * refuses, leave the losing instance on the login page instead
           * of allowing it to continue using the portal.
           */
          window.setTimeout(() => {
            if (!window.closed) {
              window.location.replace(
                "/auth/login?portalSession=replaced",
              );
            }
          }, 150);

          return;
        }
'''

# ---------------------------------------------------------------------------
# 2. Homepage: maintain a local "replaced" state. We deliberately do NOT
#    sign out Supabase or hard-reload here, because the same-browser case
#    can share auth storage with the winning window.
# ---------------------------------------------------------------------------

homepage_state_old = '''  const [aboutOpen, setAboutOpen] =
    useState(false);

  useEffect(() => {
'''

homepage_state_new = '''  const [aboutOpen, setAboutOpen] =
    useState(false);

  const [
    portalSessionReplaced,
    setPortalSessionReplaced,
  ] = useState(false);

  useEffect(() => {
'''

homepage_listener_old = '''      if (
        event.origin !==
          window.location.origin ||
        event.data?.type !==
          "sepulchria:portal-logged-out"
      ) {
        return;
      }

      /*
       * isAuthenticated is server-derived, so reload the homepage
       * after logout to recalculate it immediately.
       */
      window.location.reload();
'''

homepage_listener_new = '''      if (
        event.origin !==
        window.location.origin
      ) {
        return;
      }

      if (
        event.data?.type ===
          "sepulchria:portal-logged-out"
      ) {
        /*
         * A normal logout really ended the Supabase session, so reload
         * and let the server recalculate isAuthenticated.
         */
        window.location.reload();
        return;
      }

      if (
        event.data?.type ===
          "sepulchria:portal-session-replaced"
      ) {
        /*
         * A newer login won. Do NOT globally sign out here: another
         * Sepulchria window in the same browser may share auth storage.
         *
         * This homepage only needs to stop claiming that its old portal
         * window is still open and offer a fresh login.
         */
        setPortalSessionReplaced(
          true,
        );
      }
'''

homepage_render_old = '''                {isAuthenticated ? (
                  <HomepageDisabledButton
                    eyebrow="Already entered"
                    label="Sepulchria is open"
                    symbol="◆"
                  />
                ) : (
                  <HomepageButton
                    href={enterHref}
                    eyebrow="Enter"
                    label="Enter Sepulchria"
                    symbol="◆"
                    featured
                  />
                )}
'''

homepage_render_new = '''                {isAuthenticated &&
                !portalSessionReplaced ? (
                  <HomepageDisabledButton
                    eyebrow="Already entered"
                    label="Sepulchria is open"
                    symbol="◆"
                  />
                ) : (
                  <HomepageButton
                    href={
                      portalSessionReplaced
                        ? "/auth/login?portalSession=replaced"
                        : enterHref
                    }
                    eyebrow="Enter"
                    label="Enter Sepulchria"
                    symbol="◆"
                    featured
                  />
                )}
'''

# Validate every block before writing.
guard_after = replace_once(
    guard_path,
    guard,
    guard_old,
    guard_new,
)

homepage_after = replace_once(
    homepage_path,
    homepage,
    homepage_state_old,
    homepage_state_new,
)

homepage_after = replace_once(
    homepage_path,
    homepage_after,
    homepage_listener_old,
    homepage_listener_new,
)

homepage_after = replace_once(
    homepage_path,
    homepage_after,
    homepage_render_old,
    homepage_render_new,
)

write(guard_path, guard_after)
write(homepage_path, homepage_after)

print()
print("PATCH APPLIED SUCCESSFULLY")
print()
print("Expected forced-login replacement flow:")
print("1. Device A has homepage + Sepulchria popup open.")
print("2. Device B logs in with the same account.")
print("3. Device A popup receives session-replaced on its next check.")
print("4. Device A popup notifies its homepage and closes.")
print("5. Device A homepage immediately changes from")
print("   'Sepulchria is open' to 'Enter Sepulchria'.")
print("6. Device B remains logged in and unaffected.")
print()
print("Next: npm run build")
