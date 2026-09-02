import { NextRequest, NextResponse } from "next/server";
import { canAccessAdminSection, getStaffSession } from "@/lib/auth/require-staff";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BUCKET = "cosmetics";
const CATEGORIES = new Set(["sheet_frame", "chat_frame"]);

function bad(error: string, status = 400) {
  return NextResponse.json({ error }, { status });
}

async function allowed() {
  const staff = await getStaffSession();
  return !!staff && canAccessAdminSection(staff.role, "cosmetics");
}

async function items() {
  return createAdminClient()
    .from("cosmetic_items")
    .select("id, slug, name, description, category, preview_image_url, asset_url, preview_storage_path, asset_storage_path, config_json, is_active, sort_order, created_at, updated_at")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });
}

function validSlugPath(slug: string, kind: "asset" | "preview", path: string | null) {
  if (!path) return kind === "preview";
  const escaped = slug.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const extension = kind === "asset" ? "(?:png|webp|svg)" : "(?:png|webp|jpg|svg)";
  return new RegExp(`^${kind === "asset" ? "assets" : "previews"}/${escaped}\\.${extension}$`).test(path);
}

function publicUrl(path: string) {
  return createAdminClient().storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

export async function GET() {
  if (!(await allowed())) return bad("Not authorised.", 403);
  const result = await items();
  if (result.error) return bad(result.error.message, 500);
  return NextResponse.json({ items: result.data ?? [] });
}

export async function POST(req: NextRequest) {
  if (!(await allowed())) return bad("Not authorised.", 403);
  const body = await req.json();

  const slug = String(body.slug ?? "").trim().toLowerCase();
  const name = String(body.name ?? "").trim();
  const description = String(body.description ?? "").trim();
  const category = String(body.category ?? "");
  const sortOrder = Number(body.sort_order ?? 0);
  const assetPath = String(body.asset_storage_path ?? "") || null;
  const previewPath = String(body.preview_storage_path ?? "") || null;

  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return bad("Invalid cosmetic slug.");
  if (!name) return bad("Cosmetic name is required.");
  if (!CATEGORIES.has(category)) return bad("Only Sheet Frame and Chat Frame cosmetics are available in Phase 1.");
  if (!Number.isInteger(sortOrder)) return bad("Sort order must be a whole number.");
  if (!validSlugPath(slug, "asset", assetPath)) return bad("Invalid cosmetic asset path.");
  if (!validSlugPath(slug, "preview", previewPath)) return bad("Invalid cosmetic preview path.");
  if (!assetPath) return bad("A cosmetic asset is required.");

  const admin = createAdminClient();
  const assetUrl = publicUrl(assetPath);
  const previewUrl = previewPath ? publicUrl(previewPath) : assetUrl;

  const inserted = await admin.from("cosmetic_items").insert({
    slug,
    name,
    description,
    category,
    preview_image_url: previewUrl,
    asset_url: assetUrl,
    preview_storage_path: previewPath,
    asset_storage_path: assetPath,
    config_json: {},
    is_active: body.is_active === true,
    sort_order: sortOrder,
  });

  if (inserted.error) {
    const cleanup = [assetPath, previewPath].filter((value): value is string => Boolean(value));
    if (cleanup.length > 0) await admin.storage.from(BUCKET).remove(cleanup);
    return bad(inserted.error.message, 500);
  }

  return NextResponse.json({ ok: true });
}

export async function PATCH(req: NextRequest) {
  if (!(await allowed())) return bad("Not authorised.", 403);
  const body = await req.json();
  const id = String(body.id ?? "");
  const name = String(body.name ?? "").trim();
  const sortOrder = Number(body.sort_order ?? 0);

  if (!id || !name) return bad("Cosmetic ID and name are required.");
  if (!Number.isInteger(sortOrder)) return bad("Sort order must be a whole number.");

  const result = await createAdminClient()
    .from("cosmetic_items")
    .update({
      name,
      description: String(body.description ?? "").trim(),
      is_active: body.is_active === true,
      sort_order: sortOrder,
    })
    .eq("id", id);

  if (result.error) return bad(result.error.message, 500);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  if (!(await allowed())) return bad("Not authorised.", 403);
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return bad("Cosmetic ID is required.");

  const admin = createAdminClient();
  const cosmetic = await admin
    .from("cosmetic_items")
    .select("id, name, asset_storage_path, preview_storage_path")
    .eq("id", id)
    .maybeSingle();

  if (cosmetic.error) return bad(cosmetic.error.message, 500);
  if (!cosmetic.data) return bad("Cosmetic not found.", 404);

  const owners = await admin
  .from("character_cosmetic_entitlements")
  .select("character_id", { count: "exact", head: true })
  .eq("cosmetic_item_id", id)
  .eq("enabled", true);

  if (owners.error) return bad(owners.error.message, 500);
  if ((owners.count ?? 0) > 0) {
    return bad("Remove this cosmetic from every character before deleting it.", 409);
  }

  const deleted = await admin.from("cosmetic_items").delete().eq("id", id);
  if (deleted.error) return bad(deleted.error.message, 500);

  const paths = Array.from(new Set([
    cosmetic.data.asset_storage_path,
    cosmetic.data.preview_storage_path,
  ].filter((value): value is string => Boolean(value))));

  if (paths.length > 0) {
    const storage = await admin.storage.from(BUCKET).remove(paths);
    if (storage.error) {
      return bad(`Database record deleted, but cosmetic file cleanup failed: ${storage.error.message}`, 500);
    }
  }

  return NextResponse.json({ ok: true });
}
