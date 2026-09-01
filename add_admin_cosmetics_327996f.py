from __future__ import annotations
import subprocess
from pathlib import Path

ROOT = Path.cwd()

def read(path: str) -> str:
    return (ROOT / path).read_text(encoding="utf-8")

def write(path: str, content: str) -> None:
    target = ROOT / path
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(content, encoding="utf-8")

def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected 1 match, found {count}. Expected inspected baseline 327996f.")
    return text.replace(old, new, 1)

head = subprocess.check_output(["git", "rev-parse", "--short", "HEAD"], text=True).strip()
if not head.startswith("327996f"):
    raise SystemExit(f"Expected HEAD 327996f, found {head}. Ask ChatGPT to re-inspect.")

new_files = [
    "app/(portal)/admin/cosmetics/page.tsx",
    "app/api/admin/cosmetics/route.ts",
    "app/api/admin/cosmetics/upload-ticket/route.ts",
    "components/admin/cosmetics-feature-manager.tsx",
    "components/admin/cosmetics-context-panel.tsx",
]
for path in new_files:
    if (ROOT / path).exists():
        raise SystemExit(f"{path} already exists. Stop: this patch expects a clean 327996f baseline.")

path = "lib/auth/admin-section-access.ts"
text = read(path)
text = replace_once(text, '  | "codex"\n  | "characters"', '  | "codex"\n  | "cosmetics"\n  | "characters"', "AdminSection")
text = replace_once(text, '  codex: ["owner", "admin"],\n  characters:', '  codex: ["owner", "admin"],\n  cosmetics: ["owner"],\n  characters:', "Cosmetics role")
write(path, text)

path = "app/(portal)/admin/layout.tsx"
text = read(path)
old = '''            {can("codex") ? (
              <AdminNavigationLink href="/admin/codex">
                Codex
              </AdminNavigationLink>
            ) : null}

            {can("items") ? (
              <AdminNavigationLink href="/admin/crafting-recipes">
'''
new = '''            {can("codex") ? (
              <AdminNavigationLink href="/admin/codex">
                Codex
              </AdminNavigationLink>
            ) : null}

            {can("cosmetics") ? (
              <AdminNavigationLink href="/admin/cosmetics">
                Cosmetics
              </AdminNavigationLink>
            ) : null}

            {can("items") ? (
              <AdminNavigationLink href="/admin/crafting-recipes">
'''
text = replace_once(text, old, new, "Admin navigation")
write(path, text)

path = "components/portal/admin-context-panel.tsx"
text = read(path)
text = replace_once(
    text,
    'import { MusicContextPanel } from "@/components/admin/music-context-panel";',
    'import { MusicContextPanel } from "@/components/admin/music-context-panel";\nimport { CosmeticsContextPanel } from "@/components/admin/cosmetics-context-panel";',
    "Cosmetics context import",
)
text = replace_once(text, '  | "codex"\n  | "media"', '  | "codex"\n  | "cosmetics"\n  | "media"', "Cosmetics mode")
text = replace_once(
    text,
    '''  if (pathname === "/admin/codex") {
    return "codex";
  }

  if (pathname === "/admin/media") {
''',
    '''  if (pathname === "/admin/codex") {
    return "codex";
  }

  if (pathname === "/admin/cosmetics") {
    return "cosmetics";
  }

  if (pathname === "/admin/media") {
''',
    "Cosmetics route",
)
text = replace_once(
    text,
    '''  if (mode === "media") {
    return (
      <AdminMediaNavigatorContext />
    );
  }
''',
    '''  if (mode === "cosmetics") {
    return (
      <CosmeticsContextPanel />
    );
  }

  if (mode === "media") {
    return (
      <AdminMediaNavigatorContext />
    );
  }
''',
    "Cosmetics context render",
)
text = replace_once(
    text,
    '  { section: "codex", label: "Codex", href: "/admin/codex" },\n  { section: "items", label: "Crafting Recipes", href: "/admin/crafting-recipes", aliases: ["recipes", "crafting"] },',
    '  { section: "codex", label: "Codex", href: "/admin/codex" },\n  { section: "cosmetics", label: "Cosmetics", href: "/admin/cosmetics", aliases: ["frames", "appearance"] },\n  { section: "items", label: "Crafting Recipes", href: "/admin/crafting-recipes", aliases: ["recipes", "crafting"] },',
    "Admin overview navigator",
)
write(path, text)

