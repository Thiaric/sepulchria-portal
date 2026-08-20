import "server-only";

import { createClient as createAdminClient } from "@supabase/supabase-js";
import { getStaffSession } from "@/lib/auth/require-staff";

export type OrderHeadquartersTheme = {
  backgroundColour: string;
  speechColour: string;
  actionColour: string;
  systemColour: string;
  whisperBackgroundColour: string;
  whisperTextColour: string;
  offgameBackgroundColour: string;
  offgameTextColour: string;
};

export type OrderHeadquartersAccess = {
  isHeadquarters: boolean;
  allowed: boolean;
  enabled: boolean;
  orderId: string | null;
  headquartersId: string | null;
  level: number | null;
  isStaff: boolean;
  canInvite: boolean;
  canCustomize: boolean;
  theme: OrderHeadquartersTheme | null;
};

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secret) throw new Error("Missing Supabase server configuration.");

  return createAdminClient(url, secret, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function asOne<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? value[0] ?? null : value;
}

function themeFrom(row: any): OrderHeadquartersTheme {
  return {
    backgroundColour: row.background_colour,
    speechColour: row.speech_colour,
    actionColour: row.action_colour,
    systemColour: row.system_colour,
    whisperBackgroundColour: row.whisper_background_colour,
    whisperTextColour: row.whisper_text_colour,
    offgameBackgroundColour: row.offgame_background_colour,
    offgameTextColour: row.offgame_text_colour,
  };
}

async function getMembershipLevel(characterId: string, orderId: string) {
  const admin = adminClient();

  const { data, error } = await admin
    .from("order_memberships")
    .select(`level:order_levels!order_memberships_order_level_id_fkey(level)`)
    .eq("character_id", characterId)
    .eq("order_id", orderId)
    .maybeSingle();

  if (error) throw new Error(`Unable to verify Order membership: ${error.message}`);

  return asOne(data?.level ?? null)?.level ?? null;
}

export async function getOrderHeadquartersAccess(
  roomId: string,
  characterId: string,
): Promise<OrderHeadquartersAccess> {
  const admin = adminClient();

  const { data: hq, error } = await admin
    .from("order_headquarters")
    .select(`
      id, order_id, room_id,
      background_colour, speech_colour, action_colour, system_colour,
      whisper_background_colour, whisper_text_colour,
      offgame_background_colour, offgame_text_colour,
      room:rooms!order_headquarters_room_id_fkey(is_active)
    `)
    .eq("room_id", roomId)
    .maybeSingle();

  if (error) throw new Error(`Unable to inspect Order Headquarters: ${error.message}`);

  if (!hq) {
    return {
      isHeadquarters: false, allowed: true, enabled: true,
      orderId: null, headquartersId: null, level: null,
      isStaff: false, canInvite: false, canCustomize: false, theme: null,
    };
  }

  const room = asOne(hq.room);
  const enabled = room?.is_active === true;
  const staff = await getStaffSession();
  const isStaff = staff !== null;
  const level = await getMembershipLevel(characterId, hq.order_id);

  let externalAccess = false;

  if (enabled && !isStaff && level === null) {
    const now = new Date().toISOString();
    const { data: invitation, error: invitationError } = await admin
      .from("order_headquarters_invitations")
      .select("id")
      .eq("headquarters_id", hq.id)
      .eq("recipient_character_id", characterId)
      .eq("status", "accepted")
      .or(`expires_at.is.null,expires_at.gt.${now}`)
      .limit(1)
      .maybeSingle();

    if (invitationError) throw new Error(invitationError.message);
    externalAccess = Boolean(invitation);
  }

  return {
    isHeadquarters: true,
    allowed: enabled && (isStaff || level !== null || externalAccess),
    enabled,
    orderId: hq.order_id,
    headquartersId: hq.id,
    level,
    isStaff,
    canInvite: isStaff || level === 6 || level === 5,
    canCustomize: isStaff || level === 6,
    theme: themeFrom(hq),
  };
}

