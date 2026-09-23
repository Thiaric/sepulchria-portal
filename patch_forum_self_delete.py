from pathlib import Path

path = Path(r'app/(portal)/forum/[sectionSlug]/[topicSlug]/page.tsx')

text = path.read_text(encoding='utf-8')
original = text

old = '''        .eq(
  "action",
  "delete_post",
)
        .order("created_at", {
          ascending: false,
        })'''

new = '''        .in(
          "action",
          [
            "delete_post",
            "restore_post",
          ],
        )
        .order("created_at", {
          ascending: false,
        })'''

if old in text:
    text = text.replace(old, new, 1)

old = '''const moderationReasonMap =
  new Map<string, string>();

for (const log of moderationLogs) {
  if (
    !log.post_id ||
    moderationReasonMap.has(
      log.post_id,
    )
  ) {
    continue;
  }

  const reason =
    log.details?.reason?.trim();

  if (reason) {
    moderationReasonMap.set(
      log.post_id,
      reason,
    );
  }
}'''

new = '''const moderationReasonMap =
  new Map<string, string>();

const moderatedDeletedPostIds =
  new Set<string>();

const latestModerationActionByPost =
  new Set<string>();

for (const log of moderationLogs) {
  if (
    !log.post_id ||
    latestModerationActionByPost.has(
      log.post_id,
    )
  ) {
    continue;
  }

  latestModerationActionByPost.add(
    log.post_id,
  );

  if (log.action !== "delete_post") {
    continue;
  }

  moderatedDeletedPostIds.add(
    log.post_id,
  );

  const reason =
    log.details?.reason?.trim();

  if (reason) {
    moderationReasonMap.set(
      log.post_id,
      reason,
    );
  }
}'''

if old in text:
    text = text.replace(old, new, 1)

old = '''  const mappedPosts: ForumTopicPost[] =
    posts.map((post) => {'''

new = '''  const visiblePosts =
    posts.filter(
      (post) =>
        !post.deleted_at ||
        moderatedDeletedPostIds.has(
          post.id,
        ),
    );

  const mappedPosts: ForumTopicPost[] =
    visiblePosts.map((post) => {'''

if old in text:
    text = text.replace(old, new, 1)

if text == original:
    print("No changes made. Patch may already be applied, or source differs.")
else:
    path.write_text(text, encoding='utf-8')
    print(f"Patched: {path}")
