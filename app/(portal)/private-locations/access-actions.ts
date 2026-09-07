"use server";

import { createClient } from "@/lib/supabase/server";
import { getVisiblePrivateLocations } from "@/lib/private-locations/access";

export async function hasCurrentCharacterPrivateLocationAccess(): Promise<boolean> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return false;
  }

  const {
    data: character,
    error,
  } = await supabase
    .from("characters")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error || !character) {
    return false;
  }

  const visibleLocations =
    await getVisiblePrivateLocations(
      character.id,
    );

  return visibleLocations.length > 0;
}