write("app/(portal)/admin/cosmetics/page.tsx", r'''import {
  CosmeticsFeatureManager,
  type CosmeticAdminRow,
} from "@/components/admin/cosmetics-feature-manager";
import { requireAdminSection } from "@/lib/auth/require-staff";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminCosmeticsPage() {
  await requireAdminSection("cosmetics");
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("cosmetic_items")
    .select("id, slug, name, description, category, preview_image_url, asset_url, preview_storage_path, asset_storage_path, config_json, is_active, sort_order, created_at, updated_at")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    throw new Error(`Unable to load Cosmetics: ${error.message}`);
  }

  return (
    <main className="p-5 sm:p-7 lg:p-9">
      <div className="mx-auto max-w-7xl">
        <p className="text-[9px] uppercase tracking-[0.28em] text-[rgb(var(--sep-colour-8c704b))]">
          Administration
        </p>
        <h2 className="mt-2 font-serif text-4xl text-[rgb(var(--sep-colour-ead5ac))]">
          Cosmetics
        </h2>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-[rgb(var(--sep-colour-a99b89))]">
          Manage collectible visual treatments for character sheets and location chat.
          Store pricing and Paddle fulfilment come later.
        </p>
        <CosmeticsFeatureManager initialItems={(data ?? []) as CosmeticAdminRow[]} />
      </div>
    </main>
  );
}
''')

write("app/api/admin/cosmetics/upload-ticket/route.ts", r'''import { NextRequest, NextResponse } from "next/server";
import { canAccessAdminSection, getStaffSession } from "@/lib/auth/require-staff";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BUCKET = "cosmetics";
const MAX = 10 * 1024 * 1024;
const PREVIEW_TYPES = new Set(["image/png", "image/webp", "image/jpeg", "image/svg+xml"]);
const ASSET_TYPES = new Set(["image/png", "image/webp", "image/svg+xml"]);

function bad(error: string, status = 400) {
  return NextResponse.json({ error }, { status });
}

async function allowed() {
  const staff = await getStaffSession();
  return !!staff && canAccessAdminSection(staff.role, "cosmetics");
}

function extension(mimeType: string) {
  return ({
    "image/png": "png",
    "image/webp": "webp",
    "image/jpeg": "jpg",
    "image/svg+xml": "svg",
  } as Record<string, string>)[mimeType] ?? "bin";
}

export async function POST(req: NextRequest) {
  if (!(await allowed())) return bad("Not authorised.", 403);

  const body = (await req.json()) as {
    slug?: string;
    kind?: "preview" | "asset";
    mime_type?: string;
    file_size_bytes?: number;
  };

  const slug = String(body.slug ?? "").trim().toLowerCase();
  const kind = String(body.kind ?? "");
  const mimeType = String(body.mime_type ?? "");
  const fileSize = Number(body.file_size_bytes ?? 0);

  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return bad("Invalid cosmetic slug.");
  if (kind !== "preview" && kind !== "asset") return bad("Invalid cosmetic upload type.");

  const allowedTypes = kind === "asset" ? ASSET_TYPES : PREVIEW_TYPES;
  if (!allowedTypes.has(mimeType)) {
    return bad(
      kind === "asset"
        ? "Cosmetic assets must be PNG, WebP or SVG."
        : "Preview images must be PNG, WebP, JPEG or SVG.",
    );
  }

  if (!Number.isFinite(fileSize) || fileSize <= 0 || fileSize > MAX) {
    return bad("Cosmetic image files must be 10 MB or smaller.");
  }

  const admin = createAdminClient();
  const existing = await admin
    .from("cosmetic_items")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();

  if (existing.error) return bad(existing.error.message, 500);
  if (existing.data) return bad("That cosmetic slug already exists.", 409);

  const folder = kind === "asset" ? "assets" : "previews";
  const path = `${folder}/${slug}.${extension(mimeType)}`;

  const ticket = await admin.storage
    .from(BUCKET)
    .createSignedUploadUrl(path, { upsert: true });

  if (ticket.error || !ticket.data?.token) {
    return bad(ticket.error?.message ?? "Unable to authorise cosmetic upload.", 500);
  }

  return NextResponse.json({ path, token: ticket.data.token });
}
''')

write("app/api/admin/cosmetics/route.ts", r'''import { NextRequest, NextResponse } from "next/server";
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
    .eq("cosmetic_item_id", id);

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
''')

