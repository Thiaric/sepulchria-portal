from pathlib import Path

ROOT = Path.cwd()
rel = "app/(portal)/admin/layout.tsx"
path = ROOT / rel

if not path.exists():
    raise RuntimeError(
        f"Required file not found: {rel}"
    )

text = path.read_text(
    encoding="utf-8-sig",
).replace("\r\n", "\n").replace("\r", "\n")

if 'href="/admin/media"' in text:
    print("Already present: Media admin navigation link")
else:
    old = """            {canManageUsers ? (
              <AdminNavigationLink href="/admin/users">
                Users
              </AdminNavigationLink>
            ) : null}

            <AdminNavigationLink href="/admin/world">"""

    new = """            {canManageUsers ? (
              <>
                <AdminNavigationLink href="/admin/media">
                  Media
                </AdminNavigationLink>

                <AdminNavigationLink href="/admin/users">
                  Users
                </AdminNavigationLink>
              </>
            ) : null}

            <AdminNavigationLink href="/admin/world">"""

    if old not in text:
        raise RuntimeError(
            "Admin navigation insertion point was not found."
        )

    text = text.replace(
        old,
        new,
        1,
    )

    path.write_text(
        text,
        encoding="utf-8",
        newline="\n",
    )

    print("Applied: owner/admin Media navigation link")

print("Run: npm run build")
