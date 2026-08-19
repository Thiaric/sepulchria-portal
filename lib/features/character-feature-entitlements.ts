import "server-only";

import {
  createClient as createAdminClient,
} from "@supabase/supabase-js";

export type CharacterFeatureKey =
  | "private_chat"
  | "friend_list";

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

export async function hasCharacterFeature(
  characterId: string,
  featureKey: CharacterFeatureKey,
): Promise<boolean> {
  const admin = createPrivilegedClient();

  const { data, error } = await admin
    .from("character_feature_entitlements")
    .select("enabled")
    .eq("character_id", characterId)
    .eq("feature_key", featureKey)
    .maybeSingle();

  if (error) {
    throw new Error(
      `Unable to check feature access: ${error.message}`,
    );
  }

  return data?.enabled === true;
}