write("components/admin/cosmetics-feature-manager.tsx", r'''"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export type CosmeticAdminRow = {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: "sheet_frame" | "chat_frame";
  preview_image_url: string | null;
  asset_url: string | null;
  preview_storage_path: string | null;
  asset_storage_path: string | null;
  config_json: Record<string, unknown>;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const input = "w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2.5 text-sm text-[rgb(var(--sep-colour-d7c4a5))] outline-none focus:border-[rgb(var(--sep-colour-a17a49))]";
const button = "border border-[rgb(var(--sep-colour-987344))] bg-[rgb(var(--sep-colour-3b2919))] px-4 py-2.5 text-[8px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-efd6a8))] disabled:opacity-45";

function categoryLabel(category: CosmeticAdminRow["category"]) {
  return category === "sheet_frame" ? "Sheet Frame" : "Location Chat Frame";
}

async function responseJson(response: Response) {
  const text = await response.text();
  if (!text.trim()) return {} as { error?: string; items?: CosmeticAdminRow[]; path?: string; token?: string };
  try {
    return JSON.parse(text) as { error?: string; items?: CosmeticAdminRow[]; path?: string; token?: string };
  } catch {
    return { error: response.ok ? "The server returned an invalid response." : `Request failed (${response.status}).` };
  }
}

export function CosmeticsFeatureManager({ initialItems }: { initialItems: CosmeticAdminRow[] }) {
  const router = useRouter();
  const assetRef = useRef<HTMLInputElement | null>(null);
  const previewRef = useRef<HTMLInputElement | null>(null);
  const [items, setItems] = useState(initialItems);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [failed, setFailed] = useState(false);

  async function reload() {
    const response = await fetch("/api/admin/cosmetics", { cache: "no-store" });
    const data = await responseJson(response);
    if (!response.ok) throw new Error(data.error ?? "Unable to refresh Cosmetics.");
    setItems(data.items ?? []);
    window.requestAnimationFrame(() => {
      window.dispatchEvent(new Event("sepulchria:admin-data-changed"));
    });
    router.refresh();
  }

  function validateFile(file: File, kind: "asset" | "preview") {
    if (file.size > MAX_IMAGE_BYTES) {
      throw new Error(`${file.name} is ${(file.size / 1048576).toFixed(2)} MB. Cosmetic images must be 10 MB or smaller.`);
    }
    const types = kind === "asset"
      ? new Set(["image/png", "image/webp", "image/svg+xml"])
      : new Set(["image/png", "image/webp", "image/jpeg", "image/svg+xml"]);
    if (!types.has(file.type)) {
      throw new Error(kind === "asset"
        ? "The actual cosmetic asset must be PNG, WebP or SVG."
        : "The preview must be PNG, WebP, JPEG or SVG.");
    }
  }

  async function uploadFile({ slug, file, kind }: { slug: string; file: File; kind: "asset" | "preview" }) {
    validateFile(file, kind);
    const ticket = await fetch("/api/admin/cosmetics/upload-ticket", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug, kind, mime_type: file.type, file_size_bytes: file.size }),
    });
    const ticketData = await responseJson(ticket);
    if (!ticket.ok) throw new Error(ticketData.error ?? "Unable to authorise cosmetic upload.");

    const path = String(ticketData.path ?? "");
    const token = String(ticketData.token ?? "");
    if (!path || !token) throw new Error("The cosmetic upload ticket was incomplete.");

    const upload = await createClient().storage
      .from("cosmetics")
      .uploadToSignedUrl(path, token, file, {
        contentType: file.type,
        cacheControl: "3600",
      });

    if (upload.error) throw new Error(`Unable to store ${kind}: ${upload.error.message}`);
    return path;
  }

  async function create(formData: FormData) {
    const asset = formData.get("asset");
    const preview = formData.get("preview");

    if (!(asset instanceof File) || asset.size === 0) {
      setFailed(true);
      setMessage("Choose the actual transparent cosmetic asset.");
      return;
    }

    const slug = String(formData.get("slug") ?? "").trim().toLowerCase();
    setBusy(true);
    setMessage("");
    setFailed(false);

    try {
      const assetPath = await uploadFile({ slug, file: asset, kind: "asset" });
      let previewPath: string | null = null;
      if (preview instanceof File && preview.size > 0) {
        previewPath = await uploadFile({ slug, file: preview, kind: "preview" });
      }

      const response = await fetch("/api/admin/cosmetics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          name: String(formData.get("name") ?? ""),
          description: String(formData.get("description") ?? ""),
          category: String(formData.get("category") ?? ""),
          sort_order: Number(formData.get("sort_order") ?? 0),
          is_active: formData.get("is_active") === "on",
          asset_storage_path: assetPath,
          preview_storage_path: previewPath,
        }),
      });

      const data = await responseJson(response);
      if (!response.ok) throw new Error(data.error ?? "Unable to save cosmetic.");

      if (assetRef.current) assetRef.current.value = "";
      if (previewRef.current) previewRef.current.value = "";
      setMessage("Cosmetic created.");
      await reload();
    } catch (error) {
      setFailed(true);
      setMessage(error instanceof Error ? error.message : "Unable to create cosmetic.");
    } finally {
      setBusy(false);
    }
  }

  async function update(item: CosmeticAdminRow, formData: FormData) {
    setBusy(true);
    setMessage("");
    setFailed(false);
    try {
      const response = await fetch("/api/admin/cosmetics", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: item.id,
          name: String(formData.get("name") ?? ""),
          description: String(formData.get("description") ?? ""),
          sort_order: Number(formData.get("sort_order") ?? 0),
          is_active: formData.get("is_active") === "on",
        }),
      });
      const data = await responseJson(response);
      if (!response.ok) throw new Error(data.error ?? "Unable to save cosmetic.");
      setMessage("Cosmetic saved.");
      await reload();
    } catch (error) {
      setFailed(true);
      setMessage(error instanceof Error ? error.message : "Unable to save cosmetic.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(item: CosmeticAdminRow) {
    if (!window.confirm(`Delete "${item.name}" permanently?`)) return;
    setBusy(true);
    setMessage("");
    setFailed(false);
    try {
      const response = await fetch(`/api/admin/cosmetics?id=${encodeURIComponent(item.id)}`, { method: "DELETE" });
      const data = await responseJson(response);
      if (!response.ok) throw new Error(data.error ?? "Unable to delete cosmetic.");
      setMessage("Cosmetic deleted.");
      await reload();
    } catch (error) {
      setFailed(true);
      setMessage(error instanceof Error ? error.message : "Unable to delete cosmetic.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-7 border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))]">
      <header className="border-b border-[rgb(var(--sep-colour-60482e))]/35 bg-[rgb(var(--sep-colour-100c09))] px-5 py-4">
        <p className="text-[8px] uppercase tracking-[0.22em] text-[rgb(var(--sep-colour-a68152))]">Collectible feature</p>
        <h3 className="mt-1 font-serif text-2xl text-[rgb(var(--sep-colour-dfc99f))]">Cosmetic Catalogue</h3>
        <p className="mt-2 text-[11px] leading-5 text-[rgb(var(--sep-colour-8f8271))]">
          Phase 1 supports Sheet Frames and Location Chat Frames. The actual asset should be transparent PNG,
          WebP or SVG; the separate store/admin preview is optional.
        </p>
      </header>

      {message ? (
        <div className={`mx-5 mt-5 border px-4 py-3 text-xs ${failed
          ? "border-red-800/55 text-red-200"
          : "border-[rgb(var(--sep-colour-56754f))]/55 text-[rgb(var(--sep-colour-c5d7bd))]"}`}>
          {message}
        </div>
      ) : null}

      <div className="grid gap-px bg-[rgb(var(--sep-colour-4f3b28))]/30 xl:grid-cols-[380px_minmax(0,1fr)]">
        <form
          id="cosmetic-new"
          className="scroll-mt-6 bg-[rgb(var(--sep-colour-17110d))] p-5"
          onSubmit={(event) => {
            event.preventDefault();
            void create(new FormData(event.currentTarget));
          }}
        >
          <p className="text-[8px] uppercase tracking-[0.2em] text-[rgb(var(--sep-colour-8c704b))]">Add Cosmetic</p>
          <div className="mt-4 space-y-3">
            <input name="slug" required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" placeholder="gilded-reliquary" className={input} />
            <input name="name" required placeholder="Gilded Reliquary" className={input} />
            <textarea name="description" rows={3} maxLength={1500} placeholder="Description" className={`${input} resize-y`} />

            <label className="block">
              <span className="mb-1.5 block text-[8px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-806b50))]">Cosmetic type</span>
              <select name="category" defaultValue="sheet_frame" className={input}>
                <option value="sheet_frame">Sheet Frame</option>
                <option value="chat_frame">Location Chat Frame</option>
              </select>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-[8px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-806b50))]">Actual cosmetic asset</span>
              <input
                ref={assetRef}
                name="asset"
                type="file"
                required
                accept="image/png,image/webp,image/svg+xml,.png,.webp,.svg"
                className="block w-full text-xs text-[rgb(var(--sep-colour-a99472))]"
              />
            </label>
            <p className="text-[8px] leading-4 text-[rgb(var(--sep-colour-6f6252))]">
              PNG, WebP or SVG - max 10 MB. Transparent background recommended.
            </p>

            <label className="block">
              <span className="mb-1.5 block text-[8px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-806b50))]">Store / admin preview (optional)</span>
              <input
                ref={previewRef}
                name="preview"
                type="file"
                accept="image/png,image/webp,image/jpeg,image/svg+xml,.png,.webp,.jpg,.jpeg,.svg"
                className="block w-full text-xs text-[rgb(var(--sep-colour-a99472))]"
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-[8px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-806b50))]">Sort order</span>
              <input name="sort_order" type="number" defaultValue={0} className={input} />
            </label>

            <label className="flex gap-2 text-xs">
              <input type="checkbox" name="is_active" defaultChecked />
              Active
            </label>

            <button type="submit" disabled={busy} className={button}>
              {busy ? "Working..." : "Upload Cosmetic"}
            </button>
          </div>
        </form>

        <div className="bg-[rgb(var(--sep-colour-120d0a))] p-5">
          <h4 className="font-serif text-xl text-[rgb(var(--sep-colour-d8bf91))]">Cosmetics - {items.length}</h4>
          <div className="mt-4 space-y-3">
            {items.map((item) => (
              <form
                key={item.id}
                id={`admin-cosmetic-${item.id}`}
                data-admin-cosmetic-id={item.id}
                data-admin-cosmetic-name={item.name}
                data-admin-cosmetic-category={item.category}
                data-admin-cosmetic-active={String(item.is_active)}
                className="scroll-mt-6 border border-[rgb(var(--sep-colour-59432c))]/40 bg-[rgb(var(--sep-colour-17110d))] p-4"
                onSubmit={(event) => {
                  event.preventDefault();
                  void update(item, new FormData(event.currentTarget));
                }}
              >
                <div className="grid gap-4 sm:grid-cols-[112px_minmax(0,1fr)]">
                  <div className="flex min-h-28 items-center justify-center overflow-hidden border border-[rgb(var(--sep-colour-59432c))]/45 bg-[rgb(var(--sep-colour-0d0a08))] p-2">
                    {item.preview_image_url ?? item.asset_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.preview_image_url ?? item.asset_url ?? ""} alt="" className="max-h-24 max-w-full object-contain" />
                    ) : (
                      <span className="text-[8px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-625747))]">No preview</span>
                    )}
                  </div>

                  <div>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-serif text-lg text-[rgb(var(--sep-colour-dfc79c))]">{item.name}</p>
                        <p className="font-mono text-[9px] text-[rgb(var(--sep-colour-6f665b))]">{item.slug}</p>
                      </div>
                      <span className="border border-[rgb(var(--sep-colour-60482e))]/45 px-2 py-1 text-[7px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-b59b74))]">
                        {categoryLabel(item.category)}
                      </span>
                    </div>

                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                      <input name="name" required defaultValue={item.name} className={input} />
                      <label>
                        <span className="mb-1.5 block text-[8px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-806b50))]">Sort order</span>
                        <input name="sort_order" type="number" defaultValue={item.sort_order} className={input} />
                      </label>
                    </div>

                    <textarea name="description" rows={3} maxLength={1500} defaultValue={item.description} className={`${input} mt-3 resize-y`} />

                    <div className="mt-3 flex flex-wrap items-center gap-4">
                      <label className="flex gap-2 text-xs">
                        <input type="checkbox" name="is_active" defaultChecked={item.is_active} />
                        Active
                      </label>
                      <button type="submit" disabled={busy} className={button}>Save</button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void remove(item)}
                        className="border border-red-900/65 bg-red-950/20 px-4 py-2.5 text-[8px] uppercase tracking-[0.16em] text-red-300 transition hover:border-red-700"
                      >
                        Delete
                      </button>
                    </div>

                    <p className="mt-3 break-all text-[8px] leading-4 text-[rgb(var(--sep-colour-6f6252))]">
                      Asset: {item.asset_storage_path ?? "missing"}
                    </p>
                  </div>
                </div>
              </form>
            ))}

            {items.length === 0 ? (
              <p className="border border-dashed border-[rgb(var(--sep-colour-59432c))]/40 px-4 py-8 text-center text-[10px] text-[rgb(var(--sep-colour-706452))]">
                No cosmetics have been created yet.
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
''')

