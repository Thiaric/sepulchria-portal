from pathlib import Path
import re

ROOT = Path.cwd()

def read(rel):
    p = ROOT / rel
    if not p.exists():
        raise SystemExit(f"ERROR: Missing {rel}. Run this from the sepulchria-portal root.")
    return p, p.read_text(encoding="utf-8")

def write(p, text):
    p.write_text(text, encoding="utf-8")

def replace_once(text, old, new, label):
    if old not in text:
        raise SystemExit(f"ERROR: Could not find expected block for {label}.")
    return text.replace(old, new, 1)

# 1) PM inbox: use one bounded summary RPC instead of loading every message.
rel = "app/(portal)/messages/page.tsx"
p, t = read(rel)

t = replace_once(
    t,
    '''type DeletionRow = {
  message_id: string;
};
''',
    '''type DeletionRow = {
  message_id: string;
};

type InboxSummaryRow = {
  conversation_id: string;
  last_message_id: string | null;
  last_message_body: string | null;
  last_message_created_at: string | null;
  last_message_sender_character_id: string | null;
  unread_count: number | string;
};
''',
    "messages inbox summary type",
)

t = replace_once(
    t,
    '''    allMessagesResult,
    deletionsResult,
    availableCharactersResult,
    blocksResult,
  ] = await Promise.all([''',
    '''    summaryResult,
    deletionsResult,
    availableCharactersResult,
    blocksResult,
  ] = await Promise.all([''',
    "messages Promise.all names",
)

pattern = re.compile(
    r'''    conversationIds\.length
      \? supabase
          \.from\(
            "direct_messages",
          \)
          \.select\(
            "id, conversation_id, body, created_at, sender_character_id",
          \)
          \.in\(
            "conversation_id",
            conversationIds,
          \)
          \.order\(
            "created_at",
            \{
              ascending: false,
            \},
          \)
      : Promise\.resolve\(\{
          data: \[\],
          error: null,
        \}\),'''
)
replacement = '''    conversationIds.length
      ? supabase.rpc(
          "get_direct_message_inbox_summaries",
          {
            p_character_id: character.id,
            p_archived: showArchived,
            p_limit: 100,
          },
        )
      : Promise.resolve({
          data: [],
          error: null,
        }),'''
t, n = pattern.subn(replacement, t, count=1)
if n != 1:
    raise SystemExit("ERROR: Could not replace the heavy PM inbox message query.")

t = t.replace("    allMessagesResult.error ??\n", "    summaryResult.error ??\n", 1)

start = t.find("  const deletedMessageIds =")
end = t.find("  const blockedCharacterIds =", start)
if start == -1 or end == -1:
    raise SystemExit("ERROR: Could not find PM inbox message processing block.")

t = t[:start] + '''  const summariesByConversation =
    new Map<string, InboxSummaryRow>();

  for (
    const row of
      (summaryResult.data ?? []) as InboxSummaryRow[]
  ) {
    summariesByConversation.set(
      row.conversation_id,
      row,
    );
  }

''' + t[end:]

start = t.find("  const messagesByConversation =")
end = t.find("  const conversations =", start)
if start != -1 and end != -1:
    t = t[:start] + t[end:]

t = replace_once(
    t,
    '''        const messages =
          messagesByConversation.get(
            row.conversation_id,
          ) ?? [];

        const lastMessage =
          messages[0] ?? null;

        const lastReadTime =
          row.last_read_at
            ? Date.parse(
                row.last_read_at,
              )
            : 0;

        const unreadCount =
          messages.filter(
            (message) =>
              message.sender_character_id !==
                character.id &&
              Date.parse(
                message.created_at,
              ) >
                lastReadTime,
          ).length;
''',
    '''        const summary =
          summariesByConversation.get(
            row.conversation_id,
          ) ?? null;

        const lastMessage: DirectMessageRow | null =
          summary?.last_message_id &&
          summary.last_message_created_at &&
          summary.last_message_sender_character_id
            ? {
                id: summary.last_message_id,
                conversation_id: row.conversation_id,
                body: summary.last_message_body ?? "",
                created_at: summary.last_message_created_at,
                sender_character_id:
                  summary.last_message_sender_character_id,
              }
            : null;

        const unreadCount =
          Number(summary?.unread_count ?? 0);
''',
    "messages inbox summary mapping",
)

t = replace_once(
    t,
    '''            ...messages.map(
              (message) =>
                richTextToPlainText(
                  message.body,
                ),
            ),
''',
    '''            lastMessage
              ? richTextToPlainText(
                  lastMessage.body,
                )
              : null,
''',
    "messages inbox search text",
)

