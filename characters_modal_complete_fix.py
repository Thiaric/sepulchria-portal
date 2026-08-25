from pathlib import Path

ROOT = Path.cwd()

SIDEBAR = ROOT / "components/portal/portal-sidebar.tsx"
GAME_CONTEXT = ROOT / "components/portal/game-context-panel.tsx"
PROFILE = ROOT / "components/characters/public-character-profile.tsx"
RETURN_LINK = ROOT / "components/characters/character-return-link.tsx"


def fail(message: str) -> None:
    raise SystemExit(
        f"ERROR: {message}\nNo changes were applied."
    )


def read(path: Path) -> str:
    if not path.exists():
        fail(f"Missing expected file: {path.relative_to(ROOT)}")
    return path.read_text(encoding="utf-8")


sidebar = read(SIDEBAR)
game = read(GAME_CONTEXT)
profile = read(PROFILE)

old_detection = '''  const isMessagesModal =
    item.label === "Messages" ||
    item.label.startsWith(
      "Messages — ",
    ) ||
    item.href === "/messages" ||
    item.href.startsWith(
      "/messages/",
    );

  const modalWindowRef =
'''

new_detection = '''  const isMessagesModal =
    item.label === "Messages" ||
    item.label.startsWith(
      "Messages — ",
    ) ||
    item.href === "/messages" ||
    item.href.startsWith(
      "/messages/",
    );

  const isCharacterModal =
    item.href === "/characters" ||
    item.href.startsWith(
      "/characters/",
    );

  const isLargeModal =
    isMessagesModal ||
    isCharacterModal;

  const modalWindowRef =
'''

if sidebar.count(old_detection) == 1:
    sidebar = sidebar.replace(old_detection, new_detection, 1)
elif sidebar.count(new_detection) != 1:
    fail("Could not find the current Messages modal detection block.")

old_size = '''            : isMessagesModal
              ? "h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] min-h-0 min-w-0 max-h-[calc(100dvh-1rem)] max-w-[calc(100vw-1rem)] overflow-hidden sm:resize"
'''

new_size = '''            : isLargeModal
              ? "h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] min-h-0 min-w-0 max-h-[calc(100dvh-1rem)] max-w-[calc(100vw-1rem)] overflow-hidden sm:resize"
'''

if sidebar.count(old_size) == 1:
    sidebar = sidebar.replace(old_size, new_size, 1)
elif sidebar.count(new_size) != 1:
    fail("Could not find the current large Messages modal sizing branch.")

modal_import = 'import { openPortalModal } from "@/components/portal/portal-modal-button";\n'

if modal_import not in game:
    import_anchor = 'import Link from "next/link";\n'
    if game.count(import_anchor) != 1:
        fail("Could not find next/link import in game-context-panel.tsx.")
    game = game.replace(import_anchor, import_anchor + modal_import, 1)

old_location_link = '''    <Link
      href={`/characters/${person.public_slug}?from=game`}
      title={`Open ${displayName}'s profile`}
      className="block"
    >
'''

new_location_button = '''    <button
      type="button"
      title={`Open ${displayName}'s profile`}
      aria-label={`Open ${displayName}'s character sheet`}
      onClick={() =>
        openPortalModal({
          label: displayName,
          title: `${displayName}'s character sheet`,
          icon:
            person.portrait_url ??
            "/icons/characters.png",
          href: `/characters/${person.public_slug}?from=game`,
        })
      }
      className="block w-full text-left"
    >
'''

if game.count(old_location_link) == 1:
    game = game.replace(old_location_link, new_location_button, 1)
elif game.count(new_location_button) != 1:
    fail("Could not find the Present Characters profile link.")

old_location_close = '''    </Link>

    {person.id !== currentCharacterId &&
'''

new_location_close = '''    </button>

    {person.id !== currentCharacterId &&
'''

if game.count(old_location_close) == 1:
    game = game.replace(old_location_close, new_location_close, 1)
