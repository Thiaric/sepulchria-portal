from pathlib import Path
import sys

TARGET = Path("app/(portal)/game/actions.ts")


def fail(message: str) -> int:
    print(f"ERROR: {message}")
    print("No file was changed.")
    return 1


def find_matching_brace(text: str, open_pos: int) -> int:
    depth = 0
    i = open_pos
    in_string = None
    escape = False

    while i < len(text):
        ch = text[i]

        if in_string is not None:
            if escape:
                escape = False
            elif ch == "\\":
                escape = True
            elif ch == in_string:
                in_string = None
            i += 1
            continue

        if ch in ("'", '"', "`"):
            in_string = ch
            i += 1
            continue

        if ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0:
                return i

        i += 1

    return -1


def main() -> int:
    if not TARGET.exists():
        return fail(
            f"Missing {TARGET}. Run this from the sepulchria-portal root."
        )

    original = TARGET.read_text(encoding="utf-8")
    source = original

    marker = "export async function moveCharacter("
    start = source.find(marker)

    if start == -1:
        return fail("Could not find moveCharacter().")

    body_open = source.find("{", start)

    if body_open == -1:
        return fail("Could not find moveCharacter() body.")

    body_close = find_matching_brace(source, body_open)

    if body_close == -1:
        return fail("Could not parse moveCharacter() body.")

    existing = source[start:body_close + 1]

    replacement = '''export async function moveCharacter(
  formData: FormData,
): Promise<void> {
  const roomId = String(
    formData.get("roomId") ?? "",
  );

  /*
   * Journey buttons are generated only from the current room's exits,
   * so do not re-query room_connections here.
   *
   * Use the exact same entry pipeline as /area -> Location:
   * - skips re-checking access to the room being left
   * - validates destination room + destination access in parallel
   * - preserves ghost/private/HQ-return/presence behaviour
   */
  await enterRoomById(
    roomId,
  );

  redirect("/game");
}'''

    if existing == replacement:
        print("moveCharacter() already uses the /area entry pipeline.")
        return 0

    required_fragments = [
        'getOwnedCharacter({ allowDeadGhost: true })',
        'from("room_connections")',
        'getPrivateLocationAccess(',
        'touchPresence(',
        'redirect("/game")',
    ]

    missing = [
        fragment
        for fragment in required_fragments
        if fragment not in existing
    ]

    if missing:
        return fail(
            "moveCharacter() is not in the expected 2c0ff2a-style state. "
            f"Missing expected fragment(s): {', '.join(missing)}"
        )

    updated = (
        source[:start]
        + replacement
        + source[body_close + 1:]
    )

    backup = TARGET.with_suffix(
        TARGET.suffix + ".before-area-style-journey"
    )

    if not backup.exists():
        backup.write_text(
            original,
            encoding="utf-8",
        )

    TARGET.write_text(
        updated,
        encoding="utf-8",
    )

    print("Journey movement now uses the same pipeline as /area -> Location.")
    print()
    print("Removed from Journey:")
    print("  - current Location access re-check")
    print("  - direct room_connection query")
    print("  - reverse room_connection query")
    print()
    print("Still preserved through enterRoomById():")
    print("  - destination exists/active check")
    print("  - destination access check")
    print("  - ghost movement rules")
    print("  - Order HQ return-room handling")
    print("  - character room update")
    print("  - presence update")
    print("  - /game redirect")
    print()
    print("Run:")
    print("  npm run build")
    return 0


if __name__ == "__main__":
    sys.exit(main())
