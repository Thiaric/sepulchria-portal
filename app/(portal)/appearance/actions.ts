"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function selectPortalSkin(
  skinSlug: string,
): Promise<{ ok: boolean; error?: string }> {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(skinSlug)) {
    return { ok: false, error: "Invalid portal skin." };
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "You must be signed in." };
  }

  const { data: skin, error: skinError } =
    await supabase
      .from("portal_skins")
      .select("id, slug, is_default")
      .eq("slug", skinSlug)
      .eq("is_active", true)
      .maybeSingle();

  if (skinError || !skin) {
    return {
      ok: false,
      error: skinError?.message ?? "Portal skin not found.",
    };
  }

  if (!skin.is_default) {
    const {
      data: entitlement,
      error: entitlementError,
    } = await supabase
      .from("user_portal_skin_entitlements")
      .select("enabled")
      .eq("user_id", user.id)
      .eq("skin_id", skin.id)
      .maybeSingle();

    if (entitlementError) {
      return { ok: false, error: entitlementError.message };
    }

    if (entitlement?.enabled !== true) {
      return {
        ok: false,
        error: "This portal skin is not unlocked for your account.",
      };
    }
  }

  const { error: preferenceError } =
    await supabase
      .from("user_portal_preferences")
      .upsert(
        {
          user_id: user.id,
          selected_skin_id: skin.id,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      );

  if (preferenceError) {
    return { ok: false, error: preferenceError.message };
  }

  revalidatePath("/appearance");
  return { ok: true };
}
