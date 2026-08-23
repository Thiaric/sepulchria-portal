import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function requireSupportIdentity() {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) redirect("/auth/login");
  const { data: character, error } = await supabase
    .from("characters")
    .select("id, display_name, first_name, surname")
    .eq("user_id", user.id)
    .maybeSingle();
  if (error) throw new Error(`Unable to load support identity: ${error.message}`);
  const characterName = character
    ? character.display_name?.trim() || [character.first_name, character.surname].filter(Boolean).join(" ").trim() || null
    : null;
  return { userId: user.id, characterId: character?.id ?? null, characterName };
}
