from pathlib import Path


def stop(msg):
    raise SystemExit(f"\nPATCH STOPPED: {msg}\n")


def replace_once(path, old, new, label):
    text = path.read_text(encoding='utf-8')
    count = text.count(old)
    if count != 1:
        stop(f"{label}: expected exactly 1 match in {path}, found {count}. This patch targets 72b6816.")
    path.write_text(text.replace(old, new, 1), encoding='utf-8', newline='\n')
    print(f"✓ {label}")

root = Path.cwd()
if not (root / 'package.json').exists():
    stop('Run this script from the sepulchria-portal repository root.')

route = root / 'app/api/notifications/read/route.ts'
route.parent.mkdir(parents=True, exist_ok=True)
if route.exists():
    stop('app/api/notifications/read/route.ts already exists. Send me that file instead of overwriting it.')

route.write_text(r'''import {
  NextRequest,
  NextResponse,
} from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type RequestBody = {
  action?: "status" | "read";
  notificationIds?: unknown;
};

function normaliseIds(value: unknown) {
  if (!Array.isArray(value)) return [];

  return Array.from(
    new Set(
      value
        .filter(
          (entry): entry is string =>
            typeof entry === "string" && entry.length > 0,
        )
        .slice(0, 500),
    ),
  );
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json(
      { ok: false, error: "Not authenticated." },
      { status: 401 },
    );
  }

  const body = (await request.json().catch(() => ({}))) as RequestBody;
  const ids = normaliseIds(body.notificationIds);

  if (body.action !== "status" && body.action !== "read") {
    return NextResponse.json(
      { ok: false, error: "Invalid action." },
      { status: 400 },
    );
  }

  if (ids.length === 0) {
    return NextResponse.json({ ok: true, readIds: [] });
  }

  const admin = createAdminClient();

  if (body.action === "status") {
    const { data, error } = await admin
      .from("notification_reads")
      .select("notification_id")
      .eq("user_id", user.id)
      .in("notification_id", ids);

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      readIds: (data ?? []).map((row) => row.notification_id),
    });
  }

  const readAt = new Date().toISOString();
  const { error } = await admin
    .from("notification_reads")
    .upsert(
      ids.map((notificationId) => ({
        user_id: user.id,
        notification_id: notificationId,
        read_at: readAt,
      })),
      { onConflict: "user_id,notification_id" },
    );

  if (error) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, readIds: ids });
}
''', encoding='utf-8', newline='\n')
print('✓ Created server-authoritative notification read endpoint')

bell = root / 'components/notifications/notification-bell.tsx'

replace_once(
    bell,
'''      let individuallyReadIds =
        new Set<string>();

      if (
        nextRows.length > 0
      ) {
        const {
          data: readRows,
          error: readError,
        } = await supabase
          .from(
            "notification_reads",
          )
          .select(
            "notification_id",
          )
          .in(
            "notification_id",
            nextRows.map(
              (row) => row.id,
            ),
          );

        if (readError) {
          console.warn(
            "Notification individual read state:",
            readError.message,
          );
        } else {
          individuallyReadIds =
            new Set(
              (readRows ?? []).map(
                (row) =>
                  row.notification_id,
              ),
            );
        }
      }
''',
'''      let individuallyReadIds =
        new Set<string>();

      if (
        nextRows.length > 0
      ) {
        const response =
          await fetch(
            "/api/notifications/read",
            {
              method: "POST",
              cache: "no-store",
              headers: {
                "Content-Type":
                  "application/json",
              },
              body:
                JSON.stringify({
                  action:
                    "status",
                  notificationIds:
                    nextRows.map(
                      (row) => row.id,
                    ),
                }),
            },
          ).catch(() => null);

        if (response?.ok) {
          const result =
            (await response.json()) as {
              readIds?: string[];
            };

          individuallyReadIds =
            new Set(
              Array.isArray(
                result.readIds,
              )
                ? result.readIds
                : [],
            );
        } else {
          console.warn(
            "Notification individual read state could not be loaded.",
          );
        }
      }
''',
    'Bell: load persistent read IDs via authenticated server',
)

