"use server";

import { createClient as createAdminClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { hasCharacterFeature } from "@/lib/features/character-feature-entitlements";
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

const LIST_SCOPES = ["ingame", "offgame"] as const;

type RelationshipType = (typeof RELATIONSHIP_TYPES)[number];
type ListScope = (typeof LIST_SCOPES)[number];

function createPrivilegedClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY;

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

function readUuid(value: FormDataEntryValue | null): string {
  const text = String(value ?? "").trim();
  const uuidPattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  if (!uuidPattern.test(text)) {
    throw new Error("Invalid character or Friend List identifier.");
  }

  return text;
}

function readRelationshipType(
  value: FormDataEntryValue | null,
): RelationshipType {
  const text = String(value ?? "").trim();

  if (!RELATIONSHIP_TYPES.includes(text as RelationshipType)) {
    throw new Error("Invalid relationship type.");
  }

  return text as RelationshipType;
}

function readListScope(
  value: FormDataEntryValue | null,
): ListScope {
  const text = String(value ?? "").trim();

  if (!LIST_SCOPES.includes(text as ListScope)) {
    throw new Error("Invalid Friend List section.");
  }

  return text as ListScope;
}

async function getOwnedCharacter() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const { data: character, error } = await supabase
    .from("characters")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!character) redirect("/character/create");

  return character;
}

async function requireFriendList(characterId: string) {
  const enabled = await hasCharacterFeature(
    characterId,
    "friend_list",
  );

  if (!enabled) {
    throw new Error(
      "The Friend List feature is not enabled for this character.",
    );
  }
}

export async function addFriendListEntry(formData: FormData) {
  const targetCharacterId = readUuid(
    formData.get("targetCharacterId"),
  );
  const relationshipType = readRelationshipType(
    formData.get("relationshipType"),
  );
  const listScope = readListScope(
    formData.get("listScope"),
  );

  const owner = await getOwnedCharacter();
  await requireFriendList(owner.id);

  if (targetCharacterId === owner.id) {
    throw new Error(
      "You cannot add yourself to your Friend List.",
    );
  }

  const admin = createPrivilegedClient();

  const { data: target, error: targetError } = await admin
    .from("characters")
    .select("id, status, public_slug, is_system")
    .eq("id", targetCharacterId)
    .maybeSingle();

  if (targetError || !target) {
    throw new Error(
      targetError?.message ?? "Character not found.",
    );
  }

  if (
    target.status !== "approved" ||
    target.is_system === true
  ) {
    throw new Error(
      "Only playable approved characters can be added to a Friend List.",
    );
  }

  const { error } = await admin
    .from("character_friend_entries")
    .upsert(
      {
        owner_character_id: owner.id,
        target_character_id: targetCharacterId,
        list_scope: listScope,
        relationship_type: relationshipType,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict:
          "owner_character_id,target_character_id,list_scope",
      },
    );

  if (error) {
    throw new Error(
      `Unable to update Friend List: ${error.message}`,
    );
  }

  revalidatePath("/friends");

  if (target.public_slug) {
    revalidatePath(`/characters/${target.public_slug}`);
  }
}

export async function updateFriendListEntry(formData: FormData) {
  const entryId = readUuid(formData.get("entryId"));
  const relationshipType = readRelationshipType(
    formData.get("relationshipType"),
  );
  const listScope = readListScope(
    formData.get("listScope"),
  );

  const owner = await getOwnedCharacter();
  await requireFriendList(owner.id);

  const admin = createPrivilegedClient();

  const { error } = await admin
    .from("character_friend_entries")
    .update({
      list_scope: listScope,
      relationship_type: relationshipType,
      updated_at: new Date().toISOString(),
    })
    .eq("id", entryId)
    .eq("owner_character_id", owner.id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/friends");
}

export async function removeFriendListEntry(formData: FormData) {
  const entryId = readUuid(formData.get("entryId"));

  const owner = await getOwnedCharacter();
  await requireFriendList(owner.id);

  const admin = createPrivilegedClient();

  const { error } = await admin
    .from("character_friend_entries")
    .delete()
    .eq("id", entryId)
    .eq("owner_character_id", owner.id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/friends");
}
