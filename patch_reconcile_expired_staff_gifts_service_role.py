from __future__ import annotations

import subprocess
from pathlib import Path

EXPECTED_HEAD = "0789c7613ec83373571182a0ae8b0b8f4aa212a7"


def fail(message: str) -> None:
    raise SystemExit(f"ERROR: {message}")


def replace_exact(path: Path, old: str, new: str, expected_count: int = 1) -> None:
    text = path.read_text(encoding="utf-8")
    count = text.count(old)
    if count != expected_count:
        fail(
            f"{path}: expected {expected_count} exact match(es), found {count}. "
            "No changes were made to this file."
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
            '''  const { error: staffExpiryError } = await supabase.rpc(\n    "reconcile_expired_staff_gifts",\n    { p_character_id: characterId },\n  );\n''',
            '''  const { error: staffExpiryError } = await createAdminClient().rpc(\n    "reconcile_expired_staff_gifts",\n    { p_character_id: characterId },\n  );\n''',
        )

        p = targets[1]
        replace_exact(
            p,
            '''import {\n  createClient,\n} from "@/lib/supabase/server";\n''',
            '''import {\n  createClient,\n} from "@/lib/supabase/server";\nimport {\n  createAdminClient,\n} from "@/lib/supabase/admin";\n''',
        )
        replace_exact(
            p,
            '''  const expiry =\n    await supabase.rpc(\n      "reconcile_expired_staff_gifts",\n''',
            '''  const expiry =\n    await createAdminClient().rpc(\n      "reconcile_expired_staff_gifts",\n''',
        )

        p = targets[2]
        replace_exact(
            p,
            '''    const { error: staffExpiryError } = await supabase.rpc(\n      "reconcile_expired_staff_gifts",\n''',
            '''    const { error: staffExpiryError } = await createPrivilegedClient().rpc(\n      "reconcile_expired_staff_gifts",\n''',
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
            '''    const { error: expiryError } = await supabase.rpc(\n      "reconcile_expired_staff_gifts",\n      { p_character_id: characterId },\n    );\n''',
            '''    const { error: expiryError } = await createAdminClient().rpc(\n      "reconcile_expired_staff_gifts",\n      { p_character_id: characterId },\n    );\n''',
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
    print("Next run: npm run build")


if __name__ == "__main__":
    main()
