import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  createTargetedCharacterNotification,
} from "@/lib/notifications/create-targeted-character-notification";
import {
  assertOrdinaryInteractionTargetAllowed,
} from "@/lib/death/death-system";

export const dynamic = "force-dynamic";

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

  const targetAdmin =
    createAdminClient();

  const {
    data: npcTarget,
    error: npcTargetError,
  } = await targetAdmin
    .from("npcs")
    .select("id")
    .eq("character_id", other)
    .maybeSingle();

  if (npcTargetError) {
    return NextResponse.json(
      {
        error:
          npcTargetError.message,
      },
      { status: 500 },
    );
  }

  if (npcTarget) {
    return NextResponse.json(
      {
        error:
          "NPCs cannot take part in Item Exchanges. Use Give Item instead.",
      },
      { status: 400 },
    );
  }

  try {
    await Promise.all([
      assertOrdinaryInteractionTargetAllowed({
        targetCharacterId: me.id,
        interactionLabel: "Item Exchange",
      }),
      assertOrdinaryInteractionTargetAllowed({
        targetCharacterId: other,
        interactionLabel: "Item Exchange",
      }),
    ]);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Item Exchange is unavailable.",
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
    try {
      await createTargetedCharacterNotification({
        recipientCharacterId:
          recipient.id,
        title:
          "Item Exchange request",
        body:
          `${me.display_name} has opened an Item Exchange with you. ` +
          "Open it while you are both still in the same location.",
        href:
          `/game?exchange=${encodeURIComponent(
            trade.id,
          )}`,
        sourceType:
          "item_trade",
        sourceId:
          trade.id,
        sourceTrigger:
          "opened",
        createdByUserId:
          user.id,
      });
    } catch (error) {
      await cancelCreatedTrade();

      return NextResponse.json(
        {
          error:
            "The exchange could not be notified, so it was cancelled. " +
            (
              error instanceof Error
                ? error.message
                : ""
            ),
        },
        { status: 500 },
      );
    }
  }

  return NextResponse.json({
    tradeId: trade.id,
  });
}
