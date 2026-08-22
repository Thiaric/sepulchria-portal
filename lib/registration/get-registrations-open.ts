import "server-only";

import { createClient } from "@/lib/supabase/server";

export async function getRegistrationsOpen(): Promise<boolean> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("registration_settings")
    .select("registrations_open")
    .eq("id", 1)
    .maybeSingle();

  if (error) {
    console.error(
      "Unable to read registration settings:",
      error.message,
    );

    return false;
  }

  return data?.registrations_open === true;
}
