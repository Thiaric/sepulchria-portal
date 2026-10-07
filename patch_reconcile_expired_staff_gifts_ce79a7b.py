from __future__ import annotations

import subprocess
from pathlib import Path

EXPECTED_HEAD = "ce79a7b6126c7cb7d01ad936d9b54abcd523fc59"

def fail(message: str) -> None:
    raise SystemExit(f"ERROR: {message}")

def replace_exact(path: Path, old: str, new: str, expected_count: int = 1) -> None:
    text = path.read_text(encoding="utf-8")
    count = text.count(old)
    if count != expected_count:
        fail(
            f"{path}: expected {expected_count} exact match(es), found {count}. "
            "All files will be restored."
        )
    path.write_text(text.replace(old, new), encoding="utf-8", newline="")

def main() -> None:
    root = Path.cwd()

    try:
        head = subprocess.check_output(
            ["git", "rev-parse", "HEAD"],
            cwd=root,
            text=True,
        ).strip()
    except Exception as exc:
        fail(f"Could not read git HEAD: {exc}")

    if head != EXPECTED_HEAD:
        fail(
            f"This patch was built for {EXPECTED_HEAD}, but local HEAD is {head}. "
            "Aborting without changes."
        )

    targets = [
        root / "components/characters/character-gifts-display.tsx",
        root / "lib/gifts/get-character-gift-modifiers.ts",
        root / "app/(portal)/game/actions.ts",
        root / "app/(portal)/admin/gifts/actions.ts",
    ]

    missing = [str(p) for p in targets if not p.exists()]
    if missing:
        fail("Missing expected file(s): " + ", ".join(missing))

    originals = {p: p.read_bytes() for p in targets}

    try:
        p = targets[0]
        replace_exact(
            p,
            'import { createClient } from "@/lib/supabase/server";\n',
            'import { createClient } from "@/lib/supabase/server";\n'
            'import { createAdminClient } from "@/lib/supabase/admin";\n',
        )
        replace_exact(
            p,
            '''  const { error: staffExpiryError } = await supabase.rpc(
    "reconcile_expired_staff_gifts",
    { p_character_id: characterId },
  );
''',
            '''  const { error: staffExpiryError } = await createAdminClient().rpc(
    "reconcile_expired_staff_gifts",
    { p_character_id: characterId },
  );
''',
        )

        p = targets[1]
        replace_exact(
            p,
            '''import {
  createClient,
} from "@/lib/supabase/server";
''',
            '''import {
  createClient,
} from "@/lib/supabase/server";
import {
  createAdminClient,
} from "@/lib/supabase/admin";
''',
        )
        replace_exact(
            p,
            '''  const expiry =
    await supabase.rpc(
      "reconcile_expired_staff_gifts",
''',
            '''  const expiry =
    await createAdminClient().rpc(
      "reconcile_expired_staff_gifts",
''',
        )

        p = targets[2]
        replace_exact(
            p,
            '''    const { error: staffExpiryError } = await supabase.rpc(
      "reconcile_expired_staff_gifts",
''',
            '''    const { error: staffExpiryError } = await createPrivilegedClient().rpc(
      "reconcile_expired_staff_gifts",
''',
            expected_count=2,
        )

        p = targets[3]
        replace_exact(
            p,
            'import { createClient } from "@/lib/supabase/server";\n',
            'import { createClient } from "@/lib/supabase/server";\n'
            'import { createAdminClient } from "@/lib/supabase/admin";\n',
        )
        replace_exact(
            p,
            '''    const { error: expiryError } = await supabase.rpc(
      "reconcile_expired_staff_gifts",
      { p_character_id: characterId },
    );
''',
            '''    const { error: expiryError } = await createAdminClient().rpc(
      "reconcile_expired_staff_gifts",
      { p_character_id: characterId },
    );
''',
        )

    except BaseException:
        for path, content in originals.items():
            path.write_bytes(content)
        raise

    print("Patch applied successfully.")
    print("Changed:")
    for path in targets:
        print(f"  - {path.relative_to(root)}")
    print()
    print("The reconcile_expired_staff_gifts RPC remains service-role only.")
    print("Next: npm run build")

if __name__ == "__main__":
    main()
