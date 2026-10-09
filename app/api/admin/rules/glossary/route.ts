import { NextResponse } from "next/server";
import { requireAdminSection } from "@/lib/auth/require-staff";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  await requireAdminSection("rules");
  const url = new URL(request.url);
  const rawOffset = url.searchParams.get("offset") ?? "0";
  const offset = Number(rawOffset);
  if (!Number.isSafeInteger(offset) || offset < 0) {
    return NextResponse.json({ error: "Invalid offset" }, { status: 400 });
  }
  const supabase = await createClient();
  const slug = url.searchParams.get("slug");
  if (slug !== null) {
    if (!slug || slug.length > 200) {
      return NextResponse.json({ error: "Invalid slug" }, { status: 400 });
    }
    const { data, error } = await supabase.from("rule_glossary")
      .select("id, term, slug, definition, related_rule_id, sort_order, status")
      .eq("slug", slug).limit(1);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ entries: data ?? [] }, { headers: { "Cache-Control": "no-store" } });
  }
  const { data, error } = await supabase.from("rule_glossary")
    .select("id, term, slug, definition, related_rule_id, sort_order, status")
    .order("sort_order", { ascending: true })
    .order("term", { ascending: true })
    .order("id", { ascending: true })
    .range(offset, offset + 24);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ entries: data ?? [] }, { headers: { "Cache-Control": "no-store" } });
}
