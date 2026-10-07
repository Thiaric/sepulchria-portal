from __future__ import annotations

import subprocess
from pathlib import Path

EXPECTED_HEAD = "ce79a7b6126c7cb7d01ad936d9b54abcd523fc59"

def fail(message: str) -> None:
    raise SystemExit(f"ERROR: {message}")

def read(path: Path) -> str:
    return path.read_text(encoding="utf-8")

def write(path: Path, text: str) -> None:
    path.write_text(text, encoding="utf-8", newline="")

def ensure_import(text: str, anchor: str, import_line: str) -> str:
    if import_line in text:
        return text
    if anchor not in text:
        fail(f"Import anchor not found: {anchor}")
    return text.replace(anchor, anchor + import_line, 1)

def replace_one(text: str, old: str, new: str, label: str) -> str:
    if new in text:
        return text
    count = text.count(old)
    if count != 1:
        fail(f"{label}: expected 1 match, found {count}")
    return text.replace(old, new, 1)

def replace_n(text: str, old: str, new: str, expected: int, label: str) -> str:
    if text.count(new) == expected and old not in text:
        return text
    count = text.count(old)
    if count != expected:
        fail(f"{label}: expected {expected} matches, found {count}")
    return text.replace(old, new)

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

    files = {
        "gift_display": root / "components/characters/character-gifts-display.tsx",
        "gift_mods": root / "lib/gifts/get-character-gift-modifiers.ts",
        "game_actions": root / "app/(portal)/game/actions.ts",
        "admin_gifts": root / "app/(portal)/admin/gifts/actions.ts",
        "order_membership": root / "app/(portal)/admin/orders/membership-actions.ts",
    }

    missing = [str(p) for p in files.values() if not p.exists()]
    if missing:
        fail("Missing expected file(s): " + ", ".join(missing))

    originals = {p: p.read_bytes() for p in files.values()}

    try:
        p = files["gift_display"]
        t = read(p)
        t = ensure_import(
            t,
            'import { createClient } from "@/lib/supabase/server";\n',
            'import { createAdminClient } from "@/lib/supabase/admin";\n',
        )
        t = replace_one(
            t,
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
            "character-gifts-display reconciliation",
        )
        write(p, t)

        p = files["gift_mods"]
        t = read(p)
        t = ensure_import(
            t,
            '''import {
  createClient,
} from "@/lib/supabase/server";
''',
            '''import {
  createAdminClient,
} from "@/lib/supabase/admin";
''',
        )
        t = replace_one(
            t,
            '''  const expiry =
    await supabase.rpc(
      "reconcile_expired_staff_gifts",
''',
            '''  const expiry =
    await createAdminClient().rpc(
      "reconcile_expired_staff_gifts",
''',
            "get-character-gift-modifiers reconciliation",
        )
        write(p, t)

        p = files["game_actions"]
        t = read(p)
        t = replace_n(
            t,
            '''    const { error: staffExpiryError } = await supabase.rpc(
      "reconcile_expired_staff_gifts",
''',
            '''    const { error: staffExpiryError } = await createPrivilegedClient().rpc(
      "reconcile_expired_staff_gifts",
''',
            2,
            "game/actions reconciliation",
        )
        write(p, t)

        p = files["admin_gifts"]
        t = read(p)
        t = ensure_import(
            t,
            'import { createClient } from "@/lib/supabase/server";\n',
            'import { createAdminClient } from "@/lib/supabase/admin";\n',
        )
        t = replace_one(
            t,
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
            "admin/gifts reconciliation",
        )
        write(p, t)

        p = files["order_membership"]
        t = read(p)
        t = ensure_import(
            t,
            'import { createClient } from "@/lib/supabase/server";\n',
            'import { createAdminClient } from "@/lib/supabase/admin";\n',
        )
        t = replace_one(
            t,
            'async function syncOrderShapes(supabase:Awaited<ReturnType<typeof createClient>>,characterId:string){const {error}=await supabase.rpc("sync_character_order_shapes",{p_character_id:characterId});if(error)throw new Error(`Unable to synchronise Order Shapes: ${error.message}`);}\n',
            'async function syncOrderShapes(_supabase:Awaited<ReturnType<typeof createClient>>,characterId:string){const {error}=await createAdminClient().rpc("sync_character_order_shapes",{p_character_id:characterId});if(error)throw new Error(`Unable to synchronise Order Shapes: ${error.message}`);}\n',
            "admin/orders membership Shape sync",
        )
        write(p, t)

    except BaseException:
        for path, data in originals.items():
            path.write_bytes(data)
        raise

    print("Security-regression patch applied successfully.")
    print("Changed:")
    for path in files.values():
        print(f"  - {path.relative_to(root)}")
    print()
    print("Fixed:")
    print("  - service-only reconcile_expired_staff_gifts callers")
    print("  - service-only sync_character_order_shapes caller")
    print()
    print("No Supabase permissions were loosened.")
    print("Next: npm run build")

if __name__ == "__main__":
    main()
