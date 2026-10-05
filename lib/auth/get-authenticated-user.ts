import "server-only";

import { cache } from "react";

import { createClient } from "@/lib/supabase/server";

export const getAuthenticatedUser = cache(
  async () => {
    const supabase =
      await createClient();

    let result =
      await supabase.auth.getUser();

    if (
      result.error ||
      !result.data.user
    ) {
      result =
        await supabase.auth.getUser();
    }

    return result;
  },
);
