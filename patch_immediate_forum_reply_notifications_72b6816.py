#!/usr/bin/env python3
from pathlib import Path

path = Path("components/notifications/notification-bell.tsx")

if not path.exists():
    raise SystemExit(
        "\nPATCH STOPPED: Run this from the sepulchria-portal project root.\n"
    )

text = path.read_text(encoding="utf-8")

old = '''    let retryTimer:
      | number
      | null = null;
'''

new = '''    let retryTimer:
      | number
      | null = null;

    let forumRetryTimer:
      | number
      | null = null;
'''

count = text.count(old)
if count != 1:
    raise SystemExit(
        f"\nPATCH STOPPED: retry timer anchor: expected 1 match, found {count}.\n"
    )

text = text.replace(old, new, 1)

anchor = '''    function reloadFromReadySignal() {
      /*
       * The targeted-notification helper creates notification_targets
       * BEFORE it emits its final UPDATE on notifications. Load now,
       * then once more shortly afterwards as a transaction-visibility
       * safety net.
       */
      void load();

      if (
        retryTimer !== null
      ) {
        window.clearTimeout(
          retryTimer,
        );
      }

      retryTimer =
        window.setTimeout(
          () => {
            void load();
          },
          180,
        );
    }
'''

replacement = '''    function reloadFromReadySignal() {
      /*
       * The targeted-notification helper creates notification_targets
       * BEFORE it emits its final UPDATE on notifications. Load now,
       * then once more shortly afterwards as a transaction-visibility
       * safety net.
       */
      void load();

      if (
        retryTimer !== null
      ) {
        window.clearTimeout(
          retryTimer,
        );
      }

      retryTimer =
        window.setTimeout(
          () => {
            void load();
          },
          180,
        );
    }

    function reloadFromForumReplyInsert() {
      /*
       * A forum reply is inserted before the server resolves the topic
       * author/favourite audience and creates the targeted notification.
       * Wake immediately, then retry after that recipient work has had
       * time to finish.
       */
      void load();

      if (
        forumRetryTimer !== null
      ) {
        window.clearTimeout(
          forumRetryTimer,
        );
      }

      window.setTimeout(
        () => {
          void load();
        },
        250,
      );

      forumRetryTimer =
        window.setTimeout(
          () => {
            void load();
          },
          900,
        );
    }
'''

count = text.count(anchor)
if count != 1:
    raise SystemExit(
        f"\nPATCH STOPPED: ready-signal helper anchor: expected 1 match, found {count}.\n"
    )

text = text.replace(anchor, replacement, 1)

anchor = '''    const invitationChannels =
      invitationTables.map(
        (table) =>
          supabase
            .channel(
              `bell-invitation-${table}-${crypto.randomUUID()}`,
            )
            .on(
              "postgres_changes",
              {
                event: "INSERT",
                schema: "public",
                table,
              },
              () => {
                reloadFromReadySignal();
              },
            )
            .subscribe(),
      );

    return () => {
'''

replacement = '''    const invitationChannels =
      invitationTables.map(
        (table) =>
          supabase
            .channel(
              `bell-invitation-${table}-${crypto.randomUUID()}`,
            )
            .on(
              "postgres_changes",
              {
                event: "INSERT",
                schema: "public",
                table,
              },
              () => {
                reloadFromReadySignal();
              },
            )
            .subscribe(),
      );

    const forumReplyChannel =
      supabase
        .channel(
          `bell-forum-replies-${crypto.randomUUID()}`,
        )
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "forum_posts",
          },
          (payload) => {
            const isInitial =
              Boolean(
                (
                  payload.new as {
                    is_initial?: boolean;
                  }
                )?.is_initial,
              );

            if (!isInitial) {
              reloadFromForumReplyInsert();
            }
          },
        )
        .subscribe();

    return () => {
'''

count = text.count(anchor)
if count != 1:
    raise SystemExit(
        f"\nPATCH STOPPED: invitation channel anchor: expected 1 match, found {count}.\n"
    )

text = text.replace(anchor, replacement, 1)

anchor = '''      if (
        retryTimer !== null
      ) {
        window.clearTimeout(
          retryTimer,
        );
      }

      void supabase.removeChannel(
        channel,
      );

      for (
        const invitationChannel of
          invitationChannels
      ) {
        void supabase.removeChannel(
          invitationChannel,
        );
      }
'''

replacement = '''      if (
        retryTimer !== null
      ) {
        window.clearTimeout(
          retryTimer,
        );
      }

      if (
        forumRetryTimer !== null
      ) {
        window.clearTimeout(
          forumRetryTimer,
        );
      }

      void supabase.removeChannel(
        channel,
      );

      void supabase.removeChannel(
        forumReplyChannel,
      );

      for (
        const invitationChannel of
          invitationChannels
      ) {
        void supabase.removeChannel(
          invitationChannel,
        );
      }
'''

count = text.count(anchor)
if count != 1:
    raise SystemExit(
        f"\nPATCH STOPPED: cleanup anchor: expected 1 match, found {count}.\n"
    )

text = text.replace(anchor, replacement, 1)

path.write_text(text, encoding="utf-8", newline="\n")

print("✓ Added forum_posts INSERT realtime listener.")
print("✓ Only reply posts wake the bell.")
print("✓ Added 250ms + 900ms retries.")
print("✓ Added cleanup.")
print("\nPATCH COMPLETE")
print("\nRun: npm run build")
