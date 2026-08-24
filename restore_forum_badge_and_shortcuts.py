from pathlib import Path
import sys
import shutil

ROOT = Path.cwd()

PORTAL = ROOT / "components/portal/portal-sidebar.tsx"
FORUM = ROOT / "components/portal/forum-sidebar-menu.tsx"

def fail(message: str):
    print(f"\nERROR: {message}")
    sys.exit(1)

def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        fail(f"{label}: expected exactly 1 match, found {count}. No changes written.")
    return text.replace(old, new, 1)

for path in (PORTAL, FORUM):
    if not path.exists():
        fail(f"Missing file: {path}")

portal_text = PORTAL.read_text(encoding="utf-8")
forum_text = FORUM.read_text(encoding="utf-8")

old_desktop_forum = '''                {renderNavigationItem(
                  forumItem,
                )}'''

new_desktop_forum = '''                <ForumSidebarMenu
                  unreadCount={
                    currentUnreadForumCount
                  }
                />'''

portal_text = replace_once(
    portal_text,
    old_desktop_forum,
    new_desktop_forum,
    "restore desktop ForumSidebarMenu",
)

forum_text = replace_once(
    forum_text,
    'import Link from "next/link";',
    'import { openPortalModal } from "@/components/portal/portal-modal-button";',
    "replace Link import with modal opener",
)

old_main_link = '''        <Link
          href="/forum"
          className="flex min-w-0 flex-1 items-center gap-2 px-2.5 py-2"
        >'''

new_main_link = '''        <button
          type="button"
          onClick={() =>
            openPortalModal({
              label: "Forum",
              title:
                "Open the Sepulchria community forum.",
              icon: "/icons/forum.png",
              href: "/forum",
            })
          }
          className="flex min-w-0 flex-1 items-center gap-2 px-2.5 py-2 text-left"
        >'''

forum_text = replace_once(
    forum_text,
    old_main_link,
    new_main_link,
    "Forum main link -> modal button",
)

forum_text = replace_once(
    forum_text,
    '''        </Link>

        <button
          type="button"
          onClick={() =>
            setOpen((value) => !value)
          }''',
    '''        </button>

        <button
          type="button"
          onClick={() =>
            setOpen((value) => !value)
          }''',
    "close Forum modal button",
)

old_topic_link = '''      <Link
        href={`/forum/${encodeURIComponent(
          topic.sectionSlug,
        )}/${encodeURIComponent(
          topic.slug,
        )}`}
        title={`${topic.title} — ${topic.sectionName}`}
        className="min-w-0 flex-1 truncate border-l border-transparent px-2 py-1.5 text-[9px] text-[rgb(var(--sep-colour-958875))] transition hover:border-[rgb(var(--sep-colour-8e683d))] hover:bg-[rgb(var(--sep-colour-1b140f))] hover:text-[rgb(var(--sep-colour-dbc39c))]"
      >
        {topic.title}
      </Link>'''

new_topic_link = '''      <button
        type="button"
        onClick={() =>
          openPortalModal({
            label: topic.title,
            title:
              `${topic.title} — ${topic.sectionName}`,
            icon: "/icons/forum.png",
            href: `/forum/${encodeURIComponent(
              topic.sectionSlug,
            )}/${encodeURIComponent(
              topic.slug,
            )}`,
          })
        }
        title={`${topic.title} — ${topic.sectionName}`}
        className="min-w-0 flex-1 truncate border-l border-transparent px-2 py-1.5 text-left text-[9px] text-[rgb(var(--sep-colour-958875))] transition hover:border-[rgb(var(--sep-colour-8e683d))] hover:bg-[rgb(var(--sep-colour-1b140f))] hover:text-[rgb(var(--sep-colour-dbc39c))]"
      >
        {topic.title}
      </button>'''

forum_text = replace_once(
    forum_text,
    old_topic_link,
    new_topic_link,
    "Forum topic shortcut -> modal button",
)

for path in (PORTAL, FORUM):
    backup = path.with_suffix(path.suffix + ".before-forum-sidebar-restore.bak")
    if not backup.exists():
        shutil.copy2(path, backup)

PORTAL.write_text(portal_text, encoding="utf-8")
FORUM.write_text(forum_text, encoding="utf-8")

print("PATCH APPLIED")
print("")
print("Restored:")
print("  - Forum unread badge in desktop sidebar")
print("  - Forum + / - expander")
print("  - Favourite Topics shortcuts")
print("  - Recent Topics shortcuts")
print("")
print("Preserved:")
print("  - Forum opens in the floating modal")
print("  - Favourite/recent topic shortcuts open directly in floating modals")
print("  - Existing forum unread realtime/polling logic")
print("")
print("Next:")
print("  npm run build")
