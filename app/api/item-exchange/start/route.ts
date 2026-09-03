import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function notificationExpiry() {
  return new Date(
    Date.now() +
      7 * 24 * 60 * 60 * 1000,
  ).toISOString();
}

export async function POST(
  request: Request,
) {
  const supabase =
    await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      {
        error:
          "You must be signed in to start an Item Exchange.",
      },
      { status: 401 },
    );
  }

  const body =
    (await request.json().catch(
      () => null,
    )) as
      | {
          other?: unknown;
        }
      | null;

  const other =
    typeof body?.other === "string"
      ? body.other.trim()
      : "";

  if (!other) {
    return NextResponse.json(
      {
        error:
          "Choose a character for the Item Exchange.",
      },
      { status: 400 },
    );
  }

  const {
    data: me,
    error: meError,
  } = await supabase
    .from("characters")
    .select(
      "id, display_name, status",
    )
    .eq("user_id", user.id)
    .maybeSingle();

  if (
    meError ||
    !me ||
    me.status !== "approved"
  ) {
    return NextResponse.json(
      {
        error:
          meError?.message ??
          "Unable to identify your approved character.",
      },
      { status: 400 },
    );
  }

  if (other === me.id) {
    return NextResponse.json(
      {
        error:
          "You cannot start an Item Exchange with yourself.",
      },
      { status: 400 },
    );
  }

  const {
    error: createError,
  } = await supabase.rpc(
    "create_item_trade",
    {
      other,
    },
  );

  if (createError) {
    return NextResponse.json(
      {
        error: createError.message,
      },
      { status: 400 },
    );
  }

  const {
    data: trade,
    error: tradeError,
  } = await supabase
    .from("item_trades")
    .select(
      "id, character_one_id, character_two_id, status, created_at",
    )
    .eq(
      "character_one_id",
      me.id,
    )
    .eq(
      "character_two_id",
      other,
    )
    .eq("status", "open")
    .order(
      "created_at",
      { ascending: false },
    )
    .limit(1)
    .maybeSingle();

  if (tradeError || !trade) {
    return NextResponse.json(
      {
        error:
          tradeError?.message ??
          "The Item Exchange opened, but its record could not be identified.",
      },
      { status: 500 },
    );
  }

  const tradeId = trade.id;

  async function cancelCreatedTrade() {
    try {
      await supabase.rpc(
        "cancel_item_trade",
        {
          tid: tradeId,
        },
      );
    } catch {
      // Best-effort rollback.
    }
  }

  const admin =
    createAdminClient();

  const {
    data: recipient,
    error: recipientError,
  } = await admin
    .from("characters")
    .select("id, display_name")
    .eq("id", other)
    .maybeSingle();

  if (
    recipientError ||
    !recipient
  ) {
    await cancelCreatedTrade();

    return NextResponse.json(
      {
        error:
          recipientError?.message ??
          "Unable to identify the other character.",
      },
      { status: 500 },
    );
  }

  const {
    data: existing,
    error: existingError,
  } = await admin
    .from("notifications")
    .select("id")
    .eq(
      "source_type",
      "item_trade",
    )
    .eq(
      "source_id",
      trade.id,
    )
    .eq(
      "source_trigger",
      "opened",
    )
    .limit(1)
    .maybeSingle();

  if (existingError) {
    await cancelCreatedTrade();

    return NextResponse.json(
      {
        error:
          existingError.message,
      },
      { status: 500 },
    );
  }

  if (!existing) {
    const now =
      new Date().toISOString();

    const {
      data: notification,
      error: notificationError,
    } = await admin
      .from("notifications")
      .insert({
        type: "system",
        title:
          "Item Exchange request",
        body:
          `${me.display_name} has opened an Item Exchange with you. ` +
          "Open it while you are both still in the same location.",
        href:
          `/game?exchange=${encodeURIComponent(
            trade.id,
          )}`,
        starts_at: now,
        expires_at:
          notificationExpiry(),
        expires_game_at: null,
        created_by: user.id,
        is_automatic: true,
        source_type:
          "item_trade",
        source_id: trade.id,
        source_trigger:
          "opened",
        staff_overridden: false,
        is_active: true,
      })
      .select("id")
      .single();

    if (
      notificationError ||
      !notification
    ) {
      await cancelCreatedTrade();

      return NextResponse.json(
        {
          error:
            "The exchange could not be notified, so it was cancelled. " +
            (
              notificationError
                ?.message ??
              ""
            ),
        },
        { status: 500 },
      );
    }

    const {
      error: targetError,
    } = await admin
      .from(
        "notification_targets",
      )
      .insert({
        notification_id:
          notification.id,
        target_type:
          "character",
        target_id:
          recipient.id,
      });

    if (targetError) {
      await admin
        .from("notifications")
        .delete()
        .eq(
          "id",
          notification.id,
        );

      await cancelCreatedTrade();

      return NextResponse.json(
        {
          error:
            "The exchange could not be notified, so it was cancelled. " +
            targetError.message,
        },
        { status: 500 },
      );
    }

    const {
      error: readySignalError,
    } = await admin
      .from("notifications")
      .update({
        starts_at: now,
      })
      .eq(
        "id",
        notification.id,
      );

    if (readySignalError) {
      console.warn(
        "Item Exchange notification realtime signal:",
        readySignalError.message,
      );
    }
  }

  return NextResponse.json({
    tradeId: trade.id,
  });
}
