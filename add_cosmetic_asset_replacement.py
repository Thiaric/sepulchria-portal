from pathlib import Path

ROOT = Path.cwd()

manager = ROOT / "components/admin/cosmetics-feature-manager.tsx"
api = ROOT / "app/api/admin/cosmetics/route.ts"
ticket = ROOT / "app/api/admin/cosmetics/upload-ticket/route.ts"

for path in (manager, api, ticket):
    if not path.exists():
        raise SystemExit(f"Missing required file: {path}")

def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected exactly 1 match, found {count}. Nothing was changed.")
    return text.replace(old, new, 1)

# 1) upload ticket
text = ticket.read_text(encoding="utf-8")

text = replace_once(
    text,
    '    file_size_bytes?: number;\n  };',
    '    file_size_bytes?: number;\n    replace_existing?: boolean;\n  };',
    "upload ticket request type",
)

text = replace_once(
    text,
    '  const fileSize = Number(body.file_size_bytes ?? 0);',
    '  const fileSize = Number(body.file_size_bytes ?? 0);\n  const replaceExisting = body.replace_existing === true;',
    "upload ticket replace flag",
)

text = replace_once(
    text,
    '  if (existing.error) return bad(existing.error.message, 500);\n  if (existing.data) return bad("That cosmetic slug already exists.", 409);\n\n  const folder = kind === "asset" ? "assets" : "previews";\n  const path = `${folder}/${slug}.${extension(mimeType)}`;',
    '  if (existing.error) return bad(existing.error.message, 500);\n  if (existing.data && !replaceExisting) {\n    return bad("That cosmetic slug already exists.", 409);\n  }\n  if (!existing.data && replaceExisting) {\n    return bad("That cosmetic does not exist.", 404);\n  }\n\n  const folder = kind === "asset" ? "assets" : "previews";\n  const path = replaceExisting\n    ? `${folder}/${slug}-${Date.now()}.${extension(mimeType)}`\n    : `${folder}/${slug}.${extension(mimeType)}`;',
    "upload ticket replacement path",
)

ticket.write_text(text, encoding="utf-8")

# 2) admin API
text = api.read_text(encoding="utf-8")

text = replace_once(
    text,
    '  return new RegExp(`^${kind === "asset" ? "assets" : "previews"}/${escaped}\\\\.${extension}$`).test(path);',
    '  return new RegExp(\n    `^${kind === "asset" ? "assets" : "previews"}/${escaped}(?:-\\\\d+)?\\\\.${extension}$`,\n  ).test(path);',
    "versioned path validation",
)

patch_start = text.find("export async function PATCH(req: NextRequest) {")
patch_end = text.find("export async function DELETE(req: NextRequest) {", patch_start)
if patch_start == -1 or patch_end == -1:
    raise SystemExit("Could not locate PATCH endpoint. Nothing was changed.")

new_patch = '''export async function PATCH(req: NextRequest) {
  if (!(await allowed())) return bad("Not authorised.", 403);

  const body = await req.json();
  const id = String(body.id ?? "");
  const name = String(body.name ?? "").trim();
  const sortOrder = Number(body.sort_order ?? 0);

  if (!id || !name) return bad("Cosmetic ID and name are required.");
  if (!Number.isInteger(sortOrder)) return bad("Sort order must be a whole number.");

  const admin = createAdminClient();

  const current = await admin
    .from("cosmetic_items")
    .select("id, slug, asset_storage_path, preview_storage_path")
    .eq("id", id)
    .maybeSingle();

  if (current.error) return bad(current.error.message, 500);
  if (!current.data) return bad("Cosmetic not found.", 404);

  const hasAssetReplacement =
    Object.prototype.hasOwnProperty.call(body, "asset_storage_path");
  const hasPreviewReplacement =
    Object.prototype.hasOwnProperty.call(body, "preview_storage_path");

  const assetPath = hasAssetReplacement
    ? String(body.asset_storage_path ?? "") || null
    : current.data.asset_storage_path;

  const previewPath = hasPreviewReplacement
    ? String(body.preview_storage_path ?? "") || null
    : current.data.preview_storage_path;

  if (!assetPath) return bad("A cosmetic asset is required.");
  if (!validSlugPath(current.data.slug, "asset", assetPath)) {
    return bad("Invalid cosmetic asset path.");
  }
  if (!validSlugPath(current.data.slug, "preview", previewPath)) {
    return bad("Invalid cosmetic preview path.");
  }

  const assetUrl = publicUrl(assetPath);
  const previewUrl = previewPath ? publicUrl(previewPath) : assetUrl;

  const result = await admin
    .from("cosmetic_items")
    .update({
      name,
      description: String(body.description ?? "").trim(),
      is_active: body.is_active === true,
      sort_order: sortOrder,
      asset_storage_path: assetPath,
      asset_url: assetUrl,
      preview_storage_path: previewPath,
      preview_image_url: previewUrl,
    })
    .eq("id", id);

  if (result.error) return bad(result.error.message, 500);

  const obsoletePaths = Array.from(
    new Set(
      [
        hasAssetReplacement &&
        current.data.asset_storage_path &&
        current.data.asset_storage_path !== assetPath
          ? current.data.asset_storage_path
          : null,
        hasPreviewReplacement &&
        current.data.preview_storage_path &&
        current.data.preview_storage_path !== previewPath
          ? current.data.preview_storage_path
          : null,
      ].filter((value): value is string => Boolean(value)),
    ),
  );

  if (obsoletePaths.length > 0) {
    const cleanup = await admin.storage.from(BUCKET).remove(obsoletePaths);
    if (cleanup.error) {
      console.error(
        "Cosmetic replacement saved, but old file cleanup failed:",
        cleanup.error.message,
      );
    }
  }

  return NextResponse.json({ ok: true });
}

'''

