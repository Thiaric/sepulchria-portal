import "server-only";
import { createClient } from "@/lib/supabase/server";

export async function requireOrderHead(orderId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("You must be signed in.");

  const { data: character } = await supabase.from("characters")
    .select("id").eq("user_id", user.id).maybeSingle();
  if (!character) throw new Error("You are not permitted to manage this Order.");

  const { data: membership, error } = await supabase.from("order_memberships")
    .select("id, level:order_levels!order_memberships_order_level_id_fkey(level)")
    .eq("order_id", orderId).eq("character_id", character.id).maybeSingle();
  const relation = Array.isArray(membership?.level) ? membership?.level[0] : membership?.level;
  if (error || !membership || relation?.level !== 5)
    throw new Error("Only the Level 5 Head may manage this Order.");

  return { userId: user.id, characterId: character.id };
}