export async function getOrderHeadquartersVisibility(characterId: string) {
  const admin = adminClient();
  const staff = await getStaffSession();

  const { data: rows, error } = await admin
    .from("order_headquarters")
    .select(`id, order_id, room_id, room:rooms!order_headquarters_room_id_fkey(is_active)`);

  if (error) throw new Error(error.message);

  const allRows = rows ?? [];
  const allRoomIds = allRows.map((r) => r.room_id as string);

  if (staff) {
    return {
      allRoomIds,
      visibleRoomIds: allRows
        .filter((r) => asOne(r.room)?.is_active === true)
        .map((r) => r.room_id as string),
    };
  }

  const { data: memberships, error: membershipError } = await admin
    .from("order_memberships")
    .select("order_id")
    .eq("character_id", characterId);

  if (membershipError) throw new Error(membershipError.message);

  const memberOrderIds = new Set((memberships ?? []).map((m) => m.order_id as string));

  const { data: invites, error: inviteError } = await admin
    .from("order_headquarters_invitations")
    .select("headquarters_id, expires_at")
    .eq("recipient_character_id", characterId)
    .eq("status", "accepted");

  if (inviteError) throw new Error(inviteError.message);

  const now = Date.now();
  const inviteHqIds = new Set(
    (invites ?? [])
      .filter((i) => !i.expires_at || Date.parse(i.expires_at) > now)
      .map((i) => i.headquarters_id as string),
  );

  return {
    allRoomIds,
    visibleRoomIds: allRows
      .filter((r) =>
        asOne(r.room)?.is_active === true &&
        (memberOrderIds.has(r.order_id) || inviteHqIds.has(r.id))
      )
      .map((r) => r.room_id as string),
  };
}

export async function getOrderHeadquartersManageData(
  roomId: string,
  characterId: string,
) {
  const access = await getOrderHeadquartersAccess(roomId, characterId);

  if (!access.isHeadquarters || (!access.canInvite && !access.canCustomize)) {
    return null;
  }

  const admin = adminClient();

  const { data: hq, error } = await admin
    .from("order_headquarters")
    .select(`
      id, order_id, room_id,
      background_colour, speech_colour, action_colour, system_colour,
      whisper_background_colour, whisper_text_colour,
      offgame_background_colour, offgame_text_colour,
      room:rooms!order_headquarters_room_id_fkey(name,description,image_url),
      order:orders!order_headquarters_order_id_fkey(name)
    `)
    .eq("room_id", roomId)
    .single();

  if (error) throw new Error(error.message);

  const room = asOne(hq.room);
  const order = asOne(hq.order);

  const { data: members } = await admin
    .from("order_memberships")
    .select("character_id")
    .eq("order_id", hq.order_id);

  const memberIds = new Set((members ?? []).map((m) => m.character_id as string));

  const { data: invitations, error: invitationError } = await admin
    .from("order_headquarters_invitations")
    .select(`
      id, recipient_character_id, status, expires_at,
      recipient:characters!order_headquarters_invitations_recipient_character_id_fkey(
        display_name, first_name, surname
      )
    `)
    .eq("headquarters_id", hq.id)
    .in("status", ["pending", "accepted"]);

  if (invitationError) throw new Error(invitationError.message);

  const inviteeIds = new Set((invitations ?? []).map((i) => i.recipient_character_id as string));

  const { data: characters, error: characterError } = await admin
    .from("characters")
    .select("id, display_name, first_name, surname")
    .eq("status", "approved")
      .eq("is_system", false);

  if (characterError) throw new Error(characterError.message);

  const nameOf = (c: any) =>
    c.display_name?.trim() ||
    `${c.first_name ?? ""} ${c.surname ?? ""}`.trim() ||
    "Unknown";

  const candidates = (characters ?? [])
    .filter((c) => c.id !== characterId && !memberIds.has(c.id) && !inviteeIds.has(c.id))
    .map((c) => ({ id: c.id, name: nameOf(c) }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const externalGuests = (invitations ?? []).map((i) => ({
    invitationId: i.id,
    characterId: i.recipient_character_id,
    name: nameOf(asOne(i.recipient) ?? {}),
    status: i.status,
    expiresAt: i.expires_at,
  }));

  return {
    headquartersId: hq.id,
    roomId: hq.room_id,
    orderId: hq.order_id,
    orderName: order?.name ?? "Order",
    roomName: room?.name ?? "Headquarters",
    description: room?.description ?? null,
    imageUrl: room?.image_url ?? null,
    canInvite: access.canInvite,
    canCustomize: access.canCustomize,
    isStaff: access.isStaff,
    level: access.level,
    theme: themeFrom(hq),
    candidates,
    externalGuests,
  };
}
