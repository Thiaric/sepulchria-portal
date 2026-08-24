import "server-only";

import {
  createClient,
} from "@/lib/supabase/server";

export async function getUnreadForumCount():
  Promise<number> {
  const supabase =
    await createClient();

  const {
    data,
    error,
  } = await supabase.rpc(
    "get_unread_forum_topic_count",
  );

  if (error) {
    return 0;
  }

  if (
    typeof data === "number" &&
    Number.isFinite(data)
  ) {
    return data;
  }

  if (typeof data === "string") {
    const parsed =
      Number.parseInt(data, 10);

    return Number.isFinite(parsed)
      ? parsed
      : 0;
  }

  return 0;
}
