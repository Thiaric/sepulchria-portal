"use server";

import { randomUUID } from "node:crypto";

import { createClient } from "@/lib/supabase/server";
import {
  createTargetedCharacterNotification,
} from "@/lib/notifications/create-targeted-character-notification";

async function getGiftContext(
  recipientCharacterId: string,
) {
  const supabase =
    await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error(
      "You must be signed in.",
    );
  }

  const {
    data: sender,
    error: senderError,
  } = await supabase
    .from("characters")
    .select(
      "id, display_name, current_room_id, status, is_system",
    )
    .eq("user_id", user.id)
    .maybeSingle();

  if (
    senderError ||
    !sender ||
    sender.status !== "approved" ||
    sender.is_system === true
  ) {
    throw new Error(
      senderError?.message ??
        "Unable to identify your approved Character.",
    );
  }

  if (
    !recipientCharacterId ||
    recipientCharacterId ===
      sender.id
  ) {
    throw new Error(
      "Invalid gift recipient.",
    );
  }

  const {
    data: recipient,
    error: recipientError,
  } = await supabase
    .from("characters")
    .select(
      "id, display_name, current_room_id, status, is_system",
    )
    .eq(
      "id",
      recipientCharacterId,
    )
    .maybeSingle();

  if (
    recipientError ||
    !recipient ||
    recipient.status !== "approved"
  ) {
    throw new Error(
      recipientError?.message ??
        "Unable to identify the receiving Character.",
    );
  }

  if (recipient.is_system === true) {
    return null;
  }

  if (
    !sender.current_room_id ||
    sender.current_room_id !==
      recipient.current_room_id
  ) {
    throw new Error(
      "The receiving Character is no longer in your Location.",
    );
  }

  return {
    supabase,
    user,
    sender,
    recipient,
  };
}

export async function notifyItemGiftReceived({
  recipientCharacterId,
  itemId,
  quantity,
}: {
  recipientCharacterId: string;
  itemId: string;
  quantity: number;
}) {
  const context =
    await getGiftContext(
      recipientCharacterId,
    );

  if (!context) {
    return;
  }

  const safeQuantity =
    Math.max(
      1,
      Math.floor(
        Number(quantity) || 1,
      ),
    );

  const {
    data: item,
    error: itemError,
  } = await context.supabase
    .from("items")
    .select("id, name")
    .eq("id", itemId)
    .maybeSingle();

  if (
    itemError ||
    !item
  ) {
    throw new Error(
      itemError?.message ??
        "Unable to identify the transferred Item.",
    );
  }

  await createTargetedCharacterNotification({
    recipientCharacterId:
      context.recipient.id,
    title:
      "Item received",
    body:
      `${context.sender.display_name} gave you ` +
      `${safeQuantity > 1 ? `${safeQuantity} × ` : ""}${item.name}.`,
    href:
      `/character?tab=inventory&focusItem=${encodeURIComponent(
        item.id,
      )}`,
    sourceType:
      "item_gift",
    sourceId:
      randomUUID(),
    sourceTrigger:
      "received",
    createdByUserId:
      context.user.id,
  });
}

export async function notifyRemnantsGiftReceived({
  recipientCharacterId,
  amount,
}: {
  recipientCharacterId: string;
  amount: number;
}) {
  const context =
    await getGiftContext(
      recipientCharacterId,
    );

  if (!context) {
    return;
  }

  const safeAmount =
    Math.max(
      1,
      Math.floor(
        Number(amount) || 1,
      ),
    );

  await createTargetedCharacterNotification({
    recipientCharacterId:
      context.recipient.id,
    title:
      "Remnants received",
    body:
      `${context.sender.display_name} gave you ` +
      `${safeAmount.toLocaleString("en-GB")} Remnants.`,
    href:
      "/character?tab=ledger",
    sourceType:
      "remnant_gift",
    sourceId:
      randomUUID(),
    sourceTrigger:
      "received",
    createdByUserId:
      context.user.id,
  });
}