elif game.count(new_location_close) != 1:
    fail("Could not find the closing tag for the Present Characters profile link.")

if "<Link" not in game and "</Link>" not in game:
    game = game.replace('import Link from "next/link";\n', "", 1)

if "export function GameContextPanel" not in game:
    fail("Safety check failed: GameContextPanel export is missing.")

return_component = '''"use client";

import Link from "next/link";

export function CharacterReturnLink({
  href,
  label,
  className,
}: {
  href: string;
  label: string;
  className: string;
}) {
  return (
    <Link
      href={href}
      className={className}
      onClick={(event) => {
        if (
          typeof window === "undefined" ||
          window.self === window.top
        ) {
          return;
        }

        event.preventDefault();

        const destination =
          new URL(
            href,
            window.location.origin,
          );

        destination.searchParams.set(
          "embedded",
          "1",
        );

        window.location.assign(
          `${destination.pathname}${destination.search}${destination.hash}`,
        );
      }}
    >
      <span aria-hidden="true">←</span>
      {label}
    </Link>
  );
}
'''

profile_import_anchor = '''import Link from "next/link";

import { startConversation } from "@/app/(portal)/messages/actions";
'''

profile_import_new = '''import Link from "next/link";

import { CharacterReturnLink } from "@/components/characters/character-return-link";
import { startConversation } from "@/app/(portal)/messages/actions";
'''

if profile.count(profile_import_anchor) == 1:
    profile = profile.replace(profile_import_anchor, profile_import_new, 1)
elif profile.count(
    'import { CharacterReturnLink } from "@/components/characters/character-return-link";'
) != 1:
    fail("Could not add CharacterReturnLink import.")

old_return_link = '''        <Link
          href={returnHref}
          className="inline-flex items-center gap-2 border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-15100d))] px-4 py-2 text-[9px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-c6ab80))] transition hover:border-[rgb(var(--sep-colour-987344))] hover:bg-[rgb(var(--sep-colour-261b12))] hover:text-[rgb(var(--sep-colour-ead2a5))]"
        >
          <span aria-hidden="true">←</span>
          {returnLabel}
        </Link>
'''

new_return_link = '''        <CharacterReturnLink
          href={returnHref}
          label={returnLabel}
          className="inline-flex items-center gap-2 border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-15100d))] px-4 py-2 text-[9px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-c6ab80))] transition hover:border-[rgb(var(--sep-colour-987344))] hover:bg-[rgb(var(--sep-colour-261b12))] hover:text-[rgb(var(--sep-colour-ead2a5))]"
        />
'''

if profile.count(old_return_link) == 1:
    profile = profile.replace(old_return_link, new_return_link, 1)
elif profile.count(new_return_link) != 1:
    fail("Could not find the Back to Characters / Back to Chat link.")

SIDEBAR.write_text(sidebar, encoding="utf-8", newline="\n")
GAME_CONTEXT.write_text(game, encoding="utf-8", newline="\n")
PROFILE.write_text(profile, encoding="utf-8", newline="\n")
RETURN_LINK.write_text(return_component, encoding="utf-8", newline="\n")

print("WROTE  components/portal/portal-sidebar.tsx")
print("WROTE  components/portal/game-context-panel.tsx")
print("WROTE  components/characters/public-character-profile.tsx")
print("WROTE  components/characters/character-return-link.tsx")
print()
print("PATCH APPLIED SUCCESSFULLY")
print()
print("Changes:")
print("- Present characters in a location now open their sheet in a portal modal.")
print("- /characters and /characters/[slug] modals open at the same large size as Messages.")
print("- Character modals remain resizable.")
print("- Back to Characters forces /characters inside the modal instead of relying on iframe/router history.")
print("- Back to Chat still points to /game.")
print("- GameContextPanel export is explicitly preserved.")
print("- No fixed commit guard is used.")
print()
print("Next: npm run build")