text = text[:patch_start] + new_patch + text[patch_end:]
api.write_text(text, encoding="utf-8")

# 3) admin UI
text = manager.read_text(encoding="utf-8")

text = replace_once(
    text,
    '  async function uploadFile({ slug, file, kind }: { slug: string; file: File; kind: "asset" | "preview" }) {',
    '''  async function uploadFile({
    slug,
    file,
    kind,
    replaceExisting = false,
  }: {
    slug: string;
    file: File;
    kind: "asset" | "preview";
    replaceExisting?: boolean;
  }) {''',
    "uploadFile signature",
)

text = replace_once(
    text,
    '      body: JSON.stringify({ slug, kind, mime_type: file.type, file_size_bytes: file.size }),',
    '''      body: JSON.stringify({
        slug,
        kind,
        mime_type: file.type,
        file_size_bytes: file.size,
        replace_existing: replaceExisting,
      }),''',
    "upload ticket payload",
)

old_update_start = text.find("  async function update(item: CosmeticAdminRow, formData: FormData) {")
old_update_end = text.find("  async function remove(item: CosmeticAdminRow) {", old_update_start)
if old_update_start == -1 or old_update_end == -1:
    raise SystemExit("Could not locate update() in cosmetics manager. Nothing was changed.")

new_update = '''  async function update(item: CosmeticAdminRow, formData: FormData) {
    setBusy(true);
    setMessage("");
    setFailed(false);

    try {
      const replacementAsset = formData.get("replacement_asset");
      const replacementPreview = formData.get("replacement_preview");

      let assetPath: string | undefined;
      let previewPath: string | undefined;

      if (replacementAsset instanceof File && replacementAsset.size > 0) {
        assetPath = await uploadFile({
          slug: item.slug,
          file: replacementAsset,
          kind: "asset",
          replaceExisting: true,
        });
      }

      if (replacementPreview instanceof File && replacementPreview.size > 0) {
        previewPath = await uploadFile({
          slug: item.slug,
          file: replacementPreview,
          kind: "preview",
          replaceExisting: true,
        });
      }

      const response = await fetch("/api/admin/cosmetics", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: item.id,
          name: String(formData.get("name") ?? ""),
          description: String(formData.get("description") ?? ""),
          sort_order: Number(formData.get("sort_order") ?? 0),
          is_active: formData.get("is_active") === "on",
          ...(assetPath ? { asset_storage_path: assetPath } : {}),
          ...(previewPath ? { preview_storage_path: previewPath } : {}),
        }),
      });

      const data = await responseJson(response);
      if (!response.ok) {
        throw new Error(data.error ?? "Unable to save cosmetic.");
      }

      setMessage(
        assetPath || previewPath
          ? "Cosmetic image replaced and saved."
          : "Cosmetic saved.",
      );

      await reload();
    } catch (error) {
      setFailed(true);
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to save cosmetic.",
      );
    } finally {
      setBusy(false);
    }
  }

'''

text = text[:old_update_start] + new_update + text[old_update_end:]

anchor = '                    <textarea name="description" rows={3} maxLength={1500} defaultValue={item.description} className={`${input} mt-3 resize-y`} />\n\n                    <div className="mt-3 flex flex-wrap items-center gap-4">'

replacement = '''                    <textarea name="description" rows={3} maxLength={1500} defaultValue={item.description} className={`${input} mt-3 resize-y`} />

                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                      <label className="block">
                        <span className="mb-1.5 block text-[8px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-806b50))]">
                          Replace actual cosmetic asset
                        </span>
                        <input
                          name="replacement_asset"
                          type="file"
                          accept="image/png,image/webp,image/svg+xml,.png,.webp,.svg"
                          className="block w-full text-xs text-[rgb(var(--sep-colour-a99472))]"
                        />
                        <span className="mt-1 block text-[8px] leading-4 text-[rgb(var(--sep-colour-6f6252))]">
                          Leave empty to keep the current asset.
                        </span>
                      </label>

                      <label className="block">
                        <span className="mb-1.5 block text-[8px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-806b50))]">
                          Replace preview
                        </span>
                        <input
                          name="replacement_preview"
                          type="file"
                          accept="image/png,image/webp,image/jpeg,image/svg+xml,.png,.webp,.jpg,.jpeg,.svg"
                          className="block w-full text-xs text-[rgb(var(--sep-colour-a99472))]"
                        />
                        <span className="mt-1 block text-[8px] leading-4 text-[rgb(var(--sep-colour-6f6252))]">
                          Leave empty to keep the current preview.
                        </span>
                      </label>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-4">'''

text = replace_once(
    text,
    anchor,
    replacement,
    "replacement inputs",
)

manager.write_text(text, encoding="utf-8")

print("Existing cosmetic assets can now be replaced without deleting the cosmetic record.")
print("ID, slug, category, entitlements and equipped preferences are preserved.")
