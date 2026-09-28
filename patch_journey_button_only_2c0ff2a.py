from pathlib import Path
import sys

TARGET = Path("components/portal/game-context-panel.tsx")


def fail(message: str) -> int:
    print(f"ERROR: {message}")
    print("No file was changed.")
    return 1


def replace_once(source: str, old: str, new: str, label: str) -> str:
    count = source.count(old)
    if count != 1:
        raise RuntimeError(
            f"{label}: expected exactly 1 match, found {count}."
        )
    return source.replace(old, new, 1)


def main() -> int:
    if not TARGET.exists():
        return fail(
            f"Missing {TARGET}. Run this from the sepulchria-portal root."
        )

    original = TARGET.read_text(encoding="utf-8")
    source = original

    try:
        source = replace_once(
            source,
            '''  const [exits, setExits] =
    useState<RoomExit[]>([]);

  const [loading, setLoading] =
''',
            '''  const [exits, setExits] =
    useState<RoomExit[]>([]);

  const [
    journeyingTo,
    setJourneyingTo,
  ] = useState<string | null>(null);

  const [loading, setLoading] =
''',
            "journeying state",
        )

        source = replace_once(
            source,
            '''                <form className="components_portal_game_context_panel_form_move_character"
                  key={`${exit.id}-${destination.id}`}
                  action={moveCharacter}
                >
''',
            '''                <form className="components_portal_game_context_panel_form_move_character"
                  key={`${exit.id}-${destination.id}`}
                  action={moveCharacter}
                  onSubmit={() => {
                    setJourneyingTo(
                      destination.id,
                    );
                  }}
                >
''',
            "Journey form onSubmit",
        )

        source = replace_once(
            source,
            '''                  <button
                    type="submit"
                    className="group w-full border border-[rgb(var(--sep-colour-765937))]/60 bg-[rgb(var(--sep-colour-271c12))] px-2.5 py-[2px] text-left transition hover:border-[rgb(var(--sep-colour-a17a49))] hover:bg-[rgb(var(--sep-colour-3b2919))] components_portal_game_context_panel_button_action_3"
                  >
''',
            '''                  <button
                    type="submit"
                    disabled={
                      journeyingTo !== null
                    }
                    aria-disabled={
                      journeyingTo !== null
                    }
                    className={[
                      "group w-full border border-[rgb(var(--sep-colour-765937))]/60 bg-[rgb(var(--sep-colour-271c12))] px-2.5 py-[2px] text-left transition components_portal_game_context_panel_button_action_3",
                      journeyingTo !== null
                        ? "cursor-wait opacity-65"
                        : "hover:border-[rgb(var(--sep-colour-a17a49))] hover:bg-[rgb(var(--sep-colour-3b2919))]",
                    ].join(" ")}
                  >
''',
            "Journey button disable state",
        )

        source = replace_once(
            source,
            '''                          {destination.name}
''',
            '''                          {journeyingTo ===
                          destination.id
                            ? "Journeying..."
                            : destination.name}
''',
            "Journey button label",
        )

        source = replace_once(
            source,
            '''                        →
''',
            '''                        {journeyingTo ===
                        destination.id
                          ? "…"
                          : "→"}
''',
            "Journey button arrow",
        )

    except RuntimeError as exc:
        return fail(str(exc))

    backup = TARGET.with_suffix(
        TARGET.suffix + ".before-journey-button-only"
    )

    if not backup.exists():
        backup.write_text(
            original,
            encoding="utf-8",
        )

    TARGET.write_text(
        source,
        encoding="utf-8",
    )

    print("Journey button UI patch applied.")
    print()
    print("Only changes:")
    print('  - clicked Journey button says "Journeying..."')
    print("  - all Journey buttons disable immediately on submit")
    print("  - no routing/realtime/chat/performance code changed")
    print()
    print("Run:")
    print("  npm run build")
    return 0


if __name__ == "__main__":
    sys.exit(main())
