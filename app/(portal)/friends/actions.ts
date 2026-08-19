"use server";

import {
  createClient as createAdminClient,
} from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  hasCharacterFeature,
} from "@/lib/features/character-feature-entitlements";
import { createClient } from "@/lib/supabase/server";

const RELATIONSHIP_TYPES = [
  "friend",
  "close_friend",
  "family",
  "romance",
  "lover",
  "partner",
  "spouse",
] as const;

type RelationshipType =
  (typeof RELATIONSHIP_TYPES)[number];

function createPrivilegedClient() {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret =
    process.env.SUPABASE_SECRET_KEY;

  if (!url || !secret) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY.",
    );
  }

  return createAdminClient(url, secret, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function readUuid(
  value: FormDataEntryValue | null,
): string {
  const text = String(value ?? "").trim();
  const uuidPattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  if (!uuidPattern.test(text)) {
    throw new Error(
      "Invalid character or relationship identifier.",
    );
  }

  return text;
}

function readRelationshipType(
  value: FormDataEntryValue | null,
): RelationshipType {
  const text = String(value ?? "").trim();

  if (
    !RELATIONSHIP_TYPES.includes(
      text as RelationshipType,
    )
  ) {
    throw new Error(
      "Invalid relationship type.",
    );
  }

  return text as RelationshipType;
}

async function getOwnedCharacter() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: character, error } = await supabase
    .from("characters")
    .select("id, public_slug, status")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!character) {
    redirect("/character/create");
  }

  return character;
}

async function requireFriendList(
  characterId: string,
) {
  const enabled =
    await hasCharacterFeature(
      characterId,
      "friend_list",
    );

  if (!enabled) {
    throw new Error(
      "The Friend List feature is not enabled for this character.",
    );
  }
}

async function getTargetCharacter(
  characterId: string,
) {
  const admin = createPrivilegedClient();

  const { data, error } = await admin
    .from("characters")
    .select("id, public_slug, status")
    .eq("id", characterId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data || data.status !== "approved") {
    throw new Error(
      "That character is not available for relationships.",
    );
  }

  return data;
}

export async function sendRelationshipRequest(
  formData: FormData,
) {
  const recipientId =
    readUuid(formData.get("recipientId"));

  const relationshipType =
    readRelationshipType(
      formData.get("relationshipType"),
    );

  const character = await getOwnedCharacter();

  if (recipientId === character.id) {
    throw new Error(
      "You cannot add yourself to your Friend List.",
    );
  }

  await requireFriendList(character.id);

  const target =
    await getTargetCharacter(recipientId);

  await requireFriendList(target.id);

  const admin = createPrivilegedClient();

  const { data: existing, error: existingError } =
    await admin
      .from("character_relationships")
      .select("id, status")
      .or(
        [
          `and(requester_character_id.eq.${character.id},recipient_character_id.eq.${recipientId})`,
          `and(requester_character_id.eq.${recipientId},recipient_character_id.eq.${character.id})`,
        ].join(","),
      )
      .in("status", ["pending", "accepted"])
      .limit(1)
      .maybeSingle();

  if (existingError) {
    throw new Error(existingError.message);
  }

  if (existing) {
    throw new Error(
      existing.status === "accepted"
        ? "These characters already have an accepted relationship."
        : "A relationship request between these characters is already pending.",
    );
  }

  const { error } = await admin
    .from("character_relationships")
    .insert({
      requester_character_id: character.id,
      recipient_character_id: recipientId,
      relationship_type: relationshipType,
      status: "pending",
    });

  if (error) {
    throw new Error(
      `Unable to send relationship request: ${error.message}`,
    );
  }

  revalidatePath("/friends");
  revalidatePath(
    `/characters/${target.public_slug}`,
  );
}

export async function respondRelationshipRequest(
  formData: FormData,
) {
  const relationshipId =
    readUuid(formData.get("relationshipId"));

  const response =
    String(formData.get("response") ?? "").trim();

  if (
    response !== "accept" &&
    response !== "decline"
  ) {
    throw new Error(
      "Invalid relationship response.",
    );
  }

  const character = await getOwnedCharacter();
  await requireFriendList(character.id);

  const admin = createPrivilegedClient();

  const {
    data: relationship,
    error: relationshipError,
  } = await admin
    .from("character_relationships")
    .select(
      "id, requester_character_id, recipient_character_id, status",
    )
    .eq("id", relationshipId)
    .maybeSingle();

  if (relationshipError || !relationship) {
    throw new Error(
      relationshipError?.message ??
        "Relationship request not found.",
    );
  }

  if (
    relationship.recipient_character_id !==
      character.id ||
    relationship.status !== "pending"
  ) {
    throw new Error(
      "This relationship request cannot be changed.",
    );
  }

  const now = new Date().toISOString();

  const { error } = await admin
    .from("character_relationships")
    .update({
      status:
        response === "accept"
          ? "accepted"
          : "declined",
      responded_at: now,
      updated_at: now,
    })
    .eq("id", relationshipId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/friends");
}

export async function cancelRelationshipRequest(
  formData: FormData,
) {
  const relationshipId =
    readUuid(formData.get("relationshipId"));

  const character = await getOwnedCharacter();
  await requireFriendList(character.id);

  const admin = createPrivilegedClient();

  const { error } = await admin
    .from("character_relationships")
    .delete()
    .eq("id", relationshipId)
    .eq("requester_character_id", character.id)
    .eq("status", "pending");

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/friends");
}

export async function removeRelationship(
  formData: FormData,
) {
  const relationshipId =
    readUuid(formData.get("relationshipId"));

  const character = await getOwnedCharacter();
  await requireFriendList(character.id);

  const admin = createPrivilegedClient();

  const {
    data: relationship,
    error: relationshipError,
  } = await admin
    .from("character_relationships")
    .select(
      "id, requester_character_id, recipient_character_id, status",
    )
    .eq("id", relationshipId)
    .maybeSingle();

  if (relationshipError || !relationship) {
    throw new Error(
      relationshipError?.message ??
        "Relationship not found.",
    );
  }

  const isParticipant =
    relationship.requester_character_id ===
      character.id ||
    relationship.recipient_character_id ===
      character.id;

  if (
    !isParticipant ||
    relationship.status !== "accepted"
  ) {
    throw new Error(
      "This relationship cannot be removed.",
    );
  }

  const { error } = await admin
    .from("character_relationships")
    .delete()
    .eq("id", relationshipId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/friends");
}
