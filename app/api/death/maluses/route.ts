import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);

  const ids = [
    ...new Set(
      String(url.searchParams.get("ids") ?? "")
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean),
    ),
  ].slice(0, 100);

  if (!ids.length) {
    return NextResponse.json({ maluses: {} });
  }

  const admin = createAdminClient();

  const { data, error } = await admin
    .from("character_resurrection_maluses")
    .select(`
      character_id,
      narrative_text,
      applied_at,
      malus:death_resurrection_maluses(name,description)
    `)
    .in("character_id", ids)
    .is("cleared_at", null)
    .order("applied_at", { ascending: false });

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 },
    );
  }

  const maluses: Record<
    string,
    { name: string; description: string }
  > = {};

  for (const row of data ?? []) {
    const characterId = String(row.character_id ?? "");

    if (!characterId || maluses[characterId]) {
      continue;
    }

    const relation = Array.isArray(row.malus)
      ? row.malus[0] ?? null
      : row.malus;

    maluses[characterId] = {
      name: String(relation?.name ?? "Resurrection Scar"),
      description: String(
        row.narrative_text ??
        relation?.description ??
        "",
      ),
    };
  }

  return NextResponse.json({ maluses });
}
