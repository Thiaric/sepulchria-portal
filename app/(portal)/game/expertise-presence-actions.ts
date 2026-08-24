"use server";

import {
  createClient,
} from "@/lib/supabase/server";

export async function heartbeatExpertisePresence():
  Promise<void> {
  const supabase =
    await createClient();

  const {
    data: { user },
    error: authError,
  } =
    await supabase.auth.getUser();

  if (authError || !user) {
    return;
  }

  const { error } =
    await supabase.rpc(
      "claim_presence_expertise_tick",
    );

  if (error) {
    throw new Error(
      `Unable to update portal-time Expertise: ${error.message}`,
    );
  }
}