t = replace_once(
    t,
    '''          matchedMessages:
            messages.map(
              (message) => ({
                id: message.id,
                body:
                  message.body,
                createdAt:
                  message.created_at,
              }),
            ),
''',
    '''          matchedMessages:
            lastMessage
              ? [{
                  id: lastMessage.id,
                  body: lastMessage.body,
                  createdAt:
                    lastMessage.created_at,
                }]
              : [],
''',
    "messages inbox matched messages",
)

needle = '''      : membershipQuery.is(
          "archived_at",
          null,
        );

  const {
'''
if needle in t:
    t = t.replace(
        needle,
        '''      : membershipQuery.is(
          "archived_at",
          null,
        );

  membershipQuery =
    membershipQuery.limit(100);

  const {
''',
        1,
    )

write(p, t)
print("Patched PM inbox.")

# 2) One-to-one PM pagination: 100 messages per page.
rel = "app/(portal)/messages/[id]/page.tsx"
p, t = read(rel)

t = replace_once(
    t,
    '''type ConversationPageProps = {
  params: Promise<{
    id: string;
  }>;
};''',
    '''type ConversationPageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{
    page?: string;
  }>;
};

const MESSAGE_PAGE_SIZE = 100;''',
    "PM pagination props",
)

t = replace_once(
    t,
    '''export default async function ConversationPage({
  params,
}: ConversationPageProps) {
  const { id } =
    await params;
''',
    '''export default async function ConversationPage({
  params,
  searchParams,
}: ConversationPageProps) {
  const { id } =
    await params;

  const { page: pageParam } =
    await searchParams;

  const page =
    Math.max(
      1,
      Number.parseInt(
        pageParam ?? "1",
        10,
      ) || 1,
    );

  const messageFrom =
    (page - 1) *
    MESSAGE_PAGE_SIZE;

  const messageTo =
    messageFrom +
    MESSAGE_PAGE_SIZE;
''',
    "PM page calculation",
)

t = replace_once(
    t,
    '''      .limit(1000),''',
    '''      .range(
        messageFrom,
        messageTo,
      ),''',
    "PM message range",
)

t = replace_once(
    t,
    '''  const rawMessages = (
    (messagesResult.data ??
      []) as DirectMessage[]
  )
    .filter(
      (message) =>
        !deletedIds.has(
          message.id,
        ),
    )
    .reverse();
''',
    '''  const fetchedMessages = (
    (messagesResult.data ??
      []) as DirectMessage[]
  );

  const hasOlderMessages =
    fetchedMessages.length >
    MESSAGE_PAGE_SIZE;

  const rawMessages =
    fetchedMessages
      .slice(
        0,
        MESSAGE_PAGE_SIZE,
      )
      .filter(
        (message) =>
          !deletedIds.has(
            message.id,
          ),
      )
      .reverse();
''',
    "PM fetched page",
)

t = replace_once(
    t,
    '''        title={
          conversationMeta.title
        }
      />''',
    '''        title={
          conversationMeta.title
        }
        page={page}
      />''',
    "group conversation page prop",
)

t = replace_once(
    t,
    '''          <ConversationMessageList
            conversationId={id}''',
    '''          {(page > 1 || hasOlderMessages) ? (
            <nav className="flex items-center justify-between gap-3 border-b border-[rgb(var(--sep-colour-59432c))]/40 px-4 py-3 text-[9px] uppercase tracking-[0.14em]">
              {hasOlderMessages ? (
                <Link
                  href={`/messages/${id}?page=${page + 1}`}
                  className="border border-[rgb(var(--sep-colour-59432c))] px-3 py-2"
                >
                  ← Older messages
                </Link>
              ) : <span />}

              {page > 1 ? (
                <Link
                  href={`/messages/${id}?page=${page - 1}`}
                  className="border border-[rgb(var(--sep-colour-59432c))] px-3 py-2"
                >
                  Newer messages →
                </Link>
              ) : null}
            </nav>
          ) : null}

          <ConversationMessageList
            conversationId={id}''',
    "PM pager UI",
)

write(p, t)
print("Patched direct-message pagination.")

# 3) Group PM pagination.
rel = "app/(portal)/messages/components/group-conversation-view.tsx"
p, t = read(rel)

t = replace_once(
    t,
    '''  title,
}: {
  conversationId: string;
  viewerCharacterId: string;
  isDead: boolean;
  title: string | null;
}) {''',
    '''  title,
  page = 1,
}: {
  conversationId: string;
  viewerCharacterId: string;
  isDead: boolean;
  title: string | null;
  page?: number;
}) {
  const pageSize = 100;
  const messageFrom =
    (Math.max(1, page) - 1) *
    pageSize;
  const messageTo =
    messageFrom + pageSize;''',
    "group PM page props",
)

t = replace_once(
    t,
    '''      .limit(1000),''',
    '''      .range(
        messageFrom,
        messageTo,
      ),''',
    "group PM range",
)

