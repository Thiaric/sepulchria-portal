"use server";

import { revalidatePath } from "next/cache";

import { requireStaff } from "@/lib/auth/require-staff";
import { sanitizeRichHtml } from "@/lib/rich-text";
import { createClient } from "@/lib/supabase/server";

function readRequiredUuid(
  value: FormDataEntryValue | null,
  fieldName: string,
): string {
  if (
    typeof value !== "string" ||
    value.trim() === ""
  ) {
    throw new Error(`${fieldName} is required.`);
  }

  const trimmed = value.trim();

  const uuidPattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  if (!uuidPattern.test(trimmed)) {
    throw new Error(
      `${fieldName} is invalid.`,
    );
  }

  return trimmed;
}

function readRequiredText(
  value: FormDataEntryValue | null,
  fieldName: string,
  maxLength: number,
): string {
  if (typeof value !== "string") {
    throw new Error(
      `${fieldName} is required.`,
    );
  }

  const trimmed = value.trim();

  if (!trimmed) {
    throw new Error(
      `${fieldName} is required.`,
    );
  }

  return trimmed.slice(0, maxLength);
}

function readOptionalText(
  value: FormDataEntryValue | null,
  maxLength: number,
): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  return trimmed.slice(0, maxLength);
}

function readSortOrder(
  value: FormDataEntryValue | null,
): number {
  if (
    typeof value !== "string" ||
    value.trim() === ""
  ) {
    return 0;
  }

  const parsed = Number.parseInt(
    value.trim(),
    10,
  );

  if (!Number.isFinite(parsed)) {
    throw new Error(
      "Sort order must be a valid number.",
    );
  }

  return Math.max(
    -9999,
    Math.min(9999, parsed),
  );
}

function readCheckbox(
  value: FormDataEntryValue | null,
): boolean {
  return (
    value === "on" ||
    value === "true"
  );
}

function normaliseSlug(
  value: string,
): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);
}

function readSlug(
  value: FormDataEntryValue | null,
  fallbackName: string,
): string {
  const submitted =
    typeof value === "string"
      ? value.trim()
      : "";

  const slug = normaliseSlug(
    submitted || fallbackName,
  );

  if (!slug) {
    throw new Error(
      "A valid room slug could not be generated.",
    );
  }

  return slug;
}

function refreshRoomPages() {
  revalidatePath("/admin");
  revalidatePath("/admin/rooms");
  revalidatePath("/admin/areas");
  revalidatePath("/");
}

async function assertAreaExists(
  areaId: string,
) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("areas")
    .select("id")
    .eq("id", areaId)
    .maybeSingle();

  if (error) {
    throw new Error(
      `Unable to verify the area: ${error.message}`,
    );
  }

  if (!data) {
    throw new Error(
      "The selected area does not exist.",
    );
  }
}

async function assertRoomExists(
  roomId: string,
) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("rooms")
    .select("id")
    .eq("id", roomId)
    .maybeSingle();

  if (error) {
    throw new Error(
      `Unable to verify the room: ${error.message}`,
    );
  }

  if (!data) {
    throw new Error(
      "The selected room does not exist.",
    );
  }
}

async function assertUniqueSlug(
  slug: string,
  excludedRoomId?: string,
) {
  const supabase = await createClient();

  let query = supabase
    .from("rooms")
    .select("id")
    .eq("slug", slug)
    .limit(1);

  if (excludedRoomId) {
    query = query.neq(
      "id",
      excludedRoomId,
    );
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(
      `Unable to verify the room slug: ${error.message}`,
    );
  }

  if (data && data.length > 0) {
    throw new Error(
      "Another room already uses this slug.",
    );
  }
}

