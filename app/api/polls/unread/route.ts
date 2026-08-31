import {
  NextRequest,
  NextResponse,
} from "next/server";

import { createClient } from "@/lib/supabase/server";
import {
  getUnreadOpenPollIds,
  markPollSeen,
} from "@/lib/polls/unread";

export const dynamic =
  "force-dynamic";

async function getUser() {
  const supabase =
    await createClient();

  const {
    data: { user },
  } =
    await supabase.auth.getUser();

  return user;
}

export async function GET() {
  const user =
    await getUser();

  if (!user) {
    return NextResponse.json(
      {
        ids: [],
        count: 0,
      },
      {
        status: 401,
      },
    );
  }

  try {
    const ids =
      await getUnreadOpenPollIds(
        user.id,
      );

    return NextResponse.json({
      ids,
      count: ids.length,
    });
  } catch (error) {
    console.error(
      "Unable to load unread Poll count:",
      error,
    );

    return NextResponse.json(
      {
        ids: [],
        count: 0,
      },
      {
        status: 500,
      },
    );
  }
}

export async function POST(
  request: NextRequest,
) {
  const user =
    await getUser();

  if (!user) {
    return NextResponse.json(
      {
        ok: false,
      },
      {
        status: 401,
      },
    );
  }

  const body =
    await request
      .json()
      .catch(() => null);

  const pollId =
    typeof body?.pollId ===
      "string"
      ? body.pollId.trim()
      : "";

  if (!pollId) {
    return NextResponse.json(
      {
        ok: false,
      },
      {
        status: 400,
      },
    );
  }

  try {
    const marked =
      await markPollSeen(
        user.id,
        pollId,
      );

    return NextResponse.json({
      ok: true,
      marked,
    });
  } catch (error) {
    console.error(
      "Unable to mark Poll as seen:",
      error,
    );

    return NextResponse.json(
      {
        ok: false,
      },
      {
        status: 500,
      },
    );
  }
}
