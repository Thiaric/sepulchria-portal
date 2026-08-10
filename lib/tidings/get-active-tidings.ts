import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { Tiding } from "@/lib/tidings/types";

export async function getActiveTidings(): Promise<Tiding[]> {
  const supabase = await createClient();
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("tidings")
    .select(
      "id, title, message, priority, is_active, starts_at, expires_at, created_at, updated_at",
    )
    .eq("is_active", true)
    .lte("starts_at", now)
    .or(`expires_at.is.null,expires_at.gt.${now}`)
    .order("priority_rank", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(12);

  if (error || !data) {
    return [];
  }

  return data as Tiding[];
}
