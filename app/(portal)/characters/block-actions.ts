"use server";

import { createClient as createAdminClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isCharacterStaff } from "@/lib/auth/is-character-staff";

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secret) throw new Error("Missing Supabase server credentials.");
  return createAdminClient(url, secret, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function toggleGlobalCharacterBlock(formData: FormData) {
  const targetCharacterId = String(formData.get("targetCharacterId") ?? "").trim();
  const block = String(formData.get("block") ?? "false") === "true";
  if (!targetCharacterId) throw new Error("Missing character.");

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: actor, error: actorError } = await supabase
    .from("characters").select("id").eq("user_id", user.id).maybeSingle();
  if (actorError) throw new Error(actorError.message);
  if (!actor) redirect("/character/create");
  if (actor.id === targetCharacterId) throw new Error("You cannot block yourself.");

  const admin = adminClient();
  const { data: target, error: targetError } = await admin
    .from("characters")
    .select("id, public_slug, is_system")
    .eq("id", targetCharacterId)
    .maybeSingle();

  if (targetError) throw new Error(targetError.message);
  if (!target || target.is_system) throw new Error("That character cannot be blocked.");

  if (
    block &&
    await isCharacterStaff(
      targetCharacterId,
    )
  ) {
    throw new Error(
      "Staff characters cannot be blocked.",
    );
  }

  if (block) {
    const { error } = await admin.from("character_blocks").upsert(
      {
        blocker_character_id: actor.id,
        blocked_character_id: targetCharacterId,
      },
      { onConflict: "blocker_character_id,blocked_character_id" },
    );
    if (error) throw new Error(error.message);

    const { error: friendError } = await admin
      .from("character_friend_entries")
      .delete()
      .or([
        `and(owner_character_id.eq.${actor.id},target_character_id.eq.${targetCharacterId})`,
        `and(owner_character_id.eq.${targetCharacterId},target_character_id.eq.${actor.id})`,
      ].join(","));
    if (friendError) throw new Error(friendError.message);
  } else {
    const { error } = await admin.from("character_blocks")
      .delete()
      .eq("blocker_character_id", actor.id)
      .eq("blocked_character_id", targetCharacterId);
    if (error) throw new Error(error.message);
  }

  for (const path of ["/characters","/friends","/messages","/forum","/game","/admin/communication-logs"]) {
    revalidatePath(path);
  }
  if (target.public_slug) revalidatePath(`/characters/${target.public_slug}`);
}
