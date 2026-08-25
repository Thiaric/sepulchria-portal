from pathlib import Path
import subprocess

ROOT = Path.cwd()
EXPECTED = "6381c49"


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

logout_path = "components/logout-button.tsx"
homepage_path = "components/homepage/sepulchria-homepage.tsx"

logout = read(logout_path)
homepage = read(homepage_path)

logout_old = '''      sessionStorage.removeItem(
        "sepulchria-portal-instance-id",
      );

      window.close();

      /*
       * Script-opened portal windows are allowed to close themselves.
'''

logout_new = '''      sessionStorage.removeItem(
        "sepulchria-portal-instance-id",
      );

      /*
       * Tell the original public homepage that logout succeeded before
       * this dedicated game window disappears.
       */
      if (
        window.opener &&
        !window.opener.closed
      ) {
        try {
          window.opener.postMessage(
            {
              type:
                "sepulchria:portal-logged-out",
            },
            window.location.origin,
          );
        } catch (error) {
          console.warn(
            "Unable to notify homepage about logout:",
            error,
          );
        }
      }

      window.close();

      /*
       * Script-opened portal windows are allowed to close themselves.
'''

homepage_old = '''  const [aboutOpen, setAboutOpen] =
    useState(false);

  useEffect(() => {
    if (!aboutOpen) return;
'''

homepage_new = '''  const [aboutOpen, setAboutOpen] =
    useState(false);

  useEffect(() => {
    function handlePortalMessage(
      event: MessageEvent,
    ) {
      if (
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
    }

    window.addEventListener(
      "message",
      handlePortalMessage,
    );

    return () => {
      window.removeEventListener(
        "message",
        handlePortalMessage,
      );
    };
  }, []);

  useEffect(() => {
    if (!aboutOpen) return;
'''

# Validate all expected blocks before writing anything.
if logout.count(logout_old) != 1:
    raise SystemExit(
        f"ERROR: Expected the close-on-logout block exactly once in {logout_path}, "
        f"found {logout.count(logout_old)}. "
        "This patch expects the previous close-on-logout patch to already be applied. "
        "No changes were applied."
    )

if homepage.count(homepage_old) != 1:
    raise SystemExit(
        f"ERROR: Expected the homepage effect anchor exactly once in {homepage_path}, "
        f"found {homepage.count(homepage_old)}. No changes were applied."
    )

logout_after = logout.replace(
    logout_old,
    logout_new,
    1,
)

homepage_after = homepage.replace(
    homepage_old,
    homepage_new,
    1,
)

write(logout_path, logout_after)
write(homepage_path, homepage_after)

print()
print("PATCH APPLIED SUCCESSFULLY")
print()
print("Expected behaviour:")
print("1. Original homepage stays open.")
print("2. Enter Sepulchria opens the dedicated popup.")
print("3. Logout in the popup.")
print("4. Popup closes.")
print("5. Original homepage reloads automatically.")
print("6. 'Sepulchria is open' becomes 'Enter Sepulchria'.")
print()
print("Next: npm run build")
