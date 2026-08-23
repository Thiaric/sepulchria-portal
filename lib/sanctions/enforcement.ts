import type {
  SupabaseClient,
} from "@supabase/supabase-js";

export type SanctionCapability =
  | "communication"
  | "forum"
  | "game_chat"
  | "portal";

type EnforcementRow = {
  blocked: boolean;
  message: string | null;
};

export async function getSanctionEnforcement(
  supabase: SupabaseClient,
  capability: SanctionCapability,
): Promise<EnforcementRow> {
  const {
    data,
    error,
  } = await supabase.rpc(
    "get_current_sanction_enforcement",
    {
      p_capability: capability,
    },
  );

  if (error) {
    throw new Error(
      `Unable to verify account sanctions: ${error.message}`,
    );
  }

  const row =
    Array.isArray(data)
      ? data[0] ?? null
      : data;

  return {
    blocked:
      row?.blocked === true,
    message:
      typeof row?.message === "string"
        ? row.message
        : null,
  };
}

export async function assertCurrentUserCan(
  supabase: SupabaseClient,
  capability: SanctionCapability,
): Promise<void> {
  const enforcement =
    await getSanctionEnforcement(
      supabase,
      capability,
    );

  if (enforcement.blocked) {
    throw new Error(
      enforcement.message ??
        "This action is currently restricted on your account.",
    );
  }
}