write("components/admin/cosmetics-context-panel.tsx", r'''"use client";

import { useEffect, useMemo, useState } from "react";

type Entry = {
  id: string;
  name: string;
  category: string;
  active: boolean;
};

function categoryLabel(category: string) {
  if (category === "sheet_frame") return "Sheet Frame";
  if (category === "chat_frame") return "Chat Frame";
  return category;
}

export function CosmeticsContextPanel() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const read = () => {
      const nodes = Array.from(
        document.querySelectorAll<HTMLElement>("[data-admin-cosmetic-id]"),
      );
      setEntries(nodes.map((node) => ({
        id: node.dataset.adminCosmeticId ?? "",
        name: node.dataset.adminCosmeticName ?? "Untitled Cosmetic",
        category: node.dataset.adminCosmeticCategory ?? "",
        active: node.dataset.adminCosmeticActive === "true",
      })));
    };

    read();
    const frame = window.requestAnimationFrame(read);
    window.addEventListener("sepulchria:admin-data-changed", read);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("sepulchria:admin-data-changed", read);
    };
  }, []);

  const visible = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return entries;
    return entries.filter((entry) =>
      [entry.name, categoryLabel(entry.category), entry.active ? "active" : "inactive"]
        .join(" ")
        .toLowerCase()
        .includes(query),
    );
  }, [entries, search]);

  function jumpToCreate() {
    document.getElementById("cosmetic-new")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  function jumpToItem(id: string) {
    document.getElementById(`admin-cosmetic-${id}`)?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <p className="text-[8px] uppercase tracking-[0.24em] text-[rgb(var(--sep-colour-806b50))]">
        Cosmetics administration
      </p>
      <h2 className="mt-1 font-serif text-xl text-[rgb(var(--sep-colour-d8bf91))]">
        Cosmetic Catalogue
      </h2>
      <p className="mt-2 text-[11px] leading-5 text-[rgb(var(--sep-colour-8f8271))]">
        Create a cosmetic or jump directly to an existing frame.
      </p>

      <button
        type="button"
        onClick={jumpToCreate}
        className="mt-4 w-full border border-[rgb(var(--sep-colour-765937))]/55 bg-[rgb(var(--sep-colour-21170f))] px-3 py-2.5 text-left font-serif text-[13px] text-[rgb(var(--sep-colour-cbb28a))] transition hover:border-[rgb(var(--sep-colour-a17a49))]"
      >
        + Add Cosmetic
      </button>

      <input
        type="search"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Search cosmetics..."
        className="mt-3 w-full border border-[rgb(var(--sep-colour-59432c))]/45 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2.5 text-xs text-[rgb(var(--sep-colour-d4bea0))] outline-none focus:border-[rgb(var(--sep-colour-987344))]"
      />

      <div className="mt-3 min-h-0 flex-1 space-y-1.5 overflow-y-auto">
        {visible.map((entry) => (
          <button
            key={entry.id}
            type="button"
            onClick={() => jumpToItem(entry.id)}
            className="w-full border border-[rgb(var(--sep-colour-59432c))]/40 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2.5 text-left transition hover:border-[rgb(var(--sep-colour-80613b))]"
          >
            <span className="block truncate font-serif text-[13px] text-[rgb(var(--sep-colour-cbb28a))]">
              {entry.name}
            </span>
            <span className="mt-1 block text-[7px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-6f6252))]">
              {categoryLabel(entry.category)} · {entry.active ? "Active" : "Inactive"}
            </span>
          </button>
        ))}

        {visible.length === 0 ? (
          <p className="px-2 py-5 text-center text-[10px] text-[rgb(var(--sep-colour-706452))]">
            No matching cosmetics.
          </p>
        ) : null}
      </div>
    </div>
  );
}
''')

print("Cosmetics admin patch applied.")