export async function createRoom(
  formData: FormData,
) {
  await requireStaff();

  const areaId = readRequiredUuid(
    formData.get("areaId"),
    "Area",
  );

  const name = readRequiredText(
    formData.get("name"),
    "Room name",
    120,
  );

  const slug = readSlug(
    formData.get("slug"),
    name,
  );

  const descriptionRaw = readOptionalText(
    formData.get("description"),
    100000,
  );

  const description = descriptionRaw
    ? sanitizeRichHtml(descriptionRaw) || null
    : null;

  const imageUrl = readOptionalText(
    formData.get("imageUrl"),
    2000,
  );

  const sortOrder = readSortOrder(
    formData.get("sortOrder"),
  );

  const isActive = readCheckbox(
    formData.get("isActive"),
  );

  const isOutdoors = readCheckbox(
  formData.get("isOutdoors"),
);

  const chatEnabled = readCheckbox(
    formData.get("chatEnabled"),
  );

  await assertAreaExists(areaId);
  await assertUniqueSlug(slug);

  const supabase = await createClient();

  const { error } = await supabase
    .from("rooms")
    .insert({
  area_id: areaId,
  name,
  slug,
  description,
  image_url: imageUrl,
  sort_order: sortOrder,
  is_active: isActive,
  is_outdoors: isOutdoors,
  chat_enabled: chatEnabled,
  updated_at: new Date().toISOString(),
});

  if (error) {
    throw new Error(
      `Unable to create room: ${error.message}`,
    );
  }

  refreshRoomPages();
}

export async function updateRoom(
  formData: FormData,
) {
  await requireStaff();

  const roomId = readRequiredUuid(
    formData.get("roomId"),
    "Room",
  );

  const areaId = readRequiredUuid(
    formData.get("areaId"),
    "Area",
  );

  const name = readRequiredText(
    formData.get("name"),
    "Room name",
    120,
  );

  const slug = readSlug(
    formData.get("slug"),
    name,
  );

  const descriptionRaw = readOptionalText(
    formData.get("description"),
    100000,
  );

  const description = descriptionRaw
    ? sanitizeRichHtml(descriptionRaw) || null
    : null;

  const imageUrl = readOptionalText(
    formData.get("imageUrl"),
    2000,
  );

  const sortOrder = readSortOrder(
    formData.get("sortOrder"),
  );

  const isActive = readCheckbox(
    formData.get("isActive"),
  );

  const isOutdoors = readCheckbox(
  formData.get("isOutdoors"),
);

  const chatEnabled = readCheckbox(
    formData.get("chatEnabled"),
  );

  await assertRoomExists(roomId);
  await assertAreaExists(areaId);
  await assertUniqueSlug(
    slug,
    roomId,
  );

  const supabase = await createClient();

  const { error } = await supabase
    .from("rooms")
    .update({
  area_id: areaId,
  name,
  slug,
  description,
  image_url: imageUrl,
  sort_order: sortOrder,
  is_active: isActive,
  is_outdoors: isOutdoors,
  chat_enabled: chatEnabled,
  updated_at: new Date().toISOString(),
})
    .eq("id", roomId);

  if (error) {
    throw new Error(
      `Unable to update room: ${error.message}`,
    );
  }

  refreshRoomPages();
}

export async function deleteRoom(
  formData: FormData,
) {
  await requireStaff();

  const roomId = readRequiredUuid(
    formData.get("roomId"),
    "Room",
  );

  const confirmation =
    typeof formData.get("confirmation") ===
    "string"
      ? String(
          formData.get("confirmation"),
        )
          .trim()
          .toUpperCase()
      : "";

  if (confirmation !== "DELETE") {
    throw new Error(
      'Type "DELETE" to confirm room deletion.',
    );
  }

  const supabase = await createClient();

  const [
    charactersResult,
    presenceResult,
    messagesResult,
    outgoingConnectionsResult,
    incomingConnectionsResult,
  ] = await Promise.all([
    supabase
      .from("characters")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq("current_room_id", roomId),

    supabase
      .from("character_presence")
      .select("room_id", {
        count: "exact",
        head: true,
      })
      .eq("room_id", roomId),

    supabase
      .from("room_messages")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq("room_id", roomId),

    supabase
      .from("room_connections")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq("from_room_id", roomId),

    supabase
      .from("room_connections")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq("to_room_id", roomId),
  ]);

  const firstError =
    charactersResult.error ??
    presenceResult.error ??
    messagesResult.error ??
    outgoingConnectionsResult.error ??
    incomingConnectionsResult.error;

  if (firstError) {
    throw new Error(
      `Unable to inspect room dependencies: ${firstError.message}`,
    );
  }

  const characterCount =
    charactersResult.count ?? 0;

  const presenceCount =
    presenceResult.count ?? 0;

  const messageCount =
    messagesResult.count ?? 0;

  const connectionCount =
    (outgoingConnectionsResult.count ??
      0) +
    (incomingConnectionsResult.count ??
      0);

  if (characterCount > 0) {
    throw new Error(
      `This room cannot be deleted because ${characterCount} ${
        characterCount === 1
          ? "character is"
          : "characters are"
      } currently assigned to it.`,
    );
  }

  if (presenceCount > 0) {
    throw new Error(
      "This room cannot be deleted while character presence records still refer to it.",
    );
  }

  if (messageCount > 0) {
    throw new Error(
      `This room cannot be deleted because it contains ${messageCount} ${
        messageCount === 1
          ? "message"
          : "messages"
      }.`,
    );
  }

  if (connectionCount > 0) {
    throw new Error(
      `This room cannot be deleted because it still has ${connectionCount} ${
        connectionCount === 1
          ? "connection"
          : "connections"
      }. Remove them first.`,
    );
  }

  const { error } = await supabase
    .from("rooms")
    .delete()
    .eq("id", roomId);

  if (error) {
    throw new Error(
      `Unable to delete room: ${error.message}`,
    );
  }

  refreshRoomPages();
}