t = replace_once(
    t,
    '''  const messages =
    (
      messagesResult.data ??
      []
    )
      .filter(
        (message) =>
          !deleted.has(
            message.id,
          ),
      )
      .reverse() as unknown as DirectMessage[];
''',
    '''  const fetchedMessages =
    (
      messagesResult.data ??
      []
    );

  const hasOlderMessages =
    fetchedMessages.length >
    pageSize;

  const messages =
    fetchedMessages
      .slice(0, pageSize)
      .filter(
        (message) =>
          !deleted.has(
            message.id,
          ),
      )
      .reverse() as unknown as DirectMessage[];
''',
    "group PM fetched page",
)

t = replace_once(
    t,
    '''          <ConversationMessageList
            conversationId={''',
    '''          {(page > 1 || hasOlderMessages) ? (
            <nav className="flex items-center justify-between gap-3 border-b border-[rgb(var(--sep-colour-59432c))]/40 px-4 py-3 text-[9px] uppercase tracking-[0.14em]">
              {hasOlderMessages ? (
                <Link
                  href={`/messages/${conversationId}?page=${page + 1}`}
                  className="border border-[rgb(var(--sep-colour-59432c))] px-3 py-2"
                >
                  ← Older messages
                </Link>
              ) : <span />}

              {page > 1 ? (
                <Link
                  href={`/messages/${conversationId}?page=${page - 1}`}
                  className="border border-[rgb(var(--sep-colour-59432c))] px-3 py-2"
                >
                  Newer messages →
                </Link>
              ) : null}
            </nav>
          ) : null}

          <ConversationMessageList
            conversationId={''',
    "group PM pager UI",
)

write(p, t)
print("Patched group-message pagination.")

# 4) Forum: 50 posts per page.
rel = "app/(portal)/forum/[sectionSlug]/[topicSlug]/page.tsx"
p, t = read(rel)

t = replace_once(
    t,
    '''  searchParams: Promise<{
    quote?: string;
  }>;
};''',
    '''  searchParams: Promise<{
    quote?: string;
    page?: string;
  }>;
};

const FORUM_POST_PAGE_SIZE = 50;''',
    "forum pagination props",
)

t = replace_once(
    t,
    '''  const {
    quote: requestedQuoteId,
  } = await searchParams;
''',
    '''  const {
    quote: requestedQuoteId,
    page: pageParam,
  } = await searchParams;

  const page =
    Math.max(
      1,
      Number.parseInt(
        pageParam ?? "1",
        10,
      ) || 1,
    );

  const postFrom =
    (page - 1) *
    FORUM_POST_PAGE_SIZE;

  const postTo =
    postFrom +
    FORUM_POST_PAGE_SIZE;
''',
    "forum page calculation",
)

t = replace_once(
    t,
    '''    .eq("topic_id", topic.id)
    .order("created_at", {
      ascending: true,
    });''',
    '''    .eq("topic_id", topic.id)
    .order("created_at", {
      ascending: true,
    })
    .range(
      postFrom,
      postTo,
    );''',
    "forum post range",
)

t = replace_once(
    t,
    '''  const posts =
    (postRecords ??
      []) as ForumPostRecord[];

  if (posts.length === 0) {
''',
    '''  const fetchedPosts =
    (postRecords ??
      []) as ForumPostRecord[];

  const hasNextPage =
    fetchedPosts.length >
    FORUM_POST_PAGE_SIZE;

  const posts =
    fetchedPosts.slice(
      0,
      FORUM_POST_PAGE_SIZE,
    );

  if (posts.length === 0) {
''',
    "forum fetched page",
)

t = t.replace(
    '''            value={mappedPosts.length}''',
    '''            value={
              normalizeCount(
                topic.replies_count,
              ) + 1
            }''',
    1,
)
t = t.replace(
    '''            value={visibleReplyCount}''',
    '''            value={
              normalizeCount(
                topic.replies_count,
              )
            }''',
    1,
)

t = replace_once(
    t,
    '''      <section
        id="reply"''',
    '''      {(page > 1 || hasNextPage) ? (
        <nav className="mt-6 flex items-center justify-between gap-3 text-[9px] uppercase tracking-[0.14em]">
          {page > 1 ? (
            <Link
              href={`/forum/${section.slug}/${topic.slug}?page=${page - 1}`}
              className="border border-[rgb(var(--sep-colour-60482e))]/45 px-4 py-2"
            >
              ← Previous page
            </Link>
          ) : <span />}

          {hasNextPage ? (
            <Link
              href={`/forum/${section.slug}/${topic.slug}?page=${page + 1}`}
              className="border border-[rgb(var(--sep-colour-60482e))]/45 px-4 py-2"
            >
              Next page →
            </Link>
          ) : null}
        </nav>
      ) : null}

      <section
        id="reply"''',
    "forum pager UI",
)

write(p, t)
print("Patched forum pagination.")