replace_once(
    bell,
'''  async function markNotificationRead(
    notificationId: string,
  ) {
    const target =
      rows.find(
        (row) =>
          row.id ===
          notificationId,
      );

    if (
      !target?.is_unread
    ) {
      return;
    }

    setRows(
      (current) =>
        current.map(
          (row) =>
            row.id ===
            notificationId
              ? {
                  ...row,
                  is_unread:
                    false,
                }
              : row,
        ),
    );

    previousUnreadRef.current =
      Math.max(
        0,
        previousUnreadRef.current -
          1,
      );

    const {
      data: { user },
      error: userError,
    } =
      await supabase.auth.getUser();

    if (
      userError ||
      !user
    ) {
      await load();
      return;
    }

    const {
      error,
    } = await supabase
      .from(
        "notification_reads",
      )
      .upsert(
        {
          user_id:
            user.id,
          notification_id:
            notificationId,
          read_at:
            new Date().toISOString(),
        },
        {
          onConflict:
            "user_id,notification_id",
        },
      );

    if (error) {
      console.warn(
        "Mark notification read:",
        error.message,
      );

      await load();
      return;
    }

    window.dispatchEvent(
      new Event(
        "sepulchria:notifications-changed",
      ),
    );
  }
''',
'''  async function markNotificationRead(
    notificationId: string,
  ) {
    const target =
      rows.find(
        (row) =>
          row.id === notificationId,
      );

    if (!target?.is_unread) {
      return;
    }

    setRows(
      (current) =>
        current.map(
          (row) =>
            row.id === notificationId
              ? {
                  ...row,
                  is_unread: false,
                }
              : row,
        ),
    );

    previousUnreadRef.current =
      Math.max(
        0,
        previousUnreadRef.current - 1,
      );

    const response =
      await fetch(
        "/api/notifications/read",
        {
          method: "POST",
          cache: "no-store",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            action: "read",
            notificationIds: [notificationId],
          }),
        },
      ).catch(() => null);

    if (!response?.ok) {
      console.warn(
        "Mark notification read: server persistence failed.",
      );
      await load();
      return;
    }

    window.dispatchEvent(
      new Event(
        "sepulchria:notifications-changed",
      ),
    );
  }
''',
    'Bell: persist individual read via server',
)

replace_once(
    bell,
'''  async function markAllRead() {
    if (
      markingAllRead ||
      unreadCount === 0
    ) {
      return;
    }

    setMarkingAllRead(true);

    previousUnreadRef.current =
      0;

    setRows(
      (current) =>
        current.map(
          (row) => ({
            ...row,
            is_unread: false,
          }),
        ),
    );

    const {
      error,
    } = await supabase.rpc(
      "mark_my_notifications_viewed",
    );

    if (error) {
      console.warn(
        "Mark all notifications read:",
        error.message,
      );

      await load();
      setMarkingAllRead(
        false,
      );
      return;
    }

    window.dispatchEvent(
      new Event(
        "sepulchria:notifications-changed",
      ),
    );

    setMarkingAllRead(
      false,
    );
  }
''',
'''  async function markAllRead() {
    if (
      markingAllRead ||
      unreadCount === 0
    ) {
      return;
    }

    const unreadIds =
      rows
        .filter((row) => row.is_unread)
        .map((row) => row.id);

    if (unreadIds.length === 0) {
      return;
    }

    setMarkingAllRead(true);
    previousUnreadRef.current = 0;

    setRows(
      (current) =>
        current.map(
          (row) => ({
            ...row,
            is_unread: false,
          }),
        ),
    );

    const [
      readResponse,
      viewedResult,
    ] = await Promise.all([
      fetch(
        "/api/notifications/read",
        {
          method: "POST",
          cache: "no-store",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            action: "read",
            notificationIds: unreadIds,
          }),
        },
      ).catch(() => null),
      supabase.rpc(
        "mark_my_notifications_viewed",
      ),
    ]);

    if (
      !readResponse?.ok ||
      viewedResult.error
    ) {
      if (viewedResult.error) {
        console.warn(
          "Mark all notifications read:",
          viewedResult.error.message,
        );
      }
      if (!readResponse?.ok) {
        console.warn(
          "Mark all notifications read: ID persistence failed.",
        );
      }

      await load();
      setMarkingAllRead(false);
      return;
    }

    window.dispatchEvent(
      new Event(
        "sepulchria:notifications-changed",
      ),
    );

    setMarkingAllRead(false);
  }
''',
    'Bell: Mark all persists every unread notification ID',
)

replace_once(
    bell,
'''                        ) : (
                          <div
                            key={
                              row.id
                            }
                            className={
                              className
                            }
                          >
                            {
                              content
                            }
                          </div>
                        );
''',
'''                        ) : (
                          <div
                            key={
                              row.id
                            }
                            role="button"
                            tabIndex={0}
                            onClick={() => {
                              void markNotificationRead(
                                row.id,
                              );
                            }}
                            onKeyDown={(event) => {
                              if (
                                event.key === "Enter" ||
                                event.key === " "
                              ) {
                                event.preventDefault();
                                void markNotificationRead(
                                  row.id,
                                );
                              }
                            }}
                            className={[
                              className,
                              row.is_unread
                                ? "cursor-pointer"
                                : "",
                            ].join(" ")}
                          >
                            {
                              content
                            }
                          </div>
                        );
''',
    'Bell: no-link notifications are clickable to mark read',
)

print('\nPATCH COMPLETE.')
print('Changed:')
print('  app/api/notifications/read/route.ts')
print('  components/notifications/notification-bell.tsx')
print('\nNow run: npm run build')
