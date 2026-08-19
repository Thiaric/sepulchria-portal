"use server";

import { createClient as createAdminClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getOrderHeadquartersAccess } from "@/lib/order-headquarters/access";
import { sanitizeRichHtml } from "@/lib/rich-text";
import { createClient } from "@/lib/supabase/server";

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secret) throw new Error("Missing Supabase server configuration.");
  return createAdminClient(url, secret, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function uuid(value: FormDataEntryValue | null) {
  const v = String(value ?? "").trim();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v)) {
    throw new Error("Invalid identifier.");
  }
  return v;
}

function text(value: FormDataEntryValue | null, max: number) {
  return String(value ?? "").trim().slice(0, max);
}

function colour(value: FormDataEntryValue | null, fallback: string) {
  const v = String(value ?? "").trim();
  return /^#[0-9a-f]{6}$/i.test(v) ? v : fallback;
}

async function currentCharacter() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: character, error } = await supabase
    .from("characters")
    .select("id,current_room_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error || !character) throw new Error(error?.message ?? "Character not found.");
  return character;
}

async function requirePermission(roomId: string, kind: "invite" | "customize") {
  const character = await currentCharacter();
  const access = await getOrderHeadquartersAccess(roomId, character.id);
  const allowed = kind === "invite" ? access.canInvite : access.canCustomize;

  if (!access.isHeadquarters || !allowed) {
    throw new Error("You do not have permission to manage this Headquarters.");
  }

  return { character, access, admin: adminClient() };
}

async function ensureConversation(
  admin: ReturnType<typeof adminClient>,
  first: string,
  second: string,
) {
  const { data: firstRows, error } = await admin
    .from("direct_conversation_participants")
    .select("conversation_id")
    .eq("character_id", first);

  if (error) throw new Error(error.message);

  const ids = (firstRows ?? []).map((row) => row.conversation_id as string);

  if (ids.length) {
    const { data: shared, error: sharedError } = await admin
      .from("direct_conversation_participants")
      .select("conversation_id")
      .eq("character_id", second)
      .in("conversation_id", ids)
      .limit(1)
      .maybeSingle();

    if (sharedError) throw new Error(sharedError.message);
    if (shared) return shared.conversation_id as string;
  }

  const { data: conversation, error: conversationError } = await admin
    .from("direct_conversations")
    .insert({})
    .select("id")
    .single();

  if (conversationError) throw new Error(conversationError.message);

  const { error: participantError } = await admin
    .from("direct_conversation_participants")
    .insert([
      { conversation_id: conversation.id, character_id: first },
      { conversation_id: conversation.id, character_id: second },
    ]);

  if (participantError) throw new Error(participantError.message);
  return conversation.id as string;
}

function duration(value: FormDataEntryValue | null) {
  const raw = String(value ?? "").trim();
  if (!raw || raw === "permanent") return null;

  const parsed = Number.parseInt(raw, 10);
  const allowed = [60, 360, 1440, 4320, 10080, 43200];
  if (!allowed.includes(parsed)) throw new Error("Invalid invitation duration.");
  return parsed;
}

export async function inviteOrderHeadquarters(formData: FormData) {
  const roomId = uuid(formData.get("roomId"));
  const recipientId = uuid(formData.get("recipientId"));
  const { character, access, admin } = await requirePermission(roomId, "invite");

  if (recipientId === character.id) throw new Error("You cannot invite yourself.");

  const { data: membership, error: membershipError } = await admin
    .from("order_memberships")
    .select("id")
    .eq("order_id", access.orderId!)
    .eq("character_id", recipientId)
    .maybeSingle();

  if (membershipError) throw new Error(membershipError.message);
  if (membership) throw new Error("Order members already have automatic access.");

  const { data: hq, error: hqError } = await admin
    .from("order_headquarters")
    .select(`id,room:rooms!order_headquarters_room_id_fkey(name)`)
    .eq("room_id", roomId)
    .single();

  if (hqError) throw new Error(hqError.message);

  const { data: presence } = await admin
    .from("character_presence")
    .select("status,last_seen_at")
    .eq("character_id", recipientId)
    .maybeSingle();

  const seen = presence?.last_seen_at ? Date.parse(presence.last_seen_at) : Number.NaN;
  const online =
    presence?.status === "online" &&
    Number.isFinite(seen) &&
    Date.now() - seen <= 120000;

  const customMessage = text(formData.get("customMessage"), 1200);
  const accessDuration = duration(formData.get("accessDuration"));

  const { data: invitation, error: invitationError } = await admin
    .from("order_headquarters_invitations")
    .insert({
      headquarters_id: hq.id,
      inviter_character_id: character.id,
      recipient_character_id: recipientId,
      custom_message: customMessage || null,
      access_duration_minutes: accessDuration,
      delivery_method: online ? "popup" : "message",
      status: "pending",
    })
    .select("id")
    .single();

  if (invitationError) throw new Error(invitationError.message);

  if (!online) {
    const conversationId = await ensureConversation(admin, character.id, recipientId);
    const roomRelation = hq.room;
    const room = Array.isArray(roomRelation) ? roomRelation[0] : roomRelation;

    const body =
      `<p>You have been invited to <strong>${room?.name ?? "an Order Headquarters"}</strong>.</p>` +
      (customMessage ? `<p>${customMessage}</p>` : "") +
      `<!--ORDER_HEADQUARTERS_INVITE:${invitation.id}-->`;

    const { error: messageError } = await admin
      .from("direct_messages")
      .insert({
        conversation_id: conversationId,
        sender_character_id: character.id,
        body,
        message_mode: "offgame",
        client_nonce: crypto.randomUUID(),
      });

    if (messageError) throw new Error(messageError.message);

    await admin
      .from("direct_conversations")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", conversationId);
  }

  revalidatePath("/game");
  revalidatePath("/messages");
}