export async function createRoomConnection(
  formData: FormData,
) {
  await requireStaff();

  const fromRoomId =
    readRequiredUuid(
      formData.get("fromRoomId"),
      "Starting room",
    );

  const toRoomId =
    readRequiredUuid(
      formData.get("toRoomId"),
      "Destination room",
    );

  if (fromRoomId === toRoomId) {
    throw new Error(
      "A room cannot be connected to itself.",
    );
  }

  const connectionName =
    readOptionalText(
      formData.get("connectionName"),
      120,
    );

  const isTwoWay = readCheckbox(
    formData.get("isTwoWay"),
  );

  const sortOrder = readSortOrder(
    formData.get("sortOrder"),
  );

  await assertRoomExists(fromRoomId);
  await assertRoomExists(toRoomId);

  const supabase = await createClient();

  const {
    data: existingConnection,
    error: existingError,
  } = await supabase
    .from("room_connections")
    .select("id")
    .eq("from_room_id", fromRoomId)
    .eq("to_room_id", toRoomId)
    .maybeSingle();

  if (existingError) {
    throw new Error(
      `Unable to inspect room connections: ${existingError.message}`,
    );
  }

  if (existingConnection) {
    throw new Error(
      "This connection already exists.",
    );
  }

  const { error } = await supabase
    .from("room_connections")
    .insert({
      from_room_id: fromRoomId,
      to_room_id: toRoomId,
      connection_name: connectionName,
      is_two_way: isTwoWay,
      sort_order: sortOrder,
    });

  if (error) {
    throw new Error(
      `Unable to create connection: ${error.message}`,
    );
  }

  refreshRoomPages();
}

export async function updateRoomConnection(
  formData: FormData,
) {
  await requireStaff();

  const connectionId =
    readRequiredUuid(
      formData.get("connectionId"),
      "Connection",
    );

  const connectionName =
    readOptionalText(
      formData.get("connectionName"),
      120,
    );

  const isTwoWay = readCheckbox(
    formData.get("isTwoWay"),
  );

  const sortOrder = readSortOrder(
    formData.get("sortOrder"),
  );

  const supabase = await createClient();

  const { error } = await supabase
    .from("room_connections")
    .update({
      connection_name: connectionName,
      is_two_way: isTwoWay,
      sort_order: sortOrder,
    })
    .eq("id", connectionId);

  if (error) {
    throw new Error(
      `Unable to update connection: ${error.message}`,
    );
  }

  refreshRoomPages();
}

export async function deleteRoomConnection(
  formData: FormData,
) {
  await requireStaff();

  const connectionId =
    readRequiredUuid(
      formData.get("connectionId"),
      "Connection",
    );

  const supabase = await createClient();

  const { error } = await supabase
    .from("room_connections")
    .delete()
    .eq("id", connectionId);

  if (error) {
    throw new Error(
      `Unable to delete connection: ${error.message}`,
    );
  }

  refreshRoomPages();
}