# 5) Market N+1: batch all container child checks into 2 queries total.
rel = "app/(portal)/market/[slug]/page.tsx"
p, t = read(rel)

t = replace_once(
    t,
    '''  const sellableByItem = new Map<string, number>();

  for (
    const row of
      (inventoryRows ?? []) as Array<{
        record_kind: string;
        item_id: string;
        quantity: number;
        parent_container_id: string | null;
        is_equipped: boolean;
        transfer_policy: string;
        is_quest_item: boolean;
        container_capacity: number | null;
        record_id: string;
      }>
  ) {
''',
    '''  const sellableByItem = new Map<string, number>();

  const inventory =
    (inventoryRows ?? []) as Array<{
      record_kind: string;
      item_id: string;
      quantity: number;
      parent_container_id: string | null;
      is_equipped: boolean;
      transfer_policy: string;
      is_quest_item: boolean;
      container_capacity: number | null;
      record_id: string;
    }>;

  const containerIds =
    inventory
      .filter(
        (row) =>
          row.record_kind === "unique" &&
          row.container_capacity !== null &&
          !row.parent_container_id &&
          !row.is_equipped &&
          row.transfer_policy === "free" &&
          !row.is_quest_item,
      )
      .map((row) => row.record_id);

  const nonEmptyContainerIds =
    new Set<string>();

  if (containerIds.length > 0) {
    const [
      standardChildrenResult,
      instanceChildrenResult,
    ] = await Promise.all([
      supabase
        .from("character_items")
        .select("container_instance_id")
        .in(
          "container_instance_id",
          containerIds,
        ),
      supabase
        .from("character_item_instances")
        .select("container_instance_id")
        .in(
          "container_instance_id",
          containerIds,
        ),
    ]);

    for (
      const child of
        standardChildrenResult.data ?? []
    ) {
      if (child.container_instance_id) {
        nonEmptyContainerIds.add(
          String(
            child.container_instance_id,
          ),
        );
      }
    }

    for (
      const child of
        instanceChildrenResult.data ?? []
    ) {
      if (child.container_instance_id) {
        nonEmptyContainerIds.add(
          String(
            child.container_instance_id,
          ),
        );
      }
    }
  }

  for (const row of inventory) {
''',
    "market inventory batching",
)

t = replace_once(
    t,
    '''    if (ordinaryContainer) {
      const [{ count: standardChildren }, { count: instanceChildren }] =
        await Promise.all([
          supabase
            .from("character_items")
            .select("id", { count: "exact", head: true })
            .eq("container_instance_id", row.record_id),
          supabase
            .from("character_item_instances")
            .select("id", { count: "exact", head: true })
            .eq("container_instance_id", row.record_id),
        ]);

      if (
        (standardChildren ?? 0) > 0 ||
        (instanceChildren ?? 0) > 0
      ) {
        continue;
      }
    }
''',
    '''    if (
      ordinaryContainer &&
      nonEmptyContainerIds.has(
        row.record_id,
      )
    ) {
      continue;
    }
''',
    "market N+1 removal",
)

write(p, t)
print("Patched market N+1.")

# 6) Presence/realtime: keep Realtime; make polling a fallback instead of hammering DB.
changes = {
    "components/friends/friend-live-presence.tsx": [
        ("const REFRESH_INTERVAL_MS = 5_000;", "const REFRESH_INTERVAL_MS = 30_000;"),
    ],
    "components/portal/active-city-counter.tsx": [
        ("const REFRESH_INTERVAL_MS = 5_000;", "const REFRESH_INTERVAL_MS = 30_000;"),
    ],
    "components/portal/live-dashboard-chronicle.tsx": [
        ("const REFRESH_INTERVAL_MS = 30_000;", "const REFRESH_INTERVAL_MS = 60_000;"),
    ],
    "components/portal/compact-city-activity.tsx": [
        ("const REFRESH_INTERVAL_MS =\n  20_000;", "const REFRESH_INTERVAL_MS =\n  60_000;"),
    ],
    "components/instant-chat/instant-chat-dock.tsx": [
        ("        10_000,\n      );", "        30_000,\n      );"),
    ],
    "components/portal/game-context-panel.tsx": [
        ("      }, 5_000);", "      }, 30_000);"),
    ],
}

for rel, replacements in changes.items():
    p, t = read(rel)
    changed = False
    for old, new in replacements:
        if old in t:
            t = t.replace(old, new, 1)
            changed = True
        else:
            print(f"WARNING: polling pattern not found in {rel}")
    if changed:
        write(p, t)
        print(f"Reduced polling in {rel}.")

print("")
print("Phase 8.12 high-impact patch applied.")
print("Run phase_8_12_performance.sql in Supabase BEFORE testing /messages.")
print("Then run:")
print("  npm run typecheck")
print("  npm run build")
