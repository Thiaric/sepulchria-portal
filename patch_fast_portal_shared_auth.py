from pathlib import Path
import sys

ROOT = Path.cwd()

def read(rel):
    p = ROOT / rel
    if not p.exists():
        raise FileNotFoundError(f"Missing {rel}. Run from the sepulchria-portal repository root.")
    return p, p.read_text(encoding="utf-8")

def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"{label}: expected exactly 1 match, found {count}.")
    return text.replace(old, new, 1)

def main():
    auth_helper = ROOT / "lib" / "auth" / "get-authenticated-user.ts"
    if auth_helper.exists():
        raise RuntimeError(
            "lib/auth/get-authenticated-user.ts already exists; refusing to overwrite it."
        )

    auth_helper.parent.mkdir(parents=True, exist_ok=True)
    auth_helper.write_text(
        '''import "server-only";

import { cache } from "react";

import { createClient } from "@/lib/supabase/server";

export const getAuthenticatedUser = cache(
  async () => {
    const supabase =
      await createClient();

    let result =
      await supabase.auth.getUser();

    if (
      result.error ||
      !result.data.user
    ) {
      result =
        await supabase.auth.getUser();
    }

    return result;
  },
);
''',
        encoding="utf-8",
    )
    print("OK: created lib/auth/get-authenticated-user.ts")

    p, text = read("lib/auth/require-staff.ts")
    text = replace_once(
        text,
        'import { createClient } from "@/lib/supabase/server";\n',
        'import { createClient } from "@/lib/supabase/server";\nimport { getAuthenticatedUser } from "@/lib/auth/get-authenticated-user";\n',
        "require-staff import",
    )
    text = replace_once(
        text,
        '''  const {
    data: { user },
    error: userError,
  } =
    await supabase.auth.getUser();''',
        '''  const {
    data: { user },
    error: userError,
  } =
    await getAuthenticatedUser();''',
        "require-staff shared auth lookup",
    )
    p.write_text(text, encoding="utf-8")
    print("OK: lib/auth/require-staff.ts")

    p, text = read("lib/portal/get-portal-context.ts")
    text = replace_once(
        text,
        'import { createClient } from "@/lib/supabase/server";\n',
        'import { createClient } from "@/lib/supabase/server";\nimport { getAuthenticatedUser } from "@/lib/auth/get-authenticated-user";\n',
        "portal-context import",
    )

    old = '''    let {
  data: { user },
  error: userError,
} =
  await supabase.auth.getUser();

/*
 * A portal modal runs the same authenticated application
 * inside an iframe. A transient auth/network failure must
 * not immediately throw that iframe back to /homepage.
 *
 * Retry once before treating the session as unavailable.
 */
if (userError || !user) {
  const retryResult =
    await supabase.auth.getUser();

  user =
    retryResult.data.user;

  userError =
    retryResult.error;
}

if (userError || !user) {
  redirect("/homepage");
}'''

    new = '''    const {
      data: { user },
      error: userError,
    } =
      await getAuthenticatedUser();

    if (userError || !user) {
      redirect("/homepage");
    }'''

    text = replace_once(
        text,
        old,
        new,
        "portal-context shared auth lookup",
    )
    p.write_text(text, encoding="utf-8")
    print("OK: lib/portal/get-portal-context.ts")

    print()
    print("Patch complete.")
    print("Next: npm run build")

if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        sys.exit(1)
