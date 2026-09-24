from pathlib import Path
import subprocess
import sys

EXPECTED_HEAD = "c279063"

def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"{label}: expected exactly 1 match, found {count}")
    return text.replace(old, new, 1)

def main():
    head = subprocess.check_output(
        ["git", "rev-parse", "--short=7", "HEAD"],
        text=True,
    ).strip()

    if head != EXPECTED_HEAD:
        raise RuntimeError(
            f"This patch was built for {EXPECTED_HEAD}, but current HEAD is {head}. "
            "No files were changed."
        )

    manager_path = Path("components/tutorial/portal-first-visit-tour.tsx")
    definitions_path = Path("components/tutorial/tutorial-stage2-definitions.ts")
    sidebar_path = Path("components/portal/portal-sidebar.tsx")
    base_sql_path = Path("add_first_visit_tutorial_progress.sql")
    stage2_sql_path = Path("extend_tutorial_keys_stage2.sql")

    manager = manager_path.read_text(encoding="utf-8")
    definitions = definitions_path.read_text(encoding="utf-8")
    sidebar = sidebar_path.read_text(encoding="utf-8")
    base_sql = base_sql_path.read_text(encoding="utf-8")
    stage2_sql = stage2_sql_path.read_text(encoding="utf-8")

    manager = replace_once(
        manager,
        '''  if (pathname === "/messages" || pathname.startsWith("/messages/")) { result.push(TOURS["private-messages"]); return result; }''',
        '''  if (pathname === "/messages") {
    result.push(TOURS["private-messages"]);
    return result;
  }

  if (/^\\/messages\\/[^/]+$/.test(pathname)) {
    result.push(TOURS["messages-conversation"]);
    return result;
  }''',
        "messages route tutorial split",
    )

    replay_old = '''  const replayControl =
    ready &&
    userId &&
    !activeTour &&
    applicableTours.length > 0 ? (
      <div className="fixed right-3 top-[calc(env(safe-area-inset-top)+5rem)] z-[20050] flex max-w-[min(92vw,430px)] flex-wrap justify-end gap-1.5 sm:right-5">
        {applicableTours.map((tour) => (
          <button
            key={tour.key}
            type="button"
            onClick={() => void startTour(tour)}
            className="border border-[rgb(var(--sep-colour-8b693e))]/80 bg-[rgb(var(--sep-colour-17110d))]/95 px-3 py-2 text-[8px] uppercase tracking-[0.15em] text-[rgb(var(--sep-colour-d9bd88))] shadow-[0_8px_24px_rgba(0,0,0,0.45)] backdrop-blur transition hover:border-[rgb(var(--sep-colour-b98c50))] hover:bg-[rgb(var(--sep-colour-2d1f14))] hover:text-[rgb(var(--sep-colour-f2d49f))]"
          >
            {applicableTours.length === 1
              ? "Play Tutorial"
              : `Play ${tour.label}`}
          </button>
        ))}
      </div>
    ) : null;

  if (!activeTour || !steps.length) return replayControl;
'''

    replay_new = '''  useEffect(() => {
    function handlePlayTutorial() {
      if (
        !ready ||
        !userId ||
        activeTour ||
        startingRef.current
      ) {
        return;
      }

      /*
       * Transient header-widget tours are added first. The current
       * page/context tour is appended afterwards; on /game, a
       * Location-specific tour is appended after the general one.
       * Replay therefore follows the most specific current context.
       */
      const tour =
        applicableTours[
          applicableTours.length - 1
        ];

      if (!tour) {
        return;
      }

      void startTour(tour);
    }

    window.addEventListener(
      "sepulchria:play-tutorial",
      handlePlayTutorial,
    );

    return () => {
      window.removeEventListener(
        "sepulchria:play-tutorial",
        handlePlayTutorial,
      );
    };
  }, [
    activeTour,
    applicableTours,
    ready,
    startTour,
    userId,
  ]);

  if (!activeTour || !steps.length) return null;
'''

    manager = replace_once(
        manager,
        replay_old,
        replay_new,
        "floating replay control removal",
    )

    definitions = replace_once(
        definitions,
        '''  "instant-chat": {''',
        '''  "messages-conversation": {
    "key": "messages-conversation",
    "label": "Message Conversation",
    "steps": [
      {
        "selector": ".messages_id_page_main_main, .messages_components_group_conversation_view_main_main",
        "title": "A Private Conversation",
        "body": "This is a persistent private-message conversation. It remains available in your Messages until you archive or delete it."
      },
      {
        "selector": ".messages_id_page_div_container_3, .messages_components_group_conversation_view_header_header",
        "title": "Conversation Details",
        "body": "The conversation header identifies who you are speaking with. From here you can also archive or delete the conversation when those actions are available."
      },
      {
        "selector": ".messages_id_components_conversationmessagelist_section_section",
        "title": "Search and Filter Messages",
        "body": "Use the controls above the history to search the conversation, filter On-game and Off-game messages, narrow by date, or manage selected messages."
      },
      {
        "selector": ".messages_id_components_conversationmessagelist_div_container_6",
        "title": "Message History",
        "body": "The conversation history is kept here. On-game correspondence belongs to the story; Off-game messages are player-to-player communication."
      },
      {
        "selector": ".messages_components_messagecomposer_form_action",
        "title": "Write a Reply",
        "body": "Choose whether the reply is On-game or Off-game, write the message, and send it. On-game messages are character correspondence; Off-game messages are written by the player."
      }
    ]
  },
  "instant-chat": {''',
        "messages conversation tutorial definition",
    )

    sidebar = replace_once(
        sidebar,
        '''            {renderLegalSafetyMenu()}
          </div>''',
        '''            {renderLegalSafetyMenu()}

            {modalWindows.length === 0 ? (
              <button
                type="button"
                onClick={() => {
                  window.dispatchEvent(
                    new Event(
                      "sepulchria:play-tutorial",
                    ),
                  );
                }}
                className="mt-2 flex items-center py-0.5 text-[9px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-9f8b70))] transition hover:text-[rgb(var(--sep-colour-d8bf91))]"
              >
                Play Tutorial
              </button>
            ) : null}
          </div>''',
        "sidebar Play Tutorial placement",
    )

    sidebar = replace_once(
        sidebar,
        '''  const resizeRef =
    useRef<ResizeState | null>(
      null,
    );''',
        '''  const resizeRef =
    useRef<ResizeState | null>(
      null,
    );

  const iframeRef =
    useRef<HTMLIFrameElement | null>(
      null,
    );

  const modalTutorialPath =
    item.href
      .split("#", 1)[0]
      .split("?", 1)[0];

  const modalHasTutorial =
    modalTutorialPath === "/characters" ||
    modalTutorialPath === "/store" ||
    modalTutorialPath === "/messages" ||
    modalTutorialPath === "/ancestries" ||
    modalTutorialPath.startsWith("/ancestries/") ||
    modalTutorialPath === "/associations" ||
    modalTutorialPath.startsWith("/associations/") ||
    modalTutorialPath === "/orders" ||
    modalTutorialPath.startsWith("/orders/") ||
    modalTutorialPath === "/warping" ||
    modalTutorialPath === "/feats" ||
    modalTutorialPath === "/character" ||
    modalTutorialPath === "/forum" ||
    modalTutorialPath.startsWith("/forum/") ||
    modalTutorialPath === "/market" ||
    modalTutorialPath.startsWith("/market/") ||
    modalTutorialPath === "/missions" ||
    modalTutorialPath === "/polls" ||
    modalTutorialPath === "/ranking" ||
    modalTutorialPath === "/rules" ||
    modalTutorialPath === "/codex" ||
    modalTutorialPath === "/crafting";''',
        "modal iframe ref and tutorial availability",
    )

    sidebar = replace_once(
        sidebar,
        '''          <div className="flex items-center gap-1 components_portal_portal_sidebar_div_container_20">
            <button''',
        '''          <div className="flex items-center gap-1 components_portal_portal_sidebar_div_container_20">
            {!collapsed && modalHasTutorial ? (
              <button
                type="button"
                onClick={() => {
                  iframeRef.current
                    ?.contentWindow
                    ?.dispatchEvent(
                      new Event(
                        "sepulchria:play-tutorial",
                      ),
                    );
                }}
                className="mr-1 h-7 border border-[rgb(var(--sep-colour-60482e))]/50 bg-[rgb(var(--sep-colour-17110d))] px-3 text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-bd9d6d))] transition hover:border-[rgb(var(--sep-colour-967342))] hover:text-[rgb(var(--sep-colour-f1d7a5))]"
              >
                Play Tutorial
              </button>
            ) : null}

            <button''',
        "modal titlebar Play Tutorial button",
    )

    sidebar = replace_once(
        sidebar,
        '''          <iframe
            src={iframeSrc}''',
        '''          <iframe
            ref={iframeRef}
            src={iframeSrc}''',
        "modal iframe ref mount",
    )

    if "'messages-conversation'" in base_sql or "'messages-conversation'" in stage2_sql:
        raise RuntimeError(
            "messages-conversation SQL key already exists; no files were changed."
        )

    base_sql = replace_once(
        base_sql,
        '''        'private-messages',
        'instant-chat',''',
        '''        'private-messages',
        'messages-conversation',
        'instant-chat',''',
        "base SQL messages conversation key",
    )

    stage2_sql = replace_once(
        stage2_sql,
        '''        'private-messages',
        'instant-chat',''',
        '''        'private-messages',
        'messages-conversation',
        'instant-chat',''',
        "stage2 SQL messages conversation key",
    )

    checks = [
        (manager, '"sepulchria:play-tutorial"', True, "manager replay event"),
        (manager, 'TOURS["messages-conversation"]', True, "conversation route"),
        (manager, 'fixed right-3 top-[calc(env(safe-area-inset-top)+5rem)]', False, "old floating replay control"),
        (definitions, '"key": "messages-conversation"', True, "conversation tutorial"),
        (sidebar, "modalWindows.length === 0", True, "sidebar modal exclusion"),
        (sidebar, "ref={iframeRef}", True, "iframe ref"),
        (sidebar, "iframeRef.current", True, "modal tutorial dispatch"),
        (base_sql, "'messages-conversation'", True, "base SQL key"),
        (stage2_sql, "'messages-conversation'", True, "stage2 SQL key"),
    ]

    for text, token, should_exist, label in checks:
        exists = token in text
        if exists != should_exist:
            wanted = "present" if should_exist else "absent"
            raise RuntimeError(
                f"Verification failed: {label} should be {wanted}. No files were changed."
            )

    manager_path.write_text(manager, encoding="utf-8")
    definitions_path.write_text(definitions, encoding="utf-8")
    sidebar_path.write_text(sidebar, encoding="utf-8")
    base_sql_path.write_text(base_sql, encoding="utf-8")
    stage2_sql_path.write_text(stage2_sql, encoding="utf-8")

    print("Applied tutorial placement fix for c279063.")
    print(" - Removed all floating tutorial replay buttons")
    print(" - Added sidebar replay below Legal & Safety for full pages")
    print(" - Added modal title-bar replay before window controls")
    print(" - Added separate /messages/[id] conversation tutorial")
    print()
    print("Next: run the supplied SQL, then npm run build.")

if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"PATCH FAILED: {exc}", file=sys.stderr)
        sys.exit(1)