export async function respondOrderHeadquartersInvitation(formData: FormData) {
  const invitationId = uuid(formData.get("invitationId"));
  const response = String(formData.get("response") ?? "").trim();

  if (response !== "accept" && response !== "refuse") {
    throw new Error("Invalid invitation response.");
  }

  const character = await currentCharacter();
  const admin = adminClient();

  const { data: invitation, error } = await admin
    .from("order_headquarters_invitations")
    .select(`
      id,recipient_character_id,status,access_duration_minutes,
      headquarters:order_headquarters!order_headquarters_invitations_headquarters_id_fkey(
        room_id,
        room:rooms!order_headquarters_room_id_fkey(is_active)
      )
    `)
    .eq("id", invitationId)
    .maybeSingle();

  if (
    error ||
    !invitation ||
    invitation.recipient_character_id !== character.id ||
    invitation.status !== "pending"
  ) {
    throw new Error(error?.message ?? "This invitation is no longer available.");
  }

  const relation = invitation.headquarters;
  const hq = Array.isArray(relation) ? relation[0] : relation;
  if (!hq) throw new Error("Headquarters not found.");

  const roomRelation = hq.room;
  const room = Array.isArray(roomRelation) ? roomRelation[0] : roomRelation;
  if (room?.is_active !== true) throw new Error("This Headquarters is currently disabled.");

  const now = new Date();
  const expiresAt =
    response === "accept" && invitation.access_duration_minutes
      ? new Date(now.getTime() + invitation.access_duration_minutes * 60000).toISOString()
      : null;

  const { error: updateError } = await admin
    .from("order_headquarters_invitations")
    .update({
      status: response === "accept" ? "accepted" : "refused",
      accepted_at: response === "accept" ? now.toISOString() : null,
      expires_at: expiresAt,
      responded_at: now.toISOString(),
    })
    .eq("id", invitationId);

  if (updateError) throw new Error(updateError.message);

  if (response === "accept") {
    const { error: moveError } = await admin
      .from("characters")
      .update({ current_room_id: hq.room_id })
      .eq("id", character.id);

    if (moveError) throw new Error(moveError.message);

    await admin
      .from("character_presence")
      .upsert(
        {
          character_id: character.id,
          room_id: hq.room_id,
          status: "online",
          last_seen_at: now.toISOString(),
        },
        { onConflict: "character_id" },
      );

    revalidatePath("/game");
    redirect("/game");
  }

  revalidatePath("/messages");
}

export async function revokeOrderHeadquartersGuest(formData: FormData) {
  const roomId = uuid(formData.get("roomId"));
  const invitationId = uuid(formData.get("invitationId"));
  const { admin } = await requirePermission(roomId, "invite");

  const { data: invitation, error } = await admin
    .from("order_headquarters_invitations")
    .select("recipient_character_id")
    .eq("id", invitationId)
    .maybeSingle();

  if (error || !invitation) throw new Error(error?.message ?? "Invitation not found.");

  const { error: revokeError } = await admin
    .from("order_headquarters_invitations")
    .update({ status: "revoked", responded_at: new Date().toISOString() })
    .eq("id", invitationId);

  if (revokeError) throw new Error(revokeError.message);

  const { data: target } = await admin
    .from("characters")
    .select("current_room_id")
    .eq("id", invitation.recipient_character_id)
    .maybeSingle();

  if (target?.current_room_id === roomId) {
    await admin.from("characters")
      .update({ current_room_id: null })
      .eq("id", invitation.recipient_character_id);

    await admin.from("character_presence")
      .update({ room_id: null })
      .eq("character_id", invitation.recipient_character_id);
  }

  revalidatePath("/game");
}

export async function updateOrderHeadquartersPresentation(formData: FormData) {
  const roomId = uuid(formData.get("roomId"));
  const { admin } = await requirePermission(roomId, "customize");

  const name = text(formData.get("name"), 120) || "Order Headquarters";
  const description = sanitizeRichHtml(String(formData.get("description") ?? "")) || null;
  const imageUrl = text(formData.get("imageUrl"), 2000);

  const { error: roomError } = await admin
    .from("rooms")
    .update({
      name,
      description,
      image_url: imageUrl || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", roomId);

  if (roomError) throw new Error(roomError.message);

  const { error: themeError } = await admin
    .from("order_headquarters")
    .update({
      background_colour: colour(formData.get("backgroundColour"), "#17110d"),
      speech_colour: colour(formData.get("speechColour"), "#d3c2aa"),
      action_colour: colour(formData.get("actionColour"), "#a98a60"),
      system_colour: colour(formData.get("systemColour"), "#c8b89f"),
      whisper_background_colour: colour(formData.get("whisperBackgroundColour"), "#241b2a"),
      whisper_text_colour: colour(formData.get("whisperTextColour"), "#c7add6"),
      offgame_background_colour: colour(formData.get("offgameBackgroundColour"), "#182536"),
      offgame_text_colour: colour(formData.get("offgameTextColour"), "#a9c7e6"),
      updated_at: new Date().toISOString(),
    })
    .eq("room_id", roomId);

  if (themeError) throw new Error(themeError.message);

  revalidatePath("/game");
}